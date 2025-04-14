// Script to apply the migration to add missing fields
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set the DATABASE_URL environment variable to the Neon connection string
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_kxZDhdAeE35y@ep-delicate-block-a4wdwtzv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

console.log('Applying migration to add missing fields...');

try {
  // Execute the SQL directly using Prisma's db execute
  const migrationSQL = fs.readFileSync(
    path.join(process.cwd(), 'prisma/migrations/20250414_add_missing_fields/migration.sql'),
    'utf8'
  );
  
  // Use psql to execute the SQL (since Prisma doesn't have a direct way to run arbitrary SQL)
  const tempSqlFile = path.join(process.cwd(), 'temp_migration.sql');
  fs.writeFileSync(tempSqlFile, migrationSQL);
  
  // Execute the SQL using environment variable for connection
  execSync(`PGPASSWORD=npg_kxZDhdAeE35y psql -h ep-delicate-block-a4wdwtzv-pooler.us-east-1.aws.neon.tech -U neondb_owner -d neondb -f ${tempSqlFile}`, { 
    stdio: 'inherit'
  });
  
  // Clean up temp file
  fs.unlinkSync(tempSqlFile);
  
  console.log('Migration applied successfully!');
} catch (error) {
  console.error('Error applying migration:', error);
}
