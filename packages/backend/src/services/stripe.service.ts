/**
 * Stripe Service for payment processing and customer management
 */

import Stripe from 'stripe';
import prisma from '../utils/prisma.js';

class StripeService {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    });
  }

  /**
   * Check if a Stripe error indicates a resource doesn't exist
   * (e.g. test-mode customer/payment method accessed with live key)
   */
  private isStaleResourceError(error: any): boolean {
    const msg = error?.message || '';
    return (
      error?.code === 'resource_missing' ||
      msg.includes('No such customer') ||
      msg.includes('No such payment method') ||
      msg.includes('No such SetupIntent')
    );
  }

  /**
   * Clear a stale customer and all associated payment methods from the database
   */
  private async clearStaleCustomerData(userId: string): Promise<void> {
    await prisma.paymentMethod.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: null },
    });
  }

  /**
   * Create or retrieve a Stripe customer for a user
   */
  async getOrCreateCustomer(userId: string, email: string, name: string): Promise<string> {
    // Check if user already has a Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (user?.stripeCustomerId) {
      // Verify the customer still exists in Stripe (handles test→live mode switch)
      try {
        await this.stripe.customers.retrieve(user.stripeCustomerId);
        return user.stripeCustomerId;
      } catch (error: any) {
        if (this.isStaleResourceError(error) || this.isStaleAccountError(error)) {
          // Stale test-mode customer — clear and recreate
          await this.clearStaleCustomerData(userId);
        } else {
          throw error;
        }
      }
    }

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    // Save customer ID to database
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Create a SetupIntent for saving payment methods
   */
  async createSetupIntent(userId: string): Promise<{ clientSecret: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const customerId = await this.getOrCreateCustomer(
      userId,
      user.email,
      `${user.firstName} ${user.lastName}`
    );

    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        userId,
      },
    });

    return {
      clientSecret: setupIntent.client_secret!,
    };
  }

  /**
   * Attach and save a payment method to a customer
   */
  async attachPaymentMethod(
    userId: string,
    paymentMethodId: string,
    isDefault: boolean = false
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('Customer not found');
    }

    // Attach payment method to customer
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Get payment method details
    const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

    // If setting as default, unset other default payment methods
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Save to database
    await prisma.paymentMethod.create({
      data: {
        userId,
        stripePaymentMethodId: paymentMethodId,
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4 || '',
        brand: paymentMethod.card?.brand || null,
        expiryMonth: paymentMethod.card?.exp_month || null,
        expiryYear: paymentMethod.card?.exp_year || null,
        isDefault,
      },
    });

    // Set as default payment method on Stripe if requested
    if (isDefault) {
      await this.stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }
  }

  /**
   * Get all payment methods for a user
   */
  async getPaymentMethods(userId: string) {
    return prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    // Block deleting last card if user is in an active or pending group
    const cardCount = await prisma.paymentMethod.count({ where: { userId } });
    if (cardCount === 1) {
      const activeGroupMembership = await prisma.membership.findFirst({
        where: {
          userId,
          isActive: true,
          group: { status: { in: ['PENDING', 'ACTIVE'] } },
        },
      });

      if (activeGroupMembership) {
        throw new Error(
          'You cannot delete your only payment card while you are in an active or pending group. Please add another card first.'
        );
      }
    }

    // Detach from Stripe (ignore if stale test-mode payment method)
    try {
      await this.stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
    } catch (error: any) {
      if (!this.isStaleResourceError(error)) {
        throw error;
      }
      // Stale payment method (e.g. test-mode) — just remove from DB
    }

    // Delete from database
    await prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('Customer not found');
    }

    // Unset other default payment methods
    await prisma.paymentMethod.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set as default in database
    await prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });

    // Set as default in Stripe (ignore if stale test-mode customer)
    try {
      await this.stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.stripePaymentMethodId,
        },
      });
    } catch (error: any) {
      if (!this.isStaleResourceError(error)) {
        throw error;
      }
      // Stale customer — DB default is still set, will sync on next customer creation
    }
  }

  /**
   * Get Stripe publishable key
   */
  getPublishableKey(): string {
    return process.env.STRIPE_PUBLISHABLE_KEY || '';
  }

  /**
   * Create a test charge using saved payment method
   */
  async createTestCharge(userId: string, amount: number, description: string = 'Test charge') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('Customer not found');
    }

    // Get default payment method or first available
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    if (!paymentMethod) {
      throw new Error('No payment method found');
    }

    // Create a PaymentIntent (this is how you charge a saved payment method)
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: user.stripeCustomerId,
      payment_method: paymentMethod.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      description,
    });

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      status: paymentIntent.status,
      currency: paymentIntent.currency,
      description: paymentIntent.description,
      created: paymentIntent.created,
    };
  }
  /**
   * Check if a Stripe error indicates the Connect account is inaccessible
   * (e.g. test-mode account accessed with live key, or revoked access)
   */
  private isStaleAccountError(error: any): boolean {
    const msg = error?.message || '';
    return (
      error?.type === 'StripePermissionError' ||
      msg.includes('does not have access to account') ||
      msg.includes('that account does not exist')
    );
  }

  /**
   * Clear a stale Connect account reference from the database
   */
  private async clearStaleConnectAccount(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeConnectAccountId: null,
        stripeConnectOnboarded: false,
      },
    });
  }

  /**
   * Create a Stripe Connect Custom account and add a bank account
   */
  async setupConnectAccount(
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
    bankDetails: {
      routingNumber: string;
      accountNumber: string;
      accountHolderName?: string;
    },
    ipAddress: string,
    identityDetails?: {
      dobDay: number;
      dobMonth: number;
      dobYear: number;
      addressLine1: string;
      addressCity: string;
      addressState: string;
      addressPostalCode: string;
      ssnLast4: string;
    }
  ): Promise<{ accountId: string; bankLast4: string; transfersStatus: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true },
    });

    let accountId = user?.stripeConnectAccountId;

    if (accountId) {
      // Verify the existing account is still accessible
      try {
        await this.stripe.accounts.retrieve(accountId);

        // Update existing account with identity details if provided
        if (identityDetails) {
          await this.stripe.accounts.update(accountId, {
            individual: {
              first_name: firstName,
              last_name: lastName,
              email,
              dob: {
                day: identityDetails.dobDay,
                month: identityDetails.dobMonth,
                year: identityDetails.dobYear,
              },
              address: {
                line1: identityDetails.addressLine1,
                city: identityDetails.addressCity,
                state: identityDetails.addressState,
                postal_code: identityDetails.addressPostalCode,
                country: 'US',
              },
              ssn_last_4: identityDetails.ssnLast4,
            },
          });
        }
      } catch (error: any) {
        if (this.isStaleAccountError(error)) {
          // Stale account (e.g. test-mode account on live key) — clear and recreate
          await this.clearStaleConnectAccount(userId);
          accountId = null;
        } else {
          throw error;
        }
      }
    }

    if (!accountId) {
      const individualData: Stripe.AccountCreateParams['individual'] = {
        first_name: firstName,
        last_name: lastName,
        email,
      };

      if (identityDetails) {
        individualData.dob = {
          day: identityDetails.dobDay,
          month: identityDetails.dobMonth,
          year: identityDetails.dobYear,
        };
        individualData.address = {
          line1: identityDetails.addressLine1,
          city: identityDetails.addressCity,
          state: identityDetails.addressState,
          postal_code: identityDetails.addressPostalCode,
          country: 'US',
        };
        individualData.ssn_last_4 = identityDetails.ssnLast4;
      }

      const account = await this.stripe.accounts.create({
        type: 'custom',
        country: 'US',
        email,
        business_type: 'individual',
        business_profile: {
          url: process.env.FRONTEND_URL || 'https://save-pal-frontend.vercel.app',
          mcc: '6012',
        },
        individual: individualData,
        capabilities: {
          transfers: { requested: true },
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: ipAddress,
        },
        metadata: { userId },
      });

      accountId = account.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    // Add bank account as external account
    const bankAccount = await this.stripe.accounts.createExternalAccount(accountId, {
      external_account: {
        object: 'bank_account',
        country: 'US',
        currency: 'usd',
        routing_number: bankDetails.routingNumber,
        account_number: bankDetails.accountNumber,
        account_holder_name: bankDetails.accountHolderName || `${firstName} ${lastName}`,
        account_holder_type: 'individual',
      },
    });

    // Check transfers capability status before marking onboarded
    const acct = await this.stripe.accounts.retrieve(accountId);
    const transfersStatus = acct.capabilities?.transfers || 'inactive';
    const isOnboarded = transfersStatus === 'active';

    await prisma.user.update({
      where: { id: userId },
      data: { stripeConnectOnboarded: isOnboarded },
    });

    const last4 = (bankAccount as any).last4 || bankDetails.accountNumber.slice(-4);

    return { accountId, bankLast4: last4, transfersStatus };
  }

  /**
   * Update identity details on an existing Connect account (no bank changes)
   */
  async updateConnectIdentity(
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
    identityDetails: {
      dobDay: number;
      dobMonth: number;
      dobYear: number;
      addressLine1: string;
      addressCity: string;
      addressState: string;
      addressPostalCode: string;
      ssnLast4: string;
    }
  ): Promise<{ transfersStatus: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      throw new Error('No Connect account found. Please set up your bank account first.');
    }

    await this.stripe.accounts.update(user.stripeConnectAccountId, {
      individual: {
        first_name: firstName,
        last_name: lastName,
        email,
        dob: {
          day: identityDetails.dobDay,
          month: identityDetails.dobMonth,
          year: identityDetails.dobYear,
        },
        address: {
          line1: identityDetails.addressLine1,
          city: identityDetails.addressCity,
          state: identityDetails.addressState,
          postal_code: identityDetails.addressPostalCode,
          country: 'US',
        },
        ssn_last_4: identityDetails.ssnLast4,
      },
    });

    const account = await this.stripe.accounts.retrieve(user.stripeConnectAccountId);
    const transfersStatus = account.capabilities?.transfers || 'inactive';
    const isOnboarded = transfersStatus === 'active';

    await prisma.user.update({
      where: { id: userId },
      data: { stripeConnectOnboarded: isOnboarded },
    });

    return { transfersStatus };
  }

  /**
   * Get Connect account status for a user, including bank info and transfers capability
   */
  async getConnectAccountStatus(userId: string): Promise<{
    hasAccount: boolean;
    isOnboarded: boolean;
    accountId: string | null;
    bankLast4: string | null;
    bankName: string | null;
    transfersStatus: string | null;
    requiresVerification: boolean;
    currentlyDue: string[];
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true, stripeConnectOnboarded: true },
    });

    if (!user?.stripeConnectAccountId) {
      return {
        hasAccount: false,
        isOnboarded: false,
        accountId: null,
        bankLast4: null,
        bankName: null,
        transfersStatus: null,
        requiresVerification: false,
        currentlyDue: [],
      };
    }

    let bankLast4: string | null = null;
    let bankName: string | null = null;
    let transfersStatus: string | null = null;
    let currentlyDue: string[] = [];

    try {
      const account = await this.stripe.accounts.retrieve(user.stripeConnectAccountId);
      transfersStatus = account.capabilities?.transfers || 'inactive';
      currentlyDue = (account.requirements?.currently_due as string[]) || [];

      // Sync onboarded flag with actual Stripe state
      const shouldBeOnboarded = transfersStatus === 'active';
      if (user.stripeConnectOnboarded !== shouldBeOnboarded) {
        await prisma.user.update({
          where: { id: userId },
          data: { stripeConnectOnboarded: shouldBeOnboarded },
        });
      }

      const accounts = await this.stripe.accounts.listExternalAccounts(
        user.stripeConnectAccountId,
        { object: 'bank_account', limit: 1 }
      );
      if (accounts.data.length > 0) {
        const bank = accounts.data[0] as Stripe.BankAccount;
        bankLast4 = bank.last4 || null;
        bankName = bank.bank_name || null;
      }
    } catch (error: any) {
      if (this.isStaleAccountError(error)) {
        await this.clearStaleConnectAccount(userId);
        return {
          hasAccount: false,
          isOnboarded: false,
          accountId: null,
          bankLast4: null,
          bankName: null,
          transfersStatus: null,
          requiresVerification: false,
          currentlyDue: [],
        };
      }
      // Ignore other errors fetching bank details
    }

    const requiresVerification = transfersStatus !== null && transfersStatus !== 'active' && currentlyDue.length > 0;

    return {
      hasAccount: true,
      isOnboarded: transfersStatus === 'active',
      accountId: user.stripeConnectAccountId,
      bankLast4,
      bankName,
      transfersStatus,
      requiresVerification,
      currentlyDue,
    };
  }

  /**
   * Remove bank account from Connect account
   */
  async removeConnectBankAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      throw new Error('No payout account found');
    }

    try {
      const accounts = await this.stripe.accounts.listExternalAccounts(
        user.stripeConnectAccountId,
        { object: 'bank_account' }
      );

      for (const ea of accounts.data) {
        await this.stripe.accounts.deleteExternalAccount(user.stripeConnectAccountId, ea.id);
      }

      await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectOnboarded: false },
      });
    } catch (error: any) {
      if (this.isStaleAccountError(error)) {
        // Stale account — clear entirely so user can set up fresh
        await this.clearStaleConnectAccount(userId);
      } else {
        throw error;
      }
    }
  }

  /**
   * Create a transfer to a Connect account for a payout
   */
  async createTransfer(
    payoutId: string,
    connectAccountId: string,
    amount: number,
    metadata: Record<string, string> = {}
  ): Promise<string> {
    const transfer = await this.stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      destination: connectAccountId,
      metadata: {
        payoutId,
        type: 'rosca_payout',
        ...metadata,
      },
    });

    return transfer.id;
  }

  /**
   * Get the platform's available USD balance from Stripe
   */
  async getAvailableBalance(): Promise<number> {
    const balance = await this.stripe.balance.retrieve();
    const usdAvailable = balance.available.find(b => b.currency === 'usd');
    return (usdAvailable?.amount || 0) / 100; // Convert from cents
  }

  /**
   * Check if the platform has enough available balance for a transfer
   */
  async hasEnoughBalance(amount: number): Promise<{ sufficient: boolean; available: number; required: number }> {
    const available = await this.getAvailableBalance();
    return {
      sufficient: available >= amount,
      available,
      required: amount,
    };
  }

  /**
   * Check if a Connect account's transfers capability is active
   */
  async isTransferCapabilityActive(connectAccountId: string): Promise<boolean> {
    const account = await this.stripe.accounts.retrieve(connectAccountId);
    return account.capabilities?.transfers === 'active';
  }

  /**
   * Charge a user's saved payment method for a ROSCA contribution
   */
  async chargePayment(
    userId: string,
    amount: number,
    paymentId: string,
    paymentMethodId?: string
  ): Promise<{
    paymentIntentId: string;
    chargeId: string | null;
    status: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('No Stripe customer found. Please add a payment method first.');
    }

    // Get specific or default payment method
    let paymentMethod;
    if (paymentMethodId) {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId },
      });
    } else {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    }

    if (!paymentMethod) {
      throw new Error('No payment method found. Please add a payment method first.');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: user.stripeCustomerId,
      payment_method: paymentMethod.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      description: `SavePal contribution - Payment ${paymentId}`,
      metadata: {
        paymentId,
        userId,
        type: 'rosca_contribution',
      },
    });

    return {
      paymentIntentId: paymentIntent.id,
      chargeId: paymentIntent.latest_charge as string | null,
      status: paymentIntent.status,
    };
  }
}

export default new StripeService();
