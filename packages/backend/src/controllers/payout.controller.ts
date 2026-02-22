import { Response, Request } from 'express';
import payoutService from '../services/payout.service.js';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

class PayoutController {
  /**
   * Get payout by ID
   * GET /api/payouts/:payoutId
   */
  async getPayoutById(req: AuthRequest, res: Response) {
    try {
      const { payoutId } = req.params;

      const payout = await payoutService.getPayoutById(payoutId);

      res.json({
        success: true,
        data: payout,
      });
    } catch (error: any) {
      res.status(error.message === 'Payout not found' ? 404 : 400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get all payouts for current user
   * GET /api/payouts/my-payouts
   */
  async getMyPayouts(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const payouts = await payoutService.getUserPayouts(userId);

      res.json({
        success: true,
        data: payouts,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get pending payouts for current user
   * GET /api/payouts/my-payouts/pending
   */
  async getMyPendingPayouts(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const payouts = await payoutService.getPendingPayouts(userId);

      res.json({
        success: true,
        data: payouts,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get payout statistics for current user
   * GET /api/payouts/my-stats
   */
  async getMyPayoutStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const stats = await payoutService.getUserPayoutStats(userId);

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
   * Process a payout (admin only)
   * POST /api/payouts/:payoutId/process
   */
  async processPayout(req: AuthRequest, res: Response) {
    try {
      const { payoutId } = req.params;

      const payout = await payoutService.processPayout(payoutId);

      res.json({
        success: true,
        message: 'Payout processed successfully',
        data: payout,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Mark payout as failed (admin only)
   * POST /api/payouts/:payoutId/fail
   */
  async failPayout(req: AuthRequest, res: Response) {
    try {
      const { payoutId } = req.params;
      const { reason } = req.body;

      const payout = await payoutService.failPayout(payoutId, reason);

      res.json({
        success: true,
        message: 'Payout marked as failed',
        data: payout,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Retry a pending/failed payout (user-triggered)
   * POST /api/payouts/:payoutId/retry
   */
  async retryPayout(req: AuthRequest, res: Response) {
    try {
      const { payoutId } = req.params;
      const userId = req.userId!;

      const payout = await payoutService.getPayoutById(payoutId);

      // Verify payout belongs to requesting user
      if (payout.recipientId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only retry your own payouts',
        });
      }

      if (payout.status === 'COMPLETED') {
        return res.status(400).json({
          success: false,
          error: 'Payout has already been completed',
        });
      }

      if (payout.status === 'PROCESSING') {
        return res.status(400).json({
          success: false,
          error: 'Payout is currently being processed',
        });
      }

      const result = await payoutService.processPayout(payoutId);

      return res.json({
        success: true,
        message: 'Payout processed successfully',
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get payout for a specific cycle
   * GET /api/cycles/:cycleId/payout
   */
  async getPayoutForCycle(req: AuthRequest, res: Response) {
    try {
      const { cycleId } = req.params;

      const payout = await payoutService.getPayoutForCycle(cycleId);

      if (!payout) {
        return res.status(404).json({
          success: false,
          error: 'No payout found for this cycle',
        });
      }

      return res.json({
        success: true,
        data: payout,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get all payouts for a group
   * GET /api/groups/:groupId/payouts
   */
  async getPayoutsForGroup(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;

      const payouts = await payoutService.getPayoutsForGroup(groupId);

      res.json({
        success: true,
        data: payouts,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new PayoutController();
