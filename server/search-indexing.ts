import type { Env } from './env';

const PUBLIC_PATHS = ['/', '/privacy'];

/**
 * Only the instance that sets SITE_INDEXABLE=1 (the hosted site) invites
 * search engines; self-hosted servers stay out of results by default.
 */
function indexableOrigin(env: Env): string | undefined {
  if (env.SITE_INDEXABLE !== '1' || !env.BETTER_AUTH_URL) return undefined;
  return env.BETTER_AUTH_URL.replace(/\/+$/, '');
}

export function robotsTxt(env: Env): string {
  const origin = indexableOrigin(env);
  if (!origin) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function sitemapXml(env: Env): string | undefined {
  const origin = indexableOrigin(env);
  if (!origin) return undefined;
  const urls = PUBLIC_PATHS.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
