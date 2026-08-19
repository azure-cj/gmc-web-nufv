import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot,
  // Externalization keeps Chromium's relative asset lookup intact; explicit tracing
  // is also required so Vercel includes the package's compressed binaries in the function.
  outputFileTracingIncludes: {
    "/api/staff/gmc-requests/[requestId]/certificate-review": [
      "./.vercel-chromium-bin/**",
    ],
  },
  serverExternalPackages: [
    '@vercel/blob',
    '@vercel/oidc',
    '@sparticuz/chromium',
    'puppeteer-core',
    'jose',
  ],
};

export default nextConfig;
