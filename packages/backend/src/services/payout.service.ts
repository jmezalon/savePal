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
   * Process a payout via Stripe Connect transfer.
   * If the recipient has outstanding debt in this group, the debt is
   * deducted from the payout amount before transferring.
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

    // Pre-check: verify transfers capability is active on the Connect account
    const transfersActive = await stripeService.isTransferCapabilityActive(
      recipient.stripeConnectAccountId
    );
    if (!transfersActive) {
      // Sync the onboarded flag so the user sees the correct status
      await prisma.user.update({
        where: { id: recipient.id },
        data: { stripeConnectOnboarded: false },
      });

      await notificationService.createNotification({
        userId: payout.recipientId,
        groupId: payout.cycle.group.id,
        type: 'CONNECT_ONBOARDING_REQUIRED',
        title: 'Identity Verification Required',
        message: `Your payout of $${payout.netAmount.toFixed(2)} from "${payout.cycle.group.name}" cannot be processed until identity verification is complete. Please update your payout settings in Profile.`,
      });

      throw new Error('Recipient Connect account transfers capability is not active. Identity verification may be required.');
    }

    // Pre-check: verify platform has enough available balance
    const balanceCheck = await stripeService.hasEnoughBalance(payout.netAmount);
    if (!balanceCheck.sufficient) {
      const reason = `Insufficient platform balance: $${balanceCheck.available.toFixed(2)} available, $${balanceCheck.required.toFixed(2)} required. Funds from contributions may still be settling.`;
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          failureReason: reason,
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
        },
      });
      throw new Error(reason);
    }

    // Check if recipient has outstanding debt in this group
    const membership = await prisma.membership.findFirst({
      where: {
        groupId: payout.cycle.group.id,
        userId: payout.recipientId,
        isActive: true,
      },
    });

    let debtDeducted = 0;
    let adjustedNetAmount = payout.netAmount;

    if (membership && membership.outstandingDebt > 0) {
      debtDeducted = Math.min(membership.outstandingDebt, payout.netAmount);
      adjustedNetAmount = Math.round((payout.netAmount - debtDeducted) * 100) / 100;

      console.log(`[Payout] Withholding $${debtDeducted.toFixed(2)} from payout ${payoutId} for outstanding debt`);
    }

    // Set status to PROCESSING
    await prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'PROCESSING' },
    });

    try {
      let transferId: string | null = null;

      if (adjustedNetAmount > 0) {
        transferId = await stripeService.createTransfer(
          payoutId,
          recipient.stripeConnectAccountId,
          adjustedNetAmount
        );
      }

      const updatedPayout = await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'COMPLETED',
          stripeTransferId: transferId,
          transferredAt: new Date(),
          netAmount: adjustedNetAmount,
          failureReason: null,
          retryCount: 0,
          lastRetryAt: null,
        },
      });

      // Clear the debt that was deducted
      if (membership && debtDeducted > 0) {
        const remainingDebt = Math.round((membership.outstandingDebt - debtDeducted) * 100) / 100;

        // Mark the debt payments as resolved via withholding
        if (remainingDebt === 0) {
          // All debt cleared — mark all debt payments as resolved
          for (const debtPaymentId of membership.debtPaymentIds) {
            await prisma.payment.update({
              where: { id: debtPaymentId },
              data: {
                fallbackMethod: 'payout_withholding',
                fallbackAt: new Date(),
              },
            });
          }

          await prisma.membership.update({
            where: { id: membership.id },
            data: {
              outstandingDebt: 0,
              debtPaymentIds: [],
            },
          });
        } else {
          // Partial debt cleared — we deducted the full payout but debt remains
          await prisma.membership.update({
            where: { id: membership.id },
            data: {
              outstandingDebt: remainingDebt,
            },
          });
        }

        // Notify user about debt deduction
        await notificationService.createNotification({
          userId: payout.recipientId,
          groupId: payout.cycle.group.id,
          type: 'DEBT_DEDUCTED_FROM_PAYOUT',
          title: 'Debt Deducted from Payout',
          message: `$${debtDeducted.toFixed(2)} was deducted from your payout for "${payout.cycle.group.name}" to cover missed contributions.${remainingDebt > 0 ? ` Remaining debt: $${remainingDebt.toFixed(2)}.` : ' Your debt has been fully resolved.'}`,
        });
      }

      // Notify recipient
      await notificationService.sendPayoutCompletedNotification(
        payout.recipientId,
        payout.cycle.group.id,
        payout.cycle.group.name,
        adjustedNetAmount
      );

      return updatedPayout;
    } catch (error: any) {
      // Revert to PENDING so scheduler can retry
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'PENDING',
          failureReason: error.message,
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
        },
      });
      throw error;
    }
  }

  /**
   * Reinitiate a payout that was previously completed but reversed on Stripe.
   * Resets the payout status to PENDING, clears the old transfer ID, and reprocesses.
   */
  async reinitiateTransfer(payoutId: string) {
    const payout = await this.getPayoutById(payoutId);

    if (payout.status !== 'COMPLETED' && payout.status !== 'FAILED') {
      throw new Error('Only completed or failed payouts can be reinitiated');
    }

    // Reset payout to PENDING so processPayout can pick it up
    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'PENDING',
        stripeTransferId: null,
        transferredAt: null,
        failureReason: null,
        retryCount: 0,
        lastRetryAt: null,
      },
    });

    // Process the payout with fresh state
    return this.processPayout(payoutId);
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
