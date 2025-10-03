/**
 * Script to test group join notification
 * This will simulate a user joining a group and trigger the email notification
 */

import prisma from '../utils/prisma.js';
import groupService from '../services/group.service.js';

async function testJoinNotification() {
  try {
    console.log('=== Testing Group Join Notification ===\n');

    // Find a group that's in PENDING status
    const group = await prisma.group.findFirst({
      where: {
        status: 'PENDING',
      },
      include: {
        createdBy: {
          select: {
            email: true,
            firstName: true,
          },
        },
        memberships: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!group) {
      console.log('❌ No pending groups found. Please create a group first.');
      return;
    }

    console.log(`✓ Found group: "${group.name}" (invite code: ${group.inviteCode})`);
    console.log(`  Owner: ${group.createdBy.firstName} (${group.createdBy.email})`);
    console.log(`  Current members: ${group.currentMembers}/${group.maxMembers}`);

    // Find a user who is NOT a member of this group
    const memberUserIds = group.memberships.map(m => m.userId);
    const nonMember = await prisma.user.findFirst({
      where: {
        id: {
          notIn: memberUserIds,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!nonMember) {
      console.log('\n❌ No users available to join this group. All users are already members.');
      return;
    }

    console.log(`\n✓ Found user to join: ${nonMember.firstName} ${nonMember.lastName} (${nonMember.email})`);

    // Check if group is full
    if (group.currentMembers >= group.maxMembers) {
      console.log('\n❌ Group is already full. Cannot add more members.');
      return;
    }

    console.log('\n📧 Attempting to join group and send notification...');

    // Join the group (this will trigger the email notification)
    await groupService.joinGroup({
      inviteCode: group.inviteCode,
      userId: nonMember.id,
    });

    console.log('\n✅ SUCCESS!');
    console.log(`   - ${nonMember.firstName} ${nonMember.lastName} joined the group`);
    console.log(`   - Email notification sent to ${group.createdBy.email}`);
    console.log(`   - Check the group owner's email inbox for the notification`);

    // Get updated group info
    const updatedGroup = await prisma.group.findUnique({
      where: { id: group.id },
      select: {
        currentMembers: true,
        maxMembers: true,
      },
    });

    console.log(`\n📊 Updated group stats: ${updatedGroup?.currentMembers}/${updatedGroup?.maxMembers} members`);

  } catch (error) {
    console.error('\n❌ Error testing notification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testJoinNotification()
  .then(() => {
    console.log('\n✓ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  });
