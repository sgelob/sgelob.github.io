import { copyFileSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { parse } from 'yaml';
import type { ObjectStore } from '../scripts/photos/r2';
import { scaffoldGallery, tripFrontmatter } from '../scripts/photos/scaffold';

test('tripFrontmatter leaves track undecided and lists the photos', () => {
  const fm = tripFrontmatter({ slug: 'x', title: 'X', date: '2026-06-14T12:00:00', activity: 'hike', distance: 0, climb: 0, area: '', country: 'italy', track: undefined, cover: '2026/06/a.jpg', darkHeader: false, photos: [{ src: '2026/06/a.jpg', width: 1620, height: 1080 }] });
  expect(fm).toMatch(/^---\ntitle: X\n/);
  expect(fm).toContain('\ntrack:\n');
  expect(fm).toContain('# bike: xc | trail');
  expect(fm).toContain('  - src: 2026/06/a.jpg\n    width: 1620\n    height: 1080\n');
});

test('scaffoldGallery with kind outdoors writes a trip file in the field order', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'trip-photos-'));
  copyFileSync(new URL('./fixtures/sample-1620x1080.jpg', import.meta.url).pathname, join(folder, 'a.jpg'));
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
  expect(parse(text.split('---')[1])).toMatchObject({ title: 'Monte Bondone', track: null, cover: '2026/06/a.jpg', coverWidth: 1620, coverHeight: 1080, photos: [{ src: '2026/06/a.jpg', width: 1620, height: 1080 }] });
  await expect(scaffoldGallery({ slug: 'monte-bondone', folder, store, contentDir, uploadsDir: uploads, kind: 'outdoors' })).rejects.toThrow(/already exists/);
});
