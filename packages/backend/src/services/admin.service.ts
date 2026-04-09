import prisma from '../utils/prisma.js';

class AdminService {
  async getDashboardStats() {
    const [totalUsers, totalGroups, activeGroups] = await Promise.all([
      prisma.user.count(),
      prisma.group.count(),
      prisma.group.count({ where: { status: 'ACTIVE' } }),
    ]);

    return { totalUsers, totalGroups, activeGroups };
  }

  async getAllUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerified: true,
          trustScore: true,
          groupCreationSuspended: true,
          createdAt: true,
          _count: { select: { memberships: true } },
        },
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteUser(userId: string, blockEmail: boolean = false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'SUPERADMIN') {
      throw new Error('Cannot delete a superadmin user');
    }

    await prisma.user.delete({ where: { id: userId } });

    if (blockEmail) {
      await prisma.blockedEmail.upsert({
        where: { email: user.email.toLowerCase().trim() },
        update: {},
        create: {
          email: user.email.toLowerCase().trim(),
          reason: `Blocked on deletion of user ${userId}`,
        },
      });
    }

    return { deletedEmail: user.email, emailBlocked: blockEmail };
  }

  async unblockEmail(email: string) {
    const blocked = await prisma.blockedEmail.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!blocked) {
      throw new Error('Email is not blocked');
    }

    await prisma.blockedEmail.delete({ where: { id: blocked.id } });
    return { email: blocked.email };
  }

  async getBlockedEmails(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.blockedEmail.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blockedEmail.count(),
    ]);

    return {
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllGroups(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          contributionAmount: true,
          frequency: true,
          maxMembers: true,
          currentMembers: true,
          createdAt: true,
          createdBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.group.count(),
    ]);

    return {
      groups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGroupDetails(groupId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        memberships: {
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
          orderBy: { payoutPosition: 'asc' },
        },
        cycles: {
          include: {
            payout: {
              include: {
                recipient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { cycleNumber: 'asc' },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    return group;
  }

  async toggleGroupCreationSuspension(userId: string, suspended: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'SUPERADMIN') {
      throw new Error('Cannot suspend a superadmin user');
    }

    return prisma.user.update({
      where: { id: userId },
      data: { groupCreationSuspended: suspended },
      select: { id: true, email: true, groupCreationSuspended: true },
    });
  }

  async getGroupCreatorEmails(): Promise<string[]> {
    const creators = await prisma.user.findMany({
      where: {
        createdGroups: { some: {} },
      },
      select: { email: true },
      distinct: ['email'],
    });

    return creators.map((c) => c.email);
  }

  async deleteGroup(groupId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    await prisma.group.delete({ where: { id: groupId } });
    return { deletedGroup: group.name };
  }
}

export default new AdminService();
