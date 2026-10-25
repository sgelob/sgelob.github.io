// The hidden ride order: a trip that publishes only its month has its date on the 1st, so within a month `order` (1 for the
// earliest) keeps the trips in the order they were ridden. The real ride times live only in the git-ignored trip notes (`- ride: <ISO date and time>`).
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
