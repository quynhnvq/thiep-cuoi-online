import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phone testing via LAN IP (otherwise Next blocks /_next/* and React never hydrates)
  allowedDevOrigins: ["192.168.1.7"],
};

export default nextConfig;
