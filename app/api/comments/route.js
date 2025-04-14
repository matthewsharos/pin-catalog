import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(req) {
  try {
    const { pinId, content } = await req.json();

    if (!pinId || !content) {
      return NextResponse.json({ error: 'Pin ID and comment content are required' }, { status: 400 });
    }

    const newComment = await prisma.comment.create({
      data: {
        pinId,
        content
      }
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
