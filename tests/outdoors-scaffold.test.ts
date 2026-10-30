import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { parse } from 'yaml';
import type { ObjectStore } from '../scripts/photos/r2';
import { scaffoldGallery, tripFrontmatter, photoName } from '../scripts/photos/scaffold';

test('tripFrontmatter leaves activity, distance, climb and track undecided and lists the photos', () => {
  const fm = tripFrontmatter({ slug: 'x', title: 'X', date: '2026-06-14T12:00:00', activity: undefined, distance: undefined, climb: undefined, area: '', country: 'italy', track: undefined, cover: '2026/06/a.jpg', darkHeader: false, photos: [{ src: '2026/06/a.jpg', width: 1620, height: 1080 }] });
  expect(fm).toMatch(/^---\ntitle: X\n/);
  for (const key of ['activity', 'distance', 'climb', 'track']) expect(fm, key).toContain(`\n${key}:\n`);
  expect(fm).toContain('# bike: xc | trail | gravel');
  expect(fm).toContain('  - src: 2026/06/a.jpg\n    width: 1620\n    height: 1080\n');
});

test('scaffoldGallery with kind outdoors writes a trip file in the field order', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'trip-photos-'));
  copyFileSync(new URL('./fixtures/sample-1620x1080.jpg', import.meta.url).pathname, join(folder, 'PXL_20260614_080001.JPG'));
  copyFileSync(new URL('./fixtures/sample-1620x1080.jpg', import.meta.url).pathname, join(folder, 'PXL_20260614_073512.jpg'));
  const uploads = mkdtempSync(join(tmpdir(), 'trip-uploads-'));
  const contentDir = join(mkdtempSync(join(tmpdir(), 'trip-content-')), 'outdoors');
  mkdirSync(uploads, { recursive: true });
  const store: ObjectStore = { listKeys: async () => new Set(), put: async () => {} };

  const path = await scaffoldGallery({ slug: 'monte-bondone', folder, store, contentDir, uploadsDir: uploads, date: new Date(2026, 5, 14, 12), kind: 'outdoors' });

  const text = readFileSync(path, 'utf8');
  expect(path).toBe(join(contentDir, 'monte-bondone.md'));
  const keys = ['title:', 'date:', 'activity:', '# bike:', 'distance:', 'climb:', 'area:', 'country:', 'track:', 'cover:', 'coverWidth:', 'coverHeight:', 'darkHeader:', 'photos:'];
  const at = keys.map((k) => text.indexOf(`\n${k}`));
  expect(at).toEqual([...at].sort((a, b) => a - b));
  expect(at.every((i) => i >= 0)).toBe(true);
  expect(text).toContain('date: "2026-06-14T12:00:00"');
  expect(parse(text.split('---')[1])).toMatchObject({ title: 'Monte Bondone', activity: null, distance: null, climb: null, track: null, cover: '2026/06/monte-bondone-01.jpg', coverWidth: 1620, coverHeight: 1080, photos: [{ src: '2026/06/monte-bondone-01.jpg', width: 1620, height: 1080 }, { src: '2026/06/monte-bondone-02.jpg', width: 1620, height: 1080 }] });
  // The phone names (exact day and time) never reach the uploads tree or the file.
  expect(text).not.toContain('pxl_');
  expect(existsSync(join(uploads, '2026/06/monte-bondone-01.jpg'))).toBe(true);
  expect(existsSync(join(uploads, '2026/06/monte-bondone-02.jpg'))).toBe(true);
  expect(existsSync(join(uploads, '2026/06/pxl_20260614_073512.jpg'))).toBe(false);
  await expect(scaffoldGallery({ slug: 'monte-bondone', folder, store, contentDir, uploadsDir: uploads, kind: 'outdoors' })).rejects.toThrow(/already exists/);
});

test('photoName numbers with two digits, three from 100 photos, and keeps a lower-cased extension', () => {
  expect(photoName('x', 0, 41, 'PXL_1.JPG')).toBe('x-01.jpg');
  expect(photoName('x', 98, 100, 'a.jpeg')).toBe('x-099.jpeg');
  expect(photoName('x', 99, 100, 'a.jpg')).toBe('x-100.jpg');
});
