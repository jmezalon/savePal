import prisma from '../utils/prisma.js';
import { Frequency, PayoutMethod, GroupStatus, MemberRole } from '@prisma/client';

interface CreateGroupData {
  name: string;
  description?: string;
  contributionAmount: number;
  frequency: Frequency;
  payoutMethod: PayoutMethod;
  maxMembers: number;
  startDate?: Date;
  createdById: string;
}

interface JoinGroupData {
  inviteCode: string;
  userId: string;
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
    const { inviteCode, userId } = data;

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

    return memberships.map((m) => m.group);
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
        cycles: {
          include: {
            recipient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            cycleNumber: 'asc',
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user is a member
    const isMember = group.memberships.some((m) => m.userId === userId);
    if (!isMember) {
      throw new Error('You are not a member of this group');
    }

    return group;
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

    // Update group status to ACTIVE
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });

    // TODO: Create cycles for the group based on payout method
    // This will be implemented when we add the cycle/payment logic

    return updatedGroup;
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
