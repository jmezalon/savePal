/**
 * Script to set the first superadmin user
 * Run with: npm run script:seed-superadmin
 */

import prisma from '../utils/prisma.js';

const SUPERADMIN_EMAIL = 'max.mezalon@save-pals.com';

async function seedSuperAdmin() {
  try {
    console.log(`Setting ${SUPERADMIN_EMAIL} as SUPERADMIN...`);

    const user = await prisma.user.findUnique({
      where: { email: SUPERADMIN_EMAIL },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    if (!user) {
      console.error(`User with email ${SUPERADMIN_EMAIL} not found.`);
      console.log('Make sure the user has registered first.');
      process.exit(1);
    }

    if (user.role === 'SUPERADMIN') {
      console.log(`${user.firstName} ${user.lastName} is already a SUPERADMIN.`);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPERADMIN' },
    });

    console.log(`\n=== Success ===`);
    console.log(`${user.firstName} ${user.lastName} (${user.email}) is now a SUPERADMIN.`);
  } catch (error) {
    console.error('Error seeding superadmin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSuperAdmin()
  .then(() => {
    console.log('\nSeed completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
