import { Request, Response } from 'express';
import bidService from '../services/bid.service.js';

class BidController {
  /**
   * POST /api/cycles/:cycleId/bids
   * Place or update a bid
   */
  async placeBid(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { cycleId } = req.params;
      const { amount } = req.body;

      if (amount === undefined || amount === null) {
        return res.status(400).json({
          success: false,
          error: 'Bid amount is required',
        });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Bid amount must be a positive number',
        });
      }

      const bid = await bidService.placeBid(cycleId, userId, parsedAmount);

      return res.status(200).json({
        success: true,
        message: 'Bid placed successfully',
        data: bid,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to place bid';

      if (errorMessage.includes('not a member') || errorMessage.includes('owner')) {
        return res.status(403).json({ success: false, error: errorMessage });
      }

      if (
        errorMessage.includes('not open') ||
        errorMessage.includes('already received') ||
        errorMessage.includes('not use bidding') ||
        errorMessage.includes('cannot exceed') ||
        errorMessage.includes('greater than 0') ||
        errorMessage.includes('already completed')
      ) {
        return res.status(400).json({ success: false, error: errorMessage });
      }

      if (errorMessage.includes('not found')) {
        return res.status(404).json({ success: false, error: errorMessage });
      }

      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * GET /api/cycles/:cycleId/bids
   * Get all bids for a cycle
   */
  async getBids(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { cycleId } = req.params;

      const bids = await bidService.getBidsForCycle(cycleId, userId);

      return res.status(200).json({
        success: true,
        data: bids,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get bids';

      if (errorMessage.includes('not a member')) {
        return res.status(403).json({ success: false, error: errorMessage });
      }

      if (errorMessage.includes('not found')) {
        return res.status(404).json({ success: false, error: errorMessage });
      }

      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * POST /api/cycles/:cycleId/bids/resolve
   * Resolve bidding - highest bidder wins (owner only)
   */
  async resolveBidding(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { cycleId } = req.params;

      const result = await bidService.resolveBidding(cycleId, userId);

      return res.status(200).json({
        success: true,
        message: 'Bidding resolved successfully',
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve bidding';

      if (errorMessage.includes('owner')) {
        return res.status(403).json({ success: false, error: errorMessage });
      }

      if (errorMessage.includes('not open') || errorMessage.includes('No bids')) {
        return res.status(400).json({ success: false, error: errorMessage });
      }

      if (errorMessage.includes('not found')) {
        return res.status(404).json({ success: false, error: errorMessage });
      }

      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * GET /api/cycles/:cycleId/bids/eligible
   * Get eligible bidders for a cycle
   */
  async getEligibleBidders(req: Request, res: Response) {
    try {
      const { cycleId } = req.params;

      const eligible = await bidService.getEligibleBidders(cycleId);

      return res.status(200).json({
        success: true,
        data: eligible,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get eligible bidders';

      if (errorMessage.includes('not found')) {
        return res.status(404).json({ success: false, error: errorMessage });
      }

      return res.status(500).json({ success: false, error: errorMessage });
    }
  }
}

export default new BidController();
