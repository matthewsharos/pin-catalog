// Restore data from export files to the database
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreData() {
  console.log('Starting data restoration...');
  
  try {
    // Check if export file exists
    const pinsFilePath = path.join(process.cwd(), 'export', 'pins.json');
    if (!fs.existsSync(pinsFilePath)) {
      console.error('Error: pins.json export file not found');
      return;
    }
    
    // Read pins data
    console.log('Reading pins data...');
    const pinsData = JSON.parse(fs.readFileSync(pinsFilePath, 'utf8'));
    console.log(`Found ${pinsData.length} pins to restore`);
    
    // Process pins in batches to avoid memory issues
    const batchSize = 100;
    const totalBatches = Math.ceil(pinsData.length / batchSize);
    
    console.log(`Restoring pins in ${totalBatches} batches of ${batchSize}...`);
    
    for (let i = 0; i < pinsData.length; i += batchSize) {
      const batch = pinsData.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`Processing batch ${batchNumber}/${totalBatches}...`);
      
      // Create pins in database
      await Promise.all(
        batch.map(async (pin) => {
          // Remove id to let Prisma generate a new one if needed
          const { id, ...pinData } = pin;
          
          // Convert dates from strings back to Date objects
          if (pinData.releaseDate) {
            pinData.releaseDate = new Date(pinData.releaseDate);
          }
          if (pinData.createdAt) {
            pinData.createdAt = new Date(pinData.createdAt);
          }
          if (pinData.updatedAt) {
            pinData.updatedAt = new Date(pinData.updatedAt);
          }
          
          try {
            // Check if pin with this ID already exists
            const existingPin = await prisma.pin.findUnique({
              where: { id },
            });
            
            if (existingPin) {
              // Update existing pin
              await prisma.pin.update({
                where: { id },
                data: pinData,
              });
            } else {
              // Create new pin with original ID
              await prisma.pin.create({
                data: {
                  id,
                  ...pinData,
                },
              });
            }
          } catch (error) {
            console.error(`Error restoring pin ${id}:`, error);
          }
        })
      );
      
      console.log(`Completed batch ${batchNumber}/${totalBatches}`);
    }
    
    console.log('Data restoration completed successfully!');
  } catch (error) {
    console.error('Error restoring data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the restoration
restoreData();
