import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { count, read } from './helpers/dist';

/** Galleries per genre slug, from the content folder. */
function galleriesPerGenre(): Map<string, number> {
  const per = new Map<string, number>();
  for (const file of readdirSync('src/content/galleries')) {
    const genre = /^genre: (\S+)/m.exec(readFileSync(`src/content/galleries/${file}`, 'utf8'))?.[1] ?? '';
    per.set(genre, (per.get(genre) ?? 0) + 1);
  }
  return per;
}

test('photos index: a section per genre, largest first, with up to 8 newest covers and a link to all', () => {
  const html = read('dist/photos/index.html');
  const per = galleriesPerGenre();
  const expected = [...per.values()].reduce((sum, n) => sum + Math.min(n, 8), 0);
  expect(count(html, 'class="gallery-card"')).toBe(expected);
  expect(html).toContain('-480.webp 480w');
  const labels = [...html.matchAll(/<h2 id="genre-([a-z-]+)"[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);
  expect(labels).toEqual([...per.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([slug]) => slug));
  expect(labels[0]).toBe('world-places');
  expect(html).toMatch(new RegExp(`<a href="/photos/genre/world-places/"[^>]*>All ${per.get('world-places')} galleries`));
});
test('genre page filters; a genre other than World Places is a plain grid', () => { const html = read('dist/photos/genre/abandoned-places/index.html'); expect(count(html, 'class="gallery-card"')).toBe(29); expect(html).not.toContain('id="country-'); });

test('World Places: sections by country, largest first, small countries merged in a last Elsewhere section', () => {
  const html = read('dist/photos/genre/world-places/index.html');
  const sections = [...html.matchAll(/<h2 id="country-([a-z-]+)"[^>]*>([^<]+)<\/h2>/g)].map((m) => [m[1], m[2]]);
  expect(sections).toEqual([['italy', 'Italy'], ['germany', 'Germany'], ['spain', 'Spain'], ['france', 'France'], ['russia', 'Russia'], ['elsewhere', 'Elsewhere']]);
  expect(html).toMatch(/<a href="\/photos\/country\/italy\/"[^>]*>All 12 galleries/);
  expect(html).not.toMatch(/href="\/photos\/country\/elsewhere\/"/);
  expect(count(html, 'class="gallery-card"')).toBe(36);
  const elsewhere = html.slice(html.indexOf('id="country-elsewhere"'));
  expect(count(elsewhere, 'class="gallery-card"')).toBe(8); // Belgium 2, Czech Republic 2, Slovenia, Netherlands, Austria, Monaco
  expect(elsewhere).toContain('href="/gallery/ljubljana-slovenia/"');
});
test('only countries with galleries get a page; usa, a preserved live URL, is a redirect stub; croatia is nothing', () => {
  for (const slug of ['italy', 'russia']) expect(existsSync(`dist/photos/country/${slug}/index.html`)).toBe(true);
  expect(read('dist/photos/country/usa/index.html')).toContain('http-equiv="refresh" content="0; url=/photos/genre/world-places/"');
  expect(read('dist/photos/country/portugal/index.html')).toContain('http-equiv="refresh" content="0; url=/photos/genre/world-places/"');
  expect(existsSync('dist/photos/country/croatia/index.html')).toBe(false);
});

describe('photos pages', () => {
  test('index: title, description, intro and All active in the filter row', () => {
    const html = read('dist/photos/index.html');
    expect(html).toContain('<title>Photography by Olegs Belousovs</title>'); // Yoast seoTitle of the photos page
    expect(html).toContain('<meta name="description" content="Pictures and reportages');
    expect(html).toContain('I’m constantly updating these photo galleries.');
    expect(html).toMatch(/<a href="\/photos\/" aria-current="page"[^>]*>All<\/a>/);
    expect(html).toContain('href="/photos/genre/world-places/"');
    expect(count(html, 'aria-current="page"')).toBe(2); // nav section + filter
  });

  test('genre: heading, description and the genre active', () => {
    const html = read('dist/photos/genre/abandoned-places/index.html');
    expect(html).toContain('<title>Abandoned · Photos – Olegs Belousovs</title>');
    expect(html).toMatch(/<h1[^>]*>Abandoned<\/h1>/);
    expect(html).toContain('I find peace in these places');
    expect(html).toMatch(/<a href="\/photos\/genre\/abandoned-places\/" aria-current="page"[^>]*>Abandoned<\/a>/);
    expect(html).not.toMatch(/<a href="\/photos\/" aria-current="page"[^>]*>All<\/a>/);
  });

  test('country: heading, every gallery of the country, no filter active', () => {
    const html = read('dist/photos/country/russia/index.html');
    expect(html).toContain('<title>Russia · Photos – Olegs Belousovs</title>');
    expect(html).toMatch(/<h1[^>]*>Russia<\/h1>/);
    expect(count(html, 'class="gallery-card"')).toBe(13);
    expect(html).not.toMatch(/<a href="\/photos\/(genre\/[^"]+\/)?" aria-current="page"/);
  });

  test('card: link, 4:3 cover from the 960 cap, caption with short title, country and year', () => {
    const html = read('dist/photos/genre/abandoned-places/index.html');
    const card = html.match(/<a class="gallery-card" href="\/gallery\/abandoned-beldi-furnace-novara-italy\/"[\s\S]*?<\/a>/)?.[0] ?? '';
    expect(card).toContain('srcset="https://img.olegs.be/uploads/2009/06/abandoned-beldi-furnace-novara-italy-19-480.webp 480w, https://img.olegs.be/uploads/2009/06/abandoned-beldi-furnace-novara-italy-19-960.webp 960w"');
    expect(card).toContain('src="https://img.olegs.be/uploads/2009/06/abandoned-beldi-furnace-novara-italy-19-960.jpg"');
    expect(card).toContain('sizes="(min-width: 1100px) 25vw, (min-width: 640px) 50vw, 100vw"');
    expect(card).toContain('loading="lazy"');
    expect(card).toContain('“Beldì” Furnace – Italy');
    expect(card).toContain('Italy · 2009');
  });

  test('a cover missing from its photos is sized from coverWidth/coverHeight and gets variants', () => {
    const html = read('dist/photos/genre/old-film-cameras/index.html');
    expect(html).toContain('smena-symbol-soviet-35mm-rangefinder-film-camera-cover-480.webp 480w');
    expect(html).toMatch(/<img src="https:\/\/img\.olegs\.be\/uploads\/2015\/09\/smena-symbol-soviet-35mm-rangefinder-film-camera-cover-960\.jpg" width="1620" height="1080"/);
  });
});

test('every preserved live URL of the old site still builds, as a page or a redirect', () => {
  const missing = readFileSync('tests/fixtures/live-urls.txt', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('/'))
    .map((path) => decodeURI(path))
    .filter((path) => !existsSync(`dist${path}${path.endsWith('/') ? 'index.html' : ''}`));
  expect(missing).toEqual([]);
});
