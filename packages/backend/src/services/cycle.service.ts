import prisma from '../utils/prisma.js';
import { Frequency } from '@prisma/client';
import payoutService from './payout.service.js';
import notificationService from './notification.service.js';

function getContributionsPerPayout(contributionFreq: Frequency, payoutFreq: Frequency): number {
  const map: Record<string, Record<string, number>> = {
    WEEKLY:   { WEEKLY: 1, BIWEEKLY: 2, MONTHLY: 4 },
    BIWEEKLY: { BIWEEKLY: 1, MONTHLY: 2 },
    MONTHLY:  { MONTHLY: 1 },
  };
  const result = map[contributionFreq]?.[payoutFreq];
  if (result === undefined) {
    throw new Error(`Invalid frequency combination: contribution=${contributionFreq}, payout=${payoutFreq}`);
  }
  return result;
}

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
    const effectivePayoutFrequency = group.payoutFrequency || group.frequency;
    const contributionsPerPayout = getContributionsPerPayout(group.frequency, effectivePayoutFrequency);

    for (let i = 0; i < group.maxMembers; i++) {
      const dueDate = this.calculateDueDate(startDate, i, effectivePayoutFrequency);

      cycles.push({
        groupId: group.id,
        cycleNumber: i + 1,
        recipientId: payoutOrder[i],
        dueDate,
        totalAmount: group.contributionAmount * contributionsPerPayout * group.maxMembers,
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
   * Creates multiple payments per member when payout frequency > contribution frequency
   */
  async createPaymentsForCycle(cycleId: string, groupId: string) {
    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
    });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { isActive: true },
        },
      },
    });

    if (!group || !cycle) {
      throw new Error('Group or cycle not found');
    }

    const effectivePayoutFrequency = group.payoutFrequency || group.frequency;
    const contributionsPerPayout = getContributionsPerPayout(group.frequency, effectivePayoutFrequency);
    const groupStartDate = group.startDate || new Date();
    const cycleIndex = cycle.cycleNumber - 1;

    const payments: Array<{
      cycleId: string;
      userId: string;
      amount: number;
      status: 'PENDING';
      contributionPeriod: number;
      dueDate: Date;
    }> = [];

    for (const membership of group.memberships) {
      for (let period = 1; period <= contributionsPerPayout; period++) {
        // Overall contribution index from start of the group
        const overallContributionIndex = cycleIndex * contributionsPerPayout + (period - 1);
        const dueDate = this.calculateDueDate(groupStartDate, overallContributionIndex, group.frequency);

        payments.push({
          cycleId,
          userId: membership.userId,
          amount: group.contributionAmount,
          status: 'PENDING',
          contributionPeriod: period,
          dueDate,
        });
      }
    }

    await prisma.payment.createMany({
      data: payments,
    });

    return payments;
  }

  /**
   * Get all cycles for a group
   */
  async getCyclesForGroup(groupId: string, userId?: string) {
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

    // If userId provided, check role and filter for non-owners
    if (userId) {
      const membership = await prisma.membership.findFirst({
        where: { groupId, userId, isActive: true },
      });

      if (membership && membership.role !== 'OWNER') {
        return cycles.map((cycle) => ({
          ...cycle,
          payments: cycle.payments.filter((p) => p.userId === userId),
        }));
      }
    }

    return cycles;
  }

  /**
   * Get current active cycle for a group
   */
  async getCurrentCycle(groupId: string, userId?: string) {
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

    // If userId provided, check role and filter for non-owners
    if (cycle && userId) {
      const membership = await prisma.membership.findFirst({
        where: { groupId, userId, isActive: true },
      });

      if (membership && membership.role !== 'OWNER') {
        return {
          ...cycle,
          payments: cycle.payments.filter((p) => p.userId === userId),
        };
      }
    }

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
   * Get user's payments for a specific cycle (returns array for multiple contribution periods)
   */
  async getUserPaymentsForCycle(cycleId: string, userId: string) {
    const payments = await prisma.payment.findMany({
      where: {
        cycleId,
        userId,
      },
      include: {
        cycle: {
          include: {
            group: true,
          },
        },
      },
      orderBy: {
        contributionPeriod: 'asc',
      },
    });

    return payments;
  }
}

export default new CycleService();
