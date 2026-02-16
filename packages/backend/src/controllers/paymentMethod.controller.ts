import { Request, Response } from 'express';
import stripeService from '../services/stripe.service.js';

class PaymentMethodController {
  /**
   * POST /api/payment-methods/setup-intent
   * Create a SetupIntent for saving payment methods
   */
  async createSetupIntent(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const result = await stripeService.createSetupIntent(userId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create setup intent';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/payment-methods
   * Save a payment method
   */
  async savePaymentMethod(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { paymentMethodId, isDefault } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (!paymentMethodId) {
        return res.status(400).json({
          success: false,
          error: 'Payment method ID is required',
        });
      }

      await stripeService.attachPaymentMethod(userId, paymentMethodId, isDefault || false);

      return res.status(201).json({
        success: true,
        message: 'Payment method saved successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save payment method';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/payment-methods
   * Get all payment methods for the authenticated user
   */
  async getPaymentMethods(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const paymentMethods = await stripeService.getPaymentMethods(userId);

      return res.status(200).json({
        success: true,
        data: paymentMethods,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch payment methods';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * DELETE /api/payment-methods/:id
   * Delete a payment method
   */
  async deletePaymentMethod(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      await stripeService.deletePaymentMethod(userId, id);

      return res.status(200).json({
        success: true,
        message: 'Payment method deleted successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete payment method';
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * PUT /api/payment-methods/:id/default
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      await stripeService.setDefaultPaymentMethod(userId, id);

      return res.status(200).json({
        success: true,
        message: 'Default payment method updated successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update default payment method';
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/payment-methods/config
   * Get Stripe configuration (publishable key)
   */
  async getConfig(_req: Request, res: Response) {
    try {
      const publishableKey = stripeService.getPublishableKey();

      return res.status(200).json({
        success: true,
        data: {
          publishableKey,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
      });
    }
  }

  /**
   * POST /api/payment-methods/test-charge
   * Create a test charge using saved payment method
   */
  async createTestCharge(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { amount, description } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid amount is required',
        });
      }

      const charge = await stripeService.createTestCharge(
        userId,
        amount,
        description || 'Test charge'
      );

      return res.status(200).json({
        success: true,
        data: charge,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create test charge';
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }
}

export default new PaymentMethodController();
