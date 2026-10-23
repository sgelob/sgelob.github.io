import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { activityFromSport, fetchKomootTour, tourIdFromUrl, type FetchLike } from '../scripts/trip/komoot';

const body = readFileSync(new URL('./fixtures/komoot-tour.json', import.meta.url), 'utf8');
const answering = (status: number, text = body): FetchLike => async () => ({ ok: status >= 200 && status < 300, status, text: async () => text });

describe('komoot', () => {
  test('tour id from the link forms Komoot uses', () => {
    expect(tourIdFromUrl('https://www.komoot.com/tour/1134841094')).toBe('1134841094');
    expect(tourIdFromUrl('https://www.komoot.com/it-it/tour/690659568?ref=wtd')).toBe('690659568');
    expect(tourIdFromUrl('https://www.komoot.de/tour/18937346')).toBe('18937346');
    expect(tourIdFromUrl('https://www.komoot.com/smarttour/e1336309189/x')).toBeUndefined();
    expect(tourIdFromUrl('https://www.komoot.com/it-it/highlight/3512406')).toBeUndefined();
  });

  test('sports map to hike or ride, the rest to nothing', () => {
    expect(activityFromSport('hike')).toBe('hike');
    expect(activityFromSport('mtb')).toBe('ride');
    expect(activityFromSport('e_mtb')).toBe('ride');
    expect(activityFromSport('racebike')).toBeUndefined();
  });

  test('a public tour: name, sport, km to one decimal, climb rounded, local day, recorded flag; the start point is never read', async () => {
    let asked = '';
    const fetchImpl: FetchLike = async (url, init) => { asked = `${url} ${init?.headers?.Accept}`; return answering(200)(url, init); };
    const tour = await fetchKomootTour('https://www.komoot.com/tour/1134841094', fetchImpl);
    expect(asked).toBe('https://api.komoot.de/v007/tours/1134841094 application/hal+json');
    expect(tour).toEqual({ id: '1134841094', name: 'Colle delle Finestre – 10 historic Giro Italia climbs', sport: 'mtb', distanceKm: 93.1, climb: 2754, date: '2023-05-25', recorded: true });
    expect(JSON.stringify(tour)).not.toContain('start_point');
  });

  test('private, missing and odd answers become plain messages', async () => {
    await expect(fetchKomootTour('https://www.komoot.com/tour/1', answering(403, ''))).rejects.toThrow('not public');
    await expect(fetchKomootTour('https://www.komoot.com/tour/1', answering(404, ''))).rejects.toThrow('no Komoot tour with id 1');
    await expect(fetchKomootTour('https://www.komoot.com/tour/1', answering(200, '{"id":"1"}'))).rejects.toThrow('without name');
    await expect(fetchKomootTour('https://example.com/x', answering(200))).rejects.toThrow('not a Komoot tour link');
  });
});
