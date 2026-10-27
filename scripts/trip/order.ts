// The hidden ride order: a trip that publishes only its month has its date on the 1st, so within a month `order` (1 for the
// earliest) keeps the trips in the order they were ridden. The real ride times live only in the git-ignored trip notes (`- ride: <ISO date and time>`).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tourIdFromUrl } from './komoot';

/** The ride time recorded in a trip's notes, if any. */
export const readRideTime = (notes: string): string | undefined => /^- ride: (\S+)\s*$/m.exec(notes)?.[1];

/**
 * The order of each trip among those published in the same month, by ride time (1 for the earliest); undefined for a trip
 * alone in its month. A trip of a shared month without a ride time is left out (its file keeps what it has) and reported.
 */
export function rideOrders(trips: { slug: string; date: string; ride?: string }[], problems: string[] = []): Map<string, number | undefined> {
  const byMonth = new Map<string, typeof trips>();
  for (const trip of trips) byMonth.set(trip.date.slice(0, 7), [...(byMonth.get(trip.date.slice(0, 7)) ?? []), trip]);
  const orders = new Map<string, number | undefined>();
  for (const group of byMonth.values()) {
    if (group.length === 1) {
      orders.set(group[0].slug, undefined);
      continue;
    }
    const known = group.filter((t) => t.ride);
    for (const t of group.filter((t) => !t.ride)) problems.push(`${t.slug}: no ride time in its notes, so its order among the trips of ${t.date.slice(0, 7)} is unknown`);
    known.sort((a, b) => Date.parse(a.ride!) - Date.parse(b.ride!) || a.slug.localeCompare(b.slug)).forEach((t, i) => orders.set(t.slug, i + 1));
  }
  return orders;
}

/** The trip file with its `order:` line set right after `date:`, or removed when `order` is undefined. */
export function writeOrder(doc: string, order: number | undefined): string {
  const without = doc.replace(/^order: \d+\n/m, '');
  return order === undefined ? without : without.replace(/^(date: .*\n)/m, `$1order: ${order}\n`);
}

/** Numbers every trip file of `contentDir` from the notes in `notesDir`; returns the slugs whose file changed. */
export function orderTrips(contentDir: string, notesDir: string, log: (line: string) => void): { changed: string[]; problems: string[] } {
  const trips = readdirSync(contentDir).filter((f) => f.endsWith('.md')).map((f) => {
    const slug = f.slice(0, -3);
    const doc = readFileSync(join(contentDir, f), 'utf8');
    const date = /^date: "?([^"\n]+)"?$/m.exec(doc)?.[1] ?? '';
    const notes = join(notesDir, f);
    return { slug, doc, date, ride: existsSync(notes) ? readRideTime(readFileSync(notes, 'utf8')) : undefined };
  });
  const problems: string[] = [];
  const orders = rideOrders(trips, problems);
  const changed: string[] = [];
  for (const trip of trips) {
    if (!orders.has(trip.slug)) continue;
    const next = writeOrder(trip.doc, orders.get(trip.slug));
    if (next !== trip.doc) {
      writeFileSync(join(contentDir, `${trip.slug}.md`), next);
      changed.push(trip.slug);
      log(`  ${trip.slug}: order ${orders.get(trip.slug) ?? 'removed'}`);
    }
  }
  for (const p of problems) log(`  ${p}`);
  return { changed, problems };
}

/** The id of the Komoot tour a trip file links to, if any. */
export function komootTourId(doc: string): string | undefined {
  const url = /^\s+url: (https:\/\/www\.komoot\.com\/\S+)$/m.exec(doc)?.[1];
  return url ? tourIdFromUrl(url) : undefined;
}

/** A trip whose notes have no ride time: its Komoot tour if it links one, else what can recognise it in the account's list. */
export interface MissingRideTime {
  slug: string;
  tourId?: string;
  /** The published month, YYYY-MM: the real ride falls in it. */
  month: string;
  distanceKm?: number;
  climb?: number;
}

/** The trips whose notes have no ride time (notes are kept only where they were written). */
export function missingRideTimes(contentDir: string, notesDir: string): MissingRideTime[] {
  return readdirSync(contentDir).filter((f) => f.endsWith('.md')).sort().flatMap((f) => {
    const notes = join(notesDir, f);
    if (existsSync(notes) && readRideTime(readFileSync(notes, 'utf8'))) return [];
    const doc = readFileSync(join(contentDir, f), 'utf8');
    const number = (key: string) => {
      const m = new RegExp(`^${key}: ([\\d.]+)$`, 'm').exec(doc);
      return m ? Number(m[1]) : undefined;
    };
    const month = /^date: "?(\d{4}-\d{2})/m.exec(doc)?.[1] ?? '';
    return [{ slug: f.slice(0, -3), tourId: komootTourId(doc), month, distanceKm: number('distance'), climb: number('climb') }];
  });
}

/**
 * The ride time of a trip that does not link to its tour (a trip with approximate ends must not): the one tour of the account
 * ridden in the trip's month with its distance and climb. Undefined when none matches, or more than one does.
 */
export function matchRideTime(trip: MissingRideTime, tours: readonly { distanceKm: number; climb: number; startedAt: string }[]): string | undefined {
  if (trip.distanceKm === undefined || trip.climb === undefined) return undefined;
  const hits = tours.filter((t) => t.distanceKm === trip.distanceKm && t.climb === trip.climb && localMonth(t.startedAt) === trip.month);
  return hits.length === 1 ? hits[0].startedAt : undefined;
}

/** The month of a moment in Italian time, where the rides are: a ride just after midnight on the 1st belongs to the new month. */
const localMonth = (iso: string): string => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }).slice(0, 7);

/** Writes a ride time into a trip's notes, creating them if needed; a time already there is kept. */
export function recordRideTime(notesDir: string, slug: string, iso: string): void {
  const path = join(notesDir, `${slug}.md`);
  const notes = existsSync(path) ? readFileSync(path, 'utf8') : `# ${slug}\n\n`;
  if (readRideTime(notes)) return;
  mkdirSync(notesDir, { recursive: true });
  writeFileSync(path, /^- date: .*$/m.test(notes) ? notes.replace(/^(- date: .*\n)/m, `$1- ride: ${iso}\n`) : `${notes.trimEnd()}\n\n- ride: ${iso}\n`);
}
