import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { count, read } from './helpers/dist';

test('home has intro, 4 gallery cards, 3 posts', () => { const html = read('dist/index.html'); expect(html).toContain('Hi, I’m Oleg'); expect(count(html,'class="gallery-card"')).toBe(4); expect(count(html,'class="post-item"')).toBe(3); expect(html).toContain('All 85 galleries'); });
test('about keeps its slug, events and books exist', () => { for (const p of ['dist/agile-scrum-product-owner-manager-turin-italy/index.html','dist/events/index.html','dist/books/index.html','dist/privacy-policy/index.html','dist/cookie-policy/index.html']) expect(existsSync(p)).toBe(true); expect(read('dist/events/index.html')).toContain('2026'); });
test('quotes page and 141 author pages', () => { expect(count(read('dist/my-favourite-inspirational-quotes-life-design/index.html'), 'class="quote"')).toBe(188); expect(readdirSync('dist/quote-author').length).toBe(141); });

describe('home', () => {
  test('title, description, link row and section links', () => {
    const html = read('dist/index.html');
    expect(html).toContain('<title>Olegs Belousovs – Product Manager</title>');
    expect(html).toContain('<meta name="description" content="Product Manager in Italy');
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('<a href="/events/">tech events</a>'); // intro Markdown link rendered
    expect(html).not.toContain('Creative Mornings'); // third paragraph stays on the About page
    for (const href of ['/events/', '/books/', '/my-favourite-inspirational-quotes-life-design/', 'mailto:44_tildes_agog@icloud.com', '/photos/', '/blog/']) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('All 39 posts');
  });
});

describe('pages', () => {
  test('about renders its body in the reading column', () => {
    const html = read('dist/agile-scrum-product-owner-manager-turin-italy/index.html');
    expect(html).toMatch(/<h1[^>]*>Olegs Belousovs<\/h1>/);
    expect(html).toContain('How May I Help You?');
    expect(html).toContain('class="reading');
  });

  test('policies keep their language', () => {
    expect(read('dist/privacy-policy/index.html')).toContain('<html lang="it"');
    expect(read('dist/cookie-policy/index.html')).toContain('<title>Cookie Policy — olegs</title>');
  });

  test('events: a heading per year, Markdown links and italics rendered', () => {
    const html = read('dist/events/index.html');
    expect(html).toContain('<title>Events — olegs</title>');
    expect(count(html, '<h2 class="year mono')).toBe(12);
    expect(html).toContain('<a href="https://www.productheroes.it/conference/">Product Heroes Conference</a> – <em>October 1-2, 2026 – Milan, Italy</em>');
    expect(html).not.toContain('](');
  });

  test('books: favourite list keeps reversed numbering, escapes rendered', () => {
    const html = read('dist/books/index.html');
    expect(html).toContain('<title>Books — olegs</title>');
    expect(html).toContain('<ol reversed');
    expect(html).toContain('The Subtle Art of Not Giving a F*ck – <em>Mark Manson</em>');
    expect(html).toContain('Rework – <em>Jason Fried &amp; David Heinemeier Hansson</em>');
  });
});

describe('quotes', () => {
  test('grouped by author with anchors', () => {
    const html = read('dist/my-favourite-inspirational-quotes-life-design/index.html');
    expect(html).toContain('<title>My Favourite Inspirational Quotes on Life and Design — olegs</title>');
    expect(count(html, '<h2 id="')).toBe(141);
    expect(html).toMatch(/<h2 id="abraham-lincoln"[^>]*><a href="\/quote-author\/abraham-lincoln\/"[^>]*>Abraham Lincoln<\/a><\/h2>/);
  });

  test('author page: title, filtered list, back link', () => {
    const html = read('dist/quote-author/abraham-lincoln/index.html');
    expect(html).toContain('<title>Abraham Lincoln — Quotes — olegs</title>');
    expect(html).toMatch(/<h1[^>]*>Abraham Lincoln<\/h1>/);
    expect(html).toContain('The best way to predict your future is to create it.');
    expect(count(html, 'class="quote"')).toBeLessThan(188);
    expect(html).toContain('href="/my-favourite-inspirational-quotes-life-design/"');
  });
});

test('sitemap leaves out redirect pages', () => {
  const xml = read('dist/sitemap-0.xml');
  expect(xml).not.toContain('/gallery/tarragona-spain/');
  expect(xml).not.toContain('/gallery/lubitel-%D0%BB'); // raw-Unicode redirect, percent-encoded in the sitemap
  expect(xml).toContain('/gallery/tarragona-catalonia-spain/');
  expect(xml).toContain('/events/');
});
