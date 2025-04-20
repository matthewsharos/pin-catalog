import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(req) {
  try {
    const { pinIds } = await req.json();
    
    if (!Array.isArray(pinIds) || pinIds.length === 0) {
      return NextResponse.json({ error: 'Invalid pin IDs' }, { status: 400 });
    }

    await prisma.pin.updateMany({
      where: {
        id: {
          in: pinIds
        }
      },
      data: {
        isCollected: true,
        updatedAt: new Date() // Update timestamp
      }
    });

    return NextResponse.json({ message: 'Pins marked as collected successfully' });
  } catch (error) {
    console.error('Error updating pins:', error);
    return NextResponse.json({ error: 'Failed to update pins' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
