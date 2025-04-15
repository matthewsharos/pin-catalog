import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPinPopUrls() {
  try {
    // Get all pins that have a pinId
    const pins = await prisma.pin.findMany({
      where: {
        pinId: {
          not: null
        }
      },
      select: {
        id: true,
        pinId: true,
        pinpopUrl: true
      }
    });

    console.log(`Found ${pins.length} pins to update`);

    // Update each pin with the correct pinpopUrl format
    for (const pin of pins) {
      const correctUrl = `https://pinandpop.com/pins/${pin.pinId}`;
      
      if (pin.pinpopUrl !== correctUrl) {
        await prisma.pin.update({
          where: { id: pin.id },
          data: { pinpopUrl: correctUrl }
        });
        console.log(`Updated pin ${pin.pinId} with correct URL`);
      }
    }

    console.log('Finished updating pin URLs');
  } catch (error) {
    console.error('Error updating pin URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPinPopUrls();
