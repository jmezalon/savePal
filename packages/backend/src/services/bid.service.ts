import prisma from '../utils/prisma.js';

class BidService {
  /**
   * Place or update a bid for a cycle
   */
  async placeBid(cycleId: string, userId: string, amount: number) {
    if (amount <= 0) {
      throw new Error('Bid amount must be greater than 0');
    }

    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      include: {
        group: {
          include: {
            memberships: { where: { isActive: true } },
          },
        },
      },
    });

    if (!cycle) {
      throw new Error('Cycle not found');
    }

    if (cycle.group.payoutMethod !== 'BIDDING') {
      throw new Error('This group does not use bidding');
    }

    if (cycle.biddingStatus !== 'OPEN') {
      throw new Error('Bidding is not open for this cycle');
    }

    if (cycle.isCompleted) {
      throw new Error('This cycle is already completed');
    }

    // Verify user is an active member
    const membership = cycle.group.memberships.find(m => m.userId === userId);
    if (!membership) {
      throw new Error('You are not a member of this group');
    }

    // Check that user hasn't already won a previous cycle in this group
    const previousWins = await prisma.cycle.findMany({
      where: {
        groupId: cycle.groupId,
        recipientId: userId,
        biddingStatus: 'CLOSED',
      },
    });

    if (previousWins.length > 0) {
      throw new Error('You have already received a payout in this group');
    }

    // Validate bid doesn't exceed the payout amount
    if (amount >= cycle.totalAmount) {
      throw new Error('Bid amount cannot exceed the payout amount');
    }

    // Upsert the bid (one bid per user per cycle)
    const bid = await prisma.bid.upsert({
      where: {
        cycleId_userId: { cycleId, userId },
      },
      update: { amount },
      create: { cycleId, userId, amount },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return bid;
  }

  /**
   * Get all bids for a cycle
   */
  async getBidsForCycle(cycleId: string, userId: string) {
    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      include: {
        group: {
          include: {
            memberships: { where: { isActive: true } },
          },
        },
      },
    });

    if (!cycle) {
      throw new Error('Cycle not found');
    }

    // Verify user is a member
    const isMember = cycle.group.memberships.some(m => m.userId === userId);
    if (!isMember) {
      throw new Error('You are not a member of this group');
    }

    const bids = await prisma.bid.findMany({
      where: { cycleId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { amount: 'desc' },
    });

    // Non-owners can only see their own bid details
    const isOwner = cycle.group.memberships.some(m => m.userId === userId && m.role === 'OWNER');
    if (!isOwner) {
      return bids.map(bid => ({
        ...bid,
        amount: bid.userId === userId ? bid.amount : undefined,
        user: bid.userId === userId ? bid.user : { id: bid.userId, firstName: bid.user.firstName, lastName: '' },
      }));
    }

    return bids;
  }

  /**
   * Resolve bidding for a cycle - highest bidder wins
   * Only the group owner can resolve
   */
  async resolveBidding(cycleId: string, userId: string) {
    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      include: {
        group: {
          include: {
            memberships: { where: { isActive: true } },
          },
        },
        bids: {
          orderBy: { amount: 'desc' },
        },
      },
    });

    if (!cycle) {
      throw new Error('Cycle not found');
    }

    // Verify owner
    const ownerMembership = cycle.group.memberships.find(
      m => m.userId === userId && m.role === 'OWNER'
    );
    if (!ownerMembership) {
      throw new Error('Only the group owner can resolve bidding');
    }

    if (cycle.biddingStatus !== 'OPEN') {
      throw new Error('Bidding is not open for this cycle');
    }

    if (cycle.bids.length === 0) {
      throw new Error('No bids have been placed for this cycle');
    }

    // Highest bid wins
    const winningBid = cycle.bids[0];

    // Update cycle with winner and close bidding
    const updatedCycle = await prisma.cycle.update({
      where: { id: cycleId },
      data: {
        recipientId: winningBid.userId,
        biddingStatus: 'CLOSED',
      },
      include: {
        bids: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { amount: 'desc' },
        },
      },
    });

    return {
      cycle: updatedCycle,
      winningBid,
      winnerUserId: winningBid.userId,
      bidFee: winningBid.amount,
    };
  }

  /**
   * Get eligible bidders for a cycle (members who haven't won a payout yet)
   */
  async getEligibleBidders(cycleId: string) {
    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      include: {
        group: {
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
        },
      },
    });

    if (!cycle) {
      throw new Error('Cycle not found');
    }

    // Find members who already won a cycle
    const wonCycles = await prisma.cycle.findMany({
      where: {
        groupId: cycle.groupId,
        recipientId: { not: null },
        biddingStatus: 'CLOSED',
      },
      select: { recipientId: true },
    });

    const winnersSet = new Set(wonCycles.map(c => c.recipientId));

    return cycle.group.memberships
      .filter(m => !winnersSet.has(m.userId))
      .map(m => m.user);
  }
}

export default new BidService();
