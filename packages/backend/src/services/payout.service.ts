import prisma from '../utils/prisma.js';

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
   * Process a payout (mark as completed)
   * In a real implementation, this would integrate with a payment gateway
   */
  async processPayout(payoutId: string, transactionReference?: string) {
    const payout = await this.getPayoutById(payoutId);

    if (payout.status === 'COMPLETED') {
      throw new Error('Payout has already been processed');
    }

    if (payout.status === 'FAILED') {
      throw new Error('Cannot process a failed payout');
    }

    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'COMPLETED',
        transferredAt: new Date(),
        stripeTransferId: transactionReference,
      },
    });

    return updatedPayout;
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
      },
    });

    // TODO: Implement retry logic or notification system
    // TODO: Store failure reason in a separate audit log table

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
