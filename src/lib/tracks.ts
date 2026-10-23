// The committed GPX files behind the outdoors trips. Node `fs`: build time and tests only, never imported by client code.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
