import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AI SDK 6's server runtime is kept as a native Node dependency. This avoids
  // Turbopack re-ordering its initialization while collecting route metadata.
  serverExternalPackages: ['ai'],
};

export default nextConfig;
