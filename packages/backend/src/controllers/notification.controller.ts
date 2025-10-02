import { Response, Request } from 'express';
import notificationService from '../services/notification.service.js';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

class NotificationController {
  /**
   * Get all notifications for current user
   * GET /api/notifications
   */
  async getMyNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const notifications = await notificationService.getUserNotifications(userId, limit);

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get unread notifications for current user
   * GET /api/notifications/unread
   */
  async getUnreadNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const notifications = await notificationService.getUnreadNotifications(userId);

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread/count
   */
  async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const count = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/notifications/:notificationId/read
   */
  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { notificationId } = req.params;
      const userId = req.userId!;

      const notification = await notificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        data: notification,
      });
    } catch (error: any) {
      res.status(error.message === 'Notification not found' ? 404 : 400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /api/notifications/read-all
   */
  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:notificationId
   */
  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const { notificationId } = req.params;
      const userId = req.userId!;

      await notificationService.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error: any) {
      res.status(error.message === 'Notification not found' ? 404 : 400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new NotificationController();
