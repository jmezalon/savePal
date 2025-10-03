/**
 * Script to auto-verify existing users (grandfather them in)
 * Run with: npx tsx src/scripts/auto-verify-existing-users.ts
 *
 * WARNING: This will mark all existing unverified users as verified
 * and give them the +20 trust score bonus
 */

import prisma from '../utils/prisma.js';

async function autoVerifyExistingUsers() {
  try {
    console.log('Starting auto-verification of existing users...');
    console.log('WARNING: This will verify all unverified users!\n');

    // Find all users who haven't verified their email
    const unverifiedUsers = await prisma.user.findMany({
      where: {
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    console.log(`Found ${unverifiedUsers.length} unverified users\n`);

    if (unverifiedUsers.length === 0) {
      console.log('No users to verify. Exiting.');
      return;
    }

    // Show preview
    console.log('Users to be auto-verified:');
    unverifiedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - Created: ${user.createdAt.toLocaleDateString()}`);
    });

    console.log('\nProceeding with auto-verification...\n');

    // Auto-verify all users
    const result = await prisma.user.updateMany({
      where: {
        emailVerified: false,
      },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        trustScore: {
          increment: 20,
        },
      },
    });

    console.log('=== Summary ===');
    console.log(`Total users verified: ${result.count}`);
    console.log(`Trust score increased by 20 for all verified users`);
  } catch (error) {
    console.error('Error in auto-verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
autoVerifyExistingUsers()
  .then(() => {
    console.log('\nAuto-verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Auto-verification failed:', error);
    process.exit(1);
  });
