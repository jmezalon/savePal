import prisma from '../utils/prisma.js';
import stripeService from './stripe.service.js';
import notificationService from './notification.service.js';

class PayoutService {
  /**
   * Get payout by ID
   */
  async getPayoutById(payoutId: string) {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        cycle: {
          include: {
            group: true,
          },
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    return payout;
  }

  /**
   * Get all payouts for a user
   */
  async getUserPayouts(userId: string) {
    const payouts = await prisma.payout.findMany({
      where: { recipientId: userId },
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

    return payouts;
  }

  /**
   * Get pending payouts for a user
   */
  async getPendingPayouts(userId: string) {
    const payouts = await prisma.payout.findMany({
      where: {
        recipientId: userId,
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

    return payouts;
  }

  /**
   * Get payout for a specific cycle
   */
  async getPayoutForCycle(cycleId: string) {
    const payout = await prisma.payout.findUnique({
      where: { cycleId },
      include: {
        cycle: {
          include: {
            group: true,
          },
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return payout;
  }

  /**
   * Process a payout via Stripe Connect transfer
   */
  async processPayout(payoutId: string) {
    const payout = await this.getPayoutById(payoutId);

    if (payout.status === 'COMPLETED') {
      throw new Error('Payout has already been processed');
    }

    // Check recipient has onboarded Connect account
    const recipient = await prisma.user.findUnique({
      where: { id: payout.recipientId },
      select: {
        id: true,
        stripeConnectAccountId: true,
        stripeConnectOnboarded: true,
      },
    });

    if (!recipient?.stripeConnectAccountId || !recipient.stripeConnectOnboarded) {
      // Notify recipient to set up their payout account
      await notificationService.createNotification({
        userId: payout.recipientId,
        groupId: payout.cycle.group.id,
        type: 'CONNECT_ONBOARDING_REQUIRED',
        title: 'Payout Account Required',
        message: `You have a pending payout of $${payout.netAmount.toFixed(2)} from "${payout.cycle.group.name}". Please set up your payout account in Profile Settings to receive funds.`,
      });
      throw new Error('Recipient has not completed payout account setup');
    }

    // Set status to PROCESSING
    await prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'PROCESSING' },
    });

    try {
      const transferId = await stripeService.createTransfer(
        payoutId,
        recipient.stripeConnectAccountId,
        payout.netAmount
      );

      const updatedPayout = await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'COMPLETED',
          stripeTransferId: transferId,
          transferredAt: new Date(),
          failureReason: null,
        },
      });

      // Notify recipient
      await notificationService.sendPayoutCompletedNotification(
        payout.recipientId,
        payout.cycle.group.id,
        payout.cycle.group.name,
        payout.netAmount
      );

      return updatedPayout;
    } catch (error: any) {
      // Revert to PENDING so scheduler can retry
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'PENDING',
          failureReason: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Mark a payout as failed
   */
  async failPayout(payoutId: string, reason?: string) {
    const payout = await this.getPayoutById(payoutId);

    if (payout.status === 'COMPLETED') {
      throw new Error('Cannot fail a completed payout');
    }

    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'FAILED',
        failureReason: reason || null,
      },
    });

    // Notify recipient about the failure
    await notificationService.createNotification({
      userId: payout.recipientId,
      groupId: payout.cycle.group.id,
      type: 'PAYOUT_FAILED',
      title: 'Payout Failed',
      message: `Your payout of $${payout.netAmount.toFixed(2)} from "${payout.cycle.group.name}" has failed. ${reason || 'Please contact support.'}`,
    });

    return updatedPayout;
  }

  /**
   * Get payout statistics for a user
   */
  async getUserPayoutStats(userId: string) {
    const payouts = await prisma.payout.findMany({
      where: { recipientId: userId },
    });

    const stats = {
      total: payouts.length,
      completed: payouts.filter(p => p.status === 'COMPLETED').length,
      pending: payouts.filter(p => p.status === 'PENDING').length,
      failed: payouts.filter(p => p.status === 'FAILED').length,
      totalAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
      totalNetAmount: payouts.reduce((sum, p) => sum + p.netAmount, 0),
      totalFees: payouts.reduce((sum, p) => sum + p.feeAmount, 0),
      receivedAmount: payouts
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.netAmount, 0),
    };

    return stats;
  }

  /**
   * Get all payouts for a group
   */
  async getPayoutsForGroup(groupId: string) {
    const payouts = await prisma.payout.findMany({
      where: {
        cycle: {
          groupId,
        },
      },
      include: {
        cycle: true,
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        cycle: {
          cycleNumber: 'asc',
        },
      },
    });

    return payouts;
  }
}

export default new PayoutService();
