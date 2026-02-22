import prisma from '../utils/prisma.js';
import { NotificationType } from '@prisma/client';
import emailService from './email.service.js';

interface CreateNotificationData {
  userId: string;
  groupId?: string;
  type: NotificationType;
  title: string;
  message: string;
  checkPreferences?: boolean;
}

class NotificationService {
  /**
   * Check if a user has push (in-app) notifications enabled
   */
  async getUserPreferences(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailNotifications: true, pushNotifications: true },
    });
    return {
      emailNotifications: user?.emailNotifications ?? true,
      pushNotifications: user?.pushNotifications ?? true,
    };
  }

  /**
   * Create a new notification (respects pushNotifications preference by default)
   */
  async createNotification(data: CreateNotificationData) {
    const checkPreferences = data.checkPreferences ?? true;

    if (checkPreferences) {
      const prefs = await this.getUserPreferences(data.userId);
      if (!prefs.pushNotifications) {
        return null;
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        groupId: data.groupId,
        type: data.type,
        title: data.title,
        message: data.message,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return notification;
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string, limit?: number) {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: limit,
    });

    return notifications;
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string) {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    return notifications;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return count;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return updatedNotification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return { success: true };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }

  /**
   * Send payment due notification
   */
  async sendPaymentDueNotification(userId: string, groupId: string, groupName: string, amount: number, dueDate: Date) {
    return this.createNotification({
      userId,
      groupId,
      type: 'PAYMENT_DUE',
      title: 'Payment Due',
      message: `Your payment of $${amount} for "${groupName}" is due on ${dueDate.toLocaleDateString()}.`,
    });
  }

  /**
   * Send payment received notification
   */
  async sendPaymentReceivedNotification(userId: string, groupId: string, groupName: string, amount: number) {
    return this.createNotification({
      userId,
      groupId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `Your payment of $${amount} for "${groupName}" has been received.`,
    });
  }

  /**
   * Send payout pending notification
   */
  async sendPayoutPendingNotification(userId: string, groupId: string, groupName: string, amount: number) {
    return this.createNotification({
      userId,
      groupId,
      type: 'PAYOUT_PENDING',
      title: 'Payout Pending',
      message: `Your payout of $${amount} from "${groupName}" is being processed.`,
    });
  }

  /**
   * Send payout completed notification
   */
  async sendPayoutCompletedNotification(userId: string, groupId: string, groupName: string, amount: number) {
    return this.createNotification({
      userId,
      groupId,
      type: 'PAYOUT_COMPLETED',
      title: 'Payout Completed',
      message: `Your payout of $${amount} from "${groupName}" has been completed.`,
    });
  }

  /**
   * Send group started notification
   */
  async sendGroupStartedNotification(userId: string, groupId: string, groupName: string) {
    return this.createNotification({
      userId,
      groupId,
      type: 'GROUP_STARTED',
      title: 'Group Started',
      message: `The group "${groupName}" has started. Payment cycles are now active.`,
    });
  }

  /**
   * Send group completed notification
   */
  async sendGroupCompletedNotification(userId: string, groupId: string, groupName: string) {
    return this.createNotification({
      userId,
      groupId,
      type: 'GROUP_COMPLETED',
      title: 'Group Completed',
      message: `The group "${groupName}" has completed all payment cycles.`,
    });
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedNotification(userId: string, groupId: string, groupName: string, amount: number) {
    return this.createNotification({
      userId,
      groupId,
      type: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      message: `Your payment of $${amount} for "${groupName}" has failed. Please try again.`,
    });
  }

  /**
   * Send reminder notification
   */
  async sendReminderNotification(userId: string, groupId: string, title: string, message: string) {
    return this.createNotification({
      userId,
      groupId,
      type: 'REMINDER',
      title,
      message,
    });
  }

  /**
   * Send auto-payment scheduled notification (day before due date)
   */
  async sendAutoPaymentScheduledNotification(userId: string, groupId: string, groupName: string, amount: number, dueDate: Date) {
    return this.createNotification({
      userId,
      groupId,
      type: 'AUTO_PAYMENT_SCHEDULED',
      title: 'Auto-Payment Scheduled',
      message: `Your card will be automatically charged $${amount} for "${groupName}" tomorrow (${dueDate.toLocaleDateString()}). Please ensure sufficient funds are available.`,
    });
  }

  /**
   * Send auto-payment processed notification
   */
  async sendAutoPaymentProcessedNotification(userId: string, groupId: string, groupName: string, amount: number) {
    return this.createNotification({
      userId,
      groupId,
      type: 'AUTO_PAYMENT_PROCESSED',
      title: 'Auto-Payment Processed',
      message: `Your automatic payment of $${amount} for "${groupName}" has been successfully processed.`,
    });
  }

  /**
   * Notify the group owner (creator) when a member's payment fails.
   * Sends both an in-app notification and an email (if the owner has email notifications enabled).
   */
  async notifyGroupOwnerOfPaymentFailure(
    groupId: string,
    groupName: string,
    failingUserId: string,
    failingUserName: string,
    amount: number,
    failureReason?: string
  ) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            emailNotifications: true,
          },
        },
      },
    });

    if (!group) return;

    const owner = group.createdBy;

    // Don't notify the owner about their own failed payment
    if (owner.id === failingUserId) return;

    // In-app notification
    const reasonSuffix = failureReason ? ` Reason: ${failureReason}.` : '';
    await this.createNotification({
      userId: owner.id,
      groupId,
      type: 'PAYMENT_FAILED',
      title: 'Member Payment Failed',
      message: `${failingUserName}'s payment of $${amount} for "${groupName}" has failed.${reasonSuffix} Please follow up to reconcile.`,
    });

    // Email notification
    if (owner.emailNotifications) {
      try {
        await emailService.sendPaymentFailedAdminEmail(
          owner.email,
          owner.firstName,
          failingUserName,
          groupName,
          amount,
          failureReason
        );
      } catch (emailErr) {
        console.error(`Failed to send payment failure admin email for group ${groupId}:`, emailErr);
      }
    }
  }
}

export default new NotificationService();
