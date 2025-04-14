import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req, { params }) {
  try {
    const { content } = await req.json();
    const pinId = parseInt(params.id);

    const comment = await prisma.comment.create({
      data: {
        content,
        pinId
      }
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
