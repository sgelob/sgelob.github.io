// Pure helpers for the outdoors collection (hikes and mountain-bike rides): no Astro runtime, so they are unit-testable.
import type { CollectionEntry } from 'astro:content';
import { z } from 'astro/zod';
import { formatMonthYear } from './site';
import { countryName } from './taxonomies';

export const ACTIVITIES = ['hike', 'ride'] as const;
export type Activity = (typeof ACTIVITIES)[number];

export const BIKES = ['xc', 'trail'] as const;
export type Bike = (typeof BIKES)[number];

/** Front matter of a trip. Lives here (not in content.config.ts) so vitest can import it too. */
export const tripSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  activity: z.enum(ACTIVITIES),
  bike: z.enum(BIKES).optional(),
  distance: z.number().positive(),
  climb: z.number().nonnegative(),
  area: z.string().min(1),
  country: z.string().min(1),
  track: z.union([z.string().regex(/\.gpx$/), z.literal(false)]),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })).optional(),
  cover: z.string(),
  coverWidth: z.number().optional(),
  coverHeight: z.number().optional(),
  darkHeader: z.boolean(),
  seoDescription: z.string().optional(),
  photos: z.array(z.object({ src: z.string(), width: z.number(), height: z.number(), alt: z.string().optional() })),
})
  .refine((t) => t.activity === 'ride' || t.bike === undefined, { message: 'bike is for rides only', path: ['bike'] })
  .refine((t) => t.track !== false || t.date.getDate() === 1, { message: 'a discreet trip (track: false) has its date on the 1st of the month', path: ['date'] })
  .refine((t) => t.track !== false || !t.links?.length, { message: 'a discreet trip (track: false) has no links', path: ['links'] });

export type Trip = CollectionEntry<'outdoors'>;
export type TripData = z.infer<typeof tripSchema>;

/** `/outdoors/<id>/` */
export function tripPath(trip: Pick<Trip, 'id'>): string {
  return `/outdoors/${trip.id}/`;
}

/** `/outdoors/<id>.gpx` */
export function trackPath(trip: Pick<Trip, 'id'>): string {
  return `/outdoors/${trip.id}.gpx`;
}

export function activityLabel(a: Activity): 'Hike' | 'MTB' {
  return a === 'hike' ? 'Hike' : 'MTB';
}

export function bikeLabel(b: Bike): 'XC bike' | 'Trail bike' {
  return b === 'xc' ? 'XC bike' : 'Trail bike';
}

export function bikeShort(b: Bike): 'XC' | 'Trail' {
  return b === 'xc' ? 'XC' : 'Trail';
}

const numbers = new Intl.NumberFormat('en-US');

/** `12.5 km`, `1,024 km` */
export function formatKm(km: number): string {
  return `${numbers.format(km)} km`;
}

/** `1,350 m up` */
export function formatClimb(m: number): string {
  return `${numbers.format(m)} m up`;
}

/** Card line: `Hike · 16 km · 1,350 m`, `MTB · Trail · 38 km · 1,700 m` (no "up" here). */
export function cardMeta(d: Pick<TripData, 'activity' | 'bike' | 'distance' | 'climb'>): string {
  const parts: string[] = [activityLabel(d.activity)];
  if (d.activity === 'ride' && d.bike) parts.push(bikeShort(d.bike));
  parts.push(formatKm(d.distance), `${numbers.format(d.climb)} m`);
  return parts.join(' · ');
}

/** Hero facts, in display order; the bike is for rides only. */
export function heroMeta(d: TripData, photoCount: number): string[] {
  const parts: string[] = [countryName(d.country), activityLabel(d.activity)];
  if (d.activity === 'ride' && d.bike) parts.push(bikeLabel(d.bike));
  parts.push(
    formatKm(d.distance),
    formatClimb(d.climb),
    d.area,
    formatMonthYear(d.date, 'en'),
    `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`,
  );
  return parts;
}

/** Splits on the year, keeping the input order (years appear descending when the input is date descending). */
export function groupByYear<T extends { data: { date: Date } }>(trips: readonly T[]): { year: number; trips: T[] }[] {
  const groups: { year: number; trips: T[] }[] = [];
  for (const trip of trips) {
    const year = trip.data.date.getFullYear();
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.trips.push(trip);
    else groups.push({ year, trips: [trip] });
  }
  return groups;
}

/** Other trips of the same activity first, then any others, in input order, up to `count`. */
export function moreTrips<T extends { id: string; data: { activity: Activity } }>(trips: readonly T[], id: string, count = 4): T[] {
  const current = trips.find((t) => t.id === id);
  const others = trips.filter((t) => t.id !== id);
  const same = others.filter((t) => t.data.activity === current?.data.activity);
  const rest = others.filter((t) => t.data.activity !== current?.data.activity);
  return [...same, ...rest].slice(0, count);
}
