import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  // Keep local storefront demos free of the dev-tools badge, which otherwise
  // floats above full-screen buyer overlays such as checkout.
  devIndicators: false,
  // AI SDK 6's server runtime is kept as a native Node dependency. This avoids
  // Turbopack re-ordering its initialization while collecting route metadata.
  serverExternalPackages: ['ai'],
  images: supabaseUrl
    ? {
        remotePatterns: [
          {
            protocol: new URL(supabaseUrl).protocol.replace(':', '') as 'http' | 'https',
            hostname: new URL(supabaseUrl).hostname,
            pathname: '/storage/v1/object/public/product-shots/**',
          },
        ],
      }
    : undefined,
};

export default nextConfig;
