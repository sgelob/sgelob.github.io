// Pure helpers for the outdoors collection (hikes and mountain-bike rides): no Astro runtime, so they are unit-testable.
import type { CollectionEntry } from 'astro:content';
import { z } from 'astro/zod';
import { formatMonthYear } from './site';
import { countries, countryName } from './taxonomies';

export const ACTIVITIES = ['hike', 'ride'] as const;
export type Activity = (typeof ACTIVITIES)[number];

export const BIKES = ['xc', 'trail', 'gravel'] as const;
export type Bike = (typeof BIKES)[number];

/** Front matter of a trip. Lives here (not in content.config.ts) so vitest can import it too. */
export const tripSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  // Position among the trips published in the same month, by the real ride time: 1 for the earliest. A trip that shows only its month
  // has its date on the 1st, so the day alone cannot order it. Set by `npm run trips-order`.
  order: z.number().int().positive().optional(),
  activity: z.enum(ACTIVITIES),
  bike: z.enum(BIKES).optional(),
  distance: z.number().positive(),
  climb: z.number().nonnegative(),
  area: z.string().min(1),
  country: z.string().refine((slug) => countries.some((c) => c.slug === slug), { message: 'unknown country slug' }),
  // A bare file name in src/content/outdoors/tracks/: no folders, so the name cannot point elsewhere.
  track: z.union([z.string().regex(/^[\w.-]+\.gpx$/), z.literal(false)]),
  // Approximate ends: the track keeps every point but starts about 1 km along the path (`npm run track -- … --approximate-ends`).
  approximateEnds: z.boolean().optional(),
  links: z.array(z.object({ label: z.string(), url: z.url() })).optional(),
  cover: z.string(),
  coverWidth: z.number().optional(),
  coverHeight: z.number().optional(),
  darkHeader: z.boolean(),
  seoDescription: z.string().optional(),
  photos: z.array(z.object({ src: z.string(), width: z.number(), height: z.number(), alt: z.string().min(1) })),
})
  .strict()
  .refine((t) => t.activity === 'ride' || t.bike === undefined, { message: 'bike is for rides only', path: ['bike'] })
  .refine((t) => t.track !== false || t.date.getDate() === 1, { message: 'a discreet trip (track: false) has its date on the 1st of the month', path: ['date'] })
  .refine((t) => t.track !== false || !t.links?.length, { message: 'a discreet trip (track: false) has no links', path: ['links'] })
  .refine((t) => t.track !== false || !t.approximateEnds, { message: 'approximateEnds needs a track', path: ['approximateEnds'] });

export type Trip = CollectionEntry<'outdoors'>;
export type TripData = z.infer<typeof tripSchema>;

/** `/outdoors/<id>/` */
export function tripPath(trip: Pick<Trip, 'id'>): string {
  return `/outdoors/${trip.id}/`;
}

/** `/outdoors/<id>-olegs-be.gpx`: the download always says where it came from, whatever the browser names the file after. */
export function trackPath(trip: Pick<Trip, 'id'>): string {
  return `/outdoors/${trip.id}-olegs-be.gpx`;
}

/** `/outdoors/<id>.contours.svg`: the contour layer behind the route map, when the trip has one. */
export function contoursPath(trip: Pick<Trip, 'id'>): string {
  return `/outdoors/${trip.id}.contours.svg`;
}

/** A ride is MTB, except on the gravel bike (a city/trekking bike on roads and dirt tracks), which is just a ride. */
export function activityLabel(a: Activity, bike?: Bike): 'Hike' | 'MTB' | 'Ride' {
  if (a === 'hike') return 'Hike';
  return bike === 'gravel' ? 'Ride' : 'MTB';
}

export function bikeLabel(b: Bike): 'XC bike' | 'Trail bike' | 'Gravel bike' {
  return b === 'xc' ? 'XC bike' : b === 'trail' ? 'Trail bike' : 'Gravel bike';
}

export function bikeShort(b: Bike): 'XC' | 'Trail' | 'Gravel' {
  return b === 'xc' ? 'XC' : b === 'trail' ? 'Trail' : 'Gravel';
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

/** Card line, led by the country as on gallery cards: `Italy · Hike · 16 km · 1,350 m`, `Italy · MTB · Trail · 38 km · 1,700 m` (no "up" here). */
export function cardMeta(d: Pick<TripData, 'country' | 'activity' | 'bike' | 'distance' | 'climb'>): string {
  const parts: string[] = [countryName(d.country), activityLabel(d.activity, d.bike)];
  if (d.activity === 'ride' && d.bike) parts.push(bikeShort(d.bike));
  parts.push(formatKm(d.distance), `${numbers.format(d.climb)} m`);
  return parts.join(' · ');
}

/** Hero facts, in display order; the bike is for rides only. */
export function heroMeta(d: TripData, photoCount: number): string[] {
  const parts: string[] = [countryName(d.country), activityLabel(d.activity, d.bike)];
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

/** The heading and link of the "more" row on a trip page: by activity when every picked trip shares it, else all trips. */
export function moreLabels(activity: Activity, more: readonly { data: { activity: Activity } }[]): { title: string; href: string; link: string } {
  if (more.some((t) => t.data.activity !== activity)) return { title: 'More trips', href: '/outdoors/', link: 'All trips' };
  return activity === 'hike'
    ? { title: 'More hikes', href: '/outdoors/hikes/', link: 'All hikes' }
    : { title: 'More rides', href: '/outdoors/rides/', link: 'All rides' };
}

/** The lead of the Outdoors pages, also their meta description. */
export const OUTDOORS_LEAD =
  'Hikes and mountain-bike rides, mostly in the Alps: time in the woods and on the trails for the landscape and the quiet, a kind of shinrin-yoku on foot or on two wheels. Distance and climb are there to describe the day, not to measure it.';

const monthOf = (d: Date) => d.getFullYear() * 12 + d.getMonth();

/** Newest month first; within a month the latest ride first (`order`), then the published date, then the id, so the order is stable. */
export function sortTrips<T extends { id: string; data: { date: Date; order?: number } }>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      monthOf(b.data.date) - monthOf(a.data.date) ||
      (b.data.order ?? 0) - (a.data.order ?? 0) ||
      b.data.date.getTime() - a.data.date.getTime() ||
      a.id.localeCompare(b.id),
  );
}
