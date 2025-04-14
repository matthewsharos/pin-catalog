import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// This route would need to be adjusted based on how you're handling file uploads with Vercel
// For now, this is a placeholder showing the structure for handling multipart form data

export async function POST(req) {
  try {
    // In a real implementation, you would parse multipart form data here
    // and upload files to a storage service compatible with Vercel (like Vercel Blob)
    const formData = await req.formData();
    const pinId = formData.get('pinId');
    const photos = formData.getAll('photos');

    if (!pinId) {
      return NextResponse.json({ error: 'Pin ID is required' }, { status: 400 });
    }

    // Simulate uploading photos and getting URLs (replace with actual storage logic)
    const photoUrls = photos.map((photo, index) => ({
      url: `/uploads/${pinId}/${Date.now()}-${index}.jpg` // Placeholder URL
    }));

    // Save photo URLs to database
    const createdPhotos = await prisma.photo.createMany({
      data: photoUrls.map(p => ({
        url: p.url,
        pinId: pinId
      })) 
    });

    return NextResponse.json({ urls: photoUrls.map(p => p.url) });
  } catch (error) {
    console.error('Error uploading photos:', error);
    return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
