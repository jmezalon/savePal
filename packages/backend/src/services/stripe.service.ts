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
   * Create or retrieve a Stripe customer for a user
   */
  async getOrCreateCustomer(userId: string, email: string, name: string): Promise<string> {
    // Check if user already has a Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (user?.stripeCustomerId) {
      return user.stripeCustomerId;
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

    // Detach from Stripe
    await this.stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

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

    // Set as default in Stripe
    await this.stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.stripePaymentMethodId,
      },
    });
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
    ipAddress: string
  ): Promise<{ accountId: string; bankLast4: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true },
    });

    let accountId = user?.stripeConnectAccountId;

    if (!accountId) {
      const account = await this.stripe.accounts.create({
        type: 'custom',
        country: 'US',
        email,
        business_type: 'individual',
        business_profile: {
          url: process.env.FRONTEND_URL || 'https://save-pal-frontend.vercel.app',
          mcc: '6012',
        },
        individual: {
          first_name: firstName,
          last_name: lastName,
          email,
        },
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
    } else {
      // Remove existing external accounts before adding new one
      const existingAccounts = await this.stripe.accounts.listExternalAccounts(accountId, {
        object: 'bank_account',
      });
      for (const ea of existingAccounts.data) {
        await this.stripe.accounts.deleteExternalAccount(accountId, ea.id);
      }
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

    // Mark as onboarded
    await prisma.user.update({
      where: { id: userId },
      data: { stripeConnectOnboarded: true },
    });

    const last4 = (bankAccount as any).last4 || bankDetails.accountNumber.slice(-4);

    return { accountId, bankLast4: last4 };
  }

  /**
   * Get Connect account status for a user, including bank info
   */
  async getConnectAccountStatus(userId: string): Promise<{
    hasAccount: boolean;
    isOnboarded: boolean;
    accountId: string | null;
    bankLast4: string | null;
    bankName: string | null;
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
      };
    }

    let bankLast4: string | null = null;
    let bankName: string | null = null;

    if (user.stripeConnectOnboarded) {
      try {
        const accounts = await this.stripe.accounts.listExternalAccounts(
          user.stripeConnectAccountId,
          { object: 'bank_account', limit: 1 }
        );
        if (accounts.data.length > 0) {
          const bank = accounts.data[0] as Stripe.BankAccount;
          bankLast4 = bank.last4 || null;
          bankName = bank.bank_name || null;
        }
      } catch {
        // Ignore errors fetching bank details
      }
    }

    return {
      hasAccount: true,
      isOnboarded: user.stripeConnectOnboarded,
      accountId: user.stripeConnectAccountId,
      bankLast4,
      bankName,
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
