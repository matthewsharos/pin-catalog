import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // Add proper headers to avoid CORS issues
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': new URL(request.url).origin,
      },
    };

    const response = await fetch(imageUrl, fetchOptions);
    
    if (!response.ok) {
      console.error(`Error fetching image: ${response.status} ${response.statusText}`);
      return new NextResponse(`Failed to fetch image: ${response.status}`, { 
        status: response.status 
      });
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    // Check if the response is actually an image
    if (!contentType || !contentType.startsWith('image/')) {
      console.error(`Invalid content type: ${contentType}`);
      return new NextResponse('Invalid image content type', { status: 415 });
    }

    // Get the image data
    const imageData = await response.arrayBuffer();
    
    // Return the image with appropriate headers
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength || String(imageData.byteLength),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new NextResponse('Error proxying image: ' + (error.message || 'Unknown error'), { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
