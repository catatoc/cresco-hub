import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  // permite cargar assets del dev server a través del túnel ngrok
  allowedDevOrigins: ['cresco-a.ngrok.dev', 'cresco-b.ngrok.dev', 'cresco-c.ngrok.dev'],
  // los documentos privados se leen con fs en runtime (path dinámico): sin esto
  // el tracer de Vercel no los empaqueta en la función y la ruta daría ENOENT
  outputFileTracingIncludes: {
    '/portal/docs/[slug]/raw': ['./private-docs/**/*'],
    '/portal/docs/[slug]/pdf': ['./private-docs/**/*'],
    '/api/portal/docs/[slug]/raw': ['./private-docs/**/*'],
    '/api/portal/docs/[slug]/pdf': ['./private-docs/**/*'],
  },
};

export default nextConfig;
