import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  // permite cargar assets del dev server a través del túnel ngrok
  allowedDevOrigins: ['cresco-a.ngrok.dev', 'cresco-b.ngrok.dev', 'cresco-c.ngrok.dev'],
};

export default nextConfig;
