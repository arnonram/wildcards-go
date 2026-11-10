import { expect, test } from 'bun:test';
import { robotsTxt, sitemapXml } from './search-indexing';

const HOSTED = { SITE_INDEXABLE: '1', BETTER_AUTH_URL: 'https://wcg.example/' };

test('an instance without SITE_INDEXABLE asks crawlers to stay out', () => {
  const env = { BETTER_AUTH_URL: 'https://wcg.example' };
  expect(robotsTxt(env)).toBe('User-agent: *\nDisallow: /\n');
  expect(sitemapXml(env)).toBeUndefined();
});

test('SITE_INDEXABLE without an address is not indexable', () => {
  expect(robotsTxt({ SITE_INDEXABLE: '1' })).toBe('User-agent: *\nDisallow: /\n');
});

test('an indexable instance allows crawling except the API and points at its own sitemap', () => {
  expect(robotsTxt(HOSTED)).toBe(
    'User-agent: *\nDisallow: /api/\n\nSitemap: https://wcg.example/sitemap.xml\n',
  );
});

test('the sitemap lists the public pages on the instance’s own address', () => {
  const xml = sitemapXml(HOSTED);
  expect(xml).toContain('<loc>https://wcg.example/</loc>');
  expect(xml).toContain('<loc>https://wcg.example/privacy</loc>');
  expect(xml).not.toContain('/character');
});
