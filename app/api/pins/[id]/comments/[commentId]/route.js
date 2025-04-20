import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';

export async function DELETE(req, { params }) {
  try {
    const pinId = parseInt(params.id);
    const commentId = parseInt(params.commentId);

    if (isNaN(pinId) || isNaN(commentId)) {
      return NextResponse.json({ error: 'Invalid pin ID or comment ID' }, { status: 400 });
    }

    // Check if the comment exists and belongs to the specified pin
    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId,
        AND: {
          pinId: pinId
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or does not belong to the specified pin' }, { status: 404 });
    }

    // Delete the comment
    await prisma.comment.delete({
      where: {
        id: commentId
      }
    });

    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
