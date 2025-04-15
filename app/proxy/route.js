import { NextResponse } from 'next/server';

// This is a simple proxy endpoint that will forward requests to the real API
export async function POST(req) {
  try {
    // Get the target URL from the request
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target');
    
    if (!target) {
      return NextResponse.json(
        { error: 'No target specified' },
        { status: 400 }
      );
    }
    
    // Get the request body
    const contentType = req.headers.get('content-type') || '';
    let body;
    
    if (contentType.includes('multipart/form-data')) {
      body = await req.formData();
    } else if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      body = await req.text();
    }
    
    // Forward the request to the target
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
    
    // Get the response
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error.message },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        }
      }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    }
  });
}
