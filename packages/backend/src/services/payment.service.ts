import prisma from '../utils/prisma.js';
import cycleService from './cycle.service.js';

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

    // TODO: Implement penalty system for failed payments
    // This could affect trust score or trigger notifications

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
        cycle: {
          dueDate: {
            lt: now,
          },
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
        createdAt: 'asc',
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
}

export default new PaymentService();
