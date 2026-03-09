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
      // BIDDING - no pre-assigned recipients; recipients determined via bidding
      payoutOrder = [];
    }

    // Calculate cycle dates
    const cycles = [];
    const startDate = group.startDate || new Date();
    const effectivePayoutFrequency = group.payoutFrequency || group.frequency;
    const contributionsPerPayout = getContributionsPerPayout(group.frequency, effectivePayoutFrequency);
    const isBidding = group.payoutMethod === 'BIDDING';

    for (let i = 0; i < group.maxMembers; i++) {
      const dueDate = this.calculateDueDate(startDate, i, effectivePayoutFrequency);

      cycles.push({
        groupId: group.id,
        cycleNumber: i + 1,
        recipientId: isBidding ? null : payoutOrder[i],
        dueDate,
        totalAmount: group.contributionAmount * contributionsPerPayout * group.maxMembers,
        isCompleted: false,
        biddingStatus: isBidding ? (i === 0 ? 'OPEN' as const : null) : null,
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
  async getCycleById(cycleId: string, userId?: string) {
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

    // If userId provided, verify membership and filter for non-owners
    if (userId) {
      const membership = await prisma.membership.findFirst({
        where: { groupId: cycle.groupId, userId, isActive: true },
      });

      if (!membership) {
        throw new Error('Not authorized to view this cycle');
      }

      if (membership.role !== 'OWNER') {
        return {
          ...cycle,
          payments: cycle.payments.filter((p) => p.userId === userId),
        };
      }
    }

    return cycle;
  }

  /**
   * Check if a cycle is fully resolved (all payments either completed or recorded as debt)
   */
  async isCycleFullyPaid(cycleId: string): Promise<boolean> {
    const payments = await prisma.payment.findMany({
      where: { cycleId },
    });

    return payments.every(payment =>
      payment.status === 'COMPLETED' ||
      (payment.status === 'FAILED' && payment.retryCount >= 3)
    );
  }

  /**
   * Complete a cycle and trigger payout
   */
  async completeCycle(cycleId: string, userId?: string) {
    // If called with a userId (user-initiated), verify the user is the group owner
    if (userId) {
      const cycle = await prisma.cycle.findUnique({
        where: { id: cycleId },
        select: { groupId: true },
      });

      if (!cycle) {
        throw new Error('Cycle not found');
      }

      const ownerMembership = await prisma.membership.findFirst({
        where: { groupId: cycle.groupId, userId, role: 'OWNER', isActive: true },
      });

      if (!ownerMembership) {
        throw new Error('Only the group owner can complete a cycle');
      }
    }

    // Run all DB mutations in a transaction with a row lock to prevent races
    const { updatedCycle, payoutId, payoutData } = await prisma.$transaction(async (tx) => {
      // Lock the cycle row to prevent concurrent completions
      const [lockedCycle] = await tx.$queryRaw<any[]>`
        SELECT id, "isCompleted", "totalAmount", "recipientId", "groupId", "cycleNumber"
        FROM "cycles" WHERE id = ${cycleId} FOR UPDATE
      `;

      if (!lockedCycle) {
        throw new Error('Cycle not found');
      }

      if (lockedCycle.isCompleted) {
        throw new Error('Cycle is already completed');
      }

      // For bidding groups, ensure bidding has been resolved
      if (!lockedCycle.recipientId) {
        throw new Error('Bidding must be resolved before completing this cycle');
      }

      // Check if all payments are resolved (completed or recorded as debt after max retries)
      const payments = await tx.payment.findMany({ where: { cycleId } });
      const allResolved = payments.every(p =>
        p.status === 'COMPLETED' ||
        (p.status === 'FAILED' && p.retryCount >= 3)
      );

      if (!allResolved) {
        throw new Error('Not all payments have been completed or resolved');
      }

      // Calculate shortfall from failed payments (these are recorded as debt on memberships)
      const failedPayments = payments.filter(p => p.status === 'FAILED' && p.retryCount >= 3);
      const shortfallAmount = failedPayments.reduce((sum, p) => sum + p.amount, 0);
      const collectedAmount = lockedCycle.totalAmount - shortfallAmount;

      // Mark cycle as completed
      const updated = await tx.cycle.update({
        where: { id: cycleId },
        data: {
          isCompleted: true,
          completedDate: new Date(),
        },
      });

      // Create payout record based on actually collected amount
      const feeAmount = Math.min(collectedAmount * 0.03, 150); // 3% platform fee, capped at $150
      const netAmount = collectedAmount - feeAmount;

      const payout = await tx.payout.create({
        data: {
          cycleId: lockedCycle.id,
          recipientId: lockedCycle.recipientId,
          amount: collectedAmount,
          feeAmount,
          netAmount,
          status: 'PENDING',
        },
      });

      if (shortfallAmount > 0) {
        console.log(`[Cycle] Cycle ${cycleId} completed with $${shortfallAmount.toFixed(2)} shortfall from ${failedPayments.length} failed payment(s)`);
      }

      // Check for next cycle
      const nextCycle = await tx.cycle.findFirst({
        where: {
          groupId: lockedCycle.groupId,
          cycleNumber: lockedCycle.cycleNumber + 1,
        },
      });

      if (nextCycle) {
        // Create payments for the next cycle inside the transaction
        const group = await tx.group.findUnique({
          where: { id: lockedCycle.groupId },
          include: {
            memberships: { where: { isActive: true } },
          },
        });

        if (group) {
          const effectivePayoutFrequency = group.payoutFrequency || group.frequency;
          const contributionsPerPayout = getContributionsPerPayout(group.frequency, effectivePayoutFrequency);
          const groupStartDate = group.startDate || new Date();
          const nextCycleIndex = nextCycle.cycleNumber - 1;

          const newPayments: Array<{
            cycleId: string;
            userId: string;
            amount: number;
            status: 'PENDING';
            contributionPeriod: number;
            dueDate: Date;
          }> = [];

          for (const membership of group.memberships) {
            for (let period = 1; period <= contributionsPerPayout; period++) {
              const overallContributionIndex = nextCycleIndex * contributionsPerPayout + (period - 1);
              const dueDate = this.calculateDueDate(groupStartDate, overallContributionIndex, group.frequency);

              newPayments.push({
                cycleId: nextCycle.id,
                userId: membership.userId,
                amount: group.contributionAmount,
                status: 'PENDING',
                contributionPeriod: period,
                dueDate,
              });
            }
          }

          await tx.payment.createMany({ data: newPayments });

          // For bidding groups, open bidding on the next cycle
          if (group.payoutMethod === 'BIDDING') {
            await tx.cycle.update({
              where: { id: nextCycle.id },
              data: { biddingStatus: 'OPEN' },
            });
          }
        }
      } else {
        // This was the last cycle, mark group as completed
        await tx.group.update({
          where: { id: lockedCycle.groupId },
          data: {
            status: 'COMPLETED',
            endDate: new Date(),
          },
        });
      }

      return {
        updatedCycle: updated,
        payoutId: payout.id,
        payoutData: {
          recipientId: lockedCycle.recipientId,
          groupId: lockedCycle.groupId,
          groupName: '', // fetched below if needed
          netAmount,
        },
      };
    }, { timeout: 15000 });

    // Best-effort payout via Stripe Connect (outside transaction)
    try {
      await payoutService.processPayout(payoutId);
    } catch (error: any) {
      console.log(`[Cycle] Immediate payout attempt failed for ${payoutId}: ${error.message}`);
      // Fetch group name for notification
      const group = await prisma.group.findUnique({
        where: { id: payoutData.groupId },
        select: { name: true },
      });
      await notificationService.sendPayoutPendingNotification(
        payoutData.recipientId,
        payoutData.groupId,
        group?.name || '',
        payoutData.netAmount
      );
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
