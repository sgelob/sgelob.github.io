import type { APIRoute } from 'astro';
import { SITE } from './site';

/**
 * WordPress (Yoast) served the sitemap at /sitemap.xml and /sitemap_index.xml; @astrojs/sitemap writes
 * /sitemap-index.xml pointing at /sitemap-0.xml. A static site cannot redirect, so the old URLs serve the
 * same index. The site has a few hundred URLs: @astrojs/sitemap starts a second file only past 45,000.
 */
export function sitemapIndex(site: URL | string): string {
  const loc = new URL('/sitemap-0.xml', site).href;
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${loc}</loc></sitemap></sitemapindex>`;
}

export const sitemapIndexRoute: APIRoute = (context) =>
  new Response(sitemapIndex(context.site ?? SITE.url), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
