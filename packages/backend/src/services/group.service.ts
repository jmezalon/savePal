import prisma from '../utils/prisma.js';
import { Frequency, PayoutMethod } from '@prisma/client';
import cycleService from './cycle.service.js';
import emailService from './email.service.js';
import feeWaiverService, { GROUP_CREATION_FEE_AMOUNT } from './feeWaiver.service.js';
import stripeService from './stripe.service.js';

interface CreateGroupData {
  name: string;
  description?: string;
  contributionAmount: number;
  frequency: Frequency;
  payoutFrequency?: Frequency;
  payoutMethod: PayoutMethod;
  maxMembers: number;
  startDate?: Date;
  createdById: string;
  feeWaiverCode?: string;
  paymentMethodId?: string;
}

interface JoinGroupData {
  inviteCode: string;
  userId: string;
  autoPaymentConsent: boolean;
}

class GroupService {
  /**
   * Create a new savings group
   */
  async createGroup(data: CreateGroupData) {
    const {
      name,
      description,
      contributionAmount,
      frequency,
      payoutFrequency,
      payoutMethod,
      maxMembers,
      startDate,
      createdById,
      feeWaiverCode,
      paymentMethodId,
    } = data;

    // Check if creator has both email and phone unverified
    const creator = await prisma.user.findUnique({
      where: { id: createdById },
      select: { emailVerified: true, phoneVerified: true },
    });

    if (creator && !creator.emailVerified && !creator.phoneVerified) {
      throw new Error('You must verify your email or phone number before creating a group');
    }

    // Check active group limit (PENDING or ACTIVE)
    const activeGroupCount = await prisma.membership.count({
      where: {
        userId: createdById,
        isActive: true,
        group: {
          status: { in: ['PENDING', 'ACTIVE'] },
        },
      },
    });

    if (activeGroupCount >= 5) {
      throw new Error('You cannot have more than 5 active groups at a time');
    }

    // Determine fee waiver eligibility
    const eligibility = await feeWaiverService.checkFeeWaiverEligibility(createdById);

    let feeWaived = !eligibility.feeRequired;
    let waiverReason: string | null = feeWaived ? 'COMPLETED_GROUPS' : null;
    let stripePaymentIntentId: string | null = null;

    // Check waiver code if fee is required and code is provided
    if (eligibility.feeRequired && feeWaiverCode) {
      const codeValidation = await feeWaiverService.validateCode(feeWaiverCode);
      if (!codeValidation.valid) {
        throw new Error(codeValidation.message);
      }
      feeWaived = true;
      waiverReason = `WAIVER_CODE:${feeWaiverCode.toUpperCase().trim()}`;
    }

    // Charge the fee via Stripe if not waived
    if (!feeWaived) {
      try {
        const chargeResult = await stripeService.chargePayment(
          createdById,
          GROUP_CREATION_FEE_AMOUNT,
          `group-creation-fee-${Date.now()}`,
          paymentMethodId
        );
        stripePaymentIntentId = chargeResult.paymentIntentId;
      } catch (error: any) {
        throw new Error(`Failed to charge group creation fee: ${error.message}`);
      }
    }

    // Create group and add creator as owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the group
      const group = await tx.group.create({
        data: {
          name,
          description,
          contributionAmount,
          frequency,
          payoutFrequency: payoutFrequency || null,
          payoutMethod,
          maxMembers,
          startDate,
          status: 'PENDING',
          currentMembers: 1,
          createdById,
        },
      });

      // Add creator as the first member (owner)
      await tx.membership.create({
        data: {
          groupId: group.id,
          userId: createdById,
          role: 'OWNER',
          payoutPosition: 1,
          isActive: true,
          autoPaymentConsented: true,
          autoPaymentConsentedAt: new Date(),
        },
      });

      // Record the creation fee
      await tx.groupCreationFee.create({
        data: {
          groupId: group.id,
          userId: createdById,
          amount: feeWaived ? 0 : GROUP_CREATION_FEE_AMOUNT,
          status: feeWaived ? 'WAIVED' : 'COMPLETED',
          waiverReason,
          stripePaymentIntentId,
        },
      });

      return group;
    });

    // Redeem waiver code after successful group creation (outside transaction to avoid blocking)
    if (feeWaiverCode && waiverReason?.startsWith('WAIVER_CODE:')) {
      try {
        await feeWaiverService.redeemCode(feeWaiverCode, createdById, result.id);
      } catch (error) {
        console.error('Failed to record waiver code usage:', error);
      }
    }

    return result;
  }

  /**
   * Join a group using invite code
   */
  async joinGroup(data: JoinGroupData) {
    const { inviteCode, userId, autoPaymentConsent } = data;

    if (!autoPaymentConsent) {
      throw new Error('You must consent to automatic payments before joining a group');
    }

    // Find the group by invite code
    const group = await prisma.group.findUnique({
      where: { inviteCode },
      include: {
        memberships: true,
      },
    });

    if (!group) {
      throw new Error('Invalid invite code');
    }

    // Check if group is full
    if (group.currentMembers >= group.maxMembers) {
      throw new Error('Group is full');
    }

    // Check if group has started
    if (group.status !== 'PENDING') {
      throw new Error('Group has already started or is closed');
    }

    // Check if user is already a member
    const existingMembership = await prisma.membership.findFirst({
      where: {
        groupId: group.id,
        userId: userId,
      },
    });

    if (existingMembership) {
      throw new Error('You are already a member of this group');
    }

    // Check if user has at least one payment method
    const paymentMethodCount = await prisma.paymentMethod.count({
      where: { userId },
    });

    if (paymentMethodCount === 0) {
      throw new Error('You must add a payment method before joining a group');
    }

    // Block users with outstanding debt from joining new groups
    const debtMemberships = await prisma.membership.findMany({
      where: {
        userId,
        outstandingDebt: { gt: 0 },
      },
      select: { outstandingDebt: true },
    });

    if (debtMemberships.length > 0) {
      const totalDebt = debtMemberships.reduce((sum, m) => sum + m.outstandingDebt, 0);
      throw new Error(`You cannot join a new group while you have $${totalDebt.toFixed(2)} in outstanding debt from missed payments. Please resolve your existing obligations first.`);
    }

    // Get user details for the new member
    const newMember = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    // Get group owner details
    const groupOwner = await prisma.user.findUnique({
      where: { id: group.createdById },
      select: {
        email: true,
        firstName: true,
      },
    });

    // Add user as member in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Calculate next payout position
      const nextPosition = group.currentMembers + 1;

      // Create membership
      const membership = await tx.membership.create({
        data: {
          groupId: group.id,
          userId: userId,
          role: 'MEMBER',
          payoutPosition: nextPosition,
          isActive: true,
          autoPaymentConsented: true,
          autoPaymentConsentedAt: new Date(),
        },
      });

      // Update group member count
      await tx.group.update({
        where: { id: group.id },
        data: {
          currentMembers: {
            increment: 1,
          },
        },
      });

      return membership;
    });

    // Send email notification to group owner
    if (groupOwner && newMember) {
      try {
        await emailService.sendMemberJoinedNotification(
          groupOwner.email,
          groupOwner.firstName,
          `${newMember.firstName} ${newMember.lastName}`,
          group.name
        );
      } catch (error) {
        console.error('Failed to send member joined email notification:', error);
        // Don't throw error - membership was created successfully
      }
    }

    return result;
  }

  /**
   * Get all groups for a user
   */
  async getUserGroups(userId: string) {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: userId,
        isActive: true,
      },
      include: {
        group: {
          include: {
            memberships: {
              where: { isActive: true },
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
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return memberships.map((m) => {
      const group = m.group;
      const isOwner = group.createdById === userId;

      // Non-owners can only see their own membership
      if (!isOwner) {
        return {
          ...group,
          memberships: group.memberships.filter((mem) => mem.userId === userId),
        };
      }

      return group;
    });
  }

  /**
   * Get group details by ID
   */
  async getGroupById(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                trustScore: true,
                emailVerified: true,
                phoneVerified: true,
              },
            },
          },
          orderBy: {
            payoutPosition: 'asc',
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user is a member and determine role
    const userMembership = group.memberships.find((m) => m.userId === userId);
    if (!userMembership) {
      throw new Error('You are not a member of this group');
    }

    const userRole = userMembership.role;

    // Non-owners can only see their own membership
    if (userRole !== 'OWNER') {
      return {
        ...group,
        memberships: group.memberships.filter((m) => m.userId === userId),
        userRole,
      };
    }

    return { ...group, userRole };
  }

  /**
   * Update group details (only owner can update)
   */
  async updateGroup(groupId: string, userId: string, updateData: Partial<CreateGroupData>) {
    // Check if user is the owner
    const membership = await prisma.membership.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'OWNER',
      },
    });

    if (!membership) {
      throw new Error('Only the group owner can update group details');
    }

    // Don't allow updates if group has started
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (group?.status !== 'PENDING') {
      throw new Error('Cannot update group after it has started');
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        name: updateData.name,
        description: updateData.description,
        contributionAmount: updateData.contributionAmount,
        frequency: updateData.frequency,
        payoutFrequency: updateData.payoutFrequency !== undefined ? (updateData.payoutFrequency || null) : undefined,
        payoutMethod: updateData.payoutMethod,
        maxMembers: updateData.maxMembers,
        startDate: updateData.startDate,
      },
    });

    return updatedGroup;
  }

  /**
   * Start a group (only owner can start, and only when group is full)
   */
  async startGroup(groupId: string, userId: string) {
    // Check if user is the owner
    const membership = await prisma.membership.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'OWNER',
      },
    });

    if (!membership) {
      throw new Error('Only the group owner can start the group');
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, firstName: true, emailVerified: true, phoneVerified: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.status !== 'PENDING') {
      throw new Error('Group has already started or is closed');
    }

    if (group.currentMembers < group.maxMembers) {
      throw new Error(`Group needs ${group.maxMembers - group.currentMembers} more members before starting`);
    }

    // Verify all members have at least one payment method
    const memberUserIds = group.memberships.map((m) => m.userId);
    const membersWithCards = await prisma.paymentMethod.groupBy({
      by: ['userId'],
      where: { userId: { in: memberUserIds } },
    });
    const usersWithCards = new Set(membersWithCards.map((m) => m.userId));

    if (usersWithCards.size < memberUserIds.length) {
      const missingMembers = await prisma.user.findMany({
        where: { id: { in: memberUserIds.filter((id) => !usersWithCards.has(id)) } },
        select: { firstName: true },
      });
      const names = missingMembers.map((m) => m.firstName).join(', ');
      throw new Error(`Cannot start group: the following members need to add a payment method: ${names}`);
    }

    // Check if group creator has both email and phone unverified
    const creatorMembership = group.memberships.find((m) => m.userId === userId);
    if (creatorMembership && !creatorMembership.user.emailVerified && !creatorMembership.user.phoneVerified) {
      throw new Error('You must verify your email or phone number before starting a group');
    }

    // Update group status to ACTIVE
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });

    // Create cycles for the group based on payout method
    await cycleService.createCyclesForGroup(groupId);

    return updatedGroup;
  }

  /**
   * Check if all members have a payment method (readiness to start)
   */
  async checkGroupReadiness(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, emailVerified: true, phoneVerified: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    const isMember = group.memberships.some((m) => m.userId === userId);
    if (!isMember) {
      throw new Error('You are not a member of this group');
    }

    const memberUserIds = group.memberships.map((m) => m.userId);
    const membersWithCards = await prisma.paymentMethod.groupBy({
      by: ['userId'],
      where: { userId: { in: memberUserIds } },
    });
    const usersWithCards = new Set(membersWithCards.map((m) => m.userId));

    const membersWithoutPaymentMethod = group.memberships
      .filter((m) => !usersWithCards.has(m.userId))
      .map((m) => ({ firstName: m.user.firstName, lastName: m.user.lastName }));

    // Members with both email and phone unverified
    const membersWithoutVerification = group.memberships
      .filter((m) => !m.user.emailVerified && !m.user.phoneVerified)
      .map((m) => ({ firstName: m.user.firstName, lastName: m.user.lastName }));

    return {
      ready: membersWithoutPaymentMethod.length === 0,
      membersWithoutPaymentMethod,
      membersWithoutVerification,
    };
  }

  /**
   * Reorder member payout positions (owner only, PENDING groups only)
   */
  async reorderPositions(groupId: string, userId: string, positions: { userId: string; payoutPosition: number }[]) {
    // Verify owner
    const membership = await prisma.membership.findFirst({
      where: { groupId, userId, role: 'OWNER' },
    });

    if (!membership) {
      throw new Error('Only the group owner can reorder payout positions');
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: { where: { isActive: true } },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.status !== 'PENDING') {
      throw new Error('Cannot reorder positions after the group has started');
    }

    // Validate that all active members are included exactly once
    const activeMemberIds = new Set(group.memberships.map(m => m.userId));
    const providedIds = new Set(positions.map(p => p.userId));
    const providedPositions = new Set(positions.map(p => p.payoutPosition));

    if (providedIds.size !== activeMemberIds.size) {
      throw new Error('Must provide positions for all active members');
    }

    for (const id of activeMemberIds) {
      if (!providedIds.has(id)) {
        throw new Error(`Missing position for member ${id}`);
      }
    }

    // Validate positions are sequential 1..N
    for (let i = 1; i <= activeMemberIds.size; i++) {
      if (!providedPositions.has(i)) {
        throw new Error(`Positions must be sequential from 1 to ${activeMemberIds.size}`);
      }
    }

    // Update positions in a transaction
    // Use a temp offset to avoid unique constraint violations during swap
    const offset = 1000;
    await prisma.$transaction([
      // First set all to temp positions (offset to avoid unique conflicts)
      ...positions.map(p =>
        prisma.membership.updateMany({
          where: { groupId, userId: p.userId },
          data: { payoutPosition: p.payoutPosition + offset },
        })
      ),
      // Then set to final positions
      ...positions.map(p =>
        prisma.membership.updateMany({
          where: { groupId, userId: p.userId },
          data: { payoutPosition: p.payoutPosition },
        })
      ),
    ]);

    // Return updated memberships
    return prisma.membership.findMany({
      where: { groupId, isActive: true },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { payoutPosition: 'asc' },
    });
  }

  /**
   * Delete/cancel a group (only owner can delete, and only before it starts)
   */
  async deleteGroup(groupId: string, userId: string) {
    // Check if user is the owner
    const membership = await prisma.membership.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'OWNER',
      },
    });

    if (!membership) {
      throw new Error('Only the group owner can delete the group');
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (group?.status !== 'PENDING') {
      throw new Error('Cannot delete group after it has started');
    }

    // Soft delete: Update status to CANCELLED
    const deletedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'CANCELLED',
      },
    });

    return deletedGroup;
  }
}

export default new GroupService();
