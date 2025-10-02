import { Router } from 'express';
import payoutController from '../controllers/payout.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All payout routes require authentication
router.use(authenticate);

// Get current user's payouts
router.get('/my-payouts', payoutController.getMyPayouts);
router.get('/my-payouts/pending', payoutController.getMyPendingPayouts);

// Get payout statistics
router.get('/my-stats', payoutController.getMyPayoutStats);

// Get specific payout
router.get('/:payoutId', payoutController.getPayoutById);

// Process payout (admin only - will add admin middleware later)
router.post('/:payoutId/process', payoutController.processPayout);

// Mark payout as failed (admin only - will add admin middleware later)
router.post('/:payoutId/fail', payoutController.failPayout);

export default router;
