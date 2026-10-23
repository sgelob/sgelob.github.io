import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, test } from 'vitest';
import { listTracks, readTrack, TRACKS_DIR } from '../src/lib/tracks';

const DIR = 'src/content/outdoors';
const trips = readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => ({ slug: f.slice(0, -3), data: parse(readFileSync(`${DIR}/${f}`, 'utf8').split('\n---\n')[0].replace(/^---\n/, '')) as Record<string, unknown> }));

describe('outdoors content', () => {
  test('every trip decides on its track, and a named track exists', () => {
    for (const { slug, data } of trips) {
      expect(data.track, `${slug}: track must be a .gpx file name or false`).toBeDefined();
      if (typeof data.track === 'string') expect(existsSync(`${TRACKS_DIR}${data.track}`), `${slug}: ${data.track} missing from tracks/`).toBe(true);
    }
  });
  test('every file in tracks/ belongs to a trip (a stray export never ships)', () => {
    const referenced = new Set(trips.map((t) => t.data.track).filter((t): t is string => typeof t === 'string'));
    for (const file of listTracks()) expect(referenced.has(file), `tracks/${file} is referenced by no trip`).toBe(true);
  });
  test('no .gpx outside tracks/', () => {
    expect(readdirSync(DIR).filter((f) => f.endsWith('.gpx'))).toEqual([]);
  });
  test('readTrack names a missing file', () => { expect(() => readTrack('nope.gpx')).toThrow('track nope.gpx not found'); });
});
