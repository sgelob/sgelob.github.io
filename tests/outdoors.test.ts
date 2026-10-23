import { describe, expect, it } from 'vitest';
import { cardMeta, formatClimb, formatKm, groupByYear, heroMeta, moreTrips, tripPath, trackPath, tripSchema } from '../src/lib/outdoors';

const base = { title: 'Colle delle Finestre', date: '2026-06-14', activity: 'ride', bike: 'trail', distance: 38, climb: 1700, area: 'Val di Susa', country: 'italy', track: 'colle-delle-finestre.gpx', cover: '2026/06/a.jpg', darkHeader: false, photos: [{ src: '2026/06/a.jpg', width: 1620, height: 1080, alt: 'Larches' }] };

describe('tripSchema', () => {
  it('accepts a shared ride with a bike and a track', () => { expect(tripSchema.parse(base).bike).toBe('trail'); });
  it('refuses a bike on a hike', () => { expect(() => tripSchema.parse({ ...base, activity: 'hike' })).toThrow(/bike is for rides only/); });
  it('requires track: a file name ending in .gpx or false', () => {
    expect(() => tripSchema.parse({ ...base, track: undefined })).toThrow();
    expect(() => tripSchema.parse({ ...base, track: 'route.kml' })).toThrow();
    expect(tripSchema.parse({ ...base, track: false, date: '2026-06-01' }).track).toBe(false);
  });
  it('a discreet trip has its date on the 1st and no links', () => {
    expect(() => tripSchema.parse({ ...base, track: false })).toThrow(/1st of the month/);
    expect(() => tripSchema.parse({ ...base, track: false, date: '2026-06-01', links: [{ label: 'Komoot', url: 'https://komoot.com/x' }] })).toThrow(/no links/);
  });
});

describe('labels and paths', () => {
  it('paths', () => { expect(tripPath({ id: 'x' } as any)).toBe('/outdoors/x/'); expect(trackPath({ id: 'x' } as any)).toBe('/outdoors/x.gpx'); });
  it('formats numbers the en-US way', () => { expect(formatKm(12.5)).toBe('12.5 km'); expect(formatKm(1024)).toBe('1,024 km'); expect(formatClimb(1350)).toBe('1,350 m up'); });
  it('cardMeta: hike without bike, ride with the short bike name, no "up"', () => {
    expect(cardMeta({ activity: 'hike', distance: 16, climb: 1350 })).toBe('Hike · 16 km · 1,350 m');
    expect(cardMeta({ activity: 'ride', bike: 'trail', distance: 38, climb: 1700 })).toBe('MTB · Trail · 38 km · 1,700 m');
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
  it('moreTrips: same activity first, never itself, then the rest, capped', () => {
    expect(moreTrips(list, 'c', 4).map((x) => x.id)).toEqual(['a', 'b', 'z']);
    expect(moreTrips(list, 'b', 1).map((x) => x.id)).toEqual(['z']);
  });
});
