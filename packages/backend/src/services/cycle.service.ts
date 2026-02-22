import prisma from '../utils/prisma.js';
import { Frequency } from '@prisma/client';
import payoutService from './payout.service.js';
import notificationService from './notification.service.js';

class CycleService {
  /**
   * Create all cycles for a group when it starts
   */
  async createCyclesForGroup(groupId: string) {
    // Get group details with memberships
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { isActive: true },
          orderBy: { payoutPosition: 'asc' },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.status !== 'ACTIVE') {
      throw new Error('Group must be active to create cycles');
    }

    if (group.memberships.length !== group.maxMembers) {
      throw new Error('Group is not full');
    }

    // Determine payout order
    let payoutOrder: string[];

    if (group.payoutMethod === 'SEQUENTIAL') {
      // Use payout position order
      payoutOrder = group.memberships.map(m => m.userId);
    } else if (group.payoutMethod === 'RANDOM') {
      // Randomize order
      payoutOrder = group.memberships
        .map(m => m.userId)
        .sort(() => Math.random() - 0.5);
    } else {
      // BIDDING - for now use sequential, will implement bidding later
      payoutOrder = group.memberships.map(m => m.userId);
    }

    // Calculate cycle dates
    const cycles = [];
    const startDate = group.startDate || new Date();

    for (let i = 0; i < group.maxMembers; i++) {
      const dueDate = this.calculateDueDate(startDate, i, group.frequency);

      cycles.push({
        groupId: group.id,
        cycleNumber: i + 1,
        recipientId: payoutOrder[i],
        dueDate,
        totalAmount: group.contributionAmount * group.maxMembers,
        isCompleted: false,
      });
    }

    // Create all cycles in a transaction
    const createdCycles = await prisma.$transaction(
      cycles.map(cycle => prisma.cycle.create({ data: cycle }))
    );

    // Create pending payments for the first cycle
    await this.createPaymentsForCycle(createdCycles[0].id, group.id);

    return createdCycles;
  }

  /**
   * Calculate due date for a cycle based on frequency
   */
  private calculateDueDate(startDate: Date, cycleIndex: number, frequency: Frequency): Date {
    const dueDate = new Date(startDate);

    switch (frequency) {
      case 'WEEKLY':
        dueDate.setDate(dueDate.getDate() + (cycleIndex * 7));
        break;
      case 'BIWEEKLY':
        dueDate.setDate(dueDate.getDate() + (cycleIndex * 14));
        break;
      case 'MONTHLY':
        dueDate.setMonth(dueDate.getMonth() + cycleIndex);
        break;
    }

    return dueDate;
  }

  /**
   * Create payment records for all members in a cycle
   */
  async createPaymentsForCycle(cycleId: string, groupId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { isActive: true },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    const payments = group.memberships.map(membership => ({
      cycleId,
      userId: membership.userId,
      amount: group.contributionAmount,
      status: 'PENDING' as const,
    }));

    await prisma.payment.createMany({
      data: payments,
    });

    return payments;
  }

  /**
   * Get all cycles for a group
   */
  async getCyclesForGroup(groupId: string) {
    const cycles = await prisma.cycle.findMany({
      where: { groupId },
      include: {
        payments: {
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
        },
        payout: true,
      },
      orderBy: { cycleNumber: 'asc' },
    });

    return cycles;
  }

  /**
   * Get current active cycle for a group
   */
  async getCurrentCycle(groupId: string) {
    const cycle = await prisma.cycle.findFirst({
      where: {
        groupId,
        isCompleted: false,
      },
      include: {
        payments: {
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
        },
        payout: true,
      },
      orderBy: { cycleNumber: 'asc' },
    });

    return cycle;
  }

  /**
   * Get cycle by ID
   */
  async getCycleById(cycleId: string) {
    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      include: {
        group: true,
        payments: {
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
        },
        payout: true,
      },
    });

    if (!cycle) {
      throw new Error('Cycle not found');
    }

    return cycle;
  }

  /**
   * Check if a cycle is fully paid
   */
  async isCycleFullyPaid(cycleId: string): Promise<boolean> {
    const payments = await prisma.payment.findMany({
      where: { cycleId },
    });

    return payments.every(payment => payment.status === 'COMPLETED');
  }

  /**
   * Complete a cycle and trigger payout
   */
  async completeCycle(cycleId: string) {
    const cycle = await this.getCycleById(cycleId);

    if (cycle.isCompleted) {
      throw new Error('Cycle is already completed');
    }

    // Check if all payments are completed
    const isFullyPaid = await this.isCycleFullyPaid(cycleId);

    if (!isFullyPaid) {
      throw new Error('Not all payments have been completed');
    }

    // Mark cycle as completed
    const updatedCycle = await prisma.cycle.update({
      where: { id: cycleId },
      data: {
        isCompleted: true,
        completedDate: new Date(),
      },
    });

    // Create payout record (actual payout will be handled by payment service)
    const feeAmount = cycle.totalAmount * 0.03; // 3% platform fee
    const netAmount = cycle.totalAmount - feeAmount;

    const payout = await prisma.payout.create({
      data: {
        cycleId: cycle.id,
        recipientId: cycle.recipientId,
        amount: cycle.totalAmount,
        feeAmount,
        netAmount,
        status: 'PENDING',
      },
    });

    // Attempt immediate payout via Stripe Connect
    try {
      await payoutService.processPayout(payout.id);
    } catch (error: any) {
      console.log(`[Cycle] Immediate payout attempt failed for ${payout.id}: ${error.message}`);
      // Notify recipient that payout is pending retry
      await notificationService.sendPayoutPendingNotification(
        cycle.recipientId,
        cycle.groupId,
        cycle.group.name,
        payout.netAmount
      );
    }

    // Create payments for the next cycle if it exists
    const nextCycle = await prisma.cycle.findFirst({
      where: {
        groupId: cycle.groupId,
        cycleNumber: cycle.cycleNumber + 1,
      },
    });

    if (nextCycle) {
      await this.createPaymentsForCycle(nextCycle.id, cycle.groupId);
    } else {
      // This was the last cycle, mark group as completed
      await prisma.group.update({
        where: { id: cycle.groupId },
        data: {
          status: 'COMPLETED',
          endDate: new Date(),
        },
      });
    }

    return updatedCycle;
  }

  /**
   * Get user's payments for a specific cycle
   */
  async getUserPaymentForCycle(cycleId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: {
        cycleId_userId: {
          cycleId,
          userId,
        },
      },
      include: {
        cycle: {
          include: {
            group: true,
          },
        },
      },
    });

    return payment;
  }
}

export default new CycleService();
