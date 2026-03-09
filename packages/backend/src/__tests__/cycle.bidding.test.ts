import { describe, it, expect, vi, beforeEach } from 'vitest';
import cycleService from '../services/cycle.service.js';
import prisma from '../utils/prisma.js';

const mockPrisma = vi.mocked(prisma, true);

const baseMemberships = [
  { id: 'mem-1', userId: 'user-1', role: 'OWNER', payoutPosition: 1, isActive: true },
  { id: 'mem-2', userId: 'user-2', role: 'MEMBER', payoutPosition: 2, isActive: true },
  { id: 'mem-3', userId: 'user-3', role: 'MEMBER', payoutPosition: 3, isActive: true },
];

describe('CycleService - createCyclesForGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create cycles for BIDDING group with null recipientId and first cycle OPEN', async () => {
    const biddingGroup = {
      id: 'group-bidding',
      status: 'ACTIVE',
      payoutMethod: 'BIDDING',
      maxMembers: 3,
      frequency: 'MONTHLY',
      payoutFrequency: null,
      contributionAmount: 100,
      startDate: new Date('2026-04-01'),
      memberships: baseMemberships,
    };

    mockPrisma.group.findUnique.mockResolvedValue(biddingGroup as any);

    // Capture what's passed to $transaction
    const createdCycles: any[] = [];
    mockPrisma.$transaction.mockImplementation(async (calls: any) => {
      // calls is an array of PrismaPromise
      const results = [];
      for (const call of calls) {
        results.push(call);
      }
      return results;
    });

    // Mock prisma.cycle.create to capture data
    mockPrisma.cycle.create.mockImplementation(({ data }: any) => {
      createdCycles.push(data);
      return { ...data, id: `cycle-${data.cycleNumber}` } as any;
    });

    // Mock createPaymentsForCycle dependencies
    mockPrisma.cycle.findUnique.mockResolvedValue({
      id: 'cycle-1',
      cycleNumber: 1,
      groupId: 'group-bidding',
    } as any);
    mockPrisma.payment.createMany.mockResolvedValue({ count: 3 } as any);

    await cycleService.createCyclesForGroup('group-bidding');

    // Verify $transaction was called with 3 cycle creates
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    const transactionArg = mockPrisma.$transaction.mock.calls[0][0];
    expect(transactionArg).toHaveLength(3);

    // Verify cycles were created without recipientIds for BIDDING
    // Since prisma.cycle.create is called, let's check the mock calls
    const createCalls = mockPrisma.cycle.create.mock.calls;
    expect(createCalls).toHaveLength(3);

    // First cycle should have biddingStatus OPEN
    expect(createCalls[0][0].data.recipientId).toBeNull();
    expect(createCalls[0][0].data.biddingStatus).toBe('OPEN');

    // Subsequent cycles should have biddingStatus null (opened later)
    expect(createCalls[1][0].data.recipientId).toBeNull();
    expect(createCalls[1][0].data.biddingStatus).toBeNull();

    expect(createCalls[2][0].data.recipientId).toBeNull();
    expect(createCalls[2][0].data.biddingStatus).toBeNull();
  });

  it('should create cycles for SEQUENTIAL group with assigned recipientIds', async () => {
    const seqGroup = {
      id: 'group-seq',
      status: 'ACTIVE',
      payoutMethod: 'SEQUENTIAL',
      maxMembers: 3,
      frequency: 'MONTHLY',
      payoutFrequency: null,
      contributionAmount: 100,
      startDate: new Date('2026-04-01'),
      memberships: baseMemberships,
    };

    mockPrisma.group.findUnique.mockResolvedValue(seqGroup as any);
    mockPrisma.$transaction.mockImplementation(async (calls: any) => calls);
    mockPrisma.cycle.create.mockImplementation(({ data }: any) => ({ ...data, id: `cycle-${data.cycleNumber}` }) as any);
    mockPrisma.cycle.findUnique.mockResolvedValue({ id: 'cycle-1', cycleNumber: 1, groupId: 'group-seq' } as any);
    mockPrisma.payment.createMany.mockResolvedValue({ count: 3 } as any);

    await cycleService.createCyclesForGroup('group-seq');

    const createCalls = mockPrisma.cycle.create.mock.calls;
    expect(createCalls).toHaveLength(3);

    // Sequential should assign recipients in order
    expect(createCalls[0][0].data.recipientId).toBe('user-1');
    expect(createCalls[1][0].data.recipientId).toBe('user-2');
    expect(createCalls[2][0].data.recipientId).toBe('user-3');

    // No bidding status for sequential
    expect(createCalls[0][0].data.biddingStatus).toBeNull();
  });

  it('should create cycles for RANDOM group with shuffled recipientIds', async () => {
    const randomGroup = {
      id: 'group-random',
      status: 'ACTIVE',
      payoutMethod: 'RANDOM',
      maxMembers: 3,
      frequency: 'MONTHLY',
      payoutFrequency: null,
      contributionAmount: 100,
      startDate: new Date('2026-04-01'),
      memberships: baseMemberships,
    };

    mockPrisma.group.findUnique.mockResolvedValue(randomGroup as any);
    mockPrisma.$transaction.mockImplementation(async (calls: any) => calls);
    mockPrisma.cycle.create.mockImplementation(({ data }: any) => ({ ...data, id: `cycle-${data.cycleNumber}` }) as any);
    mockPrisma.cycle.findUnique.mockResolvedValue({ id: 'cycle-1', cycleNumber: 1, groupId: 'group-random' } as any);
    mockPrisma.payment.createMany.mockResolvedValue({ count: 3 } as any);

    await cycleService.createCyclesForGroup('group-random');

    const createCalls = mockPrisma.cycle.create.mock.calls;
    expect(createCalls).toHaveLength(3);

    // All recipient IDs should be present (just potentially shuffled)
    const assignedRecipients = createCalls.map((c: any) => c[0].data.recipientId);
    expect(assignedRecipients).toContain('user-1');
    expect(assignedRecipients).toContain('user-2');
    expect(assignedRecipients).toContain('user-3');

    // No bidding status for random
    expect(createCalls[0][0].data.biddingStatus).toBeNull();
  });

  it('should reject if group is not active', async () => {
    mockPrisma.group.findUnique.mockResolvedValue({
      id: 'group-1',
      status: 'PENDING',
      memberships: baseMemberships,
    } as any);

    await expect(cycleService.createCyclesForGroup('group-1')).rejects.toThrow(
      'Group must be active to create cycles'
    );
  });

  it('should reject if group is not full', async () => {
    mockPrisma.group.findUnique.mockResolvedValue({
      id: 'group-1',
      status: 'ACTIVE',
      maxMembers: 3,
      memberships: baseMemberships.slice(0, 2), // Only 2 of 3
    } as any);

    await expect(cycleService.createCyclesForGroup('group-1')).rejects.toThrow(
      'Group is not full'
    );
  });
});

describe('CycleService - completeCycle bidding enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject completing a cycle with no recipientId (unresolved bidding)', async () => {
    mockPrisma.membership.findFirst.mockResolvedValue({ role: 'OWNER' } as any);
    mockPrisma.cycle.findUnique.mockResolvedValue({ groupId: 'group-1' } as any);

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        $queryRaw: vi.fn().mockResolvedValue([{
          id: 'cycle-1',
          isCompleted: false,
          totalAmount: 300,
          recipientId: null, // Bidding not resolved
          groupId: 'group-1',
          cycleNumber: 1,
        }]),
        payment: { findMany: vi.fn() },
        cycle: { update: vi.fn(), findFirst: vi.fn() },
        payout: { create: vi.fn() },
        group: { update: vi.fn(), findUnique: vi.fn() },
      });
    });

    await expect(cycleService.completeCycle('cycle-1', 'user-1')).rejects.toThrow(
      'Bidding must be resolved before completing this cycle'
    );
  });
});
