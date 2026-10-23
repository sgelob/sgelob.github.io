import { describe, expect, test } from 'vitest';
import { render } from './helpers/render';
import Hero from '../src/components/Hero.astro';
import TripCard from '../src/components/TripCard.astro';
import TripGrid from '../src/components/TripGrid.astro';

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
