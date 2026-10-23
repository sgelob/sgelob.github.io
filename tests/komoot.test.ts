import { describe, expect, test } from 'vitest';
import { mkdtempSync, readdirSync, readFileSync as readSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { activityFromSport, downloadKomootImages, fetchKomootImages, fetchKomootTour, tourIdFromUrl, type FetchLike } from '../scripts/trip/komoot';

const body = readSync(new URL('./fixtures/komoot-tour.json', import.meta.url), 'utf8');
const imagesBody = readSync(new URL('./fixtures/komoot-images.json', import.meta.url), 'utf8');
const jpeg = readSync(new URL('./fixtures/sample-900x600.jpg', import.meta.url));
const answering = (status: number, text = body): FetchLike => async (url) => {
  if (url.includes('/images/')) return { ok: true, status: 200, text: async () => imagesBody, arrayBuffer: async () => new ArrayBuffer(0) };
  return { ok: status >= 200 && status < 300, status, text: async () => text, arrayBuffer: async () => new ArrayBuffer(0) };
};

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
    const asked: string[] = [];
    const fetchImpl: FetchLike = async (url, init) => { asked.push(`${url} ${init?.headers?.Accept}`); return answering(200)(url, init); };
    const tour = await fetchKomootTour('https://www.komoot.com/tour/1134841094', fetchImpl);
    expect(asked[0]).toBe('https://api.komoot.de/v007/tours/1134841094 application/hal+json');
    expect(tour).toMatchObject({ id: '1134841094', name: 'Colle delle Finestre – 10 historic Giro Italia climbs', sport: 'mtb', distanceKm: 93.1, climb: 2754, date: '2023-05-25', recorded: true });
    expect(tour.images.map((i) => i.id)).toEqual([2, 1]); // sorted by position along the tour
    expect(JSON.stringify(tour)).not.toContain('start_point');
    expect(JSON.stringify(tour)).not.toContain('location'); // nor the photos' locations
  });

  test('private, missing and odd answers become plain messages', async () => {
    await expect(fetchKomootTour('https://www.komoot.com/tour/1', answering(403, ''))).rejects.toThrow('not public');
    await expect(fetchKomootTour('https://www.komoot.com/tour/1', answering(404, ''))).rejects.toThrow('no Komoot tour with id 1');
    await expect(fetchKomootTour('https://www.komoot.com/tour/1', answering(200, '{"id":"1"}'))).rejects.toThrow('without name');
    await expect(fetchKomootTour('https://example.com/x', answering(200))).rejects.toThrow('not a Komoot tour link');
  });
});

describe('komoot photos', () => {
  test('images: plain src, tour order, the size of the upload; none for a tour without', async () => {
    const images = await fetchKomootImages('907671487', answering(200));
    expect(images).toEqual([
      { id: 2, src: 'https://d2exd72xrrp1s7.cloudfront.net/www/gg/b-p2-full/2', index: 300, createdAt: '2022-10-19T15:40:00.000Z', widthPx: 4608, heightPx: 3456 },
      { id: 1, src: 'https://d2exd72xrrp1s7.cloudfront.net/www/gg/a-p1-full/1', index: 1208, createdAt: '2022-10-19T15:52:23.000Z', widthPx: 4608, heightPx: 3456 },
    ]);
    const none: FetchLike = async () => ({ ok: false, status: 404, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) });
    expect(await fetchKomootImages('1', none)).toEqual([]);
  });

  test('download: numbered JPEGs in tour order into the folder', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'komoot-dl-'));
    const asked: string[] = [];
    const bytes: FetchLike = async (url) => { asked.push(url); return { ok: true, status: 200, text: async () => '', arrayBuffer: async () => jpeg.buffer.slice(jpeg.byteOffset, jpeg.byteOffset + jpeg.byteLength) }; };
    const images = await fetchKomootImages('907671487', answering(200));
    const names = await downloadKomootImages(images, dir, bytes);
    expect(names).toEqual(['01.jpg', '02.jpg']);
    expect(asked).toEqual(['https://d2exd72xrrp1s7.cloudfront.net/www/gg/b-p2-full/2', 'https://d2exd72xrrp1s7.cloudfront.net/www/gg/a-p1-full/1']);
    expect(readdirSync(dir).sort()).toEqual(['01.jpg', '02.jpg']);
    expect(statSync(join(dir, '01.jpg')).size).toBe(jpeg.byteLength);
  });
});
