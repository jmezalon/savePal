/**
 * One-time reconciliation script for late payments.
 *
 * Finds payments that were part of a shortfall (cycle completed while the
 * payment was FAILED) but have since been paid (status = COMPLETED).
 * This covers both cases:
 *   A) Debt was recorded on membership but never cleared
 *   B) Debt was never recorded (webhook incremented retryCount but
 *      recordOutstandingDebt was never called)
 *
 * For each late payment found:
 *   - If payout is PENDING: adjusts the payout amount so the recipient
 *     gets the full amount when it eventually processes
 *   - If payout is COMPLETED: sends a top-up Stripe transfer to the recipient
 *   - Clears any debt from the member's membership
 *   - Marks the payment with fallbackMethod = 'late_payment'
 *
 * Safe to run multiple times — skips payments already reconciled.
 *
 * Run with: npm run script:reconcile-late-payments
 */

import prisma from '../utils/prisma.js';
import stripeService from '../services/stripe.service.js';
import notificationService from '../services/notification.service.js';

const PLATFORM_FEE_RATE = 0.03;
const PLATFORM_FEE_CAP = 150;

async function reconcileLatePayments() {
  console.log('Starting late payment reconciliation...\n');

  // Find payments that were paid late: they belong to a completed cycle,
  // are COMPLETED now, but were clearly paid after the cycle completed
  // (paidAt > cycle.completedDate), or more reliably: the payout for
  // the cycle has a shortfall (payout.amount < cycle.totalAmount).
  //
  // The simplest approach: find all COMPLETED payments that have
  // retryCount >= 3 (they were once treated as failed/exhausted)
  // and haven't been marked as reconciled yet.
  const latePayments = await prisma.payment.findMany({
    where: {
      status: 'COMPLETED',
      retryCount: { gte: 3 },
      fallbackMethod: null, // not yet reconciled
      cycle: {
        isCompleted: true,
      },
    },
    include: {
      cycle: { include: { group: true } },
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (latePayments.length === 0) {
    console.log('No unreconciled late payments found. Nothing to do.');
    return;
  }

  console.log(`Found ${latePayments.length} late payment(s) to reconcile.\n`);

  let reconciled = 0;
  let skipped = 0;
  let errors = 0;

  for (const payment of latePayments) {
    const payout = await prisma.payout.findUnique({
      where: { cycleId: payment.cycleId },
    });

    if (!payout) {
      console.log(`  [SKIP] No payout found for cycle ${payment.cycleId}`);
      skipped++;
      continue;
    }

    const lateAmount = payment.amount;
    const topUpFee = Math.min(lateAmount * PLATFORM_FEE_RATE, PLATFORM_FEE_CAP);
    const topUpNet = Math.round((lateAmount - topUpFee) * 100) / 100;

    if (topUpNet <= 0) {
      console.log(`  [SKIP] Top-up amount is $0 for payment ${payment.id}`);
      skipped++;
      continue;
    }

    console.log(`  [RECONCILE] Payment ${payment.id}:`);
    console.log(`    Member: ${payment.user.firstName} ${payment.user.lastName} (${payment.userId})`);
    console.log(`    Group: ${payment.cycle.group.name}`);
    console.log(`    Late amount: $${lateAmount.toFixed(2)}`);
    console.log(`    Platform fee: $${topUpFee.toFixed(2)}`);
    console.log(`    Net to recipient: $${topUpNet.toFixed(2)}`);
    console.log(`    Payout status: ${payout.status}`);

    try {
      // Clear debt from membership if it was recorded
      const membership = await prisma.membership.findFirst({
        where: {
          groupId: payment.cycle.groupId,
          userId: payment.userId,
          isActive: true,
        },
      });

      if (membership && membership.debtPaymentIds.includes(payment.id)) {
        const updatedDebtIds = membership.debtPaymentIds.filter(id => id !== payment.id);
        const clearedDebt = Math.min(lateAmount, membership.outstandingDebt);
        const newDebt = Math.max(0, Math.round((membership.outstandingDebt - clearedDebt) * 100) / 100);

        await prisma.membership.update({
          where: { id: membership.id },
          data: {
            outstandingDebt: newDebt,
            debtPaymentIds: updatedDebtIds,
          },
        });
        console.log(`    Cleared $${clearedDebt.toFixed(2)} debt from membership`);
      }

      // Mark payment as reconciled
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          fallbackMethod: 'late_payment',
          fallbackAt: new Date(),
        },
      });

      if (payout.status === 'PENDING' || payout.status === 'PROCESSING') {
        // Payout hasn't been sent yet — adjust the amount so recipient gets the full payout
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            amount: { increment: lateAmount },
            feeAmount: { increment: topUpFee },
            netAmount: { increment: topUpNet },
          },
        });

        console.log(`    Adjusted PENDING payout ${payout.id}: +$${topUpNet.toFixed(2)} net`);

        await notificationService.createNotification({
          userId: payment.userId,
          groupId: payment.cycle.groupId,
          type: 'PAYMENT_RECEIVED',
          title: 'Late Payment Reconciled',
          message: `Your late payment of $${lateAmount.toFixed(2)} for "${payment.cycle.group.name}" has been reconciled and will be included in the payout to the recipient.`,
        });

        console.log(`    DONE\n`);
        reconciled++;
      } else if (payout.status === 'COMPLETED') {
        // Payout already sent — send a separate top-up transfer
        const recipient = await prisma.user.findUnique({
          where: { id: payout.recipientId },
          select: { id: true, stripeConnectAccountId: true, stripeConnectOnboarded: true },
        });

        if (!recipient?.stripeConnectAccountId || !recipient.stripeConnectOnboarded) {
          console.log(`    [WARN] Recipient ${payout.recipientId} not onboarded, cannot send top-up`);
          console.log(`    Payment marked as reconciled but top-up transfer needs manual intervention.\n`);
          reconciled++;
          continue;
        }

        const transferId = await stripeService.createTransfer(
          payout.id,
          recipient.stripeConnectAccountId,
          topUpNet,
          { type: 'late_payment_topup', latePaymentId: payment.id }
        );

        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            amount: { increment: lateAmount },
            feeAmount: { increment: topUpFee },
            netAmount: { increment: topUpNet },
          },
        });

        await notificationService.createNotification({
          userId: payout.recipientId,
          groupId: payment.cycle.groupId,
          type: 'PAYOUT_COMPLETED',
          title: 'Late Payment Top-Up Received',
          message: `A member's late payment of $${lateAmount.toFixed(2)} for "${payment.cycle.group.name}" has been collected. $${topUpNet.toFixed(2)} has been transferred to your account.`,
        });

        await notificationService.createNotification({
          userId: payment.userId,
          groupId: payment.cycle.groupId,
          type: 'PAYMENT_RECEIVED',
          title: 'Late Payment Reconciled',
          message: `Your late payment of $${lateAmount.toFixed(2)} for "${payment.cycle.group.name}" has been reconciled and forwarded to the payout recipient.`,
        });

        console.log(`    Top-up transfer: ${transferId}`);
        console.log(`    DONE\n`);
        reconciled++;
      } else {
        console.log(`    [SKIP] Payout status is ${payout.status}, no action taken\n`);
        skipped++;
      }
    } catch (error: any) {
      console.error(`    ERROR: ${error.message}\n`);
      errors++;
    }
  }

  console.log('---');
  console.log(`Reconciliation complete: ${reconciled} reconciled, ${skipped} skipped, ${errors} errors`);
}

reconcileLatePayments()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
