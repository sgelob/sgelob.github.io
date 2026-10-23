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
  test('a committed track is a sanitised export (no times, extensions, metadata or waypoints): run it through `npm run track`', () => {
    for (const file of listTracks()) {
      const xml = readTrack(file);
      for (const tag of ['<time', '<extensions', '<metadata', '<wpt']) expect(xml.includes(tag), `tracks/${file} contains ${tag}: it is a raw export, not the output of npm run track`).toBe(false);
    }
  });
  test('hikes and rides are the filter pages: no trip may take those slugs', () => {
    for (const { slug } of trips) expect(['hikes', 'rides'].includes(slug), `${slug}.md would collide with /outdoors/${slug}/`).toBe(false);
  });
  test('no .gpx outside tracks/', () => {
    expect(readdirSync(DIR).filter((f) => f.endsWith('.gpx'))).toEqual([]);
  });
  test('readTrack names a missing file', () => { expect(() => readTrack('nope.gpx')).toThrow('track nope.gpx not found'); });
});
