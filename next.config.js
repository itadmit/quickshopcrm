const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  swcMinify: true, // מינימיזציה מהירה יותר עם SWC
  reactStrictMode: true, // בדיקות טובות יותר
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // הסר console.log בפרודקשן אבל השאר errors
    } : false,
  },
  
  // Use standalone output to reduce build trace issues
  output: 'standalone',
  // Disable output file tracing to avoid micromatch recursion on Vercel
  outputFileTracing: false,
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Lazy load מודולים גדולים
    // Reduce build trace collection to avoid micromatch stack overflow
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  
  // Server Actions are enabled by default in Next.js 14
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
    // אופטימיזציה של תמונות
    formats: ['image/webp'], // WebP בלבד - קטן יותר
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 ימים cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // גדלים אופטימליים
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // גדלים קטנים
  },
  
  // Headers for caching - פשוט יותר כדי למנוע בעיות עם micromatch
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
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

module.exports = withNextIntl(nextConfig)

