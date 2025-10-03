import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/forgot-password', authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.get('/verify-email/:token', authController.verifyEmail.bind(authController));
router.post('/resend-verification', authController.resendVerification.bind(authController));

// Protected routes
router.get('/me', authenticate, authController.getMe.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.patch('/profile', authenticate, authController.updateProfile.bind(authController));
router.patch('/notifications', authenticate, authController.updateNotificationPreferences.bind(authController));
router.post('/change-password', authenticate, authController.changePassword.bind(authController));

export default router;
