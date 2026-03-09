import { describe, it, expect, vi, beforeEach } from 'vitest';
import bidService from '../services/bid.service.js';
import prisma from '../utils/prisma.js';

const mockPrisma = vi.mocked(prisma, true);

// Mock data
const mockGroup = {
  id: 'group-1',
  name: 'Test Bidding Group',
  payoutMethod: 'BIDDING',
  maxMembers: 3,
  currentMembers: 3,
  contributionAmount: 100,
  frequency: 'MONTHLY',
  payoutFrequency: null,
  status: 'ACTIVE',
  memberships: [
    { id: 'mem-1', userId: 'user-1', role: 'OWNER', payoutPosition: 1, isActive: true },
    { id: 'mem-2', userId: 'user-2', role: 'MEMBER', payoutPosition: 2, isActive: true },
    { id: 'mem-3', userId: 'user-3', role: 'MEMBER', payoutPosition: 3, isActive: true },
  ],
};

const mockCycleBiddingOpen = {
  id: 'cycle-1',
  groupId: 'group-1',
  cycleNumber: 1,
  recipientId: null,
  dueDate: new Date('2026-04-01'),
  totalAmount: 300,
  isCompleted: false,
  biddingStatus: 'OPEN',
  group: mockGroup,
  bids: [],
};

describe('BidService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('placeBid', () => {
    it('should place a bid successfully', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue(mockCycleBiddingOpen as any);
      mockPrisma.cycle.findMany.mockResolvedValue([]); // No previous wins
      mockPrisma.bid.upsert.mockResolvedValue({
        id: 'bid-1',
        cycleId: 'cycle-1',
        userId: 'user-2',
        amount: 25,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-2', firstName: 'Jane', lastName: 'Doe' },
      } as any);

      const result = await bidService.placeBid('cycle-1', 'user-2', 25);

      expect(result.amount).toBe(25);
      expect(result.userId).toBe('user-2');
      expect(mockPrisma.bid.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cycleId_userId: { cycleId: 'cycle-1', userId: 'user-2' } },
          update: { amount: 25 },
          create: { cycleId: 'cycle-1', userId: 'user-2', amount: 25 },
        })
      );
    });

    it('should reject bid with amount <= 0', async () => {
      await expect(bidService.placeBid('cycle-1', 'user-2', 0)).rejects.toThrow(
        'Bid amount must be greater than 0'
      );
      await expect(bidService.placeBid('cycle-1', 'user-2', -5)).rejects.toThrow(
        'Bid amount must be greater than 0'
      );
    });

    it('should reject bid if group is not bidding type', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue({
        ...mockCycleBiddingOpen,
        group: { ...mockGroup, payoutMethod: 'SEQUENTIAL' },
      } as any);

      await expect(bidService.placeBid('cycle-1', 'user-2', 25)).rejects.toThrow(
        'This group does not use bidding'
      );
    });

    it('should reject bid if bidding is not open', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue({
        ...mockCycleBiddingOpen,
        biddingStatus: 'CLOSED',
      } as any);

      await expect(bidService.placeBid('cycle-1', 'user-2', 25)).rejects.toThrow(
        'Bidding is not open for this cycle'
      );
    });

    it('should reject bid if cycle is completed', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue({
        ...mockCycleBiddingOpen,
        isCompleted: true,
      } as any);

      await expect(bidService.placeBid('cycle-1', 'user-2', 25)).rejects.toThrow(
        'This cycle is already completed'
      );
    });

    it('should reject bid from non-member', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue(mockCycleBiddingOpen as any);

      await expect(bidService.placeBid('cycle-1', 'user-999', 25)).rejects.toThrow(
        'You are not a member of this group'
      );
    });

    it('should reject bid from member who already won a payout', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue(mockCycleBiddingOpen as any);
      mockPrisma.cycle.findMany.mockResolvedValue([
        { id: 'cycle-prev', recipientId: 'user-2', biddingStatus: 'CLOSED' },
      ] as any);

      await expect(bidService.placeBid('cycle-1', 'user-2', 25)).rejects.toThrow(
        'You have already received a payout in this group'
      );
    });

    it('should reject bid that exceeds payout amount', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue(mockCycleBiddingOpen as any);
      mockPrisma.cycle.findMany.mockResolvedValue([]);

      await expect(bidService.placeBid('cycle-1', 'user-2', 300)).rejects.toThrow(
        'Bid amount cannot exceed the payout amount'
      );
    });

    it('should reject bid for non-existent cycle', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue(null);

      await expect(bidService.placeBid('cycle-999', 'user-2', 25)).rejects.toThrow(
        'Cycle not found'
      );
    });
  });

  describe('getBidsForCycle', () => {
    it('should return all bids with amounts for owner', async () => {
      const mockBids = [
        { id: 'bid-1', cycleId: 'cycle-1', userId: 'user-2', amount: 50, user: { id: 'user-2', firstName: 'Jane', lastName: 'Doe' } },
        { id: 'bid-2', cycleId: 'cycle-1', userId: 'user-3', amount: 25, user: { id: 'user-3', firstName: 'Bob', lastName: 'Smith' } },
      ];

      mockPrisma.cycle.findUnique.mockResolvedValue(mockCycleBiddingOpen as any);
      mockPrisma.bid.findMany.mockResolvedValue(mockBids as any);

      const result = await bidService.getBidsForCycle('cycle-1', 'user-1'); // owner

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(50);
      expect(result[1].amount).toBe(25);
    });

    it('should hide other members bid amounts for non-owner', async () => {
      const mockBids = [
        { id: 'bid-1', cycleId: 'cycle-1', userId: 'user-2', amount: 50, user: { id: 'user-2', firstName: 'Jane', lastName: 'Doe' } },
        { id: 'bid-2', cycleId: 'cycle-1', userId: 'user-3', amount: 25, user: { id: 'user-3', firstName: 'Bob', lastName: 'Smith' } },
      ];

      mockPrisma.cycle.findUnique.mockResolvedValue(mockCycleBiddingOpen as any);
      mockPrisma.bid.findMany.mockResolvedValue(mockBids as any);

      const result = await bidService.getBidsForCycle('cycle-1', 'user-2'); // non-owner

      expect(result).toHaveLength(2);
      // Own bid should have amount visible
      const ownBid = result.find(b => b.userId === 'user-2');
      expect(ownBid?.amount).toBe(50);
      // Other's bid should not have amount
      const otherBid = result.find(b => b.userId === 'user-3');
      expect(otherBid?.amount).toBeUndefined();
    });

    it('should reject for non-member', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue(mockCycleBiddingOpen as any);

      await expect(bidService.getBidsForCycle('cycle-1', 'user-999')).rejects.toThrow(
        'You are not a member of this group'
      );
    });
  });

  describe('resolveBidding', () => {
    it('should resolve bidding and assign highest bidder as winner', async () => {
      const cycleWithBids = {
        ...mockCycleBiddingOpen,
        bids: [
          { id: 'bid-1', cycleId: 'cycle-1', userId: 'user-2', amount: 50 },
          { id: 'bid-2', cycleId: 'cycle-1', userId: 'user-3', amount: 25 },
        ],
      };

      mockPrisma.cycle.findUnique.mockResolvedValue(cycleWithBids as any);
      mockPrisma.cycle.update.mockResolvedValue({
        ...cycleWithBids,
        recipientId: 'user-2',
        biddingStatus: 'CLOSED',
      } as any);

      const result = await bidService.resolveBidding('cycle-1', 'user-1');

      expect(result.winnerUserId).toBe('user-2');
      expect(result.bidFee).toBe(50);
      expect(mockPrisma.cycle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cycle-1' },
          data: { recipientId: 'user-2', biddingStatus: 'CLOSED' },
        })
      );
    });

    it('should reject if not the owner', async () => {
      const cycleWithBids = {
        ...mockCycleBiddingOpen,
        bids: [{ id: 'bid-1', cycleId: 'cycle-1', userId: 'user-2', amount: 50 }],
      };

      mockPrisma.cycle.findUnique.mockResolvedValue(cycleWithBids as any);

      await expect(bidService.resolveBidding('cycle-1', 'user-2')).rejects.toThrow(
        'Only the group owner can resolve bidding'
      );
    });

    it('should reject if bidding is not open', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue({
        ...mockCycleBiddingOpen,
        biddingStatus: 'CLOSED',
        bids: [],
      } as any);

      await expect(bidService.resolveBidding('cycle-1', 'user-1')).rejects.toThrow(
        'Bidding is not open for this cycle'
      );
    });

    it('should reject if no bids have been placed', async () => {
      mockPrisma.cycle.findUnique.mockResolvedValue({
        ...mockCycleBiddingOpen,
        bids: [],
      } as any);

      await expect(bidService.resolveBidding('cycle-1', 'user-1')).rejects.toThrow(
        'No bids have been placed for this cycle'
      );
    });
  });

  describe('getEligibleBidders', () => {
    it('should return members who have not won a payout yet', async () => {
      const cycleWithGroup = {
        ...mockCycleBiddingOpen,
        group: {
          ...mockGroup,
          memberships: [
            { userId: 'user-1', user: { id: 'user-1', firstName: 'Alice', lastName: 'Owner' } },
            { userId: 'user-2', user: { id: 'user-2', firstName: 'Jane', lastName: 'Doe' } },
            { userId: 'user-3', user: { id: 'user-3', firstName: 'Bob', lastName: 'Smith' } },
          ],
        },
      };

      mockPrisma.cycle.findUnique.mockResolvedValue(cycleWithGroup as any);
      // user-1 already won cycle 0 (via bidding)
      mockPrisma.cycle.findMany.mockResolvedValue([
        { recipientId: 'user-1', biddingStatus: 'CLOSED' },
      ] as any);

      const result = await bidService.getEligibleBidders('cycle-1');

      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['user-2', 'user-3']);
    });

    it('should return all members if no one has won yet', async () => {
      const cycleWithGroup = {
        ...mockCycleBiddingOpen,
        group: {
          ...mockGroup,
          memberships: [
            { userId: 'user-1', user: { id: 'user-1', firstName: 'Alice', lastName: 'Owner' } },
            { userId: 'user-2', user: { id: 'user-2', firstName: 'Jane', lastName: 'Doe' } },
            { userId: 'user-3', user: { id: 'user-3', firstName: 'Bob', lastName: 'Smith' } },
          ],
        },
      };

      mockPrisma.cycle.findUnique.mockResolvedValue(cycleWithGroup as any);
      mockPrisma.cycle.findMany.mockResolvedValue([] as any);

      const result = await bidService.getEligibleBidders('cycle-1');

      expect(result).toHaveLength(3);
    });
  });
});
