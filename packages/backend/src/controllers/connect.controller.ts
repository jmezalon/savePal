import { Response, Request } from 'express';
import Stripe from 'stripe';
import prisma from '../utils/prisma.js';
import stripeService from '../services/stripe.service.js';
import notificationService from '../services/notification.service.js';

function getUserFriendlyError(error: any): string {
  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('routing')) return 'Invalid routing number. Please check and try again.';
    if (msg.includes('account number')) return 'Invalid account number. Please check and try again.';
    if (msg.includes('bank account')) return 'Could not verify bank account details. Please check your information.';
    if (msg.includes('already has')) return 'A bank account is already linked. Please remove the existing one first.';
    return 'There was an issue with your bank details. Please verify your information and try again.';
  }
  if (error instanceof Stripe.errors.StripeAPIError) {
    return 'Our payment processor is temporarily unavailable. Please try again in a few minutes.';
  }
  if (error instanceof Stripe.errors.StripeConnectionError) {
    return 'Unable to connect to our payment processor. Please check your connection and try again.';
  }
  if (error instanceof Stripe.errors.StripeError) {
    return 'Something went wrong processing your request. Please try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

class ConnectController {
  /**
   * Set up payout account with bank details
   * POST /api/connect/setup
   */
  async setup(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const {
        routingNumber,
        accountNumber,
        accountHolderName,
        dobDay,
        dobMonth,
        dobYear,
        addressLine1,
        addressCity,
        addressState,
        addressPostalCode,
        ssnLast4,
      } = req.body;

      if (!routingNumber || !accountNumber) {
        res.status(400).json({
          success: false,
          error: 'Routing number and account number are required',
        });
        return;
      }

      if (!/^\d{9}$/.test(routingNumber)) {
        res.status(400).json({
          success: false,
          error: 'Routing number must be 9 digits',
        });
        return;
      }

      // Build identity details if provided
      let identityDetails: {
        dobDay: number;
        dobMonth: number;
        dobYear: number;
        addressLine1: string;
        addressCity: string;
        addressState: string;
        addressPostalCode: string;
        ssnLast4: string;
      } | undefined;

      if (dobDay && dobMonth && dobYear && addressLine1 && addressCity && addressState && addressPostalCode && ssnLast4) {
        const day = parseInt(dobDay, 10);
        const month = parseInt(dobMonth, 10);
        const year = parseInt(dobYear, 10);

        // Validate DOB is a valid date
        const dob = new Date(year, month - 1, day);
        if (dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) {
          res.status(400).json({ success: false, error: 'Invalid date of birth' });
          return;
        }

        // Validate age >= 18
        const today = new Date();
        let age = today.getFullYear() - year;
        if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) {
          age--;
        }
        if (age < 18) {
          res.status(400).json({ success: false, error: 'You must be at least 18 years old' });
          return;
        }

        // Validate SSN last 4
        if (!/^\d{4}$/.test(ssnLast4)) {
          res.status(400).json({ success: false, error: 'SSN last 4 must be exactly 4 digits' });
          return;
        }

        // Validate postal code
        if (!/^\d{5}(-\d{4})?$/.test(addressPostalCode)) {
          res.status(400).json({ success: false, error: 'Invalid ZIP code format' });
          return;
        }

        // Validate address fields are present
        if (!addressLine1.trim() || !addressCity.trim() || !addressState.trim()) {
          res.status(400).json({ success: false, error: 'Complete address is required' });
          return;
        }

        identityDetails = {
          dobDay: day,
          dobMonth: month,
          dobYear: year,
          addressLine1: addressLine1.trim(),
          addressCity: addressCity.trim(),
          addressState: addressState.trim(),
          addressPostalCode: addressPostalCode.trim(),
          ssnLast4,
        };
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true, phoneNumber: true },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await stripeService.setupConnectAccount(
        userId,
        user.email,
        user.firstName,
        user.lastName,
        user.phoneNumber,
        { routingNumber, accountNumber, accountHolderName },
        ipAddress,
        identityDetails
      );

      // Security notification: bank account added
      notificationService.sendBankAccountNotification(userId, 'added').catch((err) =>
        console.error('Failed to send bank account added notification:', err)
      );

      res.json({
        success: true,
        message: result.transfersStatus === 'active'
          ? 'Payout account set up successfully'
          : 'Payout account created. Identity verification is being processed by Stripe.',
        data: {
          accountId: result.accountId,
          bankLast4: result.bankLast4,
          transfersStatus: result.transfersStatus,
        },
      });
    } catch (error: any) {
      console.error('Connect setup error:', error.message);
      res.status(400).json({
        success: false,
        error: getUserFriendlyError(error),
      });
    }
  }

  /**
   * Get Connect account status
   * GET /api/connect/status
   */
  async getStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const status = await stripeService.getConnectAccountStatus(userId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      console.error('Connect status error:', error.message);
      res.status(400).json({
        success: false,
        error: getUserFriendlyError(error),
      });
    }
  }

  /**
   * Update identity verification details on existing Connect account
   * POST /api/connect/verify-identity
   */
  async verifyIdentity(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const {
        dobDay,
        dobMonth,
        dobYear,
        addressLine1,
        addressCity,
        addressState,
        addressPostalCode,
        ssnLast4,
      } = req.body;

      if (!dobDay || !dobMonth || !dobYear || !addressLine1 || !addressCity || !addressState || !addressPostalCode || !ssnLast4) {
        res.status(400).json({ success: false, error: 'All identity verification fields are required' });
        return;
      }

      const day = parseInt(dobDay, 10);
      const month = parseInt(dobMonth, 10);
      const year = parseInt(dobYear, 10);

      const dob = new Date(year, month - 1, day);
      if (dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) {
        res.status(400).json({ success: false, error: 'Invalid date of birth' });
        return;
      }

      const today = new Date();
      let age = today.getFullYear() - year;
      if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) {
        age--;
      }
      if (age < 18) {
        res.status(400).json({ success: false, error: 'You must be at least 18 years old' });
        return;
      }

      if (!/^\d{4}$/.test(ssnLast4)) {
        res.status(400).json({ success: false, error: 'SSN last 4 must be exactly 4 digits' });
        return;
      }

      if (!/^\d{5}(-\d{4})?$/.test(addressPostalCode)) {
        res.status(400).json({ success: false, error: 'Invalid ZIP code format' });
        return;
      }

      if (!addressLine1.trim() || !addressCity.trim() || !addressState.trim()) {
        res.status(400).json({ success: false, error: 'Complete address is required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true, phoneNumber: true },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const result = await stripeService.updateConnectIdentity(
        userId,
        user.email,
        user.firstName,
        user.lastName,
        user.phoneNumber,
        {
          dobDay: day,
          dobMonth: month,
          dobYear: year,
          addressLine1: addressLine1.trim(),
          addressCity: addressCity.trim(),
          addressState: addressState.trim(),
          addressPostalCode: addressPostalCode.trim(),
          ssnLast4,
        }
      );

      // Security notification: bank verification details updated
      notificationService.sendBankAccountNotification(userId, 'updated').catch((err) =>
        console.error('Failed to send bank account updated notification:', err)
      );

      res.json({
        success: true,
        message: result.transfersStatus === 'active'
          ? 'Identity verified successfully. Payouts are now active.'
          : 'Identity details submitted. Stripe is reviewing your information.',
        data: { transfersStatus: result.transfersStatus },
      });
    } catch (error: any) {
      console.error('Verify identity error:', error.message);
      res.status(400).json({
        success: false,
        error: getUserFriendlyError(error),
      });
    }
  }

  /**
   * Remove bank account
   * DELETE /api/connect/bank-account
   */
  async removeBankAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      await stripeService.removeConnectBankAccount(userId);

      // Security notification: bank account removed
      notificationService.sendBankAccountNotification(userId, 'removed').catch((err) =>
        console.error('Failed to send bank account removed notification:', err)
      );

      res.json({
        success: true,
        message: 'Bank account removed successfully',
      });
    } catch (error: any) {
      console.error('Remove bank account error:', error.message);
      res.status(400).json({
        success: false,
        error: getUserFriendlyError(error),
      });
    }
  }
}

export default new ConnectController();
