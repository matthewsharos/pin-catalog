import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error('BLOB_READ_WRITE_TOKEN is not set');
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

    // Upload to Vercel Blob
    const { url } = await put(file.name, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return NextResponse.json({ 
      url,
      success: true
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
