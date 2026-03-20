/**
 * Reconcile dev database data to match production-like consistency.
 *
 * Fixes:
 * - Group A (Monthly Savings Circle): adds missing cycles 4 & 5 for dave and eve
 * - Group B (Biweekly Bid Pool): marks as COMPLETED, completes cycle 2, adds cycles 3 & 4
 * - Updates trust scores for bob, dave, eve
 *
 * This script preserves all existing data (payment methods, bank accounts,
 * manually initiated payments/payouts).
 *
 * Run with: npm run script:reconcile-dev-data
 */

import prisma from '../utils/prisma.js';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function reconcile() {
  try {
    console.log('🔧 Starting dev data reconciliation...\n');

    // ==========================================
    // UPDATE TRUST SCORES
    // ==========================================
    console.log('Updating trust scores...');

    await prisma.user.update({
      where: { email: 'bob.williams@savepal-dev.com' },
      data: { trustScore: 95 },
    });
    await prisma.user.update({
      where: { email: 'dave.martinez@savepal-dev.com' },
      data: { trustScore: 108 },
    });
    await prisma.user.update({
      where: { email: 'eve.thompson@savepal-dev.com' },
      data: { trustScore: 105 },
    });
    console.log('  ✅ Updated bob (95), dave (108), eve (105)');

    // Look up users and groups we'll need
    const bob = await prisma.user.findUniqueOrThrow({ where: { email: 'bob.williams@savepal-dev.com' } });
    const alice = await prisma.user.findUniqueOrThrow({ where: { email: 'alice.johnson@savepal-dev.com' } });
    const dave = await prisma.user.findUniqueOrThrow({ where: { email: 'dave.martinez@savepal-dev.com' } });
    const eve = await prisma.user.findUniqueOrThrow({ where: { email: 'eve.thompson@savepal-dev.com' } });

    const groupA = await prisma.group.findFirst({ where: { name: 'Monthly Savings Circle' } });
    const groupB = await prisma.group.findFirst({ where: { name: 'Biweekly Bid Pool' } });

    if (!groupA) {
      console.log('  ⚠️  Monthly Savings Circle not found — skipping Group A reconciliation');
    }
    if (!groupB) {
      console.log('  ⚠️  Biweekly Bid Pool not found — skipping Group B reconciliation');
    }

    // ==========================================
    // GROUP A: Add missing cycles 4 and 5
    // ==========================================
    if (groupA) {
      console.log('\nReconciling Group A (Monthly Savings Circle)...');

      const existingCyclesA = await prisma.cycle.findMany({
        where: { groupId: groupA.id },
        orderBy: { cycleNumber: 'asc' },
      });
      console.log(`  Found ${existingCyclesA.length} existing cycles`);

      const maxCycleA = existingCyclesA.length > 0
        ? Math.max(...existingCyclesA.map(c => c.cycleNumber))
        : 0;

      // Add cycle 4 for dave if missing
      const hasCycle4 = existingCyclesA.some(c => c.cycleNumber === 4);
      if (!hasCycle4 && maxCycleA < 4) {
        await prisma.cycle.create({
          data: {
            groupId: groupA.id,
            cycleNumber: 4,
            recipientId: dave.id,
            dueDate: daysFromNow(40),
            totalAmount: groupA.contributionAmount * groupA.maxMembers,
            isCompleted: false,
          },
        });
        console.log('  ✅ Created cycle 4 (recipient: dave)');
      } else {
        console.log('  ℹ️  Cycle 4 already exists — skipped');
      }

      // Add cycle 5 for eve if missing
      const hasCycle5 = existingCyclesA.some(c => c.cycleNumber === 5);
      if (!hasCycle5 && maxCycleA < 5) {
        await prisma.cycle.create({
          data: {
            groupId: groupA.id,
            cycleNumber: 5,
            recipientId: eve.id,
            dueDate: daysFromNow(70),
            totalAmount: groupA.contributionAmount * groupA.maxMembers,
            isCompleted: false,
          },
        });
        console.log('  ✅ Created cycle 5 (recipient: eve)');
      } else {
        console.log('  ℹ️  Cycle 5 already exists — skipped');
      }
    }

    // ==========================================
    // GROUP B: Complete all cycles, mark group COMPLETED
    // ==========================================
    if (groupB) {
      console.log('\nReconciling Group B (Biweekly Bid Pool)...');

      const existingCyclesB = await prisma.cycle.findMany({
        where: { groupId: groupB.id },
        orderBy: { cycleNumber: 'asc' },
        include: { payments: true, payout: true, bids: true },
      });
      console.log(`  Found ${existingCyclesB.length} existing cycles`);

      const groupBMembers = [bob, alice, dave, eve];
      const bidRecipients = [
        { cycleNum: 1, recipient: bob, bidData: [{ user: bob, amount: 50 }, { user: alice, amount: 30 }, { user: dave, amount: 20 }] },
        { cycleNum: 2, recipient: alice, bidData: [{ user: alice, amount: 45 }, { user: dave, amount: 35 }, { user: eve, amount: 15 }] },
        { cycleNum: 3, recipient: dave, bidData: [{ user: dave, amount: 40 }, { user: eve, amount: 25 }] },
        { cycleNum: 4, recipient: eve, bidData: [{ user: eve, amount: 10 }] },
      ];

      for (const config of bidRecipients) {
        const existingCycle = existingCyclesB.find(c => c.cycleNumber === config.cycleNum);

        if (existingCycle) {
          // Complete existing cycle if not already
          if (!existingCycle.isCompleted) {
            await prisma.cycle.update({
              where: { id: existingCycle.id },
              data: {
                isCompleted: true,
                recipientId: config.recipient.id,
                completedDate: daysAgo(63 - (config.cycleNum * 14) + 1),
                biddingStatus: 'CLOSED',
              },
            });
            console.log(`  ✅ Completed existing cycle ${config.cycleNum} (recipient: ${config.recipient.firstName})`);
          } else {
            console.log(`  ℹ️  Cycle ${config.cycleNum} already completed — skipped`);
          }

          // Add missing payments for this cycle
          for (const member of groupBMembers) {
            const hasPayment = existingCycle.payments.some(p => p.userId === member.id);
            if (!hasPayment) {
              await prisma.payment.create({
                data: {
                  cycleId: existingCycle.id,
                  userId: member.id,
                  amount: groupB.contributionAmount,
                  status: 'COMPLETED',
                  contributionPeriod: 1,
                  dueDate: daysAgo(63 - (config.cycleNum * 14) + 3),
                  paidAt: daysAgo(63 - (config.cycleNum * 14) + 1),
                },
              });
              console.log(`    + Added completed payment from ${member.firstName} for cycle ${config.cycleNum}`);
            }
          }

          // Complete any pending payments
          const pendingPayments = existingCycle.payments.filter(p => p.status !== 'COMPLETED');
          for (const pp of pendingPayments) {
            await prisma.payment.update({
              where: { id: pp.id },
              data: {
                status: 'COMPLETED',
                paidAt: pp.paidAt ?? daysAgo(63 - (config.cycleNum * 14) + 1),
              },
            });
            console.log(`    + Completed pending payment ${pp.id.slice(0, 8)}... for cycle ${config.cycleNum}`);
          }

          // Add payout if missing
          if (!existingCycle.payout) {
            await prisma.payout.create({
              data: {
                cycleId: existingCycle.id,
                recipientId: config.recipient.id,
                amount: groupB.contributionAmount * groupB.maxMembers,
                feeAmount: 15,
                netAmount: groupB.contributionAmount * groupB.maxMembers - 15,
                status: 'COMPLETED',
                transferredAt: daysAgo(63 - (config.cycleNum * 14)),
              },
            });
            console.log(`    + Added payout to ${config.recipient.firstName} for cycle ${config.cycleNum}`);
          }

          // Add bids if missing
          for (const bid of config.bidData) {
            const hasBid = existingCycle.bids.some(b => b.userId === bid.user.id);
            if (!hasBid) {
              await prisma.bid.create({
                data: {
                  cycleId: existingCycle.id,
                  userId: bid.user.id,
                  amount: bid.amount,
                },
              });
              console.log(`    + Added bid from ${bid.user.firstName} ($${bid.amount}) for cycle ${config.cycleNum}`);
            }
          }
        } else {
          // Create new cycle with all associated data
          const paidDaysAgo = 63 - (config.cycleNum * 14) + 1;
          const cycle = await prisma.cycle.create({
            data: {
              groupId: groupB.id,
              cycleNumber: config.cycleNum,
              recipientId: config.recipient.id,
              dueDate: daysAgo(63 - (config.cycleNum * 14) + 2),
              completedDate: daysAgo(paidDaysAgo),
              totalAmount: groupB.contributionAmount * groupB.maxMembers,
              isCompleted: true,
              biddingStatus: 'CLOSED',
            },
          });
          console.log(`  ✅ Created cycle ${config.cycleNum} (recipient: ${config.recipient.firstName})`);

          // Payments
          for (const member of groupBMembers) {
            await prisma.payment.create({
              data: {
                cycleId: cycle.id,
                userId: member.id,
                amount: groupB.contributionAmount,
                status: 'COMPLETED',
                contributionPeriod: 1,
                dueDate: daysAgo(paidDaysAgo + 2),
                paidAt: daysAgo(paidDaysAgo),
              },
            });
          }
          console.log(`    + Created ${groupBMembers.length} payments`);

          // Payout
          await prisma.payout.create({
            data: {
              cycleId: cycle.id,
              recipientId: config.recipient.id,
              amount: groupB.contributionAmount * groupB.maxMembers,
              feeAmount: 15,
              netAmount: groupB.contributionAmount * groupB.maxMembers - 15,
              status: 'COMPLETED',
              transferredAt: daysAgo(paidDaysAgo - 1),
            },
          });
          console.log(`    + Created payout to ${config.recipient.firstName}`);

          // Bids
          for (const bid of config.bidData) {
            await prisma.bid.create({
              data: {
                cycleId: cycle.id,
                userId: bid.user.id,
                amount: bid.amount,
              },
            });
          }
          console.log(`    + Created ${config.bidData.length} bids`);
        }
      }

      // Mark group as COMPLETED
      if (groupB.status !== 'COMPLETED') {
        await prisma.group.update({
          where: { id: groupB.id },
          data: {
            status: 'COMPLETED',
            endDate: daysAgo(7),
          },
        });
        console.log('  ✅ Marked Biweekly Bid Pool as COMPLETED');
      } else {
        console.log('  ℹ️  Group already COMPLETED — skipped');
      }
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n✅ Reconciliation complete!');
    console.log('Your existing payment methods, bank accounts, and manual payments are untouched.');
  } catch (error) {
    console.error('Reconciliation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

reconcile()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
