import { Router } from 'express';
import paymentMethodController from '../controllers/paymentMethod.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All payment method routes require authentication
router.get('/config', paymentMethodController.getConfig.bind(paymentMethodController));
router.post('/setup-intent', authenticate, paymentMethodController.createSetupIntent.bind(paymentMethodController));
router.post('/confirm-setup', authenticate, paymentMethodController.confirmSetup.bind(paymentMethodController));
router.post('/', authenticate, paymentMethodController.savePaymentMethod.bind(paymentMethodController));
router.get('/', authenticate, paymentMethodController.getPaymentMethods.bind(paymentMethodController));
router.delete('/:id', authenticate, paymentMethodController.deletePaymentMethod.bind(paymentMethodController));
router.put('/:id/default', authenticate, paymentMethodController.setDefaultPaymentMethod.bind(paymentMethodController));
router.post('/test-charge', authenticate, paymentMethodController.createTestCharge.bind(paymentMethodController));

export default router;
