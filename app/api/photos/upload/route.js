import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { put } from '@vercel/blob';

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

    // Upload photos to Vercel Blob Storage
    const uploadPromises = photos.map(async (photo, index) => {
      // Generate a unique filename
      const filename = `pin-photo-${pinId}-${Date.now()}-${index}.jpg`;
      
      // Upload to Vercel Blob Storage
      const blob = await put(filename, photo, {
        access: 'public',
      });
      
      // Return the URL of the uploaded file
      return blob.url;
    });

    // Wait for all uploads to complete
    const photoUrls = await Promise.all(uploadPromises);

    // Save photo URLs to database
    await Promise.all(
      photoUrls.map(url => 
        prisma.userPhoto.create({
          data: {
            url,
            pinId: parseInt(pinId),
          }
        })
      )
    );

    return NextResponse.json({ urls: photoUrls });
  } catch (error) {
    console.error('Error uploading photos:', error);
    return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
