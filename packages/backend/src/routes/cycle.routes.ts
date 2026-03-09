import { Router } from 'express';
import cycleController from '../controllers/cycle.controller.js';
import paymentController from '../controllers/payment.controller.js';
import payoutController from '../controllers/payout.controller.js';
import bidController from '../controllers/bid.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All cycle routes require authentication
router.use(authenticate);

// Get specific cycle by ID
router.get('/:cycleId', cycleController.getCycleById);

// Get user's payments for a cycle (supports multiple contribution periods)
router.get('/:cycleId/my-payments', cycleController.getMyPayments);
// Keep old route as alias for backward compatibility
router.get('/:cycleId/my-payment', cycleController.getMyPayments);

// Get all payments for a cycle
router.get('/:cycleId/payments', paymentController.getPaymentsForCycle);

// Get payout for a cycle
router.get('/:cycleId/payout', payoutController.getPayoutForCycle);

// Complete a cycle
router.post('/:cycleId/complete', cycleController.completeCycle);

// Bid routes
router.post('/:cycleId/bids', bidController.placeBid.bind(bidController));
router.get('/:cycleId/bids', bidController.getBids.bind(bidController));
router.post('/:cycleId/bids/resolve', bidController.resolveBidding.bind(bidController));
router.get('/:cycleId/bids/eligible', bidController.getEligibleBidders.bind(bidController));

export default router;
