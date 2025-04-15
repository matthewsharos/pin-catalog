// Fix migration script to properly mark uncollected pins
// This will update pins that were previously marked as deleted to have the correct uncollected status

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixUncollectedPins() {
  console.log('Starting pin status fix migration...');
  
  try {
    // Find all pins that are currently "uncategorized" but should be "uncollected"
    // These are the pins that were previously deleted and migrated incorrectly
    const pinsToFix = await prisma.pin.findMany({
      where: {
        isCollected: false,
        isDeleted: false,
        isWishlist: false
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 3100 // Get slightly more than the ~3000 pins we expect
    });
    
    console.log(`Found ${pinsToFix.length} potentially uncategorized pins to check`);
    
    // We'll update the most recently updated pins, which should be the ones from our migration
    const pinIdsToUpdate = pinsToFix.slice(0, 3024).map(pin => pin.id);
    
    console.log(`Will update ${pinIdsToUpdate.length} pins to uncollected status`);
    
    // Update these pins to have the correct uncollected status
    if (pinIdsToUpdate.length > 0) {
      const updateResult = await prisma.pin.updateMany({
        where: {
          id: {
            in: pinIdsToUpdate
          }
        },
        data: {
          isDeleted: true,
          isCollected: false,
          isWishlist: false
        }
      });
      
      console.log(`Updated ${updateResult.count} pins to proper uncollected status`);
    }
    
    console.log('Fix migration completed successfully!');
    
    // Create a log file with the results
    const logContent = `
Fix migration completed at ${new Date().toISOString()}
- Updated ${pinIdsToUpdate.length} pins to proper uncollected status (isDeleted=true, isCollected=false, isWishlist=false)
    `;
    
    fs.writeFileSync(path.join(process.cwd(), 'fix-migration-log.txt'), logContent);
    console.log('Fix migration log saved to fix-migration-log.txt');
    
  } catch (error) {
    console.error('Fix migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix migration
fixUncollectedPins();
