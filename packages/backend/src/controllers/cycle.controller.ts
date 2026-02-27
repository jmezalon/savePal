import { Request, Response } from 'express';
import cycleService from '../services/cycle.service.js';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

class CycleController {
  /**
   * Get all cycles for a group
   * GET /api/groups/:groupId/cycles
   */
  async getCyclesForGroup(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.userId;

      const cycles = await cycleService.getCyclesForGroup(groupId, userId);

      res.json({
        success: true,
        data: cycles,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get current active cycle for a group
   * GET /api/groups/:groupId/cycles/current
   */
  async getCurrentCycle(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.userId;

      const cycle = await cycleService.getCurrentCycle(groupId, userId);

      if (!cycle) {
        return res.status(404).json({
          success: false,
          error: 'No active cycle found',
        });
      }

      return res.json({
        success: true,
        data: cycle,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get specific cycle by ID
   * GET /api/cycles/:cycleId
   */
  async getCycleById(req: AuthRequest, res: Response) {
    try {
      const { cycleId } = req.params;
      const userId = req.userId!;

      const cycle = await cycleService.getCycleById(cycleId, userId);

      res.json({
        success: true,
        data: cycle,
      });
    } catch (error: any) {
      res.status(error.message === 'Cycle not found' ? 404 : 400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Complete a cycle (admin/owner only)
   * POST /api/cycles/:cycleId/complete
   */
  async completeCycle(req: AuthRequest, res: Response) {
    try {
      const { cycleId } = req.params;
      const userId = req.userId!;

      const cycle = await cycleService.completeCycle(cycleId, userId);

      res.json({
        success: true,
        message: 'Cycle completed successfully',
        data: cycle,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get user's payments for a specific cycle (multiple contribution periods)
   * GET /api/cycles/:cycleId/my-payments
   */
  async getMyPayments(req: AuthRequest, res: Response) {
    try {
      const { cycleId } = req.params;
      const userId = req.userId!;

      const payments = await cycleService.getUserPaymentsForCycle(cycleId, userId);

      if (!payments || payments.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No payments found',
        });
      }

      return res.json({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new CycleController();
