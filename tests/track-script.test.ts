import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { writeTrack } from '../scripts/track';
import { distanceKm, parseGpx } from '../src/lib/gpx';

const EXPORT = new URL('./fixtures/track.gpx', import.meta.url).pathname;

test('writeTrack writes the sanitised route, reports the points, and refuses to overwrite', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracks-'));
  const { path, points } = writeTrack(EXPORT, 'colle-delle-finestre', dir, { privacyZone: null });
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

test('writeTrack with approximate ends: in ride order, starting and ending on the edge of the privacy zone, nothing inside it, and no profile file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracks-'));
  const original = parseGpx(readFileSync(EXPORT, 'utf8'));
  const zone = { lat: original[0].lat, lon: original[0].lon, radiusKm: 0.3 };
  const { path, points } = writeTrack(EXPORT, 'approx', dir, { approximateEnds: true, privacyZone: zone });
  const written = parseGpx(readFileSync(path, 'utf8'));
  expect(points).toBe(written.length);
  expect(written).toEqual(original.filter((p) => distanceKm(p, zone) > zone.radiusKm)); // the points outside, in the order they were ridden: it begins where the ride leaves the zone
  expect(existsSync(join(dir, 'approx.profile.json'))).toBe(false);
});

test('writeTrack refuses approximate ends without a privacy zone', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracks-'));
  expect(() => writeTrack(EXPORT, 'approx', dir, { approximateEnds: true, privacyZone: null })).toThrow(/PRIVACY_ZONE/);
  expect(existsSync(join(dir, 'approx.gpx'))).toBe(false);
});

test('writeTrack keeps a shared route out of the privacy zone too, and refuses one that lies wholly inside it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracks-'));
  const original = parseGpx(readFileSync(EXPORT, 'utf8'));
  const zone = { lat: original[0].lat, lon: original[0].lon, radiusKm: 0.3 };
  writeTrack(EXPORT, 'shared', dir, { privacyZone: zone });
  for (const p of parseGpx(readFileSync(join(dir, 'shared.gpx'), 'utf8'))) expect(distanceKm(p, zone)).toBeGreaterThan(zone.radiusKm);
  expect(() => writeTrack(EXPORT, 'inside', dir, { privacyZone: { ...zone, radiusKm: 1000 } })).toThrow(/inside the privacy zone/);
});

test('writeTrack for a shared route writes no profile file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tracks-'));
  writeTrack(EXPORT, 'plain', dir, { privacyZone: null });
  expect(existsSync(join(dir, 'plain.profile.json'))).toBe(false);
});
