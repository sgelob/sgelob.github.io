// Turns a GPX export into a shareable track: `npm run track -- <export.gpx> <slug> [--approximate-ends]`.
// Writes src/content/outdoors/tracks/<slug>.gpx with only the route (lat, lon, ele): no times, no heart rate, no waypoints,
// no device or author. The repository is public, so a shareable track is never copied there raw.
// With PRIVACY_ZONE set ("lat,lon,radiusKm"), nothing inside that circle around home is written (see `outsideZone`).
// `--approximate-ends` writes the route as a closed circuit with no start or finish, beginning 1 to 1.5 km along the path (see `asCircuit`),
// and needs PRIVACY_ZONE: a route that starts at home must never show the way to the door.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { asCircuit, outsideZone, parseGpx, parsePrivacyZone, parseSegments, trackDocument, type CircuitOptions, type PrivacyZone } from '../src/lib/gpx';

const TRACKS_DIR = fileURLToPath(new URL('../src/content/outdoors/tracks', import.meta.url));

export interface WriteTrackOptions {
  /** Approximate ends: the track becomes a closed circuit (see `asCircuit`), drawn once, here. */
  approximateEnds?: CircuitOptions;
  /** The circle no track enters; PRIVACY_ZONE when left out, and no zone when null. */
  privacyZone?: PrivacyZone | null;
}

/** PRIVACY_ZONE, parsed; null when it is not set. */
export const zoneFromEnv = (): PrivacyZone | null => (process.env.PRIVACY_ZONE ? parsePrivacyZone(process.env.PRIVACY_ZONE) : null);

/** Writes the sanitised export to `<tracksDir>/<slug>.gpx` and returns its path and point count. Refuses to overwrite: approximate ends are drawn once and never again. */
export function writeTrack(exportPath: string, slug: string, tracksDir: string, { approximateEnds, privacyZone = zoneFromEnv() }: WriteTrackOptions = {}): { path: string; points: number } {
  if (!/^[\w-]+$/.test(slug)) throw new Error(`slug "${slug}" must be letters, digits, "-" and "_" only (it is the trip's file name)`);
  const path = resolve(tracksDir, `${slug}.gpx`);
  if (existsSync(path)) throw new Error(`${path} already exists: pick another slug, or delete the file first`);
  if (approximateEnds && !privacyZone) throw new Error('approximate ends need PRIVACY_ZONE ("lat,lon,radiusKm"): without it the track still passes the door');
  const xml = readFileSync(exportPath, 'utf8');
  const segments = approximateEnds ? [asCircuit(parseGpx(xml), approximateEnds)] : parseSegments(xml);
  if (segments.length === 0) throw new Error('no track points');
  const kept = privacyZone ? segments.flatMap((segment) => outsideZone(segment, privacyZone)) : segments;
  if (kept.length === 0) throw new Error('the whole route lies inside the privacy zone: make the trip discreet instead');
  const clean = trackDocument(kept, slug);
  writeFileSync(path, clean);
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
    console.log(`wrote ${path}: ${points} points${approx ? ', as a closed circuit with no start or finish, outside the privacy zone' : ''}; set \`track: ${slug}.gpx\`${approx ? ' and `approximateEnds: true`' : ''} in the trip`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
