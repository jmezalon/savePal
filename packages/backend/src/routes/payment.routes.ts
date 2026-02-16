import { Router } from 'express';
import paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// Get current user's payments
router.get('/my-payments', paymentController.getMyPayments);
router.get('/my-payments/pending', paymentController.getMyPendingPayments);
router.get('/my-payments/overdue', paymentController.getMyOverduePayments);

// Get payment statistics
router.get('/my-stats', paymentController.getMyPaymentStats);

// Get specific payment
router.get('/:paymentId', paymentController.getPaymentById);

// Get charge breakdown (contribution + processing fee)
router.get('/:paymentId/breakdown', paymentController.getChargeBreakdown);

// Process payment
router.post('/:paymentId/process', paymentController.processPayment);

// Mark payment as failed
router.post('/:paymentId/fail', paymentController.failPayment);

export default router;
