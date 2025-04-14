const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function wipeDatabase() {
  try {
    console.log('Wiping database...');
    await prisma.comment.deleteMany();
    await prisma.image.deleteMany();
    await prisma.pin.deleteMany();
    console.log('Database wiped successfully!');
  } catch (error) {
    console.error('Error wiping database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

wipeDatabase();
