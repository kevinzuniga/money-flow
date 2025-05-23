/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicitly set to use Pages Router since the project is structured that way
  // This ensures compatibility when upgrading from Next.js 14 to 15
  useFileSystemPublicRoutes: true,
  
  // Configure security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },

  // Set proper environment for Node.js
  poweredByHeader: false,
  
  // Ensure Images are properly optimized
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp']
  },

  // Make sure serverless functions can run in the AWS environment (us-east-1)
  experimental: {
    // Enable if you need streaming features in Next.js 15
    // serverActions: true,
  }
};

module.exports = nextConfig;

