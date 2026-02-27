import prisma from '../utils/prisma.js';
import { Frequency, PayoutMethod } from '@prisma/client';
import cycleService from './cycle.service.js';
import emailService from './email.service.js';

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
    } = data;

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

      return group;
    });

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
              select: { id: true, firstName: true, lastName: true },
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

    return {
      ready: membersWithoutPaymentMethod.length === 0,
      membersWithoutPaymentMethod,
    };
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
