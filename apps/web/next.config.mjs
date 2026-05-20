/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained build for the Cloud Run runtime image. Cuts the
  // image to ~50MB and avoids shipping the dev dependencies.
  output: 'standalone',
  experimental: {
    // Trace files from the monorepo root so the standalone bundle
    // captures workspace-shared modules correctly.
    outputFileTracingRoot: undefined,
  },
};

export default nextConfig;
