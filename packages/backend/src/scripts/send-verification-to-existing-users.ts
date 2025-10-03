/**
 * Script to send verification emails to existing users
 * Run with: npx tsx src/scripts/send-verification-to-existing-users.ts
 */

import prisma from '../utils/prisma.js';
import emailService from '../services/email.service.js';
import crypto from 'crypto';

async function sendVerificationToExistingUsers() {
  try {
    console.log('Starting to send verification emails to existing users...');

    // Find all users who haven't verified their email
    const unverifiedUsers = await prisma.user.findMany({
      where: {
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        emailVerificationToken: true,
      },
    });

    console.log(`Found ${unverifiedUsers.length} unverified users`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of unverifiedUsers) {
      try {
        // Generate new verification token if user doesn't have one
        let verificationToken = user.emailVerificationToken;
        if (!verificationToken) {
          verificationToken = crypto.randomBytes(32).toString('hex');
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerificationToken: verificationToken },
          });
        }

        // Send verification email
        await emailService.sendEmailVerification(
          user.email,
          user.firstName,
          verificationToken
        );

        console.log(`✓ Sent verification email to ${user.email}`);
        successCount++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`✗ Failed to send email to ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total users: ${unverifiedUsers.length}`);
    console.log(`Successfully sent: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
  } catch (error) {
    console.error('Error in migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
sendVerificationToExistingUsers()
  .then(() => {
    console.log('\nMigration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
