import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 });
    }
    
    // Fetch image from database
    const image = await prisma.userPhoto.findUnique({
      where: { id }
    });
    
    if (!image || !image.data) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Create a response with the image data
    const response = new NextResponse(image.data);
    
    // Set appropriate headers
    response.headers.set('Content-Type', image.contentType);
    response.headers.set('Content-Disposition', `inline; filename="${image.filename}"`);
    response.headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    return response;
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
