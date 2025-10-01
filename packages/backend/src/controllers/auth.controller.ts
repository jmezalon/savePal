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
  async logout(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      message: 'Logout successful. Please remove the token from client.',
    });
  }
}

export default new AuthController();
