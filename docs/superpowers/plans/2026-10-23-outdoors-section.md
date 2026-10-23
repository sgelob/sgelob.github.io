# Outdoors Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An "Outdoors" section for hikes and mountain-bike rides: a new content collection, its index and trip pages, a privacy-safe GPX route block, and its place in the nav, home, search and feed, delivered on a branch whose PR stays open until the first trip exists.

**Architecture:** A third content collection `outdoors` next to `galleries` and `posts`, with pure helpers in `src/lib/outdoors.ts` (schema, labels, grouping) and `src/lib/gpx.ts` (parse, draw, sanitise). Pages under `src/pages/outdoors/` reuse the gallery machinery: a shared `Hero`, the `JustifiedGrid` + `Lightbox`, `SectionLabel`, and a `TripCard`/`TripGrid` pair mirroring the gallery cards. The published GPX is an endpoint that rewrites the committed file to points only.

**Tech Stack:** Astro 7 content collections (glob loader, `astro/zod`), vitest 4 (`tests/helpers/dist.ts` build reads, `tests/helpers/render.ts` container renders), Pagefind, `@astrojs/rss`, Node `fs` at build time. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-23-outdoors-section-design.md`

## Global Constraints

- Work on branch `outdoors` from `main`; one commit per task; at the end open a PR to `main` titled "feat: Outdoors section (hold until the first trip)" and do not merge it.
- Section name "Outdoors"; URLs `/outdoors/`, `/outdoors/hikes/`, `/outdoors/rides/`, `/outdoors/<slug>/`, `/outdoors/<slug>.gpx`.
- Nav order: About, Photos, Outdoors, Blog, Search.
- No external requests beyond `img.olegs.be` and the Cloudflare beacon: no map tiles, no scripts from elsewhere.
- Only the first two paragraphs of `src/content/pages/about.md` reach the home page (`leadParagraphs`); existing tests pin the text "Hi, I’m Oleg" (curly apostrophe).
- Page budgets: a gallery page under 70 KB with inlined CSS (`tests/build-gallery.test.ts`), the lightbox entry chunk under 5 KB. Trip pages share the components, so these hold for them too.
- All copy is English, in the site's voice: short sentences, concrete, first person where Oleg speaks. No counters in descriptions ("43 photos" belongs to meta lines only).
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **A GPX with waypoints or several track segments** (Komoot exports can carry `<wpt>` for the start and `<trkseg>` splits): the drawing and the download must use every `<trkpt>` across segments and must drop `<wpt>`, `<metadata>`, `<time>` and `<extensions>` entirely. Pinned in Task 2.
2. **A GPX without elevation**: the shape is drawn, the profile is omitted and the page says nothing broken. Pinned in Task 2 (`elevationProfile` returns `undefined`) and Task 5 (`RouteBlock` without a profile).
3. **A `track` file name that does not exist, or a stray `.gpx` no trip references**: the test suite fails with the file name in the message, so a wrong name or a forgotten discreet export never ships. Pinned in Task 3.
4. **A discreet trip with `links` or with a real day in its date**: the schema refuses it at build time. Pinned in Task 1.
5. **Numbers with decimals and thousands** (`12.5 km`, `1,350 m up`): formatted the same on the card, in the hero and in the route block. Pinned in Task 1 (`cardMeta`, `heroMeta`).

---

### Task 1: The `outdoors` collection and its pure helpers

**Files:**
- Create: `src/lib/outdoors.ts`
- Create: `src/content/outdoors/.gitkeep`, `src/content/outdoors/tracks/.gitkeep`
- Modify: `src/content.config.ts` (add the collection), `src/lib/collections.ts` (add `getTrips`, `getTripsBy`), `src/data/taxonomies.yaml` (add Croatia)
- Test: `tests/outdoors.test.ts`

**Interfaces:**
- Consumes: `sortByDateDesc`, `neighbours` from `src/lib/paths.ts`; `countryName` from `src/lib/taxonomies.ts`; `formatMonthYear` from `src/lib/site.ts`.
- Produces, in `src/lib/outdoors.ts`:
  - `ACTIVITIES = ['hike', 'ride'] as const`, `type Activity`; `BIKES = ['xc', 'trail'] as const`, `type Bike`.
  - `tripSchema`: the zod object below (built with `z` from `astro/zod`, so it is importable from vitest and from `content.config.ts`).
  - `type Trip = CollectionEntry<'outdoors'>`; `type TripData = z.infer<typeof tripSchema>`.
  - `tripPath(trip: Pick<Trip, 'id'>): string` → `/outdoors/<id>/`; `trackPath(trip: Pick<Trip, 'id'>): string` → `/outdoors/<id>.gpx`.
  - `activityLabel(a: Activity): 'Hike' | 'MTB'`; `bikeLabel(b: Bike): 'XC bike' | 'Trail bike'`; `bikeShort(b: Bike): 'XC' | 'Trail'`.
  - `formatKm(km: number): string` → `en-US` number plus ` km` (`12.5 km`, `1,024 km`); `formatClimb(m: number): string` → `1,350 m up`.
  - `cardMeta(d: Pick<TripData, 'activity' | 'bike' | 'distance' | 'climb'>): string` → `Hike · 16 km · 1,350 m` for hikes, `MTB · Trail · 38 km · 1,700 m` for rides (card meta has no "up").
  - `heroMeta(d: TripData, photoCount: number): string[]` → `[countryName(country), activityLabel, bikeLabel (rides only), formatKm, formatClimb, area, formatMonthYear(date, 'en'), '<n> photos']`.
  - `groupByYear<T extends { data: { date: Date } }>(trips: readonly T[]): { year: number; trips: T[] }[]` keeping input order, years descending as they appear.
  - `moreTrips<T extends { id: string; data: { activity: Activity } }>(trips: readonly T[], id: string, count = 4): T[]` → other trips of the same activity in input order, then any others, up to `count`.
- Produces, in `src/lib/collections.ts`: `getTrips(): Promise<Trip[]>` (date descending) and `getTripsBy(activity: Activity): Promise<Trip[]>`; re-export `tripPath`, `trackPath`, `type Trip`.

The schema (exact fields; the photo object is the one galleries use):

```ts
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
```

- [ ] **Step 1: Write the failing tests** in `tests/outdoors.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { cardMeta, formatClimb, formatKm, groupByYear, heroMeta, moreTrips, tripPath, trackPath, tripSchema } from '../src/lib/outdoors';

const base = { title: 'Colle delle Finestre', date: '2026-06-14', activity: 'ride', bike: 'trail', distance: 38, climb: 1700, area: 'Val di Susa', country: 'italy', track: 'colle-delle-finestre.gpx', cover: '2026/06/a.jpg', darkHeader: false, photos: [{ src: '2026/06/a.jpg', width: 1620, height: 1080, alt: 'Larches' }] };

describe('tripSchema', () => {
  it('accepts a shared ride with a bike and a track', () => { expect(tripSchema.parse(base).bike).toBe('trail'); });
  it('refuses a bike on a hike', () => { expect(() => tripSchema.parse({ ...base, activity: 'hike' })).toThrow(/bike is for rides only/); });
  it('requires track: a file name ending in .gpx or false', () => {
    expect(() => tripSchema.parse({ ...base, track: undefined })).toThrow();
    expect(() => tripSchema.parse({ ...base, track: 'route.kml' })).toThrow();
    expect(tripSchema.parse({ ...base, track: false, date: '2026-06-01' }).track).toBe(false);
  });
  it('a discreet trip has its date on the 1st and no links', () => {
    expect(() => tripSchema.parse({ ...base, track: false })).toThrow(/1st of the month/);
    expect(() => tripSchema.parse({ ...base, track: false, date: '2026-06-01', links: [{ label: 'Komoot', url: 'https://komoot.com/x' }] })).toThrow(/no links/);
  });
});

describe('labels and paths', () => {
  it('paths', () => { expect(tripPath({ id: 'x' } as any)).toBe('/outdoors/x/'); expect(trackPath({ id: 'x' } as any)).toBe('/outdoors/x.gpx'); });
  it('formats numbers the en-US way', () => { expect(formatKm(12.5)).toBe('12.5 km'); expect(formatClimb(1350)).toBe('1,350 m up'); });
  it('cardMeta: hike without bike, ride with the short bike name, no "up"', () => {
    expect(cardMeta({ activity: 'hike', distance: 16, climb: 1350 })).toBe('Hike · 16 km · 1,350 m');
    expect(cardMeta({ activity: 'ride', bike: 'trail', distance: 38, climb: 1700 })).toBe('MTB · Trail · 38 km · 1,700 m');
  });
  it('heroMeta: country, activity, bike, numbers, area, month, photos', () => {
    expect(heroMeta(tripSchema.parse(base), 41)).toEqual(['Italy', 'MTB', 'Trail bike', '38 km', '1,700 m up', 'Val di Susa', 'June 2026', '41 photos']);
    expect(heroMeta(tripSchema.parse({ ...base, activity: 'hike', bike: undefined }), 1)).toEqual(['Italy', 'Hike', '38 km', '1,700 m up', 'Val di Susa', 'June 2026', '1 photo']);
  });
});

describe('grouping', () => {
  const t = (id: string, date: string, activity = 'hike') => ({ id, data: { date: new Date(date), activity } }) as any;
  const list = [t('c', '2026-09-01'), t('b', '2026-03-01', 'ride'), t('a', '2025-11-01'), t('z', '2025-02-01', 'ride')];
  it('groupByYear keeps the order and splits on the year', () => {
    expect(groupByYear(list).map((g) => [g.year, g.trips.map((x: any) => x.id)])).toEqual([[2026, ['c', 'b']], [2025, ['a', 'z']]]);
  });
  it('moreTrips: same activity first, never itself, then the rest, capped', () => {
    expect(moreTrips(list, 'c', 4).map((x) => x.id)).toEqual(['a', 'b', 'z']);
    expect(moreTrips(list, 'b', 1).map((x) => x.id)).toEqual(['z']);
  });
});
```

(`heroMeta` writes `1 photo` for one photo and `n photos` otherwise.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/outdoors.test.ts`
Expected: FAIL, module `../src/lib/outdoors` not found.

- [ ] **Step 3: Create `src/lib/outdoors.ts`** with the exports listed in Interfaces. Numbers through `new Intl.NumberFormat('en-US')`; `groupByYear` by `date.getFullYear()`.

- [ ] **Step 4: Register the collection** in `src/content.config.ts`: `const outdoors = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/outdoors' }), schema: tripSchema });` and add it to `collections`. Create the two `.gitkeep` files. Add `getTrips`/`getTripsBy` to `src/lib/collections.ts` next to `getGalleries`. Add `  - slug: croatia\n    name: Croatia` to the countries in `src/data/taxonomies.yaml`, alphabetical (after `belgium`).

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run tests/outdoors.test.ts && npm run check`
Expected: all pass; `0 errors`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/outdoors.ts src/content.config.ts src/lib/collections.ts src/data/taxonomies.yaml src/content/outdoors tests/outdoors.test.ts
git commit -m "feat(outdoors): the trips collection, its schema and helpers"
```

---

### Task 2: GPX parsing, drawing and sanitising

**Files:**
- Create: `src/lib/gpx.ts`, `tests/fixtures/track.gpx`
- Test: `tests/gpx.test.ts`

**Interfaces:**
- Produces, in `src/lib/gpx.ts` (pure, no Astro, no XML library: regular expressions over `<trkpt>` are enough for GPX 1.1):
  - `interface TrackPoint { lat: number; lon: number; ele?: number }`
  - `parseGpx(xml: string): TrackPoint[]` → every `<trkpt lat lon>` in document order across all `<trkseg>`, with `<ele>` when present; `<wpt>` and `<rtept>` ignored.
  - `simplifyPoints(points: readonly TrackPoint[], max = 400): TrackPoint[]` → the same points when `points.length <= max`, else every nth keeping the first and last.
  - `distanceKm(a: TrackPoint, b: TrackPoint): number` (haversine, Earth radius 6371 km).
  - `routeShape(points: readonly TrackPoint[], width = 400, height = 300, pad = 8): { d: string; viewBox: string }` → an SVG path `M x y L x y …` of the points projected equirectangularly (x = lon · cos(mean lat), y = −lat), scaled uniformly to fit `width − 2·pad` by `height − 2·pad`, centred; `viewBox` is `0 0 ${width} ${height}`; coordinates rounded to one decimal.
  - `elevationProfile(points: readonly TrackPoint[], width = 400, height = 120, pad = 8): { d: string; viewBox: string; minEle: number; maxEle: number; totalKm: number } | undefined` → undefined when fewer than two points carry `ele`; else x = cumulative distance scaled to the width, y = elevation scaled between min and max (max at the top), same rounding.
  - `sanitizeGpx(xml: string, name: string): string` → a new GPX 1.1 document containing only `<trk><name>{name escaped}</name><trkseg>` and one `<trkpt lat="…" lon="…">` per point, with `<ele>` when present; no metadata, time, author, extensions or waypoints; `creator="olegs.be"`. Throws `Error('no track points')` on an empty parse.

- [ ] **Step 1: Write the fixture** `tests/fixtures/track.gpx`: a GPX 1.1 file with `<metadata><author><name>Oleg</name></author><time>2026-06-14T08:01:00Z</time></metadata>`, one `<wpt lat="45.1000" lon="7.0000"><name>Parking</name></wpt>`, and one `<trk>` with two `<trkseg>` holding six `<trkpt>` in all, each with `<ele>`, `<time>` and `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>120</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>`. Latitudes 45.10 to 45.14, longitudes 7.00 to 7.05, elevations 1200, 1350, 1500, 1650, 1800, 2176.

- [ ] **Step 2: Write the failing tests** in `tests/gpx.test.ts`

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { distanceKm, elevationProfile, parseGpx, routeShape, sanitizeGpx, simplifyPoints } from '../src/lib/gpx';

const xml = readFileSync('tests/fixtures/track.gpx', 'utf8');

describe('parseGpx', () => {
  it('reads every track point across segments, with elevation, and ignores waypoints', () => {
    const pts = parseGpx(xml);
    expect(pts).toHaveLength(6);
    expect(pts[0]).toEqual({ lat: 45.1, lon: 7, ele: 1200 });
    expect(pts[5].ele).toBe(2176);
    expect(pts.some((p) => p.lat === 45.1 && p.lon === 7 && p.ele === undefined)).toBe(false);
  });
  it('points without <ele> have no ele', () => { expect(parseGpx('<gpx><trk><trkseg><trkpt lat="1" lon="2"></trkpt></trkseg></trk></gpx>')).toEqual([{ lat: 1, lon: 2 }]); });
});

describe('geometry', () => {
  it('distanceKm: about 111 km per degree of latitude', () => { expect(distanceKm({ lat: 45, lon: 7 }, { lat: 46, lon: 7 })).toBeCloseTo(111.2, 0); });
  it('simplifyPoints keeps first and last and at most max points', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => ({ lat: i, lon: 0 }));
    const s = simplifyPoints(pts, 400);
    expect(s.length).toBeLessThanOrEqual(400); expect(s[0]).toEqual(pts[0]); expect(s.at(-1)).toEqual(pts.at(-1));
    expect(simplifyPoints(pts.slice(0, 10), 400)).toHaveLength(10);
  });
  it('routeShape fits the box and starts with M', () => {
    const { d, viewBox } = routeShape(parseGpx(xml));
    expect(viewBox).toBe('0 0 400 300');
    expect(d).toMatch(/^M [\d.]+ [\d.]+( L [\d.]+ [\d.]+){5}$/);
    for (const [, x, y] of d.matchAll(/[ML] ([\d.]+) ([\d.]+)/g)) { expect(Number(x)).toBeGreaterThanOrEqual(8); expect(Number(x)).toBeLessThanOrEqual(392); expect(Number(y)).toBeGreaterThanOrEqual(8); expect(Number(y)).toBeLessThanOrEqual(292); }
  });
  it('elevationProfile: min and max, total distance, undefined without elevation', () => {
    const p = elevationProfile(parseGpx(xml))!;
    expect(p.minEle).toBe(1200); expect(p.maxEle).toBe(2176); expect(p.totalKm).toBeGreaterThan(4); expect(p.viewBox).toBe('0 0 400 120');
    expect(elevationProfile([{ lat: 1, lon: 2 }, { lat: 1.1, lon: 2 }])).toBeUndefined();
  });
});

describe('sanitizeGpx', () => {
  it('keeps only lat, lon, ele and the name', () => {
    const out = sanitizeGpx(xml, 'Colle delle Finestre & back');
    expect(out).toContain('<name>Colle delle Finestre &amp; back</name>');
    expect(out.match(/<trkpt /g)).toHaveLength(6);
    expect(out).toContain('<ele>2176</ele>');
    for (const banned of ['<time', '<metadata', '<author', '<extensions', 'gpxtpx', '<wpt', 'Parking', 'Oleg']) expect(out).not.toContain(banned);
    expect(out).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<gpx version="1.1" creator="olegs.be" xmlns="http:\/\/www.topografix.com\/GPX\/1\/1">/);
  });
  it('round-trips through parseGpx and refuses an empty track', () => {
    expect(parseGpx(sanitizeGpx(xml, 'x'))).toEqual(parseGpx(xml));
    expect(() => sanitizeGpx('<gpx></gpx>', 'x')).toThrow('no track points');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/gpx.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `src/lib/gpx.ts`** per Interfaces. Parse with a global regex over `<trkpt\b[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>` (and the `lon`-before-`lat` order), `<ele>` from the inner text; escape `&`, `<`, `>` in the name.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/gpx.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gpx.ts tests/gpx.test.ts tests/fixtures/track.gpx
git commit -m "feat(outdoors): GPX parsing, route drawing and sanitised output"
```

---

### Task 3: Tracks on disk, the guard test and the GPX endpoint

**Files:**
- Create: `src/lib/tracks.ts`, `src/pages/outdoors/[slug].gpx.ts`
- Test: `tests/outdoors-content.test.ts`

**Interfaces:**
- Consumes: `sanitizeGpx` (Task 2); `getTrips`, `trackPath` (Task 1); `yaml` package (already a dependency) to read front matter in the test.
- Produces, in `src/lib/tracks.ts` (Node `fs`, build time only):
  - `TRACKS_DIR: string` → absolute path of `src/content/outdoors/tracks/` (via `fileURLToPath(new URL('../content/outdoors/tracks/', import.meta.url))`).
  - `readTrack(file: string): string` → the file's text; throws `Error(\`track ${file} not found in src/content/outdoors/tracks\`)` when missing.
  - `listTracks(): string[]` → `.gpx` file names in `TRACKS_DIR`, sorted.
- Produces: `GET /outdoors/<slug>.gpx` for every trip whose `track` is a string, body `sanitizeGpx(readTrack(track), title)`, header `Content-Type: application/gpx+xml; charset=utf-8`.

- [ ] **Step 1: Write the failing guard test** in `tests/outdoors-content.test.ts` (reads the content folder directly, so it also runs with zero trips)

```ts
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
  test('no .gpx outside tracks/', () => {
    expect(readdirSync(DIR).filter((f) => f.endsWith('.gpx'))).toEqual([]);
  });
  test('readTrack names a missing file', () => { expect(() => readTrack('nope.gpx')).toThrow('track nope.gpx not found'); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/outdoors-content.test.ts`
Expected: FAIL, `../src/lib/tracks` not found.

- [ ] **Step 3: Implement `src/lib/tracks.ts`** per Interfaces (`TRACKS_DIR` ends with a slash).

- [ ] **Step 4: Implement the endpoint** `src/pages/outdoors/[slug].gpx.ts`:

```ts
export const getStaticPaths = (async () => (await getTrips()).filter((t) => t.data.track !== false).map((t) => ({ params: { slug: t.id }, props: { trip: t } }))) satisfies GetStaticPaths;
export const GET: APIRoute<{ trip: Trip }> = ({ props }) => { … };
```

- [ ] **Step 5: Run the tests, the type check and a build**

Run: `npx vitest run tests/outdoors-content.test.ts && npm run check && npm run build`
Expected: PASS; `0 errors`; the build succeeds with no `/outdoors/*.gpx` pages (there are no trips yet).

- [ ] **Step 6: Commit**

```bash
git add src/lib/tracks.ts 'src/pages/outdoors/[slug].gpx.ts' tests/outdoors-content.test.ts
git commit -m "feat(outdoors): tracks folder guard and the sanitised GPX endpoint"
```

---

### Task 4: A shared `Hero`, and the trip card and grid

**Files:**
- Create: `src/components/Hero.astro`, `src/components/TripCard.astro`, `src/components/TripGrid.astro`
- Modify: `src/components/GalleryHero.astro` (becomes a wrapper around `Hero`)
- Test: `tests/outdoors-components.test.ts`; existing `tests/build-gallery.test.ts` must keep passing unchanged.

**Interfaces:**
- Produces `Hero.astro` with props `{ title: string; cover: string; width?: number; height?: number; coverAlt: string; darkHeader: boolean }` and a default slot rendered inside `<p class="meta mono">`. Its markup and CSS are today's `GalleryHero.astro` with the meta items replaced by the slot: `<header class="hero" data-dark-header?>`, the `Pic` (sizes `100vw`, maxWidth 1600, eager, high priority), `<div class="caption wrap"><h1 class="title" data-pagefind-meta="title">…</h1><p class="meta mono"><slot /></p></div>`.
- `GalleryHero.astro` keeps its `{ gallery: Gallery }` prop and renders `<Hero …>` with the same four meta items it has today (country link, genre link, month, photo count), separated by `{' '}` as now.
- Produces `TripCard.astro` with props `{ trip: Trip }`: `<a class="trip-card" href={tripPath(trip)}>` + `Pic` (cover, `alt=""`, same `sizes` and `maxWidth={960}` as `GalleryCard`) + `<span class="caption mono"><span class="title">{title}</span><span class="meta">{cardMeta(trip.data)}</span></span>`; CSS copied from `GalleryCard` with the class names renamed.
- Produces `TripGrid.astro` with props `{ trips: Trip[]; embedded?: boolean }`: the `GalleryGrid` markup and CSS with `TripCard`, empty state text `No trips yet.`.

- [ ] **Step 1: Write the failing component tests** in `tests/outdoors-components.test.ts`

```ts
import { describe, expect, test } from 'vitest';
import { render } from './helpers/render';
import Hero from '../src/components/Hero.astro';
import TripCard from '../src/components/TripCard.astro';
import TripGrid from '../src/components/TripGrid.astro';

const trip = { id: 'colle-delle-finestre', data: { title: 'Colle delle Finestre', date: new Date('2026-06-14'), activity: 'ride', bike: 'trail', distance: 38, climb: 1700, area: 'Val di Susa', country: 'italy', track: 'colle-delle-finestre.gpx', cover: '2026/06/a.jpg', coverWidth: 1620, coverHeight: 1080, darkHeader: false, photos: [{ src: '2026/06/a.jpg', width: 1620, height: 1080, alt: 'Larches' }] } } as any;

describe('Hero', () => {
  test('cover, title with the search meta, and the slot inside the meta line', async () => {
    const html = await render(Hero, { props: { title: 'T', cover: '2026/06/a.jpg', width: 1620, height: 1080, coverAlt: '', darkHeader: true }, slots: { default: '<span>Italy</span> <span>Hike</span>' } });
    expect(html).toMatch(/<header class="hero"[^>]*data-dark-header/);
    expect(html).toMatch(/<h1 class="title"[^>]*data-pagefind-meta="title"[^>]*>T<\/h1>/);
    expect(html).toMatch(/<p class="meta mono"[^>]*><span>Italy<\/span> <span>Hike<\/span><\/p>/);
    expect(html).toContain('fetchpriority="high"');
  });
});

describe('TripCard and TripGrid', () => {
  test('card: link, cover variants, title and meta', async () => {
    const html = await render(TripCard, { props: { trip } });
    expect(html).toMatch(/<a class="trip-card" href="\/outdoors\/colle-delle-finestre\/"/);
    expect(html).toContain('a-480.webp 480w');
    expect(html).toContain('Colle delle Finestre');
    expect(html).toContain('MTB · Trail · 38 km · 1,700 m');
  });
  test('grid lists cards; empty state', async () => {
    expect((await render(TripGrid, { props: { trips: [trip, trip] } })).match(/class="trip-card"/g)).toHaveLength(2);
    expect(await render(TripGrid, { props: { trips: [] } })).toContain('No trips yet.');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/outdoors-components.test.ts`
Expected: FAIL, components not found.

- [ ] **Step 3: Create `Hero.astro`** by moving `GalleryHero.astro`'s markup and `<style>` into it, with the slot; rewrite `GalleryHero.astro` as the wrapper described in Interfaces.

- [ ] **Step 4: Create `TripCard.astro` and `TripGrid.astro`** per Interfaces.

- [ ] **Step 5: Run the new tests and the gallery build tests**

Run: `npx vitest run tests/outdoors-components.test.ts tests/build-gallery.test.ts tests/layout.test.ts`
Expected: PASS, including every existing hero assertion (title, meta links, `data-dark-header`, 70 KB budget).

- [ ] **Step 6: Commit**

```bash
git add src/components/Hero.astro src/components/GalleryHero.astro src/components/TripCard.astro src/components/TripGrid.astro tests/outdoors-components.test.ts
git commit -m "feat(outdoors): shared Hero, trip card and grid"
```

---

### Task 5: The route block

**Files:**
- Create: `src/components/RouteBlock.astro`
- Test: add to `tests/outdoors-components.test.ts`

**Interfaces:**
- Consumes: `parseGpx`, `simplifyPoints`, `routeShape`, `elevationProfile` (Task 2); `formatKm`, `formatClimb` (Task 1).
- Produces `RouteBlock.astro` with props `{ xml: string; distance: number; climb: number; downloadHref: string; links?: { label: string; url: string }[] }` (pure: the page reads the file). Renders:
  - `<section class="route wrap" aria-labelledby="route">` with `<h2 id="route" class="mono">Route</h2>`;
  - the shape: `<svg class="shape" viewBox="0 0 400 300" role="img" aria-label="Shape of the route">` with `<path d="…" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">`;
  - the profile, only when `elevationProfile` returns a value: `<svg class="profile" viewBox="0 0 400 120" role="img" aria-label="Elevation profile, from {min} m to {max} m">` with the path, and under it a mono line `{formatKm(distance)} · {formatClimb(climb)}` (the front-matter numbers, not the GPX's);
  - without a profile the same mono line follows the shape;
  - `<p class="links mono"><a href={downloadHref} download>Download GPX ↗</a>{links.map((l) => <a href={l.url} rel="noopener">{l.label} ↗</a>)}</p>`.
  - Points are `simplifyPoints(parseGpx(xml))` before drawing. Styling: the SVGs side by side from 720 px (shape 1fr, profile 2fr), stacked below; `color: var(--fg)`, the profile path `fill: rgb(236 236 236 / 0.08)` closed to the baseline is left to the builder's taste.

- [ ] **Step 1: Write the failing tests** (append to `tests/outdoors-components.test.ts`)

```ts
import { readFileSync } from 'node:fs';
import RouteBlock from '../src/components/RouteBlock.astro';
const xml = readFileSync('tests/fixtures/track.gpx', 'utf8');

describe('RouteBlock', () => {
  test('shape, profile, the front-matter numbers and the download', async () => {
    const html = await render(RouteBlock, { props: { xml, distance: 38, climb: 1700, downloadHref: '/outdoors/x.gpx', links: [{ label: 'Komoot', url: 'https://www.komoot.com/tour/1' }] } });
    expect(html).toMatch(/<svg class="shape"[^>]*viewBox="0 0 400 300"[^>]*aria-label="Shape of the route"/);
    expect(html).toMatch(/<svg class="profile"[^>]*aria-label="Elevation profile, from 1,200 m to 2,176 m"/);
    expect(html).toContain('38 km · 1,700 m up');
    expect(html).toMatch(/<a href="\/outdoors\/x.gpx" download[^>]*>Download GPX/);
    expect(html).toMatch(/<a href="https:\/\/www.komoot.com\/tour\/1" rel="noopener"[^>]*>Komoot/);
    expect(html).not.toContain('Parking');
  });
  test('without elevation there is no profile and nothing else changes', async () => {
    const flat = '<gpx><trk><trkseg><trkpt lat="45.1" lon="7"></trkpt><trkpt lat="45.2" lon="7.1"></trkpt></trkseg></trk></gpx>';
    const html = await render(RouteBlock, { props: { xml: flat, distance: 9, climb: 0, downloadHref: '/outdoors/y.gpx' } });
    expect(html).toContain('class="shape"'); expect(html).not.toContain('class="profile"'); expect(html).toContain('9 km · 0 m up');
  });
});
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/outdoors-components.test.ts`, expected FAIL on `RouteBlock`.

- [ ] **Step 3: Implement `RouteBlock.astro`** per Interfaces.

- [ ] **Step 4: Run the tests** — expected PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RouteBlock.astro tests/outdoors-components.test.ts
git commit -m "feat(outdoors): route block with shape, elevation profile and GPX download"
```

---

### Task 6: The index pages and the nav

**Files:**
- Create: `src/components/OutdoorsIndex.astro`, `src/pages/outdoors/index.astro`, `src/pages/outdoors/hikes/index.astro`, `src/pages/outdoors/rides/index.astro`
- Modify: `src/lib/nav.ts`, `src/components/Nav.astro` only if the markup needs it (it should not)
- Test: `tests/build-outdoors.test.ts`; update `tests/layout.test.ts` if a nav assertion pins the old order

**Interfaces:**
- Consumes: `getTrips`, `getTripsBy`, `groupByYear` (Task 1); `TripGrid` (Task 4); `SectionLabel`, `Base`.
- Produces `OutdoorsIndex.astro` with props `{ trips: Trip[]; filter: 'all' | 'hikes' | 'rides' }`: a header in the `PhotosHeader` style (reuse its CSS by copying; a shared header component is not required) with `<h1 class="heading">Outdoors</h1>`, the lead paragraph, and a `<nav aria-label="Activities"><ul class="filters mono">` with All `/outdoors/`, Hikes `/outdoors/hikes/`, Rides `/outdoors/rides/` and `aria-current="page"` on the active one; then, for each `groupByYear` group, `<section aria-labelledby="year-{year}"><SectionLabel id="year-{year}" title={String(year)} /><TripGrid trips={group.trips} embedded /></section>` inside `<div class="sections">` (padding-bottom 32px, as the Photos page); with no trips, a single `<TripGrid trips={[]} />`.
- The lead, verbatim: `Hikes and mountain-bike rides, mostly in the Alps: time in the woods and on the trails for the landscape and the quiet, a kind of shinrin-yoku on foot or on two wheels. The numbers only describe the day.`
- Pages: `/outdoors/` → `<Base title="Outdoors — olegs" description={lead}>` with `filter="all"`; `/outdoors/hikes/` title `Hikes — Outdoors — olegs`, trips `getTripsBy('hike')`; `/outdoors/rides/` title `Rides — Outdoors — olegs`, `getTripsBy('ride')`.
- `src/lib/nav.ts`: `Section` gains `'outdoors'`; `NAV_LINKS` becomes About, Photos, Outdoors (`/outdoors/`), Blog, Search in that order; `sectionFor` returns `'outdoors'` for paths starting with `/outdoors/`.

- [ ] **Step 1: Write the failing build tests** in `tests/build-outdoors.test.ts`

```ts
import { describe, expect, test } from 'vitest';
import { count, exists, read } from './helpers/dist';

describe('outdoors index', () => {
  test('heading, lead, filter row and the empty state (no trips yet)', () => {
    const html = read('dist/outdoors/index.html');
    expect(html).toContain('<title>Outdoors — olegs</title>');
    expect(html).toMatch(/<h1[^>]*>Outdoors<\/h1>/);
    expect(html).toContain('a kind of shinrin-yoku on foot or on two wheels');
    expect(html).toMatch(/<a href="\/outdoors\/" aria-current="page"[^>]*>All<\/a>/);
    expect(html).toContain('href="/outdoors/hikes/"'); expect(html).toContain('href="/outdoors/rides/"');
    expect(html).toContain('No trips yet.');
  });
  test('hikes and rides pages exist with their filter active', () => {
    expect(read('dist/outdoors/hikes/index.html')).toMatch(/<a href="\/outdoors\/hikes\/" aria-current="page"[^>]*>Hikes<\/a>/);
    expect(read('dist/outdoors/rides/index.html')).toMatch(/<a href="\/outdoors\/rides\/" aria-current="page"[^>]*>Rides<\/a>/);
    expect(read('dist/outdoors/rides/index.html')).toContain('<title>Rides — Outdoors — olegs</title>');
  });
});

describe('nav', () => {
  test('order About, Photos, Outdoors, Blog, Search; Outdoors active on its pages', () => {
    const html = read('dist/outdoors/index.html');
    const hrefs = [...html.matchAll(/<a href="(\/[a-z]*\/)"[^>]*>(About|Photos|Outdoors|Blog|Search)<\/a>/g)].map((m) => m[1]);
    expect(hrefs.slice(0, 5)).toEqual(['/about/', '/photos/', '/outdoors/', '/blog/', '/search/']);
    expect(html).toMatch(/<a href="\/outdoors\/" aria-current="page"[^>]*>Outdoors<\/a>/);
    expect(count(html, 'aria-current="page"')).toBe(2); // nav + filter
  });
});
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/build-outdoors.test.ts`; expected FAIL (no `dist/outdoors/`).

- [ ] **Step 3: Implement** `nav.ts`, `OutdoorsIndex.astro` and the three pages per Interfaces.

- [ ] **Step 4: Run the build-dependent tests** — `npx vitest run tests/build-outdoors.test.ts tests/layout.test.ts tests/build-home.test.ts tests/build-photos.test.ts`; expected PASS. If a `layout.test.ts` assertion pins the old nav order, update it to the new one.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav.ts src/components/OutdoorsIndex.astro src/pages/outdoors tests/build-outdoors.test.ts tests/layout.test.ts
git commit -m "feat(outdoors): index pages by year with activity filters; Outdoors in the nav"
```

---

### Task 7: The trip page

**Files:**
- Create: `src/pages/outdoors/[slug].astro`
- Test: component-level only until the first trip exists (`tests/outdoors-components.test.ts` already covers the pieces); add a build test skeleton `test.skip` in `tests/build-outdoors.test.ts` to be enabled with the first trip.

**Interfaces:**
- Consumes: `getTrips`, `tripPath`, `trackPath`, `heroMeta`, `moreTrips`, `activityLabel` (Task 1); `neighbours`, `coverSize` (`src/lib/paths.ts`); `readTrack` (Task 3); `Hero`, `TripGrid` (Task 4); `RouteBlock` (Task 5); `JustifiedGrid`, `Lightbox`, `SectionLabel`, `Base`; `largestVariantUrl`, `isoDate`.
- Produces the page at `/outdoors/<slug>/`:
  - `getStaticPaths`: one path per trip with props `{ trip, prev, next, more: moreTrips(trips, trip.id) }` (`neighbours` over the date-descending list, as galleries).
  - `<Base title={`${title} — Outdoors — olegs`} description={seoDescription ?? `${activityLabel(activity)} in ${area}: ${formatKm(distance)}, ${formatClimb(climb)}.`} ogImage={largestVariantUrl(cover, min(1600, coverSize))} overlayNav search={{ type: 'outdoors', meta: { date: isoDate(date), image: largestVariantUrl(cover, min(480, coverSize)), activity: activityLabel(activity) } }}>`
  - `<Hero title cover width height coverAlt darkHeader>` with the `heroMeta(trip.data, photos.length)` items as `<span>` separated by `{' '}` (plain text, no links); the cover is decorative (`coverAlt=""`) when the grid repeats it, else the title, as galleries do.
  - The body (`render(trip)`) in a `<div class="body wrap">` with the gallery page's `.body` styles (copy them).
  - `{track !== false && <RouteBlock xml={readTrack(track)} distance climb downloadHref={trackPath(trip)} links />}`
  - `<JustifiedGrid photos />`, the pager (`<nav class="pager wrap mono" aria-label="More trips">`, same markup as galleries with "Older trip" / "Newer trip"), then `{more.length > 0 && <section class="related" aria-labelledby="more"><SectionLabel id="more" title={activity === 'hike' ? 'More hikes' : 'More rides'} href={activity === 'hike' ? '/outdoors/hikes/' : '/outdoors/rides/'} link={activity === 'hike' ? 'All hikes' : 'All rides'} /><TripGrid trips={more} /></section>}`, then `<Lightbox />`.

- [ ] **Step 1: Add the skipped build test** to `tests/build-outdoors.test.ts`, to be enabled with the first trip:

```ts
describe('trip page', () => {
  test.skip('hero meta, route block, photos, pager and more row (enable with the first trip)', () => {
    const html = read('dist/outdoors/<first-slug>/index.html');
    expect(html).toMatch(/<p class="meta mono"[^>]*><span>Italy<\/span> <span>(Hike|MTB)<\/span>/);
    expect(html).toMatch(/data-pagefind-filter="type:outdoors"/);
    expect(html).toContain('data-meta-activity=');
    expect(html).toContain('class="ph"');
  });
});
```

- [ ] **Step 2: Implement `src/pages/outdoors/[slug].astro`** per Interfaces.

- [ ] **Step 3: Type check and build**

Run: `npm run check && npm run build`
Expected: `0 errors`; the build succeeds (the page has no paths yet).

- [ ] **Step 4: Commit**

```bash
git add 'src/pages/outdoors/[slug].astro' tests/build-outdoors.test.ts
git commit -m "feat(outdoors): the trip page with hero, story, route block, photos and more trips"
```

---

### Task 8: Search, feed, home, About, Blog lead and the Photos country pages

**Files:**
- Modify: `src/pages/search.astro` (GROUPS and `item()`), `src/pages/feed.xml.ts`, `src/pages/index.astro`, `src/content/pages/about.md`, `src/pages/blog/index.astro`, `src/pages/photos/country/[slug].astro`
- Test: `tests/build-search.test.ts`, `tests/build-blog.test.ts` (feed), `tests/build-home.test.ts`, `tests/build-photos.test.ts`

**Interfaces:**
- Consumes: `getTrips`, `tripPath`, `activityLabel` (Task 1); `TripGrid` (Task 4).
- Search: `GROUPS` becomes `[gallery 'Galleries', outdoors 'Outdoors', post 'Posts', other 'Other']`; `item()` renders `outdoors` like `gallery` (cover + title + meta line) with the meta `[data.meta.activity, monthYear(data.meta.date)]`; the `.item.gallery` CSS applies to `.item.outdoors` too.
- Feed: trip items `{ title, pubDate: date, description: firstParagraph(body) || `${activityLabel(activity)} in ${area}.`, link: tripPath(trip), categories: ['Outdoors', activityLabel(activity)], content: cover image + description }` merged and sorted with the others. `FEED_TITLE` unchanged.
- Home: `links` becomes `[Outdoors '/outdoors/', Events, Books, Quotes, Email]`; between the Photos and Blog sections, `{trips.length > 0 && (<section aria-labelledby="home-outdoors"><SectionLabel id="home-outdoors" title="Outdoors" href="/outdoors/" link={`All ${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}`} /><TripGrid trips={trips.slice(0, 4)} /></section>)}`.
- About: replace the first three paragraphs with, verbatim (curly apostrophes as the file uses):

  ```
  Hi, I’m Oleg. I work in tech as a Product Manager, with a background in front-end engineering, and I like building digital products that are clear, useful and respectful of people’s privacy.

  Away from the screen I’m drawn to offline things: hiking and mountain biking in the Alps, photographing landscapes, abandoned places and the cities I travel to, a record on the turntable, a good book. This site is where those pictures and stories end up.

  I enjoy being part of communities where people share ideas, learn from each other and make useful things together: I sometimes attend [tech events](/events/), contribute to open source, and go to local Meetups, [Creative Mornings Turin](https://creativemornings.com/cities/trn) and other tech and design events in Turin. Elsewhere on this site: [photos](/photos/), [trips](/outdoors/), [books](/books/) and [quotes](/quotes/).
  ```

  "How May I Help You?" and what follows stay as they are.
- Blog lead: `Appunti su web performance, meetup e prodotto, dal 2016. The posts are in Italian.`
- Photos country pages: `getStaticPaths` builds only countries with at least one gallery (`getGalleries()` once, `countries.filter((c) => galleries.some((g) => g.data.country === c.slug))`).

- [ ] **Step 1: Update the tests first**
  - `tests/build-search.test.ts`: the search page's module script contains `Outdoors` as a group label: `expect(read(\`dist${src}\`)).toContain('Outdoors')` where `src` is the `<script type="module" src>` of `dist/search/index.html` (follow the pattern used for the lightbox entry in `tests/build-gallery.test.ts`).
  - `tests/build-home.test.ts` "home has intro…": the intro text now also contains `drawn to offline things`; the link row contains `href="/outdoors/"`; `not.toContain('Creative Mornings')` still holds (third paragraph); add `expect(html).not.toContain('id="home-outdoors"')` (no trips yet).
  - `tests/build-home.test.ts` `'title, description, link row and section links'`: `<a href="/events/">tech events</a>` moves out of the first two paragraphs, so drop that assertion and instead assert `dist/about/index.html` contains it.
  - `tests/build-blog.test.ts`: the blog index contains `The posts are in Italian.`
  - `tests/build-photos.test.ts`: replace `'country with galleries builds; every taxonomy slug has a page'` with: `italy` and `russia` exist, `usa` and `croatia` do **not** (`exists('dist/photos/country/usa/index.html')` is false); delete `'a country without galleries renders the empty state'`.

- [ ] **Step 2: Run them to verify the new assertions fail** — `npx vitest run tests/build-search.test.ts tests/build-home.test.ts tests/build-blog.test.ts tests/build-photos.test.ts`; expected FAIL on the new assertions only.

- [ ] **Step 3: Implement** the six modifications per Interfaces.

- [ ] **Step 4: Run the full suite and the type check**

Run: `npm test && npm run check`
Expected: all pass; `0 errors`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/search.astro src/pages/feed.xml.ts src/pages/index.astro src/content/pages/about.md src/pages/blog/index.astro 'src/pages/photos/country/[slug].astro' tests/build-search.test.ts tests/build-home.test.ts tests/build-blog.test.ts tests/build-photos.test.ts
git commit -m "feat(outdoors): search group, feed items, home row and links, About intro, Blog lead; country pages only with galleries"
```

---

### Task 9: Pipeline, README and the procedure

**Files:**
- Modify: `scripts/photos/scaffold.ts`, `scripts/photos.ts`, `scripts/thumbs.ts`, `README.md`
- Create: `/Users/olegs/.claude/projects/-Users-olegs-Projects-olegs-be/memory/adding-a-trip.md` and its line in `MEMORY.md` (outside the repo)
- Test: `tests/scaffold.test.ts` if one exists for `galleryFrontmatter`, else add `tests/outdoors-scaffold.test.ts`

**Interfaces:**
- `scripts/photos/scaffold.ts`: `scaffoldGallery(opts)` gains `kind?: 'gallery' | 'outdoors'` (default `'gallery'`). With `'outdoors'` it writes the front matter from a new `tripFrontmatter(doc: TripDoc): string` where `TripDoc = { slug, title, date, activity: 'hike', distance: 0, climb: 0, area: '', country: 'italy', track: undefined, cover, darkHeader: false, photos }`; `track:` is emitted as a bare key with no value, so the build fails until it is set. Field order: title, date, activity, bike (commented out: `# bike: xc | trail`), distance, climb, area, country, track, cover, coverWidth, coverHeight, darkHeader, photos.
- `scripts/photos.ts`: a boolean flag `--outdoors`; with it, `--new` uses `OUTDOORS_DIR = src/content/outdoors` and `kind: 'outdoors'`, and logs `wrote <path>: set activity, bike, distance, climb, area, country and track (a .gpx in src/content/outdoors/tracks, or false for a discreet trip), then write the story`. The usage line documents it.
- `scripts/thumbs.ts`: resolves the slug in `src/content/galleries/` first, then `src/content/outdoors/`.
- README: an "Add a trip" section after "Add a gallery" with the command, the front-matter fields, the `track` rule, where shareable GPX files go (`src/content/outdoors/tracks/`, public repo), where a discreet export stays (`olegs-be-data/`, never the repo), and the editorial rules (English, first person; ImageOptim before upload; no start, parking or access road for a discreet trip; research sources Komoot, Wikiloc, Trailforks, hut and club sites).
- Memory `adding-a-trip.md` (type `feedback`): what Oleg hands over (photos through ImageOptim in shooting order, activity and bike, month, area, distance and climb, GPX or "discreet", a few notes), what the assistant does (scaffold with `--outdoors --date`, research the place and route on Komoot, Wikiloc, Trailforks for rides, hut and club sites and blogs, write the story and an alt for every photo, pick the cover, set `track`, run tests, check in the preview, commit), and the discreet rules (date on the 1st, no links, no locating detail in the text).

- [ ] **Step 1: Write the failing test** for `tripFrontmatter`:

```ts
import { expect, test } from 'vitest';
import { tripFrontmatter } from '../scripts/photos/scaffold';
test('tripFrontmatter leaves track undecided and lists the photos', () => {
  const fm = tripFrontmatter({ slug: 'x', title: 'X', date: '2026-06-14T12:00:00', activity: 'hike', distance: 0, climb: 0, area: '', country: 'italy', track: undefined, cover: '2026/06/a.jpg', darkHeader: false, photos: [{ src: '2026/06/a.jpg', width: 1620, height: 1080 }] });
  expect(fm).toMatch(/^---\ntitle: X\n/);
  expect(fm).toContain('\ntrack:\n');
  expect(fm).toContain('# bike: xc | trail');
  expect(fm).toContain('  - src: 2026/06/a.jpg\n    width: 1620\n    height: 1080\n');
});
```

- [ ] **Step 2: Run it to verify it fails** — expected FAIL, `tripFrontmatter` is not exported.

- [ ] **Step 3: Implement** the scaffold, the flag, the thumbs lookup, the README section and the memory file.

- [ ] **Step 4: Run the test and a dry scaffold** — `npx vitest run tests/outdoors-scaffold.test.ts`; then `npm run photos -- --new` with no slug to see the usage mentions `--outdoors`. Expected: PASS; usage printed.

- [ ] **Step 5: Commit**

```bash
git add scripts/photos/scaffold.ts scripts/photos.ts scripts/thumbs.ts README.md tests/outdoors-scaffold.test.ts
git commit -m "feat(outdoors): --outdoors scaffold, thumbs for trips, README procedure"
```

---

### Task 10: Preview check, whole-branch review and the held PR

**Files:** none new.

- [ ] **Step 1: Preview** with `preview_start` (`npm run build` first): `/outdoors/`, `/outdoors/hikes/`, the home page (nav order, link row, intro text, no Outdoors row), `/about/`, `/blog/` (lead), `/search/` (type "Outdoors" group appears only with results, so just no console errors), `/photos/country/usa/` → 404. Screenshots at desktop and phone width for `/outdoors/` and the home page.

- [ ] **Step 2: Run everything** — `npm test && npm run check`; expected all green.

- [ ] **Step 3: Push the branch and open the PR**

```bash
git push -u origin outdoors
gh pr create --title "feat: Outdoors section (hold until the first trip)" --body-file - <<'EOF'
Builds the Outdoors section from docs/superpowers/specs/2026-10-23-outdoors-section-design.md: the `outdoors` collection, index pages by year with Hikes/Rides filters, the trip page with a sanitised-GPX route block, Outdoors in the nav, home, search and feed, the About intro rewrite, the Blog lead sentence, and `--outdoors` in the photo scaffold.

**Do not merge yet.** The first trip joins this branch when its photos exist; its page then gets the build test that is skipped in tests/build-outdoors.test.ts. Country pages under Photos are now built only for countries with galleries, so /photos/country/usa/ goes until a US gallery lands.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 4: Bind the PR** in the app (`get_status`, `bind_pr` if needed) and report: branch, PR link, what waits on the first trip.
