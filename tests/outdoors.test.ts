import { describe, expect, it } from 'vitest';
import { cardMeta, formatClimb, formatKm, groupByYear, heroMeta, moreLabels, moreTrips, tripPath, trackPath, tripSchema } from '../src/lib/outdoors';

const base = { title: 'Colle delle Finestre', date: '2026-06-14', activity: 'ride', bike: 'trail', distance: 38, climb: 1700, area: 'Val di Susa', country: 'italy', track: 'colle-delle-finestre.gpx', cover: '2026/06/a.jpg', darkHeader: false, photos: [{ src: '2026/06/a.jpg', width: 1620, height: 1080, alt: 'Larches' }] };

describe('tripSchema', () => {
  it('accepts a shared ride with a bike and a track', () => { expect(tripSchema.parse(base).bike).toBe('trail'); });
  it('refuses a bike on a hike', () => { expect(() => tripSchema.parse({ ...base, activity: 'hike' })).toThrow(/bike is for rides only/); });
  it('requires track: a file name ending in .gpx or false', () => {
    expect(() => tripSchema.parse({ ...base, track: undefined })).toThrow();
    expect(() => tripSchema.parse({ ...base, track: 'route.kml' })).toThrow();
    expect(tripSchema.parse({ ...base, track: false, date: '2026-06-01' }).track).toBe(false);
  });
  it('track is a bare file name: a path is refused', () => {
    expect(() => tripSchema.parse({ ...base, track: '../x.gpx' })).toThrow();
    expect(() => tripSchema.parse({ ...base, track: 'a/x.gpx' })).toThrow();
    expect(tripSchema.parse({ ...base, track: 'x-1.gpx' }).track).toBe('x-1.gpx');
  });
  it('country must be a slug of taxonomies.yaml', () => {
    expect(() => tripSchema.parse({ ...base, country: 'itlay' })).toThrow(/unknown country slug/);
    expect(tripSchema.parse({ ...base, country: 'italy' }).country).toBe('italy');
  });
  it('every photo has a non-empty alt', () => {
    expect(() => tripSchema.parse({ ...base, photos: [{ src: 'a.jpg', width: 1, height: 1 }] })).toThrow();
    expect(() => tripSchema.parse({ ...base, photos: [{ src: 'a.jpg', width: 1, height: 1, alt: '' }] })).toThrow();
  });
  it('refuses unknown keys', () => { expect(() => tripSchema.parse({ ...base, bikee: 'xc' })).toThrow(/Unrecognized key/); });
  it('a discreet trip has its date on the 1st and no links', () => {
    expect(() => tripSchema.parse({ ...base, track: false })).toThrow(/1st of the month/);
    expect(() => tripSchema.parse({ ...base, track: false, date: '2026-06-01', links: [{ label: 'Komoot', url: 'https://komoot.com/x' }] })).toThrow(/no links/);
  });
});

describe('labels and paths', () => {
  it('paths', () => { expect(tripPath({ id: 'x' } as any)).toBe('/outdoors/x/'); expect(trackPath({ id: 'x' } as any)).toBe('/outdoors/x-olegs-be.gpx'); });
  it('formats numbers the en-US way', () => { expect(formatKm(12.5)).toBe('12.5 km'); expect(formatKm(1024)).toBe('1,024 km'); expect(formatClimb(1350)).toBe('1,350 m up'); });
  it('cardMeta: the country first; hike without bike, ride with the short bike name, no "up"', () => {
    expect(cardMeta({ country: 'italy', activity: 'hike', distance: 16, climb: 1350 })).toBe('Italy · Hike · 16 km · 1,350 m');
    expect(cardMeta({ country: 'france', activity: 'ride', bike: 'trail', distance: 38, climb: 1700 })).toBe('France · MTB · Trail · 38 km · 1,700 m');
  });
  it('heroMeta: country, activity, bike, numbers, area, month, photos', () => {
    expect(heroMeta(tripSchema.parse(base), 41)).toEqual(['Italy', 'MTB', 'Trail bike', '38 km', '1,700 m up', 'Val di Susa', 'June 2026', '41 photos']);
    expect(heroMeta(tripSchema.parse({ ...base, activity: 'hike', bike: undefined }), 1)).toEqual(['Italy', 'Hike', '38 km', '1,700 m up', 'Val di Susa', 'June 2026', '1 photo']);
  });
});

describe('grouping', () => {
  const t = (id: string, date: string, activity = 'hike') => ({ id, data: { date: new Date(date), activity } }) as any;
  const list = [t('c', '2026-09-01'), t('b', '2026-03-01', 'ride'), t('a', '2025-11-01'), t('z', '2025-02-01', 'ride')];
  it('groupByYear keeps the order and splits on the year', () => {
    expect(groupByYear(list).map((g) => [g.year, g.trips.map((x: any) => x.id)])).toEqual([[2026, ['c', 'b']], [2025, ['a', 'z']]]);
  });
  it('moreLabels: by activity when every picked trip shares it, else "More trips" to all', () => {
    expect(moreLabels('hike', [t('a', '2025-01-01'), t('b', '2025-02-01')])).toEqual({ title: 'More hikes', href: '/outdoors/hikes/', link: 'All hikes' });
    expect(moreLabels('ride', [t('a', '2025-01-01', 'ride')])).toEqual({ title: 'More rides', href: '/outdoors/rides/', link: 'All rides' });
    expect(moreLabels('hike', [t('a', '2025-01-01'), t('b', '2025-02-01', 'ride')])).toEqual({ title: 'More trips', href: '/outdoors/', link: 'All trips' });
  });
  it('moreTrips: same activity first, never itself, then the rest, capped', () => {
    expect(moreTrips(list, 'c', 4).map((x) => x.id)).toEqual(['a', 'b', 'z']);
    expect(moreTrips(list, 'b', 1).map((x) => x.id)).toEqual(['z']);
  });
});
