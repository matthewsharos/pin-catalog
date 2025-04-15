import { NextResponse } from 'next/server';

export function middleware(request) {
  // Get the origin of the request
  const origin = request.headers.get('origin') || '*';
  
  // Get the pathname from the URL
  const { pathname } = request.nextUrl;

  // Only apply CORS headers to API routes
  if (pathname.startsWith('/api')) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400', // 24 hours
          'Vary': 'Origin'
        }
      });
    }

    // For actual requests, create a new response
    const response = NextResponse.next();
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Vary', 'Origin');
    
    return response;
  }
  
  // For non-API routes, just continue
  return NextResponse.next();
}

// Configure the middleware to run only on API routes
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
