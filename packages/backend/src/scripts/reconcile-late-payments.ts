/**
 * One-time reconciliation script for untracked debts and late payments.
 *
 * Handles two scenarios:
 *
 * 1) UNTRACKED DEBTS: Payments that are FAILED with retryCount >= 3 on
 *    completed cycles but were never recorded as debt on the membership
 *    (caused by webhook handler not calling recordOutstandingDebt).
 *    → Records the debt so it will be withheld from the member's future payout
 *      and forwarded to the shortchanged recipient.
 *
 * 2) LATE PAYMENTS: Payments that were FAILED with retryCount >= 3 but have
 *    since been paid (status = COMPLETED).
 *    → Adjusts the payout (if PENDING) or sends a top-up transfer (if COMPLETED).
 *
 * Safe to run multiple times — skips already-reconciled records.
 *
 * Run with: npm run script:reconcile-late-payments
 */

import prisma from '../utils/prisma.js';
import paymentService from '../services/payment.service.js';
import stripeService from '../services/stripe.service.js';
import notificationService from '../services/notification.service.js';

const PLATFORM_FEE_RATE = 0.03;
const PLATFORM_FEE_CAP = 150;

async function reconcileLatePayments() {
  console.log('=== Late Payment & Untracked Debt Reconciliation ===\n');

  // -------------------------------------------------------
  // PHASE 1: Record untracked debts
  // Find FAILED payments (retryCount >= 3) on completed cycles
  // that were never recorded as debt on the membership.
  // -------------------------------------------------------
  console.log('--- Phase 1: Recording untracked debts ---\n');

  const untrackedFailedPayments = await prisma.payment.findMany({
    where: {
      status: 'FAILED',
      retryCount: { gte: 3 },
      fallbackMethod: null,
      cycle: {
        isCompleted: true,
      },
    },
    include: {
      cycle: { include: { group: true } },
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  let debtsRecorded = 0;

  if (untrackedFailedPayments.length === 0) {
    console.log('No untracked failed payments found.\n');
  } else {
    console.log(`Found ${untrackedFailedPayments.length} untracked failed payment(s).\n`);

    for (const payment of untrackedFailedPayments) {
      const membership = await prisma.membership.findFirst({
        where: {
          groupId: payment.cycle.groupId,
          userId: payment.userId,
          isActive: true,
        },
      });

      if (!membership) {
        console.log(`  [SKIP] No active membership for user ${payment.userId} in group ${payment.cycle.groupId}`);
        continue;
      }

      // Check if already tracked
      if (membership.debtPaymentIds.includes(payment.id)) {
        console.log(`  [SKIP] Payment ${payment.id} already in debtPaymentIds`);
        continue;
      }

      console.log(`  [RECORD] Payment ${payment.id}:`);
      console.log(`    Member: ${payment.user.firstName} ${payment.user.lastName} (${payment.userId})`);
      console.log(`    Group: ${payment.cycle.group.name}`);
      console.log(`    Amount: $${payment.amount.toFixed(2)}`);

      try {
        await paymentService.recordOutstandingDebt(
          payment.id,
          payment.userId,
          payment.cycle.groupId
        );
        console.log(`    DONE — debt recorded on membership\n`);
        debtsRecorded++;
      } catch (error: any) {
        console.error(`    ERROR: ${error.message}\n`);
      }
    }
  }

  // -------------------------------------------------------
  // PHASE 2: Reconcile late payments (paid after cycle completed)
  // Find COMPLETED payments with retryCount >= 3 that haven't
  // been reconciled yet.
  // -------------------------------------------------------
  console.log('--- Phase 2: Reconciling late payments ---\n');

  const latePayments = await prisma.payment.findMany({
    where: {
      status: 'COMPLETED',
      retryCount: { gte: 3 },
      fallbackMethod: null,
      cycle: {
        isCompleted: true,
      },
    },
    include: {
      cycle: { include: { group: true } },
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  let reconciled = 0;
  let skipped = 0;
  let errors = 0;

  if (latePayments.length === 0) {
    console.log('No unreconciled late payments found.\n');
  } else {
    console.log(`Found ${latePayments.length} late payment(s) to reconcile.\n`);

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
  }

  console.log('=== Summary ===');
  console.log(`Debts recorded: ${debtsRecorded}`);
  console.log(`Late payments reconciled: ${reconciled}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

reconcileLatePayments()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
