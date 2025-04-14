// Script to execute SQL directly to add missing columns
const { PrismaClient } = require('@prisma/client');

// Set the DATABASE_URL environment variable to the Neon connection string
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_kxZDhdAeE35y@ep-delicate-block-a4wdwtzv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Initialize Prisma client
const prisma = new PrismaClient();

async function updateSchema() {
  try {
    console.log('Adding missing columns to Pin table...');
    
    // Add rarity column
    await prisma.$executeRawUnsafe(`ALTER TABLE "Pin" ADD COLUMN IF NOT EXISTS "rarity" TEXT`);
    console.log('Added rarity column');
    
    // Add year column
    await prisma.$executeRawUnsafe(`ALTER TABLE "Pin" ADD COLUMN IF NOT EXISTS "year" INTEGER`);
    console.log('Added year column');
    
    // Add pinpopUrl column
    await prisma.$executeRawUnsafe(`ALTER TABLE "Pin" ADD COLUMN IF NOT EXISTS "pinpopUrl" TEXT`);
    console.log('Added pinpopUrl column');
    
    console.log('Schema update completed successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSchema();
