/** @type {import('next').NextConfig} */
const nextConfig: any = {
  reactCompiler: true,
  transpilePackages: ['@shopify/polaris', '@shopify/polaris-icons'],
  serverExternalPackages: ['firebase-admin', 'firebase-admin/app', 'firebase-admin/auth', 'mercadopago', 'jspdf', 'jspdf-autotable', 'fflate'],
  compress: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: `${process.env.AWS_S3_BUCKET ?? 'kiosko-blob'}.s3.${process.env.AWS_REGION ?? 'us-east-2'}.amazonaws.com`,
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [40, 64, 96, 128, 256],
  },
  experimental: {
    optimizePackageImports: ['@shopify/polaris', '@shopify/polaris-icons', 'lucide-react', 'date-fns', 'recharts'],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
