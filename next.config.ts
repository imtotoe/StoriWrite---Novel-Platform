import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["omise"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.omise.co" },
      { protocol: "https", hostname: "**.opn.live" },
    ],
  },
};

export default nextConfig;
