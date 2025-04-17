import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

// Helper function to add CORS headers
const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
});

// Define allowed origins
const allowedOrigins = [
  'https://www.sharospins.com',
  'http://localhost:3000',
  'https://pin-catalog.vercel.app'
];

// Helper function to check if origin is allowed
const isOriginAllowed = (origin) => {
  // If no origin (same-origin request), allow it
  if (!origin) return true;
  
  // Check exact matches
  if (allowedOrigins.includes(origin)) return true;
  
  // Check localhost with any port
  if (origin.match(/^http:\/\/localhost:\d+$/)) return true;
  
  return false;
};

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Handle preflight requests
export async function OPTIONS(req) {
  const origin = req.headers.get('origin') || '';
  
  // Check if origin is allowed
  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin)
  });
}

export async function GET(req) {
  const origin = req.headers.get('origin') || '';

  // Check if origin is allowed
  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403 }
    );
  }

  try {
    // Get filename from query
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'No filename provided' },
        { 
          status: 400,
          headers: corsHeaders(origin)
        }
      );
    }

    // Generate a signed URL for client-side upload
    // Removed this block as it's not needed with database image storage

    return NextResponse.json(
      { 
        success: true 
      },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error('Error:', error);

    return NextResponse.json(
      { error: error.message },
      { 
        status: 500,
        headers: corsHeaders(origin)
      }
    );
  }
}

export async function POST(req) {
  const origin = req.headers.get('origin') || '';
  
  // Check if origin is allowed
  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403 }
    );
  }

  try {
    const data = await req.formData();
    const file = data.get('image');
    const pinId = parseInt(data.get('pinId') || '0', 10);

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { 
          status: 400,
          headers: corsHeaders(origin)
        }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { 
          status: 400,
          headers: corsHeaders(origin)
        }
      );
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG and WebP images are allowed.' },
        { 
          status: 400,
          headers: corsHeaders(origin)
        }
      );
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;

    // Store in database
    const userPhoto = await prisma.userPhoto.create({
      data: {
        filename: filename,
        contentType: file.type,
        data: buffer,
        // Only associate with a pin if pinId is provided and valid
        ...(pinId > 0 ? { pin: { connect: { id: pinId } } } : {})
      }
    });

    // Create a URL for the image
    const imageUrl = `/api/images/${userPhoto.id}`;

    return NextResponse.json(
      { 
        id: userPhoto.id,
        url: imageUrl,
        filename: userPhoto.filename,
        success: true 
      },
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
