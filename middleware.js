import { NextResponse } from 'next/server';

export function middleware(request) {
  // Get the origin of the request
  const origin = request.headers.get('origin') || '';
  
  // Get the pathname from the URL
  const { pathname } = request.nextUrl;

  // Only apply CORS headers to API routes
  if (pathname.startsWith('/api')) {
    // Create a new response or use the original
    const response = NextResponse.next();
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }
  
  // For non-API routes, just continue
  return NextResponse.next();
}

// Configure the middleware to run only on API routes
export const config = {
  matcher: '/api/:path*',
};
