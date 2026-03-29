import { Response, Request } from 'express';
import paymentService from '../services/payment.service.js';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

class PaymentController {
  /**
   * Get payment by ID
   * GET /api/payments/:paymentId
   */
  async getPaymentById(req: AuthRequest, res: Response) {
    try {
      const { paymentId } = req.params;

      const payment = await paymentService.getPaymentById(paymentId);

      res.json({
        success: true,
        data: payment,
      });
    } catch (error: any) {
      res.status(error.message === 'Payment not found' ? 404 : 400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get all payments for current user
   * GET /api/payments/my-payments
   */
  async getMyPayments(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const payments = await paymentService.getUserPayments(userId);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get pending payments for current user
   * GET /api/payments/my-payments/pending
   */
  async getMyPendingPayments(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const payments = await paymentService.getPendingPayments(userId);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get overdue payments for current user
   * GET /api/payments/my-payments/overdue
   */
  async getMyOverduePayments(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const payments = await paymentService.getOverduePayments(userId);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get payment statistics for current user
   * GET /api/payments/my-stats
   */
  async getMyPaymentStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const stats = await paymentService.getUserPaymentStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get charge breakdown for a payment (contribution + processing fee)
   * GET /api/payments/:paymentId/breakdown
   */
  async getChargeBreakdown(req: AuthRequest, res: Response) {
    try {
      const { paymentId } = req.params;

      const payment = await paymentService.getPaymentById(paymentId);
      const breakdown = paymentService.getChargeBreakdown(payment.amount);

      res.json({
        success: true,
        data: breakdown,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Process a payment via Stripe
   * POST /api/payments/:paymentId/process
   */
  async processPayment(req: AuthRequest, res: Response) {
    try {
      const { paymentId } = req.params;
      const { paymentMethodId } = req.body;
      const userId = req.userId!;

      const payment = await paymentService.chargeAndProcessPayment(
        paymentId,
        userId,
        paymentMethodId
      );

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: payment,
      });
    } catch (error: any) {
      const statusCode = error.message?.includes('Unauthorized') ? 403 :
                         error.message?.includes('already') ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Mark payment as failed
   * POST /api/payments/:paymentId/fail
   */
  async failPayment(req: AuthRequest, res: Response) {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      const userId = req.userId!;

      const payment = await paymentService.failPayment(paymentId, userId, reason);

      res.json({
        success: true,
        message: 'Payment marked as failed',
        data: payment,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get all payments for a cycle
   * GET /api/cycles/:cycleId/payments
   */
  async getPaymentsForCycle(req: AuthRequest, res: Response) {
    try {
      const { cycleId } = req.params;

      const payments = await paymentService.getPaymentsForCycle(cycleId);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
  /**
   * Get debt info for current user in a group
   * GET /api/payments/debt/:groupId
   */
  async getDebtInfo(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId } = req.params;

      const debtInfo = await paymentService.getDebtInfo(userId, groupId);

      res.json({
        success: true,
        data: debtInfo,
      });
    } catch (error: any) {
      res.status(error.message.includes('No active membership') ? 404 : 400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Pay outstanding debt for a group
   * POST /api/payments/debt/:groupId/pay
   */
  async payDebt(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId } = req.params;
      const { paymentMethodId } = req.body;

      const result = await paymentService.payDebt(userId, groupId, paymentMethodId);

      res.json({
        success: true,
        message: 'Debt paid successfully',
        data: result,
      });
    } catch (error: any) {
      const statusCode = error.message.includes('No outstanding debt') ? 409 :
                         error.message.includes('No active membership') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new PaymentController();
