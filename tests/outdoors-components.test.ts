import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { render } from './helpers/render';
import Hero from '../src/components/Hero.astro';
import TripCard from '../src/components/TripCard.astro';
import TripGrid from '../src/components/TripGrid.astro';
import RouteBlock from '../src/components/RouteBlock.astro';

const trip = { id: 'colle-delle-finestre', data: { title: 'Colle delle Finestre', date: new Date('2026-06-14'), activity: 'ride', bike: 'trail', distance: 38, climb: 1700, area: 'Val di Susa', country: 'italy', track: 'colle-delle-finestre.gpx', cover: '2026/06/a.jpg', coverWidth: 1620, coverHeight: 1080, darkHeader: false, photos: [{ src: '2026/06/a.jpg', width: 1620, height: 1080, alt: 'Larches' }] } } as any;

describe('Hero', () => {
  test('cover, title with the search meta, and the slot inside the meta line', async () => {
    const html = await render(Hero, { props: { title: 'T', cover: '2026/06/a.jpg', width: 1620, height: 1080, coverAlt: '', darkHeader: true }, slots: { default: '<span>Italy</span> <span>Hike</span>' } });
    expect(html).toMatch(/<header class="hero"[^>]*data-dark-header/);
    expect(html).toMatch(/<h1 class="title"[^>]*data-pagefind-meta="title"[^>]*>T<\/h1>/);
    expect(html).toMatch(/<p class="meta mono"[^>]*><span>Italy<\/span> <span>Hike<\/span><\/p>/);
    expect(html).toContain('fetchpriority="high"');
  });
});

describe('TripCard and TripGrid', () => {
  test('card: link, cover variants, title and meta', async () => {
    const html = await render(TripCard, { props: { trip } });
    expect(html).toMatch(/<a class="trip-card" href="\/outdoors\/colle-delle-finestre\/"/);
    expect(html).toContain('a-480.webp 480w');
    expect(html).toContain('Colle delle Finestre');
    expect(html).toContain('MTB · Trail · 38 km · 1,700 m');
  });
  test('grid lists cards; empty state', async () => {
    expect((await render(TripGrid, { props: { trips: [trip, trip] } })).match(/class="trip-card"/g)).toHaveLength(2);
    expect(await render(TripGrid, { props: { trips: [] } })).toContain('No trips yet.');
  });
});

const xml = readFileSync('tests/fixtures/track.gpx', 'utf8');

describe('RouteBlock', () => {
  test('shape, profile, the front-matter numbers and the download', async () => {
    const html = await render(RouteBlock, { props: { xml, distance: 38, climb: 1700, downloadHref: '/outdoors/x.gpx', links: [{ label: 'Komoot', url: 'https://www.komoot.com/tour/1' }] } });
    expect(html).toMatch(/<svg class="shape"[^>]*viewBox="0 0 400 300"[^>]*aria-label="Map of the route"/);
    expect(html).not.toContain('class="terrain"'); // no contour layer given
    expect(html).not.toContain('Contours:');
    expect(html).toMatch(/<text class="label"[^>]*>2,176 m<\/text>/); // the high point on the map
    expect(html).toMatch(/<text class="label"[^>]*>2,176 m · km [\d.]+<\/text>/); // and on the profile
    expect(html).toMatch(/<text class="axis"[^>]*>1,500<\/text>/); // an altitude guide
    expect(html).toMatch(/<text class="axis"[^>]*>38 km<\/text>/); // the total, from the front matter
    expect(html).toMatch(/<svg class="profile"[^>]*aria-label="Elevation profile, from 1,200 m to 2,176 m"/);
    expect(html).toContain('38 km · 1,700 m up');
    expect(html).toMatch(/<a href="\/outdoors\/x.gpx" download[^>]*>Download GPX/);
    expect(html).toMatch(/<a href="https:\/\/www.komoot.com\/tour\/1" rel="noopener"[^>]*>Komoot/);
    expect(html).not.toContain('Parking');
  });
  test('without elevation there is no profile and nothing else changes', async () => {
    const flat = '<gpx><trk><trkseg><trkpt lat="45.1" lon="7"></trkpt><trkpt lat="45.2" lon="7.1"></trkpt></trkseg></trk></gpx>';
    const html = await render(RouteBlock, { props: { xml: flat, distance: 9, climb: 0, downloadHref: '/outdoors/y.gpx' } });
    expect(html).toContain('class="shape"');
    expect(html).not.toContain('class="profile"');
    expect(html).not.toContain('class="top"'); // no elevation, no high point
    expect(html).toContain('9 km · 0 m up');
  });
});

describe('RouteBlock with a contour layer', () => {
  test('the terrain image under the route, the map named for it, the data credited', async () => {
    const html = await render(RouteBlock, { props: { xml, distance: 38, climb: 1700, downloadHref: '/outdoors/x.gpx', contoursHref: '/outdoors/x.contours.svg' } });
    expect(html).toMatch(/<img class="terrain"[^>]*src="\/outdoors\/x\.contours\.svg"[^>]*alt=""[^>]*width="400"[^>]*height="300"[^>]*loading="lazy"/);
    expect(html).toMatch(/<svg class="shape"[^>]*aria-label="Map of the route over contour lines every 100 m"/);
    expect(html).toMatch(/<figcaption class="credit mono"[^>]*>Contours: EU-DEM via Terrain Tiles<\/figcaption>/);
  });
});
