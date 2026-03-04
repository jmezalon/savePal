import prisma from '../utils/prisma.js';
import crypto from 'crypto';

const GROUP_CREATION_FEE = 10.0;
const COMPLETED_GROUPS_THRESHOLD = 2;

class FeeWaiverService {
  /**
   * Generate a short, human-friendly alphanumeric code
   */
  private generateCodeString(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, 1, I)
    const bytes = crypto.randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  /**
   * Create a new fee waiver code
   */
  async generateCode(description?: string, maxUses?: number) {
    let code: string;
    let attempts = 0;

    // Ensure uniqueness
    do {
      code = this.generateCodeString();
      const existing = await prisma.feeWaiverCode.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Failed to generate a unique code');
    }

    return prisma.feeWaiverCode.create({
      data: {
        code: code!,
        description,
        maxUses: maxUses ?? null,
        isActive: true,
      },
    });
  }

  /**
   * Validate a waiver code (check exists, active, and not exhausted)
   */
  async validateCode(code: string): Promise<{ valid: boolean; message: string }> {
    const waiverCode = await prisma.feeWaiverCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!waiverCode) {
      return { valid: false, message: 'Invalid waiver code' };
    }

    if (!waiverCode.isActive) {
      return { valid: false, message: 'This waiver code is no longer active' };
    }

    if (waiverCode.maxUses !== null && waiverCode.currentUses >= waiverCode.maxUses) {
      return { valid: false, message: 'This waiver code has reached its usage limit' };
    }

    return { valid: true, message: 'Waiver code is valid' };
  }

  /**
   * Redeem a waiver code — increment usage and record who used it
   */
  async redeemCode(code: string, userId: string, groupId: string) {
    const normalizedCode = code.toUpperCase().trim();

    const waiverCode = await prisma.feeWaiverCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!waiverCode) {
      throw new Error('Invalid waiver code');
    }

    await prisma.$transaction(async (tx) => {
      // Increment usage count
      await tx.feeWaiverCode.update({
        where: { id: waiverCode.id },
        data: { currentUses: { increment: 1 } },
      });

      // Record usage
      await tx.feeWaiverCodeUsage.create({
        data: {
          codeId: waiverCode.id,
          userId,
          groupId,
        },
      });
    });
  }

  /**
   * Count how many groups this user has completed as owner
   */
  async getUserCompletedGroupCount(userId: string): Promise<number> {
    return prisma.group.count({
      where: {
        createdById: userId,
        status: 'COMPLETED',
      },
    });
  }

  /**
   * Determine if the user qualifies for a fee waiver and the reason
   */
  async checkFeeWaiverEligibility(userId: string): Promise<{
    feeRequired: boolean;
    amount: number;
    reason: string;
    completedGroups: number;
  }> {
    const completedGroups = await this.getUserCompletedGroupCount(userId);

    if (completedGroups >= COMPLETED_GROUPS_THRESHOLD) {
      return {
        feeRequired: false,
        amount: 0,
        reason: `Fee waived — you've completed ${completedGroups} group${completedGroups > 1 ? 's' : ''} as owner`,
        completedGroups,
      };
    }

    return {
      feeRequired: true,
      amount: GROUP_CREATION_FEE,
      reason: `$${GROUP_CREATION_FEE.toFixed(2)} group creation fee (waived after ${COMPLETED_GROUPS_THRESHOLD} completed groups)`,
      completedGroups,
    };
  }

  /**
   * Record a group creation fee (paid or waived)
   */
  async recordCreationFee(params: {
    groupId: string;
    userId: string;
    amount: number;
    status: 'COMPLETED' | 'WAIVED';
    waiverReason?: string;
    stripePaymentIntentId?: string;
  }) {
    return prisma.groupCreationFee.create({
      data: {
        groupId: params.groupId,
        userId: params.userId,
        amount: params.amount,
        status: params.status,
        waiverReason: params.waiverReason ?? null,
        stripePaymentIntentId: params.stripePaymentIntentId ?? null,
      },
    });
  }

  /**
   * Get all waiver codes (admin)
   */
  async getAllCodes(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [codes, total] = await Promise.all([
      prisma.feeWaiverCode.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { usages: true } },
        },
      }),
      prisma.feeWaiverCode.count(),
    ]);

    return {
      codes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Toggle a waiver code active/inactive (admin)
   */
  async toggleCode(codeId: string, isActive: boolean) {
    const code = await prisma.feeWaiverCode.findUnique({ where: { id: codeId } });
    if (!code) {
      throw new Error('Waiver code not found');
    }

    return prisma.feeWaiverCode.update({
      where: { id: codeId },
      data: { isActive },
    });
  }
}

export const GROUP_CREATION_FEE_AMOUNT = GROUP_CREATION_FEE;
export default new FeeWaiverService();
