import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import paymentService from './payment.service.js';
import payoutService from './payout.service.js';
import notificationService from './notification.service.js';

class SchedulerService {
  init() {
    // Every hour: auto-charge overdue payments
    cron.schedule('0 * * * *', () => {
      this.processOverduePayments().catch(console.error);
    });

    // Daily at 9 AM: send payment due reminders (24h before due)
    cron.schedule('0 9 * * *', () => {
      this.sendPaymentReminders().catch(console.error);
    });

    // Every 6 hours: notify recipients of pending payouts
    cron.schedule('0 */6 * * *', () => {
      this.processPendingPayouts().catch(console.error);
    });

    console.log('Scheduler initialized: overdue payments (hourly), reminders (daily 9AM), payouts (6h)');
  }

  async processOverduePayments() {
    const now = new Date();

    const overduePayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
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
        user: { select: { id: true, firstName: true } },
        cycle: { include: { group: true } },
      },
    });

    for (const payment of upcomingPayments) {
      await notificationService.sendPaymentDueNotification(
        payment.userId,
        payment.cycle.group.id,
        payment.cycle.group.name,
        payment.amount,
        payment.cycle.dueDate
      );
    }

    console.log(`[Scheduler] Sent ${upcomingPayments.length} payment due reminders`);
  }

  async processPendingPayouts() {
    const pendingPayouts = await prisma.payout.findMany({
      where: {
        status: 'PENDING',
        cycle: { isCompleted: true },
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

      try {
        await payoutService.processPayout(payout.id);
        console.log(`[Scheduler] Payout ${payout.id} transferred successfully`);
      } catch (error: any) {
        console.error(`[Scheduler] Failed to process payout ${payout.id}:`, error.message);
      }
    }
  }
}

export default new SchedulerService();
