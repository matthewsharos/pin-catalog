// Migration script to update pin statuses
// 1. Update all pins currently marked as "uncollected" to "uncategorized"
// 2. Update all pins currently marked as "deleted" to "uncollected"

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migratePinStatuses() {
  console.log('Starting pin status migration...');
  
  try {
    // Step 1: Find all pins that are currently "uncollected" (isCollected=false, isDeleted=false, isWishlist=false)
    // and mark them as "uncategorized" (reset all flags)
    const uncollectedPins = await prisma.pin.findMany({
      where: {
        isCollected: false,
        isDeleted: false,
        isWishlist: false
      }
    });
    
    console.log(`Found ${uncollectedPins.length} uncollected pins to update to uncategorized`);
    
    // These pins are already in the correct state for "uncategorized"
    // (isCollected=false, isDeleted=false, isWishlist=false)
    // so we don't need to update them
    
    // Step 2: Find all pins that are currently "deleted" (isDeleted=true, isWishlist=false)
    // and mark them as "uncollected" (isCollected=false, isDeleted=false, isWishlist=false)
    const deletedPins = await prisma.pin.findMany({
      where: {
        isDeleted: true,
        isWishlist: false
      }
    });
    
    console.log(`Found ${deletedPins.length} deleted pins to update to uncollected`);
    
    // Update all deleted pins to uncollected
    if (deletedPins.length > 0) {
      const updateResult = await prisma.pin.updateMany({
        where: {
          isDeleted: true,
          isWishlist: false
        },
        data: {
          isDeleted: false,
          isCollected: false,
          isWishlist: false
        }
      });
      
      console.log(`Updated ${updateResult.count} pins from deleted to uncollected`);
    }
    
    console.log('Migration completed successfully!');
    
    // Create a log file with the results
    const logContent = `
Migration completed at ${new Date().toISOString()}
- Found ${uncollectedPins.length} uncollected pins (already in correct state for uncategorized)
- Updated ${deletedPins.length} pins from deleted to uncollected
    `;
    
    fs.writeFileSync(path.join(process.cwd(), 'migration-log.txt'), logContent);
    console.log('Migration log saved to migration-log.txt');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migratePinStatuses();
