import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { writeTrack } from '../scripts/track';
import { distanceKm, parseGpx } from '../src/lib/gpx';

const EXPORT = new URL('./fixtures/track.gpx', import.meta.url).pathname;

test('writeTrack writes the sanitised route, reports the points, and refuses to overwrite', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracks-'));
  const { path, points } = writeTrack(EXPORT, 'colle-delle-finestre', dir);
  expect(path).toBe(join(dir, 'colle-delle-finestre.gpx'));
  const text = readFileSync(path, 'utf8');
  expect(points).toBe(parseGpx(readFileSync(EXPORT, 'utf8')).length);
  expect(points).toBeGreaterThan(1);
  for (const forbidden of ['<time', '<extensions', '<metadata', '<wpt', 'Garmin', 'Oleg', 'Parking']) expect(text).not.toContain(forbidden);
  expect(text).toContain('<name>colle-delle-finestre</name>');
  expect(() => writeTrack(EXPORT, 'colle-delle-finestre', dir)).toThrow(/already exists/);
});

test('writeTrack refuses a slug that is not a plain file name, and an export without points', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracks-'));
  expect(() => writeTrack(EXPORT, '../x', dir)).toThrow(/slug/);
  const empty = join(dir, 'empty.gpx');
  writeFileSync(empty, '<gpx></gpx>');
  expect(() => writeTrack(empty, 'x', dir)).toThrow(/no track points/);
});

test('writeTrack with a mask: no point of the written track is within that distance of the export’s start or finish', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracks-'));
  const original = parseGpx(readFileSync(EXPORT, 'utf8'));
  const { path, points } = writeTrack(EXPORT, 'masked', dir, 1);
  const written = parseGpx(readFileSync(path, 'utf8'));
  expect(points).toBe(written.length);
  expect(points).toBeLessThan(original.length);
  for (const q of written) expect(Math.min(distanceKm(q, original[0]), distanceKm(q, original[original.length - 1]))).toBeGreaterThanOrEqual(1);
  // The elevation profile of the whole route, distance and elevation only, so the page can show the full ride.
  const profile = JSON.parse(readFileSync(join(dir, 'masked.profile.json'), 'utf8')) as [number, number][];
  let total = 0; for (let i = 1; i < original.length; i++) total += distanceKm(original[i - 1], original[i]);
  expect(profile[profile.length - 1][0]).toBeCloseTo(total, 1);
  expect(readFileSync(join(dir, 'masked.profile.json'), 'utf8')).not.toMatch(/lat|lon/);
});

test('writeTrack without a mask writes no profile file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracks-'));
  writeTrack(EXPORT, 'plain', dir);
  expect(existsSync(join(dir, 'plain.profile.json'))).toBe(false);
});
