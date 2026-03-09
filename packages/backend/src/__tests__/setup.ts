import { vi } from 'vitest';

// Mock Prisma client - prevents any real database connections
vi.mock('../utils/prisma.js', () => {
  const mockPrisma = {
    group: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    cycle: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    bid: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    payout: {
      create: vi.fn(),
    },
    paymentMethod: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };

  return { default: mockPrisma, prisma: mockPrisma };
});

// Mock external services to prevent side effects
vi.mock('../services/payout.service.js', () => ({
  default: { processPayout: vi.fn() },
}));

vi.mock('../services/notification.service.js', () => ({
  default: { sendPayoutPendingNotification: vi.fn() },
}));

vi.mock('../services/email.service.js', () => ({
  default: { sendMemberJoinedNotification: vi.fn() },
}));

vi.mock('../services/stripe.service.js', () => ({
  default: { chargePayment: vi.fn() },
}));

vi.mock('../services/feeWaiver.service.js', () => ({
  default: {
    checkFeeWaiverEligibility: vi.fn(),
    validateCode: vi.fn(),
    redeemCode: vi.fn(),
  },
  GROUP_CREATION_FEE_AMOUNT: 5,
}));
