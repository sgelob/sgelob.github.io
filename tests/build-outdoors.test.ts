import { describe, expect, test } from 'vitest';
import { count, exists, read } from './helpers/dist';

const TRIP = 'dist/outdoors/canosio-gardetta-valle-maira/index.html';

describe('outdoors index', () => {
  test('heading, lead, filter row and the trips grouped by year', () => {
    const html = read('dist/outdoors/index.html');
    expect(html).toContain('<title>Outdoors – Olegs Belousovs</title>');
    expect(html).toMatch(/<h1[^>]*>Outdoors<\/h1>/);
    expect(html).toContain('a kind of shinrin-yoku on foot or on two wheels');
    expect(html).toContain('Distance and climb are there to describe the day, not to measure it.');
    expect(html).toMatch(/<a href="\/outdoors\/" aria-current="page"[^>]*>All<\/a>/);
    expect(html).toContain('href="/outdoors/hikes/"'); expect(html).toContain('href="/outdoors/rides/"');
    expect(html).toMatch(/<h2 id="year-2026"[^>]*>2026<\/h2>/);
    expect(html).toMatch(/<a class="trip-card" href="\/outdoors\/canosio-gardetta-valle-maira\/"/);
    expect(html).toContain('Italy · MTB · Trail · 38.1 km · 1,500 m');
    expect(html).not.toContain('No trips yet.');
  });
  test('hikes and rides pages exist with their filter active', () => {
    expect(read('dist/outdoors/hikes/index.html')).toMatch(/<a href="\/outdoors\/hikes\/" aria-current="page"[^>]*>Hikes<\/a>/);
    expect(read('dist/outdoors/rides/index.html')).toMatch(/<a href="\/outdoors\/rides\/" aria-current="page"[^>]*>Rides<\/a>/);
    expect(read('dist/outdoors/rides/index.html')).toContain('<title>Rides · Outdoors – Olegs Belousovs</title>');
    expect(read('dist/outdoors/hikes/index.html')).toContain('No hikes yet.');
    expect(read('dist/outdoors/rides/index.html')).toContain('href="/outdoors/canosio-gardetta-valle-maira/"');
  });
});

describe('nav', () => {
  test('order About, Photos, Outdoors, Blog, Search; Outdoors active on its pages', () => {
    const html = read('dist/outdoors/index.html');
    const nav = html.match(/<nav aria-label="Main"[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? '';
    const hrefs = [...nav.matchAll(/<li[^>]*><a href="(\/[a-z]*\/)"/g)].map((m) => m[1]);
    expect(hrefs.slice(0, 5)).toEqual(['/about/', '/photos/', '/outdoors/', '/blog/', '/search/']);
    expect(html).toMatch(/<a href="\/outdoors\/" aria-current="page"[^>]*>Outdoors<\/a>/);
    expect(count(html, 'aria-current="page"')).toBe(2); // nav + filter
    expect(html).toMatch(/\.nav[^{]*\{[^}]*flex-wrap:wrap/); // five links wrap under the logo on a phone
  });
});

describe('trip page', () => {
  test('title, hero meta in order, search marks, story, route block, photos with alts, the lightbox', () => {
    const html = read(TRIP);
    expect(html).toContain('<title>Canosio – Gardetta · MTB · Valle Maira · 2026 · Outdoors – Olegs Belousovs</title>'); // activity, area and year in the title
    expect(html).toMatch(/<meta property="og:title" content="Canosio – Gardetta · MTB · Valle Maira · 2026 · Outdoors – Olegs Belousovs"/);
    expect(html).toMatch(/<h1 class="title"[^>]*>Canosio – Gardetta<\/h1>/);
    const meta = [...(html.match(/<p class="meta mono"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '').matchAll(/<span[^>]*>([^<]*)<\/span>/g)].map((m) => m[1]);
    expect(meta).toEqual(['Italy', 'MTB', 'Trail bike', '38.1 km', '1,500 m up', 'Valle Maira', 'September 2026', '26 photos']);
    expect(html).toMatch(/data-pagefind-filter="type:outdoors"/);
    expect(html).toContain('data-meta-activity="MTB"');
    expect(html).toContain('Passo della Gardetta at 2,437 metres');
    expect(html).toMatch(/<section class="route wrap"[^>]*aria-labelledby="route"/);
    expect(html).toContain('aria-label="Elevation profile, from 948 m to 2,439 m"'); // whole metres, from the full track: the pass is 2,437 m
    expect(html).toMatch(/<a href="\/outdoors\/canosio-gardetta-valle-maira-olegs-be\.gpx" download="canosio-gardetta-valle-maira-olegs-be\.gpx"[^>]*>Download GPX/);
    expect(html).toContain('href="https://www.komoot.com/tour/3297659281"');
    expect(count(html, 'class="ph"')).toBe(26);
    expect(html).not.toMatch(/alt="Photo \d+"/);
    expect(html).toContain('alt="Sticker-covered poles at the Gardetta pass, Rocca la Meja beyond"');
    expect(html).toMatch(/<script type="module" src="\/_astro\/[^"]+\.js"><\/script>/); // the lightbox entry, which loads PhotoSwipe on the first click
    expect(html).not.toContain('PhotoSwipeLightbox');
  });

  test('the map over its contour layer, served from the site as an SVG of its own', () => {
    const html = read(TRIP);
    expect(html).toMatch(/<img class="terrain"[^>]*src="\/outdoors\/canosio-gardetta-valle-maira\.contours\.svg"/);
    expect(html).toContain('Contours: EU-DEM via Terrain Tiles');
    expect(html).toMatch(/<text class="label"[^>]*>2,439 m · km 14\.5<\/text>/);
    const svg = read('dist/outdoors/canosio-gardetta-valle-maira.contours.svg');
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 400 300"/);
    expect(count(svg, '<path ')).toBeGreaterThan(10);
    expect(Buffer.byteLength(svg)).toBeLessThan(60 * 1024);
  });

  test('a trip page stays within the gallery page budget', () => {
    expect(Buffer.byteLength(read(TRIP))).toBeLessThan(70 * 1024);
  });

  test('the GPX download, <slug>-olegs-be.gpx, is the sanitised track: points only, the trip title as its name', () => {
    const gpx = read('dist/outdoors/canosio-gardetta-valle-maira-olegs-be.gpx');
    expect(gpx).toContain('<name>Canosio – Gardetta</name>');
    expect(count(gpx, '<trkpt ')).toBeGreaterThan(20000);
    for (const banned of ['<time', '<metadata', '<extensions', '<wpt', '<author']) expect(gpx).not.toContain(banned);
  });

  test('the trip is in the feed and the sitemap; the GPX is not a page', () => {
    const xml = read('dist/feed.xml');
    const item = xml.split('<item>').find((i) => i.includes('/outdoors/canosio-gardetta-valle-maira/')) ?? '';
    expect(item).toContain('<title>Canosio – Gardetta</title>');
    expect(item).toContain('<category>Outdoors</category>');
    expect(item).toContain('<category>MTB</category>');
    expect(item).toContain('A loop from Canosio up to the Gardetta plateau');
    const sitemap = read('dist/sitemap-0.xml');
    expect(sitemap).toContain('https://olegs.be/outdoors/canosio-gardetta-valle-maira/');
    expect(sitemap).not.toContain('.gpx');
    expect(exists('dist/outdoors/canosio-gardetta-valle-maira-olegs-be.gpx')).toBe(true);
    expect(exists('dist/outdoors/canosio-gardetta-valle-maira.gpx')).toBe(false); // only the named download
  });

  test.each(['castiglione-pavarolo-cordova-baldissero-rivodora-san-martino', 'castiglione-sassi-superga-rivodora-tanohill-cordova-pavarolo'])(
    'approximate ends (%s): a closed circuit with no start or finish on the map, in the GPX or on the profile', (slug) => {
    const html = read(`dist/outdoors/${slug}/index.html`);
    const route = html.slice(html.indexOf('<section class="route'), html.indexOf('</section>', html.indexOf('<section class="route')));
    expect(route).toContain('start and finish not shown');
    const map = route.slice(route.indexOf('<svg class="shape"'), route.indexOf('</svg>', route.indexOf('<svg class="shape"')));
    expect(map).not.toMatch(/<circle class="start"/); // no start ring on the map (the profile marks its low point with the same class)
    const d = route.match(/<path class="line" d="([^"]+)"/)?.[1] ?? '';
    expect(d.match(/M/g)).toHaveLength(1); // one unbroken line
    expect(exists(`dist/outdoors/${slug}.profile.json`)).toBe(false);
    const gpx = read(`dist/outdoors/${slug}-olegs-be.gpx`);
    expect(gpx.match(/<trkseg>/g)).toHaveLength(1);
    const points = [...gpx.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)"/g)].map((m) => `${m[1]},${m[2]}`);
    expect(points.length).toBeGreaterThan(5000);
    expect(points[points.length - 1]).toBe(points[0]); // the circuit closes where it starts
  });

  test('trips that share a published month are listed by their real ride order, latest first', () => {
    const html = read('dist/outdoors/index.html');
    const slugs = [...html.matchAll(/<a class="trip-card" href="\/outdoors\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
    expect(slugs).toEqual([
      'castiglione-sassi-superga-rivodora-tanohill-cordova-pavarolo',
      'castiglione-pavarolo-cordova-baldissero-rivodora-san-martino',
      'castiglione-sassi-cavoretto-revigliasco-maddalena-pecetto-pino-superga',
      'castiglione-bosco-del-vaj-casalborgone-castagneto-po-sand-raffaele',
      'canosio-gardetta-valle-maira',
    ]);
  });
});
