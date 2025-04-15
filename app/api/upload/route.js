import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set');
}

export async function POST(req) {
  try {
    const data = await req.formData();
    const file = data.get('image');

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Log file information for debugging
    console.log('File info:', {
      type: file.type,
      size: file.size,
      name: file.name
    });

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Storage configuration is missing' },
        { status: 500 }
      );
    }

    // Create a unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `pin-photo-${uniqueSuffix}${path.extname(file.name || '.jpg')}`;
    
    // Upload to Vercel Blob Storage
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
      maxAge: 31536000, // 1 year cache
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    // Return the URL for the uploaded image
    return NextResponse.json({ 
      url: blob.url,
      success: true
    });
  } catch (error) {
    console.error('Error uploading file:', error);

    // Check for specific error types
    if (error.name === 'BlobError') {
      return NextResponse.json(
        { error: 'Storage service error: ' + error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Error uploading file: ' + error.message },
      { status: 500 }
    );
  }
}
