// Deploy schema changes to production database
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path to production .env file
const envPath = path.join(process.cwd(), '.env.production');

// Check if production .env file exists
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.production file not found');
  process.exit(1);
}

// Read production database URL
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);

if (!dbUrlMatch) {
  console.error('Error: DATABASE_URL not found in .env.production');
  process.exit(1);
}

const productionDbUrl = dbUrlMatch[1];

console.log('Deploying schema changes to production database...');

try {
  // Create temporary .env file with production database URL
  const tempEnvPath = path.join(process.cwd(), '.env.temp');
  fs.writeFileSync(tempEnvPath, `DATABASE_URL="${productionDbUrl}"\n`);
  
  // Run prisma migrate deploy with the temporary .env file
  execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
    env: {
      ...process.env,
      DATABASE_URL: productionDbUrl
    },
    stdio: 'inherit'
  });
  
  // Clean up temporary .env file
  fs.unlinkSync(tempEnvPath);
  
  console.log('Schema changes deployed successfully!');
} catch (error) {
  console.error('Error deploying schema changes:', error);
  process.exit(1);
}
