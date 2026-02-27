import prisma from '../utils/prisma.js';
import cycleService from './cycle.service.js';
import stripeService from './stripe.service.js';
import notificationService from './notification.service.js';

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

    // Check if payment is already completed
    if (payment.status === 'COMPLETED') {
      throw new Error('Payment has already been completed');
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

    // Check if all payments for the cycle are completed
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
        await prisma.payment.update({
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
}

export default new PaymentService();
