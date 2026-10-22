import { afterEach, describe, expect, test, vi } from 'vitest';
import Base from '../src/layouts/Base.astro';
import Seo from '../src/components/Seo.astro';
import NotFound from '../src/pages/404.astro';
import { render } from './helpers/render';

afterEach(() => { vi.unstubAllEnvs(); });

test('Base renders nav links and no beacon without token', async () => { const html = await render(Base, { props: { title: 'T' }, slots: { default: 'X' } }); expect(html).toContain('href="/photos/"'); expect(html).not.toContain('cloudflareinsights'); expect(html).toContain('<html lang="en"'); });

describe('Base', () => {
  test('sets the html lang from the lang prop', async () => {
    const html = await render(Base, { props: { title: 'T', lang: 'it' }, slots: { default: 'X' } });
    expect(html).toContain('<html lang="it"');
  });

  test('renders the slot inside main, with nav and footer around it', async () => {
    const html = await render(Base, { props: { title: 'T' }, slots: { default: '<p>slot-body</p>' } });
    expect(html).toMatch(/<main[^>]*>[\s\S]*<p>slot-body<\/p>[\s\S]*<\/main>/);
    expect(html).toContain('href="/blog/"');
    expect(html).toContain('href="/agile-scrum-product-owner-manager-turin-italy/"');
    expect(html).toContain(`© ${new Date().getFullYear()} Olegs Belousovs`);
    expect(html).toContain('href="mailto:44_tildes_agog@icloud.com"');
    expect(html).toContain('href="/feed.xml"');
    expect(html).not.toContain('privacy'); // the site sets no cookies: no policy pages
  });

  test('renders the Cloudflare beacon when a token is set', async () => {
    vi.stubEnv('PUBLIC_CF_BEACON_TOKEN', 'abc123');
    const html = await render(Base, { props: { title: 'T' }, slots: { default: 'X' } });
    expect(html).toContain('src="https://static.cloudflareinsights.com/beacon.min.js"');
    expect(html).toContain('{&quot;token&quot;:&quot;abc123&quot;}');
  });

  test.each([
    ['/photos/', '/photos/', 'page'],
    ['/gallery/turin/', '/photos/', 'true'],
    ['/blog/', '/blog/', 'page'],
    ['/category/agile/', '/blog/', 'true'],
    ['/2019/05/some-post/', '/blog/', 'true'],
    ['/agile-scrum-product-owner-manager-turin-italy/', '/agile-scrum-product-owner-manager-turin-italy/', 'page'],
  ])('marks the current section at %s', async (path, href, value) => {
    const html = await render(Base, { props: { title: 'T' }, slots: { default: 'X' }, path });
    expect(html).toMatch(new RegExp(`href="${href}" aria-current="${value}"`));
    expect(html.match(/aria-current=/g)).toHaveLength(1);
  });

  test('marks no section on the home page', async () => {
    const html = await render(Base, { props: { title: 'T' }, slots: { default: 'X' }, path: '/' });
    expect(html).not.toContain('aria-current');
  });
});

describe('Seo', () => {
  test('emits title, description, canonical, Open Graph and the feed link', async () => {
    const html = await render(Seo, { props: { title: 'Hello — olegs', description: 'A page', lang: 'en' }, path: '/blog/' });
    expect(html).toContain('<title>Hello — olegs</title>');
    expect(html).toContain('<meta name="description" content="A page"');
    expect(html).toContain('<link rel="canonical" href="https://olegs.be/blog/"');
    expect(html).toContain('<meta property="og:title" content="Hello — olegs"');
    expect(html).toContain('<meta property="og:url" content="https://olegs.be/blog/"');
    expect(html).toContain('<meta name="twitter:card" content="summary"');
    expect(html).toContain('<link rel="alternate" type="application/rss+xml" title="olegs — blog" href="/feed.xml"');
    expect(html).not.toContain('og:image');
  });

  test('omits the description when absent and uses a large card with an image', async () => {
    const html = await render(Seo, { props: { title: 'T', lang: 'en', ogImage: 'https://img.olegs.be/x.jpg', canonical: 'https://olegs.be/x/' } });
    expect(html).not.toContain('name="description"');
    expect(html).toContain('<meta property="og:image" content="https://img.olegs.be/x.jpg"');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(html).toContain('<link rel="canonical" href="https://olegs.be/x/"');
  });
});

test('404 page repeats the three section links', async () => {
  const html = await render(NotFound, { path: '/404/' });
  expect(html).toContain('<title>Page not found — olegs</title>');
  expect(html).toContain('This page does not exist.');
  for (const href of ['/photos/', '/blog/', '/agile-scrum-product-owner-manager-turin-italy/']) {
    expect(html.split(`href="${href}"`).length - 1).toBe(2);
  }
});
