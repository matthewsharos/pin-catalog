import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global;

// Ensure both local and production environments use the Neon database
const databaseUrl = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_kxZDhdAeE35y@ep-delicate-block-a4wdwtzv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
