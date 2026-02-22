import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'SUPERADMIN') {
      res.status(403).json({
        success: false,
        error: 'Access denied. Superadmin privileges required.',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify admin privileges',
    });
  }
}
