/**
 * One-time reconciliation script for late payments.
 *
 * Finds payments that:
 *   1. Are COMPLETED (member eventually paid)
 *   2. Still appear in a membership's debtPaymentIds (debt was never cleared)
 *   3. Belong to a completed cycle with a completed payout
 *
 * For each match it:
 *   - Clears the debt from the member's membership
 *   - Marks the payment with fallbackMethod = 'late_payment'
 *   - Sends a top-up Stripe transfer to the payout recipient
 *   - Updates the payout record to reflect the additional amount
 *   - Notifies both the recipient and the late payer
 *
 * Safe to run multiple times — skips payments already resolved.
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

  // Find all memberships that have outstanding debt payment IDs
  const membershipsWithDebt = await prisma.membership.findMany({
    where: {
      isActive: true,
      NOT: { debtPaymentIds: { equals: [] } },
    },
    include: {
      group: true,
    },
  });

  if (membershipsWithDebt.length === 0) {
    console.log('No memberships with recorded debt found. Nothing to reconcile.');
    return;
  }

  console.log(`Found ${membershipsWithDebt.length} membership(s) with debt records.\n`);

  let reconciled = 0;
  let skipped = 0;
  let errors = 0;

  for (const membership of membershipsWithDebt) {
    for (const debtPaymentId of membership.debtPaymentIds) {
      const payment = await prisma.payment.findUnique({
        where: { id: debtPaymentId },
        include: {
          cycle: { include: { group: true } },
        },
      });

      if (!payment) {
        console.log(`  [SKIP] Payment ${debtPaymentId} not found`);
        skipped++;
        continue;
      }

      // Only reconcile payments that were actually paid (COMPLETED)
      if (payment.status !== 'COMPLETED') {
        console.log(`  [SKIP] Payment ${debtPaymentId} status is ${payment.status}, not COMPLETED`);
        skipped++;
        continue;
      }

      // Only reconcile if already marked as resolved via late_payment
      if (payment.fallbackMethod === 'late_payment') {
        console.log(`  [SKIP] Payment ${debtPaymentId} already reconciled`);
        skipped++;
        continue;
      }

      // Cycle must be completed
      if (!payment.cycle.isCompleted) {
        console.log(`  [SKIP] Payment ${debtPaymentId} cycle not yet completed`);
        skipped++;
        continue;
      }

      // Find the payout for this cycle
      const payout = await prisma.payout.findUnique({
        where: { cycleId: payment.cycleId },
      });

      if (!payout) {
        console.log(`  [SKIP] No payout found for cycle ${payment.cycleId}`);
        skipped++;
        continue;
      }

      if (payout.status !== 'COMPLETED') {
        console.log(`  [SKIP] Payout ${payout.id} status is ${payout.status}, not COMPLETED`);
        skipped++;
        continue;
      }

      // Find the recipient's Connect account
      const recipient = await prisma.user.findUnique({
        where: { id: payout.recipientId },
        select: { id: true, stripeConnectAccountId: true, stripeConnectOnboarded: true },
      });

      if (!recipient?.stripeConnectAccountId || !recipient.stripeConnectOnboarded) {
        console.log(`  [SKIP] Recipient ${payout.recipientId} not onboarded for Connect`);
        skipped++;
        continue;
      }

      // Calculate top-up amount
      const clearedAmount = payment.amount;
      const topUpFee = Math.min(clearedAmount * PLATFORM_FEE_RATE, PLATFORM_FEE_CAP);
      const topUpAmount = Math.round((clearedAmount - topUpFee) * 100) / 100;

      if (topUpAmount <= 0) {
        console.log(`  [SKIP] Top-up amount is $0 for payment ${debtPaymentId}`);
        skipped++;
        continue;
      }

      console.log(`  [RECONCILE] Payment ${debtPaymentId}:`);
      console.log(`    Member: ${payment.userId}`);
      console.log(`    Group: ${payment.cycle.group.name}`);
      console.log(`    Late payment amount: $${clearedAmount.toFixed(2)}`);
      console.log(`    Platform fee: $${topUpFee.toFixed(2)}`);
      console.log(`    Top-up to recipient: $${topUpAmount.toFixed(2)}`);

      try {
        // Send top-up transfer to recipient
        const transferId = await stripeService.createTransfer(
          payout.id,
          recipient.stripeConnectAccountId,
          topUpAmount,
          { type: 'late_payment_topup', latePaymentId: debtPaymentId }
        );

        // Clear this payment from the member's debt
        // Re-fetch membership to get current state (may have been updated in a previous iteration)
        const currentMembership = await prisma.membership.findUnique({
          where: { id: membership.id },
        });

        if (currentMembership) {
          const updatedDebtIds = currentMembership.debtPaymentIds.filter(id => id !== debtPaymentId);
          const newDebt = Math.max(0, Math.round((currentMembership.outstandingDebt - clearedAmount) * 100) / 100);

          await prisma.membership.update({
            where: { id: membership.id },
            data: {
              outstandingDebt: newDebt,
              debtPaymentIds: updatedDebtIds,
            },
          });
        }

        // Mark the payment as resolved
        await prisma.payment.update({
          where: { id: debtPaymentId },
          data: {
            fallbackMethod: 'late_payment',
            fallbackAt: new Date(),
          },
        });

        // Update payout record
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            amount: { increment: clearedAmount },
            feeAmount: { increment: topUpFee },
            netAmount: { increment: topUpAmount },
          },
        });

        // Notify the recipient
        await notificationService.createNotification({
          userId: payout.recipientId,
          groupId: payment.cycle.groupId,
          type: 'PAYOUT_COMPLETED',
          title: 'Late Payment Top-Up Received',
          message: `A member's late payment of $${clearedAmount.toFixed(2)} for "${payment.cycle.group.name}" has been collected. $${topUpAmount.toFixed(2)} has been transferred to your account.`,
        });

        // Notify the late payer
        await notificationService.createNotification({
          userId: payment.userId,
          groupId: payment.cycle.groupId,
          type: 'PAYMENT_RECEIVED',
          title: 'Late Payment Reconciled',
          message: `Your late payment of $${clearedAmount.toFixed(2)} for "${payment.cycle.group.name}" has been reconciled and forwarded to the payout recipient. Your debt has been cleared.`,
        });

        console.log(`    Transfer: ${transferId}`);
        console.log(`    DONE\n`);
        reconciled++;
      } catch (error: any) {
        console.error(`    ERROR: ${error.message}\n`);
        errors++;
      }
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
