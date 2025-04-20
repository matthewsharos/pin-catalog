const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updatePinUrls() {
  try {
    // Get all pins that don't have a pinpopUrl or have an incorrect one
    const pins = await prisma.pin.findMany({
      where: {
        OR: [
          { pinpopUrl: null },
          { pinpopUrl: '' },
          { NOT: { pinpopUrl: { endsWith: '/' } } } // Catch URLs without trailing slash
        ]
      }
    });

    console.log(`Found ${pins.length} pins to update`);

    // Update each pin with the correct URL
    for (const pin of pins) {
      const updatedPin = await prisma.pin.update({
        where: { id: pin.id },
        data: {
          pinpopUrl: `https://pinandpop.com/pins/${pin.pinId}/`
        }
      });
      console.log(`Updated pin ${pin.pinId}: ${updatedPin.pinpopUrl}`);
    }

    console.log('All pins have been updated successfully');
  } catch (error) {
    console.error('Error updating pin URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePinUrls();
