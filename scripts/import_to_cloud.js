// Import data from JSON files to cloud database
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Prisma client with the cloud database URL
// You'll need to run this with the DATABASE_URL environment variable set to your cloud database
const prisma = new PrismaClient();

async function importData() {
  console.log('Starting data import to cloud database...');
  
  try {
    const exportDir = path.join(process.cwd(), 'export');
    
    // Import pins
    console.log('Importing pins...');
    const pinsData = JSON.parse(fs.readFileSync(path.join(exportDir, 'pins.json'), 'utf8'));
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < pinsData.length; i += batchSize) {
      const batch = pinsData.slice(i, i + batchSize);
      await Promise.all(
        batch.map(pin => 
          prisma.pin.create({
            data: {
              ...pin,
              // Convert date strings back to Date objects
              releaseDate: pin.releaseDate ? new Date(pin.releaseDate) : null,
              createdAt: pin.createdAt ? new Date(pin.createdAt) : new Date(),
              updatedAt: pin.updatedAt ? new Date(pin.updatedAt) : new Date()
            }
          })
        )
      );
      console.log(`Imported pins ${i + 1} to ${Math.min(i + batchSize, pinsData.length)}`);
    }
    
    console.log('Data import completed successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importData();
