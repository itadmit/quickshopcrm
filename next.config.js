/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone build - מקטין את גודל ה-build ומאיץ deployment
  output: 'standalone',
  
  // Server Actions are enabled by default in Next.js 14
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
    // אופטימיזציה של תמונות
    formats: ['image/webp'], // WebP בלבד - קטן יותר
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 ימים cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // גדלים אופטימליים
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // גדלים קטנים
  },
  // Fix for regenerator runtime issues
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
}

module.exports = nextConfig

