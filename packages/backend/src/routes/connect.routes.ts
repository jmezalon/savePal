import { Router } from 'express';
import connectController from '../controllers/connect.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All connect routes require authentication
router.use(authenticate);

// Set up payout account with bank details
router.post('/setup', connectController.setup);

// Get Connect account status
router.get('/status', connectController.getStatus);

// Remove bank account
router.delete('/bank-account', connectController.removeBankAccount);

export default router;
