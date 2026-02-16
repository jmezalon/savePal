import { Response, Request } from 'express';
import prisma from '../utils/prisma.js';
import stripeService from '../services/stripe.service.js';

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
      const { routingNumber, accountNumber, accountHolderName } = req.body;

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

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
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
        { routingNumber, accountNumber, accountHolderName },
        ipAddress
      );

      res.json({
        success: true,
        message: 'Payout account set up successfully',
        data: {
          accountId: result.accountId,
          bankLast4: result.bankLast4,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
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
      res.status(400).json({
        success: false,
        error: error.message,
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

      res.json({
        success: true,
        message: 'Bank account removed successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new ConnectController();
