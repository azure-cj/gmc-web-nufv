import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: [
    '@vercel/blob',
    '@vercel/oidc',
    '@sparticuz/chromium',
    'puppeteer-core',
    'jose',
  ],
};

export default nextConfig;
