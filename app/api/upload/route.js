import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error('BLOB_READ_WRITE_TOKEN is not set');
}

// Define allowed origins
const allowedOrigins = [
  'https://www.sharospins.com',
  'http://localhost:3000',
  'https://pin-catalog.vercel.app'
];

// Helper function to add CORS headers
const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
});

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Handle preflight requests
export async function OPTIONS(req) {
  const origin = req.headers.get('origin') || '';
  
  // Check if origin is allowed
  if (!allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin)
  });
}

export async function POST(req) {
  const origin = req.headers.get('origin') || '';
  
  // Check if origin is allowed
  if (!allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403 }
    );
  }

  try {
    const data = await req.formData();
    const file = data.get('image');

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { 
          status: 400,
          headers: corsHeaders(origin)
        }
      );
    }

    // Upload to Vercel Blob
    const { url } = await put(file.name, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return NextResponse.json(
      { url, success: true },
      { headers: corsHeaders(origin) }
    );

  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      { error: error.message },
      { 
        status: 500,
        headers: corsHeaders(origin)
      }
    );
  }
}
