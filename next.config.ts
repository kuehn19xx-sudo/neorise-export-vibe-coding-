import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qqpowupqupbtlowugldh.supabase.co",
      },
    ],
  },
};

export default nextConfig;