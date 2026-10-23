// Turns a GPX export into a shareable track: `npm run track -- <export.gpx> <slug>`.
// Writes src/content/outdoors/tracks/<slug>.gpx with only the route (lat, lon, ele): no times, no heart rate, no waypoints,
// no device or author. The repository is public, so a shareable track is never copied there raw.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseGpx, sanitizeGpx } from '../src/lib/gpx';

const TRACKS_DIR = fileURLToPath(new URL('../src/content/outdoors/tracks', import.meta.url));

/** Writes the sanitised export to `<tracksDir>/<slug>.gpx` and returns its path and point count. Refuses to overwrite. */
export function writeTrack(exportPath: string, slug: string, tracksDir: string): { path: string; points: number } {
  if (!/^[\w-]+$/.test(slug)) throw new Error(`slug "${slug}" must be letters, digits, "-" and "_" only (it is the trip's file name)`);
  const path = resolve(tracksDir, `${slug}.gpx`);
  if (existsSync(path)) throw new Error(`${path} already exists: pick another slug, or delete the file first`);
  const xml = readFileSync(exportPath, 'utf8');
  const clean = sanitizeGpx(xml, slug);
  writeFileSync(path, clean);
  return { path, points: parseGpx(clean).length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [exportPath, slug, ...rest] = process.argv.slice(2);
  if (!exportPath || !slug || rest.length) {
    console.error('Usage: npm run track -- <export.gpx> <slug>');
    process.exit(2);
  }
  try {
    const { path, points } = writeTrack(resolve(exportPath), slug, TRACKS_DIR);
    console.log(`wrote ${path}: ${points} points; set \`track: ${slug}.gpx\` in the trip`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
