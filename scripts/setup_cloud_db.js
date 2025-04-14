// Script to set up the schema in the cloud database
const { execSync } = require('child_process');

// Set the DATABASE_URL environment variable to the Neon connection string
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_kxZDhdAeE35y@ep-delicate-block-a4wdwtzv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

console.log('Setting up cloud database schema...');

try {
  // Run Prisma migrations to set up the schema
  console.log('Running Prisma migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  // Generate Prisma client
  console.log('Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('Cloud database schema setup completed successfully!');
} catch (error) {
  console.error('Error setting up cloud database schema:', error);
}
