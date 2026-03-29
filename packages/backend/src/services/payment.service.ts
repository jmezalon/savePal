import prisma from '../utils/prisma.js';
import cycleService from './cycle.service.js';
import stripeService from './stripe.service.js';
import notificationService from './notification.service.js';

const MAX_CARD_RETRIES = 3;
const TRUST_SCORE_PENALTY = -10;
const TRUST_SCORE_REWARD = 5;

interface ProcessPaymentData {
  paymentId: string;
  userId: string;
  transactionReference?: string;
}

class PaymentService {
  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        cycle: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }

  /**
   * Get all payments for a user
   */
  async getUserPayments(userId: string) {
    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        cycle: {
          include: {
            group: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return payments;
  }

  /**
   * Get pending payments for a user
   */
  async getPendingPayments(userId: string) {
    const payments = await prisma.payment.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      include: {
        cycle: {
          include: {
            group: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return payments;
  }

  /**
   * Process a payment (mark as completed)
   * In a real implementation, this would integrate with a payment gateway
   */
  async processPayment(data: ProcessPaymentData) {
    const { paymentId, userId, transactionReference } = data;

    // Get payment details
    const payment = await this.getPaymentById(paymentId);

    // Verify the payment belongs to the user
    if (payment.userId !== userId) {
      throw new Error('Unauthorized: This payment does not belong to you');
    }

    // Idempotent: if already completed, still check cycle completion
    // (a race between sync response and webhook may have skipped it)
    if (payment.status === 'COMPLETED') {
      const isFullyPaid = await cycleService.isCycleFullyPaid(payment.cycleId);
      if (isFullyPaid) {
        const cycle = await prisma.cycle.findUnique({ where: { id: payment.cycleId } });
        if (cycle && !cycle.isCompleted) {
          await cycleService.completeCycle(payment.cycleId);
        }
      }
      return payment;
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        stripePaymentIntentId: transactionReference,
      },
    });

    // Reward trust score for successful payment
    await this.rewardTrustScore(userId);

    // Check if the cycle already completed with this payment as a shortfall.
    // If so, reconcile: clear the debt and forward the late payment to the recipient.
    const cycle = await prisma.cycle.findUnique({
      where: { id: payment.cycleId },
      include: { group: true },
    });

    if (cycle?.isCompleted) {
      await this.reconcileLatePayment(paymentId, userId, cycle);
      return updatedPayment;
    }

    // Check if all payments for the cycle are completed (or resolved via debt)
    const isFullyPaid = await cycleService.isCycleFullyPaid(payment.cycleId);

    // If all payments are complete, complete the cycle
    if (isFullyPaid) {
      await cycleService.completeCycle(payment.cycleId);
    }

    return updatedPayment;
  }

  /**
   * Mark a payment as failed
   */
  async failPayment(paymentId: string, userId: string, reason?: string) {
    // Get payment details
    const payment = await this.getPaymentById(paymentId);

    // Verify the payment belongs to the user or user is admin
    if (payment.userId !== userId) {
      throw new Error('Unauthorized: This payment does not belong to you');
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        failureReason: reason,
      },
    });

    // Notify the group owner about this member's failed payment
    const memberName = `${payment.user.firstName} ${payment.user.lastName}`;
    await notificationService.notifyGroupOwnerOfPaymentFailure(
      payment.cycle.group.id,
      payment.cycle.group.name,
      userId,
      memberName,
      payment.amount,
      reason
    );

    return updatedPayment;
  }

  /**
   * Get payment statistics for a user
   */
  async getUserPaymentStats(userId: string) {
    const payments = await prisma.payment.findMany({
      where: { userId },
    });

    const stats = {
      total: payments.length,
      completed: payments.filter(p => p.status === 'COMPLETED').length,
      pending: payments.filter(p => p.status === 'PENDING').length,
      failed: payments.filter(p => p.status === 'FAILED').length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      paidAmount: payments
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.amount, 0),
    };

    return stats;
  }

  /**
   * Get overdue payments for a user
   */
  async getOverduePayments(userId: string) {
    const now = new Date();

    const payments = await prisma.payment.findMany({
      where: {
        userId,
        status: 'PENDING',
        dueDate: {
          lt: now,
        },
        cycle: {
          isCompleted: false,
        },
      },
      include: {
        cycle: {
          include: {
            group: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return payments;
  }

  /**
   * Get payments for a specific cycle
   */
  async getPaymentsForCycle(cycleId: string) {
    const payments = await prisma.payment.findMany({
      where: { cycleId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return payments;
  }

  /**
   * Calculate the processing fee to cover Stripe's cut (2.9% + $0.30)
   * We pass the fee to the payer so the platform keeps its full 3% payout fee
   */
  calculateProcessingFee(amount: number): number {
    // Stripe charges 2.9% + $0.30 per transaction
    // To net exactly `amount`, we solve: chargeAmount - (chargeAmount * 0.029 + 0.30) = amount
    // chargeAmount * (1 - 0.029) = amount + 0.30
    // chargeAmount = (amount + 0.30) / 0.971
    const chargeAmount = (amount + 0.30) / 0.971;
    const fee = Math.round((chargeAmount - amount) * 100) / 100; // round to cents
    return fee;
  }

  /**
   * Get the charge breakdown for a payment (for frontend display)
   */
  getChargeBreakdown(contributionAmount: number) {
    const processingFee = this.calculateProcessingFee(contributionAmount);
    const total = Math.round((contributionAmount + processingFee) * 100) / 100;
    return { contribution: contributionAmount, processingFee, total };
  }

  /**
   * Charge a user's payment method via Stripe and process the payment
   */
  async chargeAndProcessPayment(
    paymentId: string,
    userId: string,
    paymentMethodId?: string
  ) {
    const payment = await this.getPaymentById(paymentId);

    if (payment.userId !== userId) {
      throw new Error('Unauthorized: This payment does not belong to you');
    }

    if (payment.status === 'COMPLETED') {
      throw new Error('Payment has already been completed');
    }

    if (payment.status === 'PROCESSING') {
      throw new Error('Payment is already being processed');
    }

    // Mark as PROCESSING to prevent double-charges
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PROCESSING' },
    });

    // Add processing fee so Stripe's cut doesn't eat into platform revenue
    const { total: chargeAmount } = this.getChargeBreakdown(payment.amount);

    try {
      const result = await stripeService.chargePayment(
        userId,
        chargeAmount,
        paymentId,
        paymentMethodId
      );

      if (result.status === 'succeeded') {
        // Charge succeeded synchronously - update payment record
        const updatedPayment = await this.processPayment({
          paymentId,
          userId,
          transactionReference: result.paymentIntentId,
        });

        // Send success notification
        await notificationService.sendPaymentReceivedNotification(
          userId,
          payment.cycle.group.id,
          payment.cycle.group.name,
          payment.amount
        );

        return updatedPayment;
      } else {
        // Charge requires additional action (e.g. 3DS) - not supported off-session
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            stripePaymentIntentId: result.paymentIntentId,
            status: 'PENDING',
          },
        });
        throw new Error('Payment requires additional authentication. Please try a different payment method.');
      }
    } catch (error: any) {
      if (error.type === 'StripeCardError') {
        // Card was declined
        const updatedFailedPayment = await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'FAILED',
            failureReason: error.message,
            retryCount: { increment: 1 },
          },
        });

        await notificationService.sendPaymentFailedNotification(
          userId,
          payment.cycle.group.id,
          payment.cycle.group.name,
          payment.amount
        );

        // Notify the group owner about this member's failed payment
        const memberName = `${payment.user.firstName} ${payment.user.lastName}`;
        await notificationService.notifyGroupOwnerOfPaymentFailure(
          payment.cycle.group.id,
          payment.cycle.group.name,
          userId,
          memberName,
          payment.amount,
          error.message
        );

        // After max retries exhausted, record as outstanding debt
        if (updatedFailedPayment.retryCount >= MAX_CARD_RETRIES) {
          await this.recordOutstandingDebt(paymentId, userId, payment.cycle.groupId);
        }

        throw error;
      }

      // For non-Stripe errors (network, etc.), revert to PENDING
      if (!error.message?.includes('requires additional authentication') &&
          !error.message?.includes('already been completed')) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'PENDING' },
        });
      }

      throw error;
    }
  }
  /**
   * Record a failed payment as outstanding debt on the user's membership.
   * Called after card retries are exhausted (retryCount >= MAX_CARD_RETRIES).
   * This allows the cycle to eventually complete via shortfall resolution,
   * with the debt withheld from the user's future payout.
   */
  async recordOutstandingDebt(paymentId: string, userId: string, groupId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { cycle: { include: { group: true } } },
    });

    if (!payment) return;

    // Add debt to the user's membership
    const membership = await prisma.membership.findFirst({
      where: { groupId, userId, isActive: true },
    });

    if (!membership) return;

    // Avoid double-recording: check if this payment is already in debtPaymentIds
    if (membership.debtPaymentIds.includes(paymentId)) return;

    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        outstandingDebt: { increment: payment.amount },
        debtPaymentIds: { push: paymentId },
      },
    });

    // Penalize trust score
    await this.adjustTrustScore(userId, TRUST_SCORE_PENALTY);

    // Notify the user that debt has been recorded
    await notificationService.createNotification({
      userId,
      groupId,
      type: 'DEBT_RECORDED',
      title: 'Payment Recorded as Debt',
      message: `Your payment of $${payment.amount.toFixed(2)} for "${payment.cycle.group.name}" has failed after ${MAX_CARD_RETRIES} attempts. This amount will be deducted from your payout.`,
    });

    console.log(`[Payment] Recorded $${payment.amount} debt for user ${userId} in group ${groupId} (payment ${paymentId})`);
  }

  /**
   * Reconcile a late payment on an already-completed cycle.
   *
   * Handles two scenarios:
   *   A) Debt was recorded on the membership (debtPaymentIds contains this payment)
   *   B) Debt was never recorded (e.g. webhook incremented retryCount but
   *      recordOutstandingDebt was never called before the cycle completed)
   *
   * If the payout is still PENDING, adjusts the payout amount so the recipient
   * gets the full amount when it eventually processes. If the payout already
   * COMPLETED, sends a separate top-up transfer to the recipient.
   */
  async reconcileLatePayment(
    paymentId: string,
    userId: string,
    cycle: { id: string; groupId: string; group: { id: string; name: string } }
  ) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    // Skip if already reconciled
    if (payment.fallbackMethod === 'late_payment') return;

    const lateAmount = payment.amount;

    // Clear debt from membership if it was recorded
    const membership = await prisma.membership.findFirst({
      where: { groupId: cycle.groupId, userId, isActive: true },
    });

    if (membership && membership.debtPaymentIds.includes(paymentId)) {
      const updatedDebtIds = membership.debtPaymentIds.filter(id => id !== paymentId);
      const clearedDebt = Math.min(lateAmount, membership.outstandingDebt);
      const remainingDebt = Math.round((membership.outstandingDebt - clearedDebt) * 100) / 100;

      await prisma.membership.update({
        where: { id: membership.id },
        data: {
          outstandingDebt: remainingDebt,
          debtPaymentIds: updatedDebtIds,
        },
      });

      console.log(`[Payment] Cleared $${clearedDebt} debt for user ${userId} (late payment ${paymentId})`);
    }

    // Mark the payment as resolved via late payment
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        fallbackMethod: 'late_payment',
        fallbackAt: new Date(),
      },
    });

    // Find the payout for this cycle and adjust it
    const payout = await prisma.payout.findUnique({ where: { cycleId: cycle.id } });
    if (!payout) return;

    const topUpFee = Math.min(lateAmount * 0.03, 150);
    const topUpNet = Math.round((lateAmount - topUpFee) * 100) / 100;

    if (topUpNet <= 0) return;

    if (payout.status === 'PENDING' || payout.status === 'PROCESSING') {
      // Payout hasn't been sent yet — just increase the amounts so the
      // recipient gets the full payout when it eventually processes.
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          amount: { increment: lateAmount },
          feeAmount: { increment: topUpFee },
          netAmount: { increment: topUpNet },
        },
      });

      console.log(`[Payment] Adjusted PENDING payout ${payout.id} by +$${topUpNet} for late payment ${paymentId}`);

      await notificationService.createNotification({
        userId,
        groupId: cycle.groupId,
        type: 'PAYMENT_RECEIVED',
        title: 'Late Payment Processed',
        message: `Your late payment of $${lateAmount.toFixed(2)} for "${cycle.group.name}" has been processed and will be included in the payout to the recipient.`,
      });

      return;
    }

    if (payout.status !== 'COMPLETED') return;

    // Payout already sent — send a separate top-up transfer to the recipient
    const recipient = await prisma.user.findUnique({
      where: { id: payout.recipientId },
      select: { id: true, stripeConnectAccountId: true, stripeConnectOnboarded: true },
    });

    if (!recipient?.stripeConnectAccountId || !recipient.stripeConnectOnboarded) {
      console.log(`[Payment] Recipient ${payout.recipientId} not onboarded, cannot send top-up`);
      return;
    }

    try {
      const transferId = await stripeService.createTransfer(
        payout.id,
        recipient.stripeConnectAccountId,
        topUpNet,
        { type: 'late_payment_topup', latePaymentId: paymentId }
      );

      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          amount: { increment: lateAmount },
          feeAmount: { increment: topUpFee },
          netAmount: { increment: topUpNet },
        },
      });

      console.log(`[Payment] Top-up transfer of $${topUpNet} sent to recipient ${payout.recipientId} (transfer ${transferId})`);

      await notificationService.createNotification({
        userId: payout.recipientId,
        groupId: cycle.groupId,
        type: 'PAYOUT_COMPLETED',
        title: 'Late Payment Top-Up Received',
        message: `A member's late payment of $${lateAmount.toFixed(2)} for "${cycle.group.name}" has been collected. $${topUpNet.toFixed(2)} has been transferred to your account.`,
      });

      await notificationService.createNotification({
        userId,
        groupId: cycle.groupId,
        type: 'PAYMENT_RECEIVED',
        title: 'Late Payment Processed',
        message: `Your late payment of $${lateAmount.toFixed(2)} for "${cycle.group.name}" has been processed and forwarded to the payout recipient.`,
      });
    } catch (error: any) {
      console.error(`[Payment] Failed to send top-up transfer for late payment ${paymentId}: ${error.message}`);
    }
  }

  /**
   * Pay off outstanding debt for a specific group membership.
   * Charges the member's card, clears the debt, and forwards the payment
   * to the shortchanged payout recipient (or adjusts a pending payout).
   */
  async payDebt(
    userId: string,
    groupId: string,
    paymentMethodId?: string
  ) {
    const membership = await prisma.membership.findFirst({
      where: { groupId, userId, isActive: true },
      include: { group: true },
    });

    if (!membership) {
      throw new Error('No active membership found for this group');
    }

    if (membership.outstandingDebt <= 0) {
      throw new Error('No outstanding debt to pay');
    }

    const debtAmount = membership.outstandingDebt;
    const { total: chargeAmount } = this.getChargeBreakdown(debtAmount);

    // Charge the member's card
    const result = await stripeService.chargePayment(
      userId,
      chargeAmount,
      `debt_${membership.id}`,
      paymentMethodId
    );

    if (result.status !== 'succeeded') {
      throw new Error('Payment requires additional authentication. Please try a different payment method.');
    }

    // Find the debt payments to determine which cycles were affected
    const debtPaymentIds = [...membership.debtPaymentIds];
    const debtPayments = await prisma.payment.findMany({
      where: { id: { in: debtPaymentIds } },
      include: { cycle: { include: { group: true } } },
    });

    // Clear the debt from membership
    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        outstandingDebt: 0,
        debtPaymentIds: [],
      },
    });

    // Mark all debt payments as resolved
    for (const debtPayment of debtPayments) {
      await prisma.payment.update({
        where: { id: debtPayment.id },
        data: {
          fallbackMethod: 'debt_payment',
          fallbackAt: new Date(),
        },
      });
    }

    // Restore trust score (reverse the penalties)
    await this.adjustTrustScore(userId, Math.abs(TRUST_SCORE_PENALTY) * debtPayments.length);

    // Forward the payment to each affected cycle's payout recipient
    // Group debt payments by cycle so we handle each payout once
    const cycleMap = new Map<string, typeof debtPayments>();
    for (const dp of debtPayments) {
      const existing = cycleMap.get(dp.cycleId) || [];
      existing.push(dp);
      cycleMap.set(dp.cycleId, existing);
    }

    for (const [cycleId, payments] of cycleMap) {
      const cycleDebt = payments.reduce((sum, p) => sum + p.amount, 0);
      const topUpFee = Math.min(cycleDebt * 0.03, 150);
      const topUpNet = Math.round((cycleDebt - topUpFee) * 100) / 100;

      if (topUpNet <= 0) continue;

      const payout = await prisma.payout.findUnique({ where: { cycleId } });
      if (!payout) continue;

      if (payout.status === 'PENDING' || payout.status === 'PROCESSING') {
        // Payout not sent yet — adjust the amount
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            amount: { increment: cycleDebt },
            feeAmount: { increment: topUpFee },
            netAmount: { increment: topUpNet },
          },
        });

        console.log(`[Payment] Adjusted PENDING payout ${payout.id} by +$${topUpNet} from debt payment`);
      } else if (payout.status === 'COMPLETED') {
        // Payout already sent — send a top-up transfer
        const recipient = await prisma.user.findUnique({
          where: { id: payout.recipientId },
          select: { id: true, stripeConnectAccountId: true, stripeConnectOnboarded: true },
        });

        if (recipient?.stripeConnectAccountId && recipient.stripeConnectOnboarded) {
          try {
            await stripeService.createTransfer(
              payout.id,
              recipient.stripeConnectAccountId,
              topUpNet,
              { type: 'debt_payment_topup' }
            );

            await prisma.payout.update({
              where: { id: payout.id },
              data: {
                amount: { increment: cycleDebt },
                feeAmount: { increment: topUpFee },
                netAmount: { increment: topUpNet },
              },
            });

            await notificationService.createNotification({
              userId: payout.recipientId,
              groupId,
              type: 'PAYOUT_COMPLETED',
              title: 'Debt Payment Top-Up Received',
              message: `A member has paid their outstanding debt of $${cycleDebt.toFixed(2)} for "${membership.group.name}". $${topUpNet.toFixed(2)} has been transferred to your account.`,
            });

            console.log(`[Payment] Top-up of $${topUpNet} sent to recipient ${payout.recipientId} from debt payment`);
          } catch (error: any) {
            console.error(`[Payment] Failed to send debt top-up transfer: ${error.message}`);
          }
        }
      }
    }

    // Notify the member
    await notificationService.createNotification({
      userId,
      groupId,
      type: 'PAYMENT_RECEIVED',
      title: 'Debt Paid Successfully',
      message: `Your outstanding debt of $${debtAmount.toFixed(2)} for "${membership.group.name}" has been paid. Your debt has been fully cleared.`,
    });

    console.log(`[Payment] User ${userId} paid $${debtAmount} debt for group ${groupId}`);

    return {
      debtAmount,
      chargeAmount,
      paymentsResolved: debtPayments.length,
    };
  }

  /**
   * Get outstanding debt info for a user in a specific group
   */
  async getDebtInfo(userId: string, groupId: string) {
    const membership = await prisma.membership.findFirst({
      where: { groupId, userId, isActive: true },
      include: { group: { select: { name: true } } },
    });

    if (!membership) {
      throw new Error('No active membership found for this group');
    }

    const debtPayments = membership.debtPaymentIds.length > 0
      ? await prisma.payment.findMany({
          where: { id: { in: membership.debtPaymentIds } },
          select: {
            id: true,
            amount: true,
            createdAt: true,
            cycle: { select: { cycleNumber: true } },
          },
        })
      : [];

    const breakdown = this.getChargeBreakdown(membership.outstandingDebt);

    return {
      outstandingDebt: membership.outstandingDebt,
      chargeAmount: breakdown.total,
      processingFee: breakdown.processingFee,
      debtPayments,
    };
  }

  /**
   * Adjust a user's trust score (clamped to 0 minimum)
   */
  async adjustTrustScore(userId: string, delta: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { trustScore: true },
    });

    if (!user) return;

    const newScore = Math.max(0, user.trustScore + delta);
    await prisma.user.update({
      where: { id: userId },
      data: { trustScore: newScore },
    });
  }

  /**
   * Reward trust score when a payment completes successfully
   */
  async rewardTrustScore(userId: string) {
    await this.adjustTrustScore(userId, TRUST_SCORE_REWARD);
  }
}

export default new PaymentService();
