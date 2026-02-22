import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import paymentService from './payment.service.js';
import payoutService from './payout.service.js';
import notificationService from './notification.service.js';
import emailService from './email.service.js';

class SchedulerService {
  init() {
    // Daily at 8 AM: auto-charge due-date payments
    cron.schedule('0 8 * * *', () => {
      this.processDueDateAutoPayments().catch(console.error);
    });

    // Every hour: auto-charge overdue payments
    cron.schedule('0 * * * *', () => {
      this.processOverduePayments().catch(console.error);
    });

    // Daily at 9 AM: send payment due reminders (24h before due)
    cron.schedule('0 9 * * *', () => {
      this.sendPaymentReminders().catch(console.error);
    });

    // Daily at 9 AM: send 48-hour payment reminders (2 days before due)
    cron.schedule('0 9 * * *', () => {
      this.send48HourPaymentReminders().catch(console.error);
    });

    // Every 30 minutes: retry pending payouts
    cron.schedule('*/30 * * * *', () => {
      this.processPendingPayouts().catch(console.error);
    });

    console.log('Scheduler initialized: due-date auto-charge (daily 8AM), overdue payments (hourly), reminders (daily 9AM), 48h reminders (daily 9AM), payouts (30min)');
  }

  async processDueDateAutoPayments() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const duePayments = await prisma.payment.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        retryCount: { lt: 3 },
        cycle: {
          dueDate: { gte: startOfDay, lt: endOfDay },
          isCompleted: false,
          group: { status: 'ACTIVE' },
        },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, stripeCustomerId: true } },
        cycle: { include: { group: true } },
      },
    });

    console.log(`[Scheduler] Processing ${duePayments.length} due-date auto-payments`);

    for (const payment of duePayments) {
      if (!payment.user.stripeCustomerId) {
        console.log(`[Scheduler] Skipping payment ${payment.id}: user has no Stripe customer`);
        continue;
      }

      // Check if user has consented to auto-payments for this group
      const membership = await prisma.membership.findFirst({
        where: {
          groupId: payment.cycle.groupId,
          userId: payment.userId,
          isActive: true,
          autoPaymentConsented: true,
        },
      });

      if (!membership) {
        console.log(`[Scheduler] Skipping payment ${payment.id}: user has not consented to auto-payments`);
        continue;
      }

      try {
        await paymentService.chargeAndProcessPayment(payment.id, payment.userId);
        console.log(`[Scheduler] Auto-charged due-date payment ${payment.id} successfully`);

        await notificationService.sendAutoPaymentProcessedNotification(
          payment.userId,
          payment.cycle.group.id,
          payment.cycle.group.name,
          payment.amount
        );

        const prefs = await notificationService.getUserPreferences(payment.userId);
        if (prefs.emailNotifications) {
          try {
            await emailService.sendAutoPaymentProcessedEmail(
              payment.user.email,
              payment.user.firstName,
              payment.cycle.group.name,
              payment.amount
            );
          } catch (emailErr) {
            console.error(`[Scheduler] Failed to send auto-payment processed email for payment ${payment.id}:`, emailErr);
          }
        }
      } catch (error: any) {
        console.error(`[Scheduler] Failed to auto-charge due-date payment ${payment.id}:`, error.message);
      }
    }
  }

  async processOverduePayments() {
    const now = new Date();

    const overduePayments = await prisma.payment.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        retryCount: { lt: 3 },
        cycle: {
          dueDate: { lt: now },
          isCompleted: false,
          group: { status: 'ACTIVE' },
        },
      },
      include: {
        user: { select: { id: true, stripeCustomerId: true } },
        cycle: { include: { group: true } },
      },
    });

    console.log(`[Scheduler] Processing ${overduePayments.length} overdue payments`);

    for (const payment of overduePayments) {
      if (!payment.user.stripeCustomerId) {
        console.log(`[Scheduler] Skipping payment ${payment.id}: user has no Stripe customer`);
        continue;
      }

      try {
        await paymentService.chargeAndProcessPayment(payment.id, payment.userId);
        console.log(`[Scheduler] Auto-charged payment ${payment.id} successfully`);
      } catch (error: any) {
        console.error(`[Scheduler] Failed to auto-charge payment ${payment.id}:`, error.message);
      }
    }
  }

  async sendPaymentReminders() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        cycle: {
          dueDate: { gte: now, lte: tomorrow },
          isCompleted: false,
          group: { status: 'ACTIVE' },
        },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
        cycle: { include: { group: true } },
      },
    });

    for (const payment of upcomingPayments) {
      // Check if user has consented to auto-payments for this group
      const membership = await prisma.membership.findFirst({
        where: {
          groupId: payment.cycle.groupId,
          userId: payment.userId,
          isActive: true,
          autoPaymentConsented: true,
        },
      });

      if (membership) {
        await notificationService.sendAutoPaymentScheduledNotification(
          payment.userId,
          payment.cycle.group.id,
          payment.cycle.group.name,
          payment.amount,
          payment.cycle.dueDate
        );

        const prefs = await notificationService.getUserPreferences(payment.userId);
        if (prefs.emailNotifications) {
          try {
            await emailService.sendAutoPaymentScheduledEmail(
              payment.user.email,
              payment.user.firstName,
              payment.cycle.group.name,
              payment.amount,
              payment.cycle.dueDate
            );
          } catch (emailErr) {
            console.error(`[Scheduler] Failed to send auto-payment scheduled email for payment ${payment.id}:`, emailErr);
          }
        }
      } else {
        await notificationService.sendPaymentDueNotification(
          payment.userId,
          payment.cycle.group.id,
          payment.cycle.group.name,
          payment.amount,
          payment.cycle.dueDate
        );
      }
    }

    console.log(`[Scheduler] Sent ${upcomingPayments.length} payment due reminders`);
  }

  async send48HourPaymentReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const upcomingPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        cycle: {
          dueDate: { gt: in24h, lte: in48h },
          isCompleted: false,
          group: { status: 'ACTIVE' },
        },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
        cycle: { include: { group: true } },
      },
    });

    let sentCount = 0;

    for (const payment of upcomingPayments) {
      const membership = await prisma.membership.findFirst({
        where: {
          groupId: payment.cycle.groupId,
          userId: payment.userId,
          isActive: true,
          autoPaymentConsented: true,
        },
      });

      if (!membership) continue;

      await notificationService.sendUpcomingPaymentReminderNotification(
        payment.userId,
        payment.cycle.group.id,
        payment.cycle.group.name,
        payment.amount,
        payment.cycle.dueDate
      );

      const prefs = await notificationService.getUserPreferences(payment.userId);
      if (prefs.emailNotifications) {
        try {
          await emailService.sendUpcomingPaymentReminderEmail(
            payment.user.email,
            payment.user.firstName,
            payment.cycle.group.name,
            payment.amount,
            payment.cycle.dueDate
          );
        } catch (emailErr) {
          console.error(`[Scheduler] Failed to send 48h reminder email for payment ${payment.id}:`, emailErr);
        }
      }

      sentCount++;
    }

    console.log(`[Scheduler] Sent ${sentCount} 48-hour payment reminders`);
  }

  private static MAX_RETRIES = 10;

  async processPendingPayouts() {
    const now = new Date();

    const pendingPayouts = await prisma.payout.findMany({
      where: {
        status: 'PENDING',
        cycle: { isCompleted: true },
        retryCount: { lt: SchedulerService.MAX_RETRIES },
      },
      include: {
        cycle: { include: { group: true } },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            stripeConnectAccountId: true,
            stripeConnectOnboarded: true,
          },
        },
      },
    });

    console.log(`[Scheduler] Processing ${pendingPayouts.length} pending payouts`);

    for (const payout of pendingPayouts) {
      // Linear backoff: skip if last retry was less than (retryCount * 30 min) ago
      if (payout.lastRetryAt && payout.retryCount > 0) {
        const cooldownMs = payout.retryCount * 30 * 60 * 1000;
        const elapsed = now.getTime() - new Date(payout.lastRetryAt).getTime();
        if (elapsed < cooldownMs) {
          console.log(`[Scheduler] Skipping payout ${payout.id}: cooling down (retry ${payout.retryCount}, next in ${Math.round((cooldownMs - elapsed) / 60000)}min)`);
          continue;
        }
      }

      if (!payout.recipient.stripeConnectAccountId || !payout.recipient.stripeConnectOnboarded) {
        // Recipient hasn't set up their payout account yet, notify them
        await notificationService.createNotification({
          userId: payout.recipientId,
          groupId: payout.cycle.group.id,
          type: 'CONNECT_ONBOARDING_REQUIRED',
          title: 'Payout Account Required',
          message: `You have a pending payout of $${payout.netAmount.toFixed(2)} from "${payout.cycle.group.name}". Please set up your payout account in Profile Settings to receive funds.`,
        });
        console.log(`[Scheduler] Skipping payout ${payout.id}: recipient not onboarded`);
        continue;
      }

      const wasFirstAttempt = payout.retryCount === 0;

      try {
        await payoutService.processPayout(payout.id);
        console.log(`[Scheduler] Payout ${payout.id} transferred successfully`);
      } catch (error: any) {
        console.error(`[Scheduler] Failed to process payout ${payout.id}:`, error.message);

        // Notify recipient on first failure
        if (wasFirstAttempt) {
          await notificationService.sendPayoutPendingNotification(
            payout.recipientId,
            payout.cycle.group.id,
            payout.cycle.group.name,
            payout.netAmount
          );
        }
      }
    }

    // Mark exhausted payouts (retryCount >= MAX_RETRIES) as FAILED
    const exhaustedPayouts = await prisma.payout.findMany({
      where: {
        status: 'PENDING',
        retryCount: { gte: SchedulerService.MAX_RETRIES },
      },
    });

    for (const payout of exhaustedPayouts) {
      try {
        await payoutService.failPayout(payout.id, 'Maximum retry attempts exceeded. Please contact support or retry manually.');
        console.log(`[Scheduler] Payout ${payout.id} marked as FAILED after ${payout.retryCount} retries`);
      } catch (error: any) {
        console.error(`[Scheduler] Failed to mark payout ${payout.id} as failed:`, error.message);
      }
    }
  }
}

export default new SchedulerService();
