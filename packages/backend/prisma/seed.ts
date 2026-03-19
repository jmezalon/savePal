import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper to create dates relative to now
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log('🌱 Starting seed...');

  // Clear all tables in reverse dependency order
  console.log('Clearing existing data...');
  await prisma.feeWaiverCodeUsage.deleteMany();
  await prisma.groupCreationFee.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.feeWaiverCode.deleteMany();
  await prisma.user.deleteMany();

  // ==========================================
  // USERS
  // ==========================================
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@savepal-dev.com',
      password: hashedPassword,
      firstName: 'Max',
      lastName: 'Admin',
      phoneNumber: '+15551000001',
      emailVerified: true,
      phoneVerified: true,
      trustScore: 100,
      role: 'SUPERADMIN',
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
    },
  });

  const alice = await prisma.user.create({
    data: {
      email: 'alice.johnson@savepal-dev.com',
      password: hashedPassword,
      firstName: 'Alice',
      lastName: 'Johnson',
      phoneNumber: '+15551000002',
      emailVerified: true,
      phoneVerified: true,
      trustScore: 92,
      role: 'USER',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob.williams@savepal-dev.com',
      password: hashedPassword,
      firstName: 'Bob',
      lastName: 'Williams',
      phoneNumber: '+15551000003',
      emailVerified: true,
      phoneVerified: false,
      trustScore: 85,
      role: 'USER',
    },
  });

  const carol = await prisma.user.create({
    data: {
      email: 'carol.davis@savepal-dev.com',
      password: hashedPassword,
      firstName: 'Carol',
      lastName: 'Davis',
      phoneNumber: '+15551000004',
      emailVerified: true,
      phoneVerified: true,
      trustScore: 78,
      role: 'USER',
    },
  });

  const dave = await prisma.user.create({
    data: {
      email: 'dave.martinez@savepal-dev.com',
      password: hashedPassword,
      firstName: 'Dave',
      lastName: 'Martinez',
      emailVerified: true,
      trustScore: 88,
      role: 'USER',
    },
  });

  const eve = await prisma.user.create({
    data: {
      email: 'eve.thompson@savepal-dev.com',
      password: hashedPassword,
      firstName: 'Eve',
      lastName: 'Thompson',
      phoneNumber: '+15551000006',
      emailVerified: true,
      phoneVerified: true,
      trustScore: 95,
      role: 'USER',
    },
  });

  const allUsers = [admin, alice, bob, carol, dave, eve];
  console.log(`  Created ${allUsers.length} users`);

  // ==========================================
  // GROUPS
  // ==========================================
  console.log('Creating groups...');

  // Group A: Monthly, Sequential, 5 members, ACTIVE (started ~2 months ago)
  const groupA = await prisma.group.create({
    data: {
      name: 'Monthly Savings Circle',
      description: 'A monthly savings group for friends. Each member contributes $200/month.',
      contributionAmount: 200,
      frequency: 'MONTHLY',
      payoutMethod: 'SEQUENTIAL',
      status: 'ACTIVE',
      maxMembers: 5,
      currentMembers: 5,
      startDate: daysAgo(60),
      endDate: daysFromNow(90),
      createdById: alice.id,
    },
  });

  // Group B: Biweekly, Bidding, 4 members, ACTIVE (started ~3 weeks ago)
  const groupB = await prisma.group.create({
    data: {
      name: 'Biweekly Bid Pool',
      description: 'Competitive bidding pool — highest bidder gets the payout first!',
      contributionAmount: 150,
      frequency: 'BIWEEKLY',
      payoutMethod: 'BIDDING',
      status: 'ACTIVE',
      maxMembers: 4,
      currentMembers: 4,
      startDate: daysAgo(21),
      endDate: daysFromNow(35),
      createdById: bob.id,
    },
  });

  // Group C: Weekly, Random, 3 members, PENDING
  const groupC = await prisma.group.create({
    data: {
      name: 'Quick Weekly Fund',
      description: 'Fast-paced weekly savings with random payout order.',
      contributionAmount: 50,
      frequency: 'WEEKLY',
      payoutMethod: 'RANDOM',
      status: 'PENDING',
      maxMembers: 5,
      currentMembers: 3,
      createdById: carol.id,
    },
  });

  console.log('  Created 3 groups');

  // ==========================================
  // MEMBERSHIPS
  // ==========================================
  console.log('Creating memberships...');

  // Group A members: alice (owner), bob, carol, dave, eve
  const groupAMembers = [
    { userId: alice.id, role: 'OWNER' as const, position: 1 },
    { userId: bob.id, role: 'MEMBER' as const, position: 2 },
    { userId: carol.id, role: 'MEMBER' as const, position: 3 },
    { userId: dave.id, role: 'MEMBER' as const, position: 4 },
    { userId: eve.id, role: 'MEMBER' as const, position: 5 },
  ];

  for (const m of groupAMembers) {
    await prisma.membership.create({
      data: {
        groupId: groupA.id,
        userId: m.userId,
        role: m.role,
        payoutPosition: m.position,
        isActive: true,
        autoPaymentConsented: m.position <= 3, // first 3 consented
      },
    });
  }

  // Group B members: bob (owner), alice, dave, eve
  const groupBMembers = [
    { userId: bob.id, role: 'OWNER' as const, position: 1 },
    { userId: alice.id, role: 'MEMBER' as const, position: 2 },
    { userId: dave.id, role: 'MEMBER' as const, position: 3 },
    { userId: eve.id, role: 'MEMBER' as const, position: 4 },
  ];

  for (const m of groupBMembers) {
    await prisma.membership.create({
      data: {
        groupId: groupB.id,
        userId: m.userId,
        role: m.role,
        payoutPosition: m.position,
        isActive: true,
      },
    });
  }

  // Group C members: carol (owner), admin, eve
  const groupCMembers = [
    { userId: carol.id, role: 'OWNER' as const, position: 1 },
    { userId: admin.id, role: 'MEMBER' as const, position: 2 },
    { userId: eve.id, role: 'MEMBER' as const, position: 3 },
  ];

  for (const m of groupCMembers) {
    await prisma.membership.create({
      data: {
        groupId: groupC.id,
        userId: m.userId,
        role: m.role,
        payoutPosition: m.position,
        isActive: true,
      },
    });
  }

  console.log('  Created 12 memberships');

  // ==========================================
  // CYCLES (Group A - Monthly, Sequential)
  // ==========================================
  console.log('Creating cycles...');

  // Group A: Cycle 1 (completed, alice received payout)
  const cycleA1 = await prisma.cycle.create({
    data: {
      groupId: groupA.id,
      cycleNumber: 1,
      recipientId: alice.id,
      dueDate: daysAgo(30),
      completedDate: daysAgo(28),
      totalAmount: 200 * 5,
      isCompleted: true,
    },
  });

  // Group A: Cycle 2 (completed, bob received payout)
  const cycleA2 = await prisma.cycle.create({
    data: {
      groupId: groupA.id,
      cycleNumber: 2,
      recipientId: bob.id,
      dueDate: daysAgo(2),
      completedDate: daysAgo(1),
      totalAmount: 200 * 5,
      isCompleted: true,
    },
  });

  // Group A: Cycle 3 (current, carol is next recipient)
  const cycleA3 = await prisma.cycle.create({
    data: {
      groupId: groupA.id,
      cycleNumber: 3,
      recipientId: carol.id,
      dueDate: daysFromNow(28),
      totalAmount: 200 * 5,
      isCompleted: false,
    },
  });

  // Group B: Cycle 1 (completed, bob won the bid)
  const cycleB1 = await prisma.cycle.create({
    data: {
      groupId: groupB.id,
      cycleNumber: 1,
      recipientId: bob.id,
      dueDate: daysAgo(7),
      completedDate: daysAgo(6),
      totalAmount: 150 * 4,
      isCompleted: true,
      biddingStatus: 'CLOSED',
    },
  });

  // Group B: Cycle 2 (current, bidding open)
  const cycleB2 = await prisma.cycle.create({
    data: {
      groupId: groupB.id,
      cycleNumber: 2,
      dueDate: daysFromNow(7),
      totalAmount: 150 * 4,
      isCompleted: false,
      biddingStatus: 'OPEN',
    },
  });

  console.log('  Created 5 cycles');

  // ==========================================
  // PAYMENTS
  // ==========================================
  console.log('Creating payments...');

  // Helper to create payments for a completed cycle
  async function createCompletedCyclePayments(
    cycleId: string,
    memberUserIds: string[],
    recipientId: string,
    amount: number,
    paidDaysAgo: number
  ) {
    for (const userId of memberUserIds) {
      await prisma.payment.create({
        data: {
          cycleId,
          userId,
          amount,
          status: 'COMPLETED',
          contributionPeriod: 1,
          dueDate: daysAgo(paidDaysAgo + 2),
          paidAt: daysAgo(paidDaysAgo),
        },
      });
    }
  }

  // Group A, Cycle 1 payments (all completed) — everyone pays including recipient
  await createCompletedCyclePayments(
    cycleA1.id,
    [alice.id, bob.id, carol.id, dave.id, eve.id],
    alice.id,
    200,
    28
  );

  // Group A, Cycle 2 payments (all completed)
  await createCompletedCyclePayments(
    cycleA2.id,
    [alice.id, bob.id, carol.id, dave.id, eve.id],
    bob.id,
    200,
    1
  );

  // Group A, Cycle 3 payments (current — mixed statuses)
  await prisma.payment.create({
    data: {
      cycleId: cycleA3.id,
      userId: alice.id,
      amount: 200,
      status: 'COMPLETED',
      contributionPeriod: 1,
      dueDate: daysFromNow(28),
      paidAt: daysAgo(0),
    },
  });
  await prisma.payment.create({
    data: {
      cycleId: cycleA3.id,
      userId: bob.id,
      amount: 200,
      status: 'COMPLETED',
      contributionPeriod: 1,
      dueDate: daysFromNow(28),
      paidAt: daysAgo(0),
    },
  });
  await prisma.payment.create({
    data: {
      cycleId: cycleA3.id,
      userId: carol.id,
      amount: 200,
      status: 'PENDING',
      contributionPeriod: 1,
      dueDate: daysFromNow(28),
    },
  });
  await prisma.payment.create({
    data: {
      cycleId: cycleA3.id,
      userId: dave.id,
      amount: 200,
      status: 'PENDING',
      contributionPeriod: 1,
      dueDate: daysFromNow(28),
    },
  });
  await prisma.payment.create({
    data: {
      cycleId: cycleA3.id,
      userId: eve.id,
      amount: 200,
      status: 'FAILED',
      contributionPeriod: 1,
      dueDate: daysFromNow(28),
      failureReason: 'Card declined - insufficient funds',
      retryCount: 1,
    },
  });

  // Group B, Cycle 1 payments (all completed)
  await createCompletedCyclePayments(
    cycleB1.id,
    [bob.id, alice.id, dave.id, eve.id],
    bob.id,
    150,
    6
  );

  // Group B, Cycle 2 payments (current — mixed)
  await prisma.payment.create({
    data: {
      cycleId: cycleB2.id,
      userId: bob.id,
      amount: 150,
      status: 'COMPLETED',
      contributionPeriod: 1,
      dueDate: daysFromNow(7),
      paidAt: daysAgo(1),
    },
  });
  await prisma.payment.create({
    data: {
      cycleId: cycleB2.id,
      userId: alice.id,
      amount: 150,
      status: 'COMPLETED',
      contributionPeriod: 1,
      dueDate: daysFromNow(7),
      paidAt: daysAgo(0),
    },
  });
  await prisma.payment.create({
    data: {
      cycleId: cycleB2.id,
      userId: dave.id,
      amount: 150,
      status: 'PENDING',
      contributionPeriod: 1,
      dueDate: daysFromNow(7),
    },
  });
  await prisma.payment.create({
    data: {
      cycleId: cycleB2.id,
      userId: eve.id,
      amount: 150,
      status: 'PENDING',
      contributionPeriod: 1,
      dueDate: daysFromNow(7),
    },
  });

  console.log('  Created 19 payments');

  // ==========================================
  // PAYOUTS
  // ==========================================
  console.log('Creating payouts...');

  // Group A, Cycle 1 payout to Alice
  await prisma.payout.create({
    data: {
      cycleId: cycleA1.id,
      recipientId: alice.id,
      amount: 1000,
      feeAmount: 25, // 2.5% platform fee
      netAmount: 975,
      status: 'COMPLETED',
      transferredAt: daysAgo(27),
    },
  });

  // Group A, Cycle 2 payout to Bob
  await prisma.payout.create({
    data: {
      cycleId: cycleA2.id,
      recipientId: bob.id,
      amount: 1000,
      feeAmount: 25,
      netAmount: 975,
      status: 'COMPLETED',
      transferredAt: daysAgo(0),
    },
  });

  // Group B, Cycle 1 payout to Bob
  await prisma.payout.create({
    data: {
      cycleId: cycleB1.id,
      recipientId: bob.id,
      amount: 600,
      feeAmount: 15,
      netAmount: 585,
      status: 'COMPLETED',
      transferredAt: daysAgo(5),
    },
  });

  console.log('  Created 3 payouts');

  // ==========================================
  // BIDS (Group B - Bidding method)
  // ==========================================
  console.log('Creating bids...');

  // Bids on Group B, Cycle 2 (currently open)
  await prisma.bid.create({
    data: {
      cycleId: cycleB2.id,
      userId: alice.id,
      amount: 25, // willing to pay $25 fee for priority
    },
  });

  await prisma.bid.create({
    data: {
      cycleId: cycleB2.id,
      userId: dave.id,
      amount: 40, // willing to pay $40
    },
  });

  await prisma.bid.create({
    data: {
      cycleId: cycleB2.id,
      userId: eve.id,
      amount: 15, // willing to pay $15
    },
  });

  console.log('  Created 3 bids');

  // ==========================================
  // PAYMENT METHODS
  // ==========================================
  console.log('Creating payment methods...');

  await prisma.paymentMethod.create({
    data: {
      userId: alice.id,
      stripePaymentMethodId: 'pm_test_visa_alice_001',
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true,
    },
  });

  await prisma.paymentMethod.create({
    data: {
      userId: bob.id,
      stripePaymentMethodId: 'pm_test_mc_bob_001',
      type: 'card',
      last4: '5555',
      brand: 'Mastercard',
      expiryMonth: 6,
      expiryYear: 2028,
      isDefault: true,
    },
  });

  await prisma.paymentMethod.create({
    data: {
      userId: carol.id,
      stripePaymentMethodId: 'pm_test_visa_carol_001',
      type: 'card',
      last4: '1234',
      brand: 'Visa',
      expiryMonth: 3,
      expiryYear: 2027,
      isDefault: true,
    },
  });

  console.log('  Created 3 payment methods');

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  console.log('Creating notifications...');

  const notifications = [
    { userId: alice.id, groupId: groupA.id, type: 'PAYOUT_COMPLETED' as const, title: 'Payout Received!', message: 'You received your payout of $975.00 from Monthly Savings Circle.', isRead: true, sentAt: daysAgo(27) },
    { userId: bob.id, groupId: groupA.id, type: 'PAYMENT_DUE' as const, title: 'Payment Due Soon', message: 'Your $200.00 contribution to Monthly Savings Circle is due in 3 days.', isRead: true, sentAt: daysAgo(5) },
    { userId: bob.id, groupId: groupA.id, type: 'PAYOUT_COMPLETED' as const, title: 'Payout Received!', message: 'You received your payout of $975.00 from Monthly Savings Circle.', isRead: false, sentAt: daysAgo(0) },
    { userId: carol.id, groupId: groupA.id, type: 'PAYMENT_DUE' as const, title: 'Payment Due', message: 'Your $200.00 contribution to Monthly Savings Circle is due on the 15th.', isRead: false, sentAt: daysAgo(0) },
    { userId: eve.id, groupId: groupA.id, type: 'PAYMENT_FAILED' as const, title: 'Payment Failed', message: 'Your payment of $200.00 to Monthly Savings Circle failed. Please update your payment method.', isRead: false, sentAt: daysAgo(0) },
    { userId: alice.id, groupId: groupB.id, type: 'GROUP_STARTED' as const, title: 'Group Started', message: 'Biweekly Bid Pool has officially started! First cycle is underway.', isRead: true, sentAt: daysAgo(21) },
    { userId: bob.id, groupId: groupB.id, type: 'PAYOUT_COMPLETED' as const, title: 'Payout Received!', message: 'You received your payout of $585.00 from Biweekly Bid Pool.', isRead: true, sentAt: daysAgo(5) },
    { userId: dave.id, groupId: groupB.id, type: 'PAYMENT_DUE' as const, title: 'Payment Due Soon', message: 'Your $150.00 contribution to Biweekly Bid Pool is due in 7 days.', isRead: false, sentAt: daysAgo(0) },
    { userId: eve.id, groupId: groupB.id, type: 'REMINDER' as const, title: 'Place Your Bid', message: 'Bidding is open for Cycle 2 of Biweekly Bid Pool. Place your bid now!', isRead: false, sentAt: daysAgo(1) },
    { userId: carol.id, groupId: groupC.id, type: 'GROUP_INVITE' as const, title: 'New Group Created', message: 'You created Quick Weekly Fund. Share the invite code to get members!', isRead: true, sentAt: daysAgo(3) },
    { userId: admin.id, groupId: groupC.id, type: 'GROUP_INVITE' as const, title: 'Group Invitation', message: 'Carol Davis invited you to join Quick Weekly Fund.', isRead: false, sentAt: daysAgo(2) },
    { userId: eve.id, groupId: groupC.id, type: 'GROUP_INVITE' as const, title: 'Group Invitation', message: 'Carol Davis invited you to join Quick Weekly Fund.', isRead: true, sentAt: daysAgo(2) },
    { userId: alice.id, groupId: null, type: 'CONNECT_ONBOARDING_REQUIRED' as const, title: 'Complete Your Setup', message: 'Connect your bank account to receive payouts. Set up Stripe Connect now.', isRead: true, sentAt: daysAgo(45) },
    { userId: dave.id, groupId: null, type: 'CONNECT_ONBOARDING_REQUIRED' as const, title: 'Set Up Payouts', message: 'You need to complete Stripe Connect onboarding to receive payouts.', isRead: false, sentAt: daysAgo(10) },
  ];

  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }

  console.log(`  Created ${notifications.length} notifications`);

  // ==========================================
  // DEVICE TOKENS
  // ==========================================
  console.log('Creating device tokens...');

  await prisma.deviceToken.create({
    data: { userId: alice.id, token: 'fcm_test_token_alice_ios_001', platform: 'ios' },
  });
  await prisma.deviceToken.create({
    data: { userId: bob.id, token: 'fcm_test_token_bob_android_001', platform: 'android' },
  });
  await prisma.deviceToken.create({
    data: { userId: carol.id, token: 'fcm_test_token_carol_android_001', platform: 'android' },
  });

  console.log('  Created 3 device tokens');

  // ==========================================
  // FEE WAIVER CODES
  // ==========================================
  console.log('Creating fee waiver codes...');

  const betaCode = await prisma.feeWaiverCode.create({
    data: {
      code: 'BETA2024',
      description: 'Beta tester discount — waives group creation fee',
      maxUses: 100,
      currentUses: 2,
      isActive: true,
    },
  });

  await prisma.feeWaiverCode.create({
    data: {
      code: 'FOUNDERS',
      description: 'Unlimited waiver for founding members',
      maxUses: null,
      currentUses: 1,
      isActive: true,
    },
  });

  console.log('  Created 2 fee waiver codes');

  // ==========================================
  // GROUP CREATION FEES
  // ==========================================
  console.log('Creating group creation fees...');

  // Group A: paid the fee
  await prisma.groupCreationFee.create({
    data: {
      groupId: groupA.id,
      userId: alice.id,
      amount: 4.99,
      status: 'COMPLETED',
      stripePaymentIntentId: 'pi_test_groupfee_a_001',
    },
  });

  // Group B: paid the fee
  await prisma.groupCreationFee.create({
    data: {
      groupId: groupB.id,
      userId: bob.id,
      amount: 4.99,
      status: 'COMPLETED',
      stripePaymentIntentId: 'pi_test_groupfee_b_001',
    },
  });

  // Group C: fee waived with BETA2024 code
  await prisma.groupCreationFee.create({
    data: {
      groupId: groupC.id,
      userId: carol.id,
      amount: 4.99,
      status: 'WAIVED',
      waiverReason: 'Fee waiver code: BETA2024',
    },
  });

  console.log('  Created 3 group creation fees');

  // ==========================================
  // FEE WAIVER CODE USAGES
  // ==========================================
  console.log('Creating fee waiver code usages...');

  await prisma.feeWaiverCodeUsage.create({
    data: {
      codeId: betaCode.id,
      userId: carol.id,
      groupId: groupC.id,
    },
  });

  console.log('  Created 1 fee waiver code usage');

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n✅ Seed completed successfully!');
  console.log('─────────────────────────────────');
  console.log('  Users:              6');
  console.log('  Groups:             3 (1 active-sequential, 1 active-bidding, 1 pending)');
  console.log('  Memberships:        12');
  console.log('  Cycles:             5 (3 completed, 2 in-progress)');
  console.log('  Payments:           19');
  console.log('  Payouts:            3');
  console.log('  Bids:               3');
  console.log('  Payment Methods:    3');
  console.log(`  Notifications:      ${notifications.length}`);
  console.log('  Device Tokens:      3');
  console.log('  Fee Waiver Codes:   2');
  console.log('  Fee Waiver Usages:  1');
  console.log('  Group Creation Fees: 3');
  console.log('─────────────────────────────────');
  console.log('\nLogin credentials (all users): password123');
  console.log('Admin: admin@savepal-dev.com');
  console.log('Users: alice.johnson@savepal-dev.com, bob.williams@savepal-dev.com,');
  console.log('       carol.davis@savepal-dev.com, dave.martinez@savepal-dev.com,');
  console.log('       eve.thompson@savepal-dev.com');
}

main()
  .then(() => {
    console.log('\nDone.');
  })
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
