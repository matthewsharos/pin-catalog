/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // This will be overridden by NEXT_PUBLIC_API_URL in Vercel environment variables
    NEXT_PUBLIC_API_URL: process.env.VERCEL_URL 
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
  }
}

module.exports = nextConfig
