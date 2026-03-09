import { describe, it, expect, vi, beforeEach } from 'vitest';
import groupService from '../services/group.service.js';
import prisma from '../utils/prisma.js';

const mockPrisma = vi.mocked(prisma, true);

// Mock data
const mockMemberships = [
  { id: 'mem-1', groupId: 'group-1', userId: 'user-1', role: 'OWNER', payoutPosition: 1, isActive: true },
  { id: 'mem-2', groupId: 'group-1', userId: 'user-2', role: 'MEMBER', payoutPosition: 2, isActive: true },
  { id: 'mem-3', groupId: 'group-1', userId: 'user-3', role: 'MEMBER', payoutPosition: 3, isActive: true },
];

const mockGroup = {
  id: 'group-1',
  name: 'Test Group',
  status: 'PENDING',
  maxMembers: 3,
  currentMembers: 3,
  payoutMethod: 'SEQUENTIAL',
  memberships: mockMemberships,
};

describe('GroupService - reorderPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reorder positions successfully', async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(mockMemberships[0] as any);
    mockPrisma.group.findUnique.mockResolvedValue(mockGroup as any);
    mockPrisma.$transaction.mockResolvedValue([]);
    mockPrisma.membership.findMany.mockResolvedValue(
      mockMemberships.map(m => ({
        ...m,
        user: { id: m.userId, firstName: 'User', lastName: m.userId, email: `${m.userId}@test.com` },
      })) as any
    );

    const newPositions = [
      { userId: 'user-3', payoutPosition: 1 },
      { userId: 'user-1', payoutPosition: 2 },
      { userId: 'user-2', payoutPosition: 3 },
    ];

    const result = await groupService.reorderPositions('group-1', 'user-1', newPositions);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should reject if caller is not the owner', async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(null);

    await expect(
      groupService.reorderPositions('group-1', 'user-2', [
        { userId: 'user-1', payoutPosition: 1 },
        { userId: 'user-2', payoutPosition: 2 },
        { userId: 'user-3', payoutPosition: 3 },
      ])
    ).rejects.toThrow('Only the group owner can reorder payout positions');
  });

  it('should reject if group is not PENDING', async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(mockMemberships[0] as any);
    mockPrisma.group.findUnique.mockResolvedValue({
      ...mockGroup,
      status: 'ACTIVE',
    } as any);

    await expect(
      groupService.reorderPositions('group-1', 'user-1', [
        { userId: 'user-1', payoutPosition: 1 },
        { userId: 'user-2', payoutPosition: 2 },
        { userId: 'user-3', payoutPosition: 3 },
      ])
    ).rejects.toThrow('Cannot reorder positions after the group has started');
  });

  it('should reject if not all members are included', async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(mockMemberships[0] as any);
    mockPrisma.group.findUnique.mockResolvedValue(mockGroup as any);

    await expect(
      groupService.reorderPositions('group-1', 'user-1', [
        { userId: 'user-1', payoutPosition: 1 },
        { userId: 'user-2', payoutPosition: 2 },
        // Missing user-3
      ])
    ).rejects.toThrow('Must provide positions for all active members');
  });

  it('should reject if positions are not sequential', async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(mockMemberships[0] as any);
    mockPrisma.group.findUnique.mockResolvedValue(mockGroup as any);

    await expect(
      groupService.reorderPositions('group-1', 'user-1', [
        { userId: 'user-1', payoutPosition: 1 },
        { userId: 'user-2', payoutPosition: 2 },
        { userId: 'user-3', payoutPosition: 5 }, // Gap in positions
      ])
    ).rejects.toThrow('Positions must be sequential from 1 to 3');
  });

  it('should reject if group not found', async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(mockMemberships[0] as any);
    mockPrisma.group.findUnique.mockResolvedValue(null);

    await expect(
      groupService.reorderPositions('group-999', 'user-1', [
        { userId: 'user-1', payoutPosition: 1 },
        { userId: 'user-2', payoutPosition: 2 },
        { userId: 'user-3', payoutPosition: 3 },
      ])
    ).rejects.toThrow('Group not found');
  });

  it('should reject if unknown user is in positions array', async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(mockMemberships[0] as any);
    mockPrisma.group.findUnique.mockResolvedValue(mockGroup as any);

    await expect(
      groupService.reorderPositions('group-1', 'user-1', [
        { userId: 'user-1', payoutPosition: 1 },
        { userId: 'user-2', payoutPosition: 2 },
        { userId: 'user-unknown', payoutPosition: 3 }, // Not a member
      ])
    ).rejects.toThrow(); // Should fail on validation
  });
});
