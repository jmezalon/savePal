import { Request, Response } from 'express';
import authService from '../services/auth.service.js';

class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, phoneNumber } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, first name, and last name are required',
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }

      // Password validation (min 8 characters)
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long',
        });
      }

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
      });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';

      if (errorMessage.includes('already exists')) {
        return res.status(409).json({
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
   * POST /api/auth/login
   * Login user
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
      }

      const result = await authService.login({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';

      if (errorMessage.includes('Invalid')) {
        return res.status(401).json({
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
   * POST /api/auth/google
   * Authenticate with Google
   */
  async googleAuth(req: Request, res: Response) {
    try {
      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({
          success: false,
          error: 'Google credential is required',
        });
      }

      const result = await authService.googleAuth(credential);

      return res.status(200).json({
        success: true,
        message: 'Google authentication successful',
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google authentication failed';

      if (errorMessage.includes('Invalid') || errorMessage.includes('not configured')) {
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
   * POST /api/auth/apple
   * Authenticate with Apple
   */
  async appleAuth(req: Request, res: Response) {
    try {
      const { identityToken, fullName } = req.body;

      if (!identityToken) {
        return res.status(400).json({
          success: false,
          error: 'Apple identity token is required',
        });
      }

      const result = await authService.appleAuth(identityToken, fullName);

      return res.status(200).json({
        success: true,
        message: 'Apple authentication successful',
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Apple authentication failed';

      if (errorMessage.includes('Invalid') || errorMessage.includes('Unable')) {
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
   * GET /api/auth/me
   * Get current user profile
   */
  async getMe(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const profile = await authService.getUserProfile(userId);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';

      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user (client-side token removal, here for consistency)
   */
  async logout(_req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      message: 'Logout successful. Please remove the token from client.',
    });
  }

  /**
   * PATCH /api/auth/profile
   * Update user profile
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { firstName, lastName, phoneNumber } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const user = await authService.updateProfile(userId, {
        firstName,
        lastName,
        phoneNumber,
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * PATCH /api/auth/notifications
   * Update notification preferences
   */
  async updateNotificationPreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { emailNotifications, smsNotifications, pushNotifications } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const user = await authService.updateNotificationPreferences(userId, {
        emailNotifications,
        smsNotifications,
        pushNotifications,
      });

      return res.status(200).json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: user,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/auth/change-password
   * Change user password
   */
  async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters long',
        });
      }

      await authService.changePassword(userId, currentPassword, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      const statusCode = errorMessage.includes('incorrect') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      await authService.requestPasswordReset(email);

      // Always return success to avoid revealing if email exists
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token and new password are required',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long',
        });
      }

      await authService.resetPassword(token, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/auth/verify-email/:token
   * Verify email with token
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required',
        });
      }

      await authService.verifyEmail(token);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify email';
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/auth/resend-verification
   * Resend verification email
   */
  async resendVerification(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      await authService.resendVerificationEmail(email);

      return res.status(200).json({
        success: true,
        message: 'Verification email sent',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email';
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/auth/send-phone-verification
   * Send phone verification code
   */
  async sendPhoneVerification(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      await authService.sendPhoneVerification(userId);

      return res.status(200).json({
        success: true,
        message: 'Verification code sent to your phone',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code';
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * DELETE /api/auth/delete-account
   * Delete user account
   */
  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      await authService.deleteAccount(userId);

      return res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      const statusCode = errorMessage.includes('active groups') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/auth/verify-phone
   * Verify phone with code
   */
  async verifyPhone(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Verification code is required',
        });
      }

      await authService.verifyPhone(userId, code);

      return res.status(200).json({
        success: true,
        message: 'Phone verified successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify phone';
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }
}

export default new AuthController();
