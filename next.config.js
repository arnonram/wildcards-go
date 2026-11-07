/**
 * Sent with every response. The CSP leaves scripts and styles alone: locking
 * them down needs per-request nonces, which would end static pages and the
 * service worker's precache. It still stops framing (clickjacking), plugins,
 * <base> hijacking and forms posting off-site.
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Browsers ignore it over plain HTTP, so LAN installs without TLS are unaffected.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    // Not on Next's own assets: they need none of this, and `nosniff` makes the
    // browser refuse a script Next serves with a JSON type in development.
    return [{ source: '/((?!_next/).*)', headers: securityHeaders }];
  },
  // The Docker image builds a self-contained server in .next/standalone.
  // Everywhere else (Vercel, `next start`) keeps the default output.
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' && { output: 'standalone' }),
};

module.exports = nextConfig;
