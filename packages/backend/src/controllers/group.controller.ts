import { Request, Response } from 'express';
import groupService from '../services/group.service.js';
import { Frequency, PayoutMethod } from '@prisma/client';

class GroupController {
  /**
   * POST /api/groups
   * Create a new savings group
   */
  async createGroup(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const {
        name,
        description,
        contributionAmount,
        frequency,
        payoutMethod,
        maxMembers,
        startDate,
      } = req.body;

      // Validation
      if (!name || !contributionAmount || !frequency || !payoutMethod || !maxMembers) {
        return res.status(400).json({
          success: false,
          error: 'Name, contribution amount, frequency, payout method, and max members are required',
        });
      }

      // Validate contribution amount
      if (contributionAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Contribution amount must be greater than 0',
        });
      }

      // Validate max members
      if (maxMembers < 2 || maxMembers > 50) {
        return res.status(400).json({
          success: false,
          error: 'Max members must be between 2 and 50',
        });
      }

      // Validate frequency
      if (!['WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(frequency)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid frequency. Must be WEEKLY, BIWEEKLY, or MONTHLY',
        });
      }

      // Validate payout method
      if (!['SEQUENTIAL', 'RANDOM', 'BIDDING'].includes(payoutMethod)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payout method. Must be SEQUENTIAL, RANDOM, or BIDDING',
        });
      }

      const group = await groupService.createGroup({
        name,
        description,
        contributionAmount: parseFloat(contributionAmount),
        frequency: frequency as Frequency,
        payoutMethod: payoutMethod as PayoutMethod,
        maxMembers: parseInt(maxMembers),
        startDate: startDate ? new Date(startDate) : undefined,
        createdById: userId,
      });

      return res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: group,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create group';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/groups/join
   * Join a group using invite code
   */
  async joinGroup(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { inviteCode, autoPaymentConsent } = req.body;

      if (!inviteCode) {
        return res.status(400).json({
          success: false,
          error: 'Invite code is required',
        });
      }

      const membership = await groupService.joinGroup({
        inviteCode,
        userId,
        autoPaymentConsent: autoPaymentConsent === true,
      });

      return res.status(200).json({
        success: true,
        message: 'Successfully joined group',
        data: membership,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join group';

      if (errorMessage.includes('Invalid') || errorMessage.includes('full') || errorMessage.includes('already') || errorMessage.includes('payment method') || errorMessage.includes('consent')) {
        return res.status(400).json({
          success: false,
          error: errorMessage,
        });
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/groups
   * Get all groups for the authenticated user
   */
  async getUserGroups(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      const groups = await groupService.getUserGroups(userId);

      return res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch groups';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/groups/:id
   * Get group details by ID
   */
  async getGroupById(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const group = await groupService.getGroupById(id, userId);

      return res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch group';

      if (errorMessage.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: errorMessage,
        });
      }

      if (errorMessage.includes('not a member')) {
        return res.status(403).json({
          success: false,
          error: errorMessage,
        });
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * PUT /api/groups/:id
   * Update group details (owner only)
   */
  async updateGroup(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const updateData = req.body;

      const group = await groupService.updateGroup(id, userId, updateData);

      return res.status(200).json({
        success: true,
        message: 'Group updated successfully',
        data: group,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update group';

      if (errorMessage.includes('owner')) {
        return res.status(403).json({
          success: false,
          error: errorMessage,
        });
      }

      if (errorMessage.includes('started')) {
        return res.status(400).json({
          success: false,
          error: errorMessage,
        });
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/groups/:id/start
   * Start a group (owner only, group must be full)
   */
  async startGroup(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const group = await groupService.startGroup(id, userId);

      return res.status(200).json({
        success: true,
        message: 'Group started successfully',
        data: group,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start group';

      if (errorMessage.includes('owner')) {
        return res.status(403).json({
          success: false,
          error: errorMessage,
        });
      }

      if (errorMessage.includes('started') || errorMessage.includes('needs') || errorMessage.includes('Cannot start group')) {
        return res.status(400).json({
          success: false,
          error: errorMessage,
        });
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/groups/:id/readiness
   * Check if all members have payment methods
   */
  async checkReadiness(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const readiness = await groupService.checkGroupReadiness(id, userId);

      return res.status(200).json({
        success: true,
        data: readiness,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check group readiness';

      if (errorMessage.includes('not found')) {
        return res.status(404).json({ success: false, error: errorMessage });
      }

      if (errorMessage.includes('not a member')) {
        return res.status(403).json({ success: false, error: errorMessage });
      }

      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * DELETE /api/groups/:id
   * Delete/cancel a group (owner only, before it starts)
   */
  async deleteGroup(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const group = await groupService.deleteGroup(id, userId);

      return res.status(200).json({
        success: true,
        message: 'Group cancelled successfully',
        data: group,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete group';

      if (errorMessage.includes('owner')) {
        return res.status(403).json({
          success: false,
          error: errorMessage,
        });
      }

      if (errorMessage.includes('started')) {
        return res.status(400).json({
          success: false,
          error: errorMessage,
        });
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }
}

export default new GroupController();
