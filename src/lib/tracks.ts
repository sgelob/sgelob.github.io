// The committed GPX files behind the outdoors trips. Node `fs`: build time and tests only, never imported by client code.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ProfileSeries } from './gpx';

/**
 * Absolute path of `src/content/outdoors/tracks/`, with a trailing slash. Resolved from the project root (the cwd of `astro build` and vitest):
 * `import.meta.url` is no use here, because the bundled build moves this module out of `src/`.
 */
export const TRACKS_DIR: string = `${resolve(process.cwd(), 'src/content/outdoors/tracks')}/`;

/** The text of a track file; throws, naming the file, when it is not in the tracks folder. */
export function readTrack(file: string): string {
  const path = `${TRACKS_DIR}${file}`;
  if (!existsSync(path)) throw new Error(`track ${file} not found in src/content/outdoors/tracks`);
  return readFileSync(path, 'utf8');
}

/** The `.gpx` file names in the tracks folder, sorted. */
export function listTracks(): string[] {
  return readdirSync(TRACKS_DIR).filter((f) => f.endsWith('.gpx')).sort();
}

/** The contour layer drawn behind a track's route map: `<name>.gpx` → `<name>.contours.svg`. */
export const contoursFile = (track: string): string => track.replace(/\.gpx$/, '.contours.svg');

/** Whether a track has its contour layer (written by `npm run contours` or the trip wizard). */
export const hasContours = (track: string): boolean => existsSync(`${TRACKS_DIR}${contoursFile(track)}`);

/** The `.contours.svg` file names in the tracks folder, sorted. */
export function listContours(): string[] {
  return readdirSync(TRACKS_DIR).filter((f) => f.endsWith('.contours.svg')).sort();
}

/** The whole route's elevation profile written next to a masked track (`npm run track -- … --mask <km>`), if there is one. */
export function readProfile(track: string): ProfileSeries | undefined {
  const path = `${TRACKS_DIR}${track.replace(/\.gpx$/, '.profile.json')}`;
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as ProfileSeries) : undefined;
}
