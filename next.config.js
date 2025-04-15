/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // This will be overridden by NEXT_PUBLIC_API_URL in Vercel environment variables
    NEXT_PUBLIC_API_URL: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000',
    // Use the same URL for the Vercel deployment
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
  },
  swcMinify: true,
  compiler: {
    styledComponents: true,
  },
  images: {
    domains: ['pinpics.com', 'cdn.pinpics.com', 'pin-pics.s3.amazonaws.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'canvas'],
  },
  async headers() {
    return [
      {
        // Apply CORS headers to all API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
