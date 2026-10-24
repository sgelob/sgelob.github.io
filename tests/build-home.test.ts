import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { count, read, contentCount } from './helpers/dist';
import { books } from '../src/lib/books';
import { quotes } from '../src/lib/quotes';

test('home has the bio with its section links and no link row, 4 gallery cards, 3 posts', () => {
  const html = read('dist/index.html');
  const intro = html.match(/<section class="intro[\s\S]*?<\/section>/)?.[0] ?? '';
  expect(intro).toContain('Hi, I’m Oleg'); expect(intro).toContain('drawn to offline things');
  for (const href of ['/outdoors/', '/photos/', '/books/', '/quotes/', '/events/', '/records/']) expect(intro).toContain(`href="${href}"`);
  expect(intro).not.toContain('<ul'); // the link row is gone: the bio links the sections itself
  expect(html).toMatch(/<h2 id="home-outdoors"[^>]*>Outdoors<\/h2>/); // the Outdoors row, now that there is a trip
  const trips = contentCount('outdoors'); // counted, so adding a trip doesn't break the test
  expect(html).toContain(`All ${trips} ${trips === 1 ? 'trip' : 'trips'} <span`);
  expect(count(html, 'class="trip-card"')).toBe(Math.min(trips, 4));
  expect(count(html, 'class="gallery-card"')).toBe(4); expect(count(html, 'class="post-item"')).toBe(3); expect(html).toContain(`All ${contentCount('galleries')} galleries`);
});
test('about lives at /about/ and the old slug redirects', () => {
  expect(existsSync('dist/about/index.html')).toBe(true);
  expect(read('dist/about/index.html')).toMatch(/<title>[^<]*Olegs Belousovs[^<]*<\/title>/);
  expect(read('dist/agile-scrum-product-owner-manager-turin-italy/index.html')).toContain('http-equiv="refresh" content="0; url=/about/"');
});
test('events and books exist', () => { for (const p of ['dist/events/index.html','dist/books/index.html']) expect(existsSync(p)).toBe(true); expect(read('dist/events/index.html')).toContain('2026'); });
test('quotes page at /quotes/ with title, old slug redirects, and 141 author pages', () => { expect(count(read('dist/quotes/index.html'), 'class="quote"')).toBe(188); expect(read('dist/my-favourite-inspirational-quotes-life-design/index.html')).toContain('http-equiv="refresh" content="0; url=/quotes/"'); expect(read('dist/quotes/index.html')).toMatch(/<h1[^>]*>Favourite quotes<\/h1>/); expect(readdirSync('dist/quote-author').length).toBe(141); });

describe('home', () => {
  test('title, description, bio links, footer email and section links', () => {
    const html = read('dist/index.html');
    expect(html).toContain('<title>Olegs Belousovs – Product Management and Photography</title>'); // not About's
    expect(html).toContain('<meta name="description" content="Product Manager in Italy');
    expect(html).toContain('<html lang="en"');
    expect(html).not.toContain('Creative Mornings'); // third paragraph stays on the About page
    for (const href of ['/events/', '/books/', '/quotes/', 'mailto:44_tildes_agog@icloud.com?subject=Message%20from%20olegs.be', '/photos/', '/blog/']) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('All 39 posts');
  });
});

describe('pages', () => {
  test('about renders its body in the reading column', () => {
    const html = read('dist/about/index.html');
    expect(html).toMatch(/<h1[^>]*>Olegs Belousovs<\/h1>/);
    expect(html).toContain('How May I Help You?');
    expect(html).toContain('<a href="/events/">tech events and meetups</a>'); // Markdown link rendered
    expect(html).toContain('class="reading');
    expect(html).toContain('<title>Olegs Belousovs – Product Manager</title>'); // Yoast seoTitle
  });

  test('the dropped privacy and cookie policies redirect to the home, out of the sitemap', () => {
    for (const slug of ['privacy-policy', 'cookie-policy']) {
      const html = read(`dist/${slug}/index.html`);
      expect(html).toContain('http-equiv="refresh" content="0; url=/"');
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(html).not.toContain('class="reading');
      expect(read('dist/sitemap-0.xml')).not.toContain(`/${slug}/`);
    }
  });

  test('events: a heading per year, Markdown links and italics rendered', () => {
    const html = read('dist/events/index.html');
    expect(html).toContain('<title>Events – Olegs Belousovs</title>');
    expect(count(html, '<h2 class="year mono')).toBe(12);
    expect(html).toContain('<a href="https://www.productheroes.it/conference/">Product Heroes Conference</a> – <em>October 1-2, 2026 – Milan, Italy</em>');
    expect(html).not.toContain('](');
  });

  test('books: favourite list keeps reversed numbering, titles and authors as written', () => {
    const html = read('dist/books/index.html');
    expect(html).toContain('<title>Books – Olegs Belousovs</title>');
    expect(html).toContain('<ol reversed');
    const favourites = books.find((s) => s.title === 'Favourite Books')!.books.length;
    expect(html).toMatch(new RegExp(`<span class="number mono" aria-hidden="true"[^>]*>${favourites}</span>`)); // counting down, first row
    expect(count(html, 'class="number mono"')).toBe(favourites);
    expect(html).toMatch(/<span class="title"[^>]*>The Subtle Art of Not Giving a F\*ck<\/span> – <em class="author"[^>]*>Mark Manson<\/em>/);
    expect(html).toMatch(/<span class="title"[^>]*>Rework<\/span> – <em class="author"[^>]*>Jason Fried &amp; David Heinemeier Hansson<\/em>/);
  });

  test('books: a row per book with its cover from the site’s image host, the year, and a placeholder where a cover is missing', () => {
    const html = read('dist/books/index.html');
    const all = books.flatMap((shelf) => shelf.books);
    expect(count(html, 'class="book"')).toBe(all.length);
    const covers = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    expect(covers.length).toBe(all.filter((b) => b.cover).length);
    for (const img of covers) {
      expect(img).toMatch(/src="https:\/\/img\.olegs\.be\/uploads\//);
      expect(img).toMatch(/\salt(=""|[\s>])/); // decorative: the title is next to it
      expect(img).toContain('loading="lazy"');
    }
    expect(count(html, 'class="cover blank"')).toBe(all.filter((b) => !b.cover).length);
    expect(count(html, 'class="year mono"')).toBe(all.filter((b) => b.year).length);
    expect(html).not.toMatch(/openlibrary|googleapis|books\.google/);
  });
});

describe('quotes', () => {
  test('grouped by author with anchors', () => {
    const html = read('dist/quotes/index.html');
    expect(html).toContain('<title>My Favourite Inspirational Quotes on Life and Design – Olegs Belousovs</title>');
    expect(count(html, '<h2 id="')).toBe(141);
    expect(html).toMatch(/<h2 id="abraham-lincoln"[^>]*><a href="\/quote-author\/abraham-lincoln\/"[^>]*>Abraham Lincoln<\/a><\/h2>/);
  });

  test('author page: title, filtered list, back link', () => {
    const html = read('dist/quote-author/abraham-lincoln/index.html');
    expect(html).toContain('<title>Abraham Lincoln · Quotes – Olegs Belousovs</title>');
    expect(html).toMatch(/<h1[^>]*>Abraham Lincoln<\/h1>/);
    expect(html).toContain('The best way to predict your future is to create it.');
    expect(count(html, 'class="quote"')).toBeLessThan(188);
    expect(html).toContain('href="/quotes/"');
  });
});

test('sitemap leaves out redirect pages', () => {
  const xml = read('dist/sitemap-0.xml');
  expect(xml).not.toContain('/gallery/tarragona-spain/');
  expect(xml).not.toContain('/gallery/lubitel-%D0%BB'); // raw-Unicode redirect, percent-encoded in the sitemap
  expect(xml).toContain('/gallery/tarragona-catalonia-spain/');
  expect(xml).toContain('/events/');
});

test('the WordPress sitemap URLs serve the index of the sitemap Astro writes', () => {
  const generated = read('dist/sitemap-index.xml');
  for (const path of ['dist/sitemap.xml', 'dist/sitemap_index.xml']) {
    const xml = read(path);
    expect(xml).toBe(generated);
    const locs = [...xml.matchAll(/<loc>https:\/\/olegs\.be\/([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs, path).toEqual(['sitemap-0.xml']);
    for (const loc of locs) expect(existsSync(`dist/${loc}`), loc).toBe(true);
  }
  expect(read('dist/sitemap-0.xml')).not.toMatch(/<loc>[^<]*sitemap/); // the index endpoints are not pages
  expect(read('dist/robots.txt')).toContain('Sitemap: https://olegs.be/sitemap.xml');
});

describe('home accessibility', () => {
  test('arrow glyphs are hidden from assistive tech', () => {
    const html = read('dist/index.html');
    expect(html).toMatch(/galleries <span aria-hidden="true"[^>]*>↗<\/span><\/a>/);
    expect(html).toMatch(new RegExp(`All ${contentCount('galleries')} galleries <span aria-hidden="true"[^>]*>↗</span>`));
    expect(html.replace(/<span aria-hidden="true"[^>]*>[↗←→]<\/span>/g, '')).not.toMatch(/[↗←→]/);
  });

  test('embedded post titles are h3 under the Blog h2, each item in its own language', () => {
    const html = read('dist/index.html');
    expect(count(html, '<h3 class="title"')).toBe(3);
    expect(html).not.toContain('<h2 class="title"');
    expect(count(html, '<article class="post-item" lang="it"')).toBe(3);
  });

  test('the Email link carries the site subject', () => {
    expect(read('dist/index.html')).toContain('href="mailto:44_tildes_agog@icloud.com?subject=Message%20from%20olegs.be"');
  });

  test('Italian and Russian quotes are marked with their language', () => {
    const html = read('dist/quotes/index.html');
    expect(count(html, '<blockquote class="quote" lang="it"')).toBe(12);
    expect(count(html, '<blockquote class="quote" lang="ru"')).toBe(1);
    expect(html).toMatch(/<blockquote class="quote" lang="it"[^>]*><p[^>]*>Senza crisi non ci sono sfide/);
    expect(html).toMatch(/<blockquote class="quote" data-astro-cid-\w+><p[^>]*>The best way to predict your future/);
  });
});

test('home has the quote of the day under the bio, linked to its author and to all quotes', () => {
  const html = read('dist/index.html');
  const block = html.match(/<figure class="daily-quote[\s\S]*?<\/figure>/)?.[0] ?? '';
  expect(html.indexOf('<figure class="daily-quote')).toBeGreaterThan(html.indexOf('<section class="intro'));
  expect(html.indexOf('<figure class="daily-quote')).toBeLessThan(html.indexOf('id="home-photos"'));
  const text = block.match(/<blockquote[^>]*><p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '';
  const quote = quotes.find((q) => q.text.replace(/&/g, '&amp;').replace(/</g, '&lt;') === text);
  expect(quote).toBeDefined();
  expect(block).toContain(`href="/quote-author/${quote!.author.slug}/"`);
  expect(existsSync(`dist/quote-author/${quote!.author.slug}/index.html`)).toBe(true);
  expect(block).toContain(`All ${quotes.length} quotes`);
  expect(block).toContain('href="/quotes/"');
  if (quote!.lang) expect(block).toContain(`lang="${quote!.lang}"`);
});
