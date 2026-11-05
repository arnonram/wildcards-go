/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Docker image builds a self-contained server in .next/standalone.
  // Everywhere else (Vercel, `next start`) keeps the default output.
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' && { output: 'standalone' }),
};

module.exports = nextConfig;
