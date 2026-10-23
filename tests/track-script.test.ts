import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { writeTrack } from '../scripts/track';
import { parseGpx } from '../src/lib/gpx';

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
