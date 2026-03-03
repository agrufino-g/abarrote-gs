import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@shopify/polaris', '@shopify/polaris-icons'],
};

export default nextConfig;
