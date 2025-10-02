import { Router } from 'express';
import cycleController from '../controllers/cycle.controller.js';
import paymentController from '../controllers/payment.controller.js';
import payoutController from '../controllers/payout.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All cycle routes require authentication
router.use(authenticate);

// Get specific cycle by ID
router.get('/:cycleId', cycleController.getCycleById);

// Get user's payment for a cycle
router.get('/:cycleId/my-payment', cycleController.getMyPayment);

// Get all payments for a cycle
router.get('/:cycleId/payments', paymentController.getPaymentsForCycle);

// Get payout for a cycle
router.get('/:cycleId/payout', payoutController.getPayoutForCycle);

// Complete a cycle
router.post('/:cycleId/complete', cycleController.completeCycle);

export default router;
