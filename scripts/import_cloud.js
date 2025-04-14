// Script to import data to the cloud database
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Set the DATABASE_URL environment variable to the Neon connection string
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_kxZDhdAeE35y@ep-delicate-block-a4wdwtzv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Initialize Prisma client with the cloud database URL
const prisma = new PrismaClient();

async function importData() {
  console.log('Starting data import to cloud database...');
  
  try {
    const exportDir = path.join(process.cwd(), 'export');
    
    // Import pins
    console.log('Importing pins...');
    const pinsData = JSON.parse(fs.readFileSync(path.join(exportDir, 'pins.json'), 'utf8'));
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < pinsData.length; i += batchSize) {
      const batch = pinsData.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async pin => {
          try {
            // Only include fields that are in the schema
            const cleanPin = {
              pinId: pin.pinId || null,
              pinName: pin.pinName || '',
              imageUrl: pin.imageUrl || null,
              series: pin.series || null,
              origin: pin.origin || null,
              edition: pin.edition || null,
              releaseDate: pin.releaseDate ? new Date(pin.releaseDate) : null,
              tags: Array.isArray(pin.tags) ? pin.tags : [],
              isCollected: !!pin.isCollected,
              isMystery: !!pin.isMystery,
              isLimitedEdition: !!pin.isLimitedEdition,
              rarity: pin.rarity || null,
              year: pin.year || null,
              pinpopUrl: pin.pinpopUrl || null,
              isDeleted: !!pin.isDeleted,
              isWishlist: !!pin.isWishlist,
              createdAt: pin.createdAt ? new Date(pin.createdAt) : new Date(),
              updatedAt: pin.updatedAt ? new Date(pin.updatedAt) : new Date()
            };
            
            await prisma.pin.create({
              data: cleanPin
            });
          } catch (err) {
            console.error(`Error importing pin ${pin.pinId || 'unknown'}:`, err.message);
          }
        })
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
