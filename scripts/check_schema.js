// Script to check the actual database schema
const { PrismaClient } = require('@prisma/client');

// Set the DATABASE_URL environment variable to the Neon connection string
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_kxZDhdAeE35y@ep-delicate-block-a4wdwtzv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Initialize Prisma client
const prisma = new PrismaClient();

async function checkSchema() {
  try {
    // Query the database to get table information
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Pin'
    `;
    
    console.log('Pin table schema:');
    console.table(result);
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
