// Script to update pins with null or dash dates to use 1/1/1 as a dummy date
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateInvalidDates() {
  console.log('Starting date update process...');
  
  try {
    // First, find all pins with null dates
    const pinsWithNullDates = await prisma.pin.findMany({
      where: {
        releaseDate: null
      },
      select: {
        id: true,
        pinName: true,
        releaseDate: true
      }
    });
    
    console.log(`Found ${pinsWithNullDates.length} pins with null dates`);
    
    // Update each pin with a dummy date (January 1, 0001)
    const dummyDate = new Date('0001-01-01T00:00:00.000Z');
    
    // Update pins with null dates
    for (const pin of pinsWithNullDates) {
      await prisma.pin.update({
        where: { id: pin.id },
        data: { releaseDate: dummyDate }
      });
      console.log(`Updated pin ${pin.id}: ${pin.pinName} (was null)`);
    }
    
    // Now find pins with dash or other invalid date strings
    // We need to get all pins and check their dates manually
    const allPins = await prisma.pin.findMany({
      select: {
        id: true,
        pinName: true,
        releaseDate: true
      }
    });
    
    const pinsWithInvalidDates = allPins.filter(pin => {
      if (!pin.releaseDate) return false; // Skip nulls (already handled)
      
      // Check if the date is invalid
      const dateValue = pin.releaseDate.valueOf();
      return isNaN(dateValue) || pin.releaseDate.toString().includes('Invalid Date');
    });
    
    console.log(`Found ${pinsWithInvalidDates.length} pins with invalid dates`);
    
    // Update pins with invalid dates
    for (const pin of pinsWithInvalidDates) {
      await prisma.pin.update({
        where: { id: pin.id },
        data: { releaseDate: dummyDate }
      });
      console.log(`Updated pin ${pin.id}: ${pin.pinName} (had invalid date)`);
    }
    
    console.log('Date update process completed successfully!');
  } catch (error) {
    console.error('Error updating dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updateInvalidDates();
