import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

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
