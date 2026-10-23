import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { exists, read, contentCount } from './helpers/dist';
import { pagefindAttrs } from '../src/lib/search';

const POST = 'dist/2016/09/come-eseguire-test-sintetici-web-performance-webpagetest-org/index.html';

describe('search page', () => {
  test('is a noindex page with a labelled search form, out of the sitemap', () => {
    const html = read('dist/search/index.html');
    expect(html).toContain('<title>Search — olegs</title>');
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('role="search"');
    expect(html).toMatch(/<label class="mono"[^>]*for="q"[^>]*>Search the site<\/label>/);
    expect(html).toMatch(/<input id="q" name="q" type="search"/);
    expect(html).toMatch(/<h1 class="heading"[^>]*>Search<\/h1>/);
    expect(html).not.toContain('data-pagefind-body');
    expect(read('dist/sitemap-0.xml')).not.toContain('/search/');
  });

  test('loads Pagefind at runtime, not bundled', () => {
    const html = read('dist/search/index.html');
    const scripts = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map((m) => m[1]!);
    const code = [html, ...scripts.map((src) => read(`dist${src}`))].join('\n');
    expect(code).toContain('pagefind.js');
    expect(exists('dist/_astro/pagefind.js')).toBe(false);
  });
});

describe('search index', () => {
  test('pagefind wrote its bundle into dist/pagefind', () => {
    expect(exists('dist/pagefind/pagefind.js')).toBe(true);
    const entry = JSON.parse(read('dist/pagefind/pagefind-entry.json')) as { languages: Record<string, { page_count: number }> };
    // Galleries and the English pages; the Italian posts in an index of their own.
    expect(Object.keys(entry.languages).sort()).toEqual(['en', 'it']);
    const pages = Object.values(entry.languages).reduce((sum, l) => sum + l.page_count, 0);
    expect(pages).toBe(contentCount('galleries') + contentCount('posts') + 4); // galleries, posts, and events, books, quotes, about
    expect(readdirSync('dist/pagefind/filter').filter((f) => f.endsWith('.pf_filter')).length).toBeGreaterThan(0);
  });

  test('galleries are indexed as galleries, with their search meta and photo descriptions', () => {
    const html = read('dist/gallery/venezia-italy/index.html');
    expect(html).toMatch(/<main id="main" tabindex="-1" data-pagefind-body data-pagefind-filter="type:gallery"/);
    expect(html).toContain('data-pagefind-meta="date[data-meta-date], image[data-meta-image], country[data-meta-country], genre[data-meta-genre]"');
    expect(html).toContain('data-meta-date="2012-08-11"');
    expect(html).toContain('data-meta-image="https://img.olegs.be/uploads/2012/08/venezia-italy-02-480.jpg"');
    expect(html).toContain('data-meta-country="Italy"');
    expect(html).toMatch(/<h1 class="title" data-pagefind-meta="title"/);
    expect(html).toMatch(/alt="Water taxis[^"]*"[^>]*data-pagefind-index-attrs="alt"/);
    expect(html).toMatch(/<nav class="pager wrap mono" aria-label="More galleries" data-pagefind-ignore/);
  });

  test('a gallery without photo descriptions does not index the "Photo n" fallbacks', () => {
    expect(read('dist/gallery/berlin-germany/index.html')).not.toContain('data-pagefind-index-attrs');
  });

  test('posts are indexed as posts, with date and excerpt', () => {
    const html = read(POST);
    expect(html).toMatch(/<article class="reading[^"]*"[^>]*data-pagefind-body data-pagefind-filter="type:post"/);
    expect(html).toContain('data-meta-date="2016-09-30"');
    expect(html).toContain('data-meta-excerpt="Il talk che ho fatto al meetup del Turin Web Performance Group, il 27 settembre 2016,');
    expect(html).toMatch(/<nav class="pager mono"[^>]*data-pagefind-ignore/);
    expect(html).toContain('<html lang="it"');
  });

  test.each(['events', 'books', 'quotes', 'about'])('the %s page is indexed as other', (slug) => {
    expect(read(`dist/${slug}/index.html`)).toContain('data-pagefind-body data-pagefind-filter="type:other"');
  });

  test('redirects, lists and the home are not indexed', () => {
    for (const path of ['gallery/tarragona-spain', 'photos', 'blog', '', 'quote-author/abraham-lincoln', 'search']) {
      expect(read(`dist/${path ? path + '/' : ''}index.html`), path).not.toContain('data-pagefind-body');
    }
  });
});

describe('pagefindAttrs', () => {
  test('nothing for a page that is not searchable', () => {
    expect(pagefindAttrs(undefined)).toEqual({});
  });

  test('body, filter, and each meta value from an attribute of its own, commas included', () => {
    expect(pagefindAttrs({ type: 'post', meta: { date: '2020-01-02', image: undefined, excerpt: 'One, two' } })).toEqual({
      'data-pagefind-body': '',
      'data-pagefind-filter': 'type:post',
      'data-pagefind-meta': 'date[data-meta-date], excerpt[data-meta-excerpt]',
      'data-meta-date': '2020-01-02',
      'data-meta-excerpt': 'One, two',
    });
  });
});
