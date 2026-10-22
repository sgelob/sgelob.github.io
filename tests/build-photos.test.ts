import { existsSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { count, read } from './helpers/dist';

test('photos index lists 85 cards with webp srcset', () => { const html = read('dist/photos/index.html'); expect(count(html, 'class="gallery-card"')).toBe(85); expect(html).toContain('-480.webp 480w'); });
test('genre page filters', () => { expect(count(read('dist/photos/genre/abandoned-places/index.html'), 'class="gallery-card"')).toBe(29); });
test('country with galleries builds; every taxonomy slug has a page', () => { for (const slug of ['italy','russia','usa']) expect(existsSync(`dist/photos/country/${slug}/index.html`)).toBe(true); });  // Review Focus 4: 'usa' has 0 galleries

describe('photos pages', () => {
  test('index: title, description, intro and All active in the filter row', () => {
    const html = read('dist/photos/index.html');
    expect(html).toContain('<title>Photography by Olegs Belousovs</title>'); // Yoast seoTitle of the photos page
    expect(html).toContain('<meta name="description" content="Pictures and reportages');
    expect(html).toContain('I&#39;m constantly updating these photo galleries.');
    expect(html).toMatch(/<a href="\/photos\/" aria-current="page"[^>]*>All<\/a>/);
    expect(html).toContain('href="/photos/genre/world-places/"');
    expect(count(html, 'aria-current="page"')).toBe(2); // nav section + filter
  });

  test('genre: heading, description and the genre active', () => {
    const html = read('dist/photos/genre/abandoned-places/index.html');
    expect(html).toContain('<title>Abandoned — Photos — olegs</title>');
    expect(html).toMatch(/<h1[^>]*>Abandoned<\/h1>/);
    expect(html).toContain('I find peace in these places');
    expect(html).toMatch(/<a href="\/photos\/genre\/abandoned-places\/" aria-current="page"[^>]*>Abandoned<\/a>/);
    expect(html).not.toMatch(/<a href="\/photos\/" aria-current="page"[^>]*>All<\/a>/);
  });

  test('country: heading, every gallery of the country, no filter active', () => {
    const html = read('dist/photos/country/russia/index.html');
    expect(html).toContain('<title>Russia — Photos — olegs</title>');
    expect(html).toMatch(/<h1[^>]*>Russia<\/h1>/);
    expect(count(html, 'class="gallery-card"')).toBe(13);
    expect(html).not.toMatch(/<a href="\/photos\/(genre\/[^"]+\/)?" aria-current="page"/);
  });

  test('a country without galleries renders the empty state', () => {
    const html = read('dist/photos/country/usa/index.html');
    expect(count(html, 'class="gallery-card"')).toBe(0);
    expect(html).toContain('No galleries yet.');
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
