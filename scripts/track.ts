// Turns a GPX export into a shareable track: `npm run track -- <export.gpx> <slug> [--approximate-ends]`.
// Writes src/content/outdoors/tracks/<slug>.gpx with only the route (lat, lon, ele): no times, no heart rate, no waypoints,
// no device or author. The repository is public, so a shareable track is never copied there raw.
// `--approximate-ends` moves the start and finish 1 to 1.5 km along the path (see `moveEnds`), and writes
// <slug>.profile.json: the whole route's elevation profile as distance and elevation pairs, without coordinates.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { moveEnds, parseGpx, profileSeries, sanitizeGpx, trackDocument, type MoveEndsOptions } from '../src/lib/gpx';

const TRACKS_DIR = fileURLToPath(new URL('../src/content/outdoors/tracks', import.meta.url));

export interface WriteTrackOptions {
  /** Approximate ends: the start and finish are moved along the path (see `moveEnds`), once, here. */
  approximateEnds?: MoveEndsOptions;
}

/** Writes the sanitised export to `<tracksDir>/<slug>.gpx` and returns its path and point count. Refuses to overwrite: approximate ends are drawn once and never again. */
export function writeTrack(exportPath: string, slug: string, tracksDir: string, { approximateEnds }: WriteTrackOptions = {}): { path: string; points: number } {
  if (!/^[\w-]+$/.test(slug)) throw new Error(`slug "${slug}" must be letters, digits, "-" and "_" only (it is the trip's file name)`);
  const path = resolve(tracksDir, `${slug}.gpx`);
  if (existsSync(path)) throw new Error(`${path} already exists: pick another slug, or delete the file first`);
  const xml = readFileSync(exportPath, 'utf8');
  const clean = approximateEnds ? trackDocument(moveEnds(parseGpx(xml), approximateEnds), slug) : sanitizeGpx(xml, slug);
  writeFileSync(path, clean);
  if (approximateEnds) writeFileSync(resolve(tracksDir, `${slug}.profile.json`), `${JSON.stringify(profileSeries(parseGpx(xml), 600))}\n`);
  return { path, points: parseGpx(clean).length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const approx = args.includes('--approximate-ends');
  const [exportPath, slug, ...rest] = args.filter((a) => a !== '--approximate-ends');
  if (!exportPath || !slug || rest.length) {
    console.error('Usage: npm run track -- <export.gpx> <slug> [--approximate-ends]');
    process.exit(2);
  }
  try {
    const approximateEnds = approx ? {} : undefined;
    const { path, points } = writeTrack(resolve(exportPath), slug, TRACKS_DIR, { approximateEnds });
    console.log(`wrote ${path}: ${points} points${approx ? ', start and finish moved 1 to 1.5 km along the path' : ''}; set \`track: ${slug}.gpx\`${approx ? ' and `approximateEnds: true`' : ''} in the trip`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
