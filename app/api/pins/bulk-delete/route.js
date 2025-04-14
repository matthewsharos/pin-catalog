import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        isDeleted: true
      }
    });

    return NextResponse.json({ message: 'Pins deleted successfully' });
  } catch (error) {
    console.error('Error deleting pins:', error);
    return NextResponse.json({ error: 'Failed to delete pins' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
