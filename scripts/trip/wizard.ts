// The questions behind `npm run trip`, kept apart from the terminal so a test can script the answers.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseGpx, type PrivacyZone } from '../../src/lib/gpx';
import type { ObjectStore } from '../photos/r2';
import { scaffoldGallery, type TripLink, type TripValues } from '../photos/scaffold';
import { writeTrack, zoneFromEnv } from '../track';
import { activityFromSport, type KomootTour } from './komoot';
import { orderTrips } from './order';

/** Asks one question and returns the answer; `multiline` answers end at an empty line. */
export type Ask = (question: string, opts?: { default?: string; multiline?: boolean }) => Promise<string>;

export interface WizardDeps {
  ask: Ask;
  say: (line: string) => void;
  store: ObjectStore;
  uploadsDir: string;
  /** `src/content/outdoors` */
  contentDir: string;
  /** `src/content/outdoors/tracks` */
  tracksDir: string;
  /** Where the notes for the story are kept (git-ignored drafts). */
  notesDir: string;
  /** Country slugs from taxonomies.yaml. */
  countries: readonly string[];
  /** Reads a public Komoot tour from its link, to prefill the answers; absent when offline. */
  komoot?: (url: string) => Promise<KomootTour>;
  /** Downloads the tour's photos into a fresh folder and returns it; absent when offline. */
  komootPhotos?: (tour: KomootTour) => Promise<string>;
  /** Shows a folder to the user (Finder on a Mac) so they can pick the cover; absent in tests. */
  reveal?: (dir: string) => void;
  /** Draws the contour layer behind a shared trip's route map from its committed track; returns the file written. */
  contours?: (track: string) => Promise<string>;
  /** The circle no track enters; PRIVACY_ZONE when left out. */
  privacyZone?: PrivacyZone | null;
}

export interface WizardResult {
  slug: string;
  /** The trip file. */
  path: string;
  /** The sanitised track, when the route is shared. */
  track?: string;
  /** The contour layer, when it was drawn. */
  contours?: string;
  /** The notes file for the story. */
  notes: string;
  photos: number;
  discreet: boolean;
}

export const RESERVED_SLUGS = new Set(['hikes', 'rides']);
const RASTER = /\.(jpe?g|png|webp)$/i;

/** `Colle delle Finestre` → `colle-delle-finestre`. */
export const slugify = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** A path as typed or dragged into a terminal: surrounding quotes and backslash-escaped spaces removed, `~` expanded. */
export const pathOf = (answer: string): string => {
  let p = answer.trim();
  if ((p.startsWith("'") && p.endsWith("'")) || (p.startsWith('"') && p.endsWith('"'))) p = p.slice(1, -1);
  p = p.replace(/\\ /g, ' ').trim();
  return resolve(p.replace(/^~(?=\/|$)/, process.env.HOME ?? '~'));
};

/** The area of the trip with the latest date in `contentDir`, as written there: the usual answer for the next trip. */
export function latestArea(contentDir: string): string | undefined {
  if (!existsSync(contentDir)) return undefined;
  const trips = readdirSync(contentDir).filter((f) => f.endsWith('.md')).map((f) => readFileSync(join(contentDir, f), 'utf8'));
  const field = (doc: string, name: string) => new RegExp(`^${name}: "?([^"\\n]+)"?$`, 'm').exec(doc)?.[1].trim();
  return trips
    .map((doc) => ({ date: field(doc, 'date') ?? '', area: field(doc, 'area') }))
    .filter((t) => t.area)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.area;
}

/** Asks until `parse` accepts the answer; a thrown Error is shown and the question repeats. */
async function until<T>(deps: Pick<WizardDeps, 'ask' | 'say'>, question: string, parse: (answer: string) => T | Promise<T>, opts?: { default?: string }): Promise<T> {
  for (;;) {
    const answer = await deps.ask(question, opts);
    try {
      return await parse(answer);
    } catch (e) {
      deps.say(`  ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

const yes = (s: string) => /^y(es)?$/i.test(s.trim());

const number = (s: string, what: string, { integer = false, min = 0 } = {}): number => {
  const n = Number(s.trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < min || (integer && !Number.isInteger(n))) throw new Error(`${what} must be a number${integer ? ' without decimals' : ''}${min > 0 ? ` above ${min - 1}` : ''}`);
  return n;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const yn = (b: boolean | undefined) => (b === undefined ? undefined : b ? 'y' : 'n');

/** The answers collected so far; a step leaves its field undefined until it is asked. */
interface Answers {
  folder?: { dir: string; photos: string[]; fromKomoot: boolean };
  activity?: 'hike' | 'ride';
  bike?: 'xc' | 'trail';
  title?: string;
  slug?: string;
  area?: string;
  country?: string;
  distance?: number;
  climb?: number;
  shared?: boolean;
  /** Shared, but starting about 1 km along the path from the real start, and the day on the 1st like a discreet trip. */
  approximateEnds?: boolean;
  gpx?: string;
  links?: TripLink[];
  /** The day as typed; a discreet trip publishes the 1st of that month instead. */
  date?: Date;
  cover?: number;
  darkHeader?: boolean;
  notes?: string;
}

/** One question: asked in order the first time, and again from the review with the current answer as default. */
interface Step {
  label: string;
  /** Whether the question makes sense with the other answers (the bike only for a ride, the GPX only when shared). */
  applies(): boolean;
  /** Whether it must be asked (again) before the trip can be created, e.g. after another answer changed. */
  missing(): boolean;
  ask(): Promise<void>;
  /** The answer as the review lists it. */
  show(): string;
}

/**
 * Runs the wizard: asks every question, then shows a review where any answer can be changed by its number,
 * then creates the trip, the track and the notes. Nothing is written before the review is confirmed.
 */
export async function runWizard(deps: WizardDeps): Promise<WizardResult> {
  const { ask, say } = deps;
  say('A new trip for Outdoors. Answers in brackets are defaults; press Enter to take them. A review at the end lets you change any answer.');

  let tour: KomootTour | undefined;
  if (deps.komoot) {
    tour = await until(deps, 'Komoot tour link, to prefill the numbers and offer its photos (empty to skip)', async (s) => {
      const url = s.trim();
      if (!url) return undefined;
      return deps.komoot!(url);
    }, { default: '' });
    if (tour) {
      say(`  Found: ${tour.name}, ${tour.sport}, ${tour.distanceKm} km, ${tour.climb} m up, ${tour.date}${tour.recorded ? '' : ' (a planned tour, not a recording)'}; ${tour.imagesTotal} photo${tour.imagesTotal === 1 ? '' : 's'}.`);
      say('  Each answer below is prefilled from it; press Enter to keep it or type another.');
    }
  }
  const sportActivity = tour && activityFromSport(tour.sport);

  const complete = Boolean(tour && tour.images.length && tour.images.length >= tour.imagesTotal);
  const fromKomoot = Boolean(complete && deps.komootPhotos);
  if (tour && tour.images.length && !complete) {
    say(`  Komoot lists only ${tour.images.length} of the ${tour.imagesTotal} photos without a login, so they are not offered.`);
    say('  Add KOMOOT_EMAIL and KOMOOT_PASSWORD to .env to take them all from Komoot, or give the folder of originals.');
  }
  const readFolder = (dir: string, komoot: boolean) => {
    if (!existsSync(dir)) throw new Error(`${dir} does not exist`);
    const photos = readdirSync(dir).filter((n) => !n.startsWith('.') && RASTER.test(n)).sort();
    if (!photos.length) throw new Error(`no JPEG, PNG or WebP files in ${dir}`);
    return { dir, photos, fromKomoot: komoot };
  };

  const a: Answers = {};
  const text = (what: string) => (s: string) => {
    const t = s.trim();
    if (!t) throw new Error(`the ${what} cannot be empty`);
    return t;
  };
  const withDefault = (...values: (string | undefined)[]) => {
    const value = values.find((v) => v !== undefined);
    return value === undefined ? undefined : { default: value };
  };

  const steps: Step[] = [
    {
      label: 'Photos',
      applies: () => true,
      missing: () => !a.folder,
      async ask() {
        const current = a.folder;
        const question = current
          ? 'Folder with the photos (Enter keeps the current ones)'
          : fromKomoot
            ? `Folder with the photos (JPEGs through ImageOptim), or Enter to take the ${tour!.images.length} photos from Komoot (served at up to 2048 px)`
            : 'Folder with the photos (JPEGs through ImageOptim, in shooting order)';
        a.folder = await until(deps, question, async (s) => {
          const answer = s.trim();
          if (!answer && current) return current;
          if (!answer && fromKomoot) {
            say('  Downloading from Komoot…');
            return readFolder(await deps.komootPhotos!(tour!), true);
          }
          if (!answer) throw new Error('give the folder with the photos');
          return readFolder(pathOf(answer), false);
        }, current || fromKomoot ? { default: '' } : undefined);
        say(`  ${a.folder.photos.length} photo${a.folder.photos.length === 1 ? '' : 's'} found.`);
      },
      show: () => `${a.folder!.photos.length} ${a.folder!.fromKomoot ? 'from Komoot' : `in ${a.folder!.dir}`}`,
    },
    {
      label: 'Activity',
      applies: () => true,
      missing: () => !a.activity,
      async ask() {
        a.activity = await until(deps, 'Hike or ride? (hike/ride)', (s): 'hike' | 'ride' => {
          const v = s.trim().toLowerCase();
          if (v === 'hike' || v === 'h') return 'hike';
          if (v === 'ride' || v === 'r' || v === 'mtb') return 'ride';
          throw new Error('answer hike or ride');
        }, withDefault(a.activity, sportActivity));
        if (a.activity === 'hike') a.bike = undefined;
      },
      show: () => a.activity!,
    },
    {
      label: 'Bike',
      applies: () => a.activity === 'ride',
      missing: () => !a.bike,
      async ask() {
        a.bike = await until(deps, 'Which bike? (xc/trail)', (s): 'xc' | 'trail' => {
          const b = s.trim().toLowerCase();
          if (b === 'xc' || b === 'trail') return b;
          if (b === 'enduro') return 'trail';
          throw new Error('answer xc or trail');
        }, withDefault(a.bike));
      },
      show: () => a.bike!,
    },
    {
      label: 'Title',
      applies: () => true,
      missing: () => !a.title,
      async ask() {
        a.title = await until(deps, 'Title (e.g. Colle delle Finestre)', text('title'), withDefault(a.title, tour?.name));
      },
      show: () => a.title!,
    },
    {
      label: 'Slug',
      applies: () => true,
      missing: () => !a.slug,
      async ask() {
        a.slug = await until(deps, 'Slug (the URL: /outdoors/<slug>/)', (s) => {
          const v = s.trim();
          if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v)) throw new Error('lowercase letters, digits and single dashes only');
          if (RESERVED_SLUGS.has(v)) throw new Error(`"${v}" is taken by the ${v} page; pick another`);
          if (existsSync(join(deps.contentDir, `${v}.md`))) throw new Error(`a trip called ${v} already exists`);
          return v;
        }, { default: a.slug ?? slugify(a.title!) });
      },
      show: () => `${a.slug!}  (/outdoors/${a.slug!}/)`,
    },
    {
      label: 'Area',
      applies: () => true,
      missing: () => !a.area,
      async ask() {
        a.area = await until(deps, 'Area, at valley or massif scale (never a trailhead or village)', text('area'), withDefault(a.area, latestArea(deps.contentDir)));
      },
      show: () => a.area!,
    },
    {
      label: 'Country',
      applies: () => true,
      missing: () => !a.country,
      async ask() {
        a.country = await until(deps, `Country slug (${deps.countries.join(', ')})`, (s) => {
          const c = s.trim().toLowerCase();
          if (!deps.countries.includes(c)) throw new Error(`unknown country "${c}"; add it to src/data/taxonomies.yaml first`);
          return c;
        }, { default: a.country ?? 'italy' });
      },
      show: () => a.country!,
    },
    {
      label: 'Distance',
      applies: () => true,
      missing: () => a.distance === undefined,
      async ask() {
        a.distance = await until(deps, 'Distance in km (as Komoot reports it)', (s) => number(s, 'the distance', { min: 0.1 }), withDefault(a.distance?.toString(), tour?.distanceKm.toString()));
      },
      show: () => `${a.distance} km`,
    },
    {
      label: 'Climb',
      applies: () => true,
      missing: () => a.climb === undefined,
      async ask() {
        a.climb = await until(deps, 'Climb in metres', (s) => number(s, 'the climb', { integer: true }), withDefault(a.climb?.toString(), tour?.climb.toString()));
      },
      show: () => `${a.climb} m up`,
    },
    {
      label: 'Route',
      applies: () => true,
      missing: () => a.shared === undefined,
      async ask() {
        say('  A shared trip gets its route drawn on the page and the GPX offered for download.');
        say('  An approximate trip gets the same as a closed circuit with no start or finish, and its date on the 1st of the month.');
        say('  A discreet trip gets no route, no download, no links, and its date on the 1st of the month.');
        const was = a.shared;
        const current = a.shared === undefined ? 'd' : a.approximateEnds ? 'a' : a.shared ? 's' : 'd';
        const route = await until(deps, 'Route: shared, approximate or discreet? (s/a/d)', (s): 's' | 'a' | 'd' => {
          const v = s.trim().toLowerCase();
          if (['s', 'shared', 'y', 'yes'].includes(v)) return 's';
          if (['a', 'approximate'].includes(v)) return 'a';
          if (['d', 'discreet', 'n', 'no'].includes(v)) return 'd';
          throw new Error('answer s (shared), a (approximate) or d (discreet)');
        }, { default: current });
        a.shared = route !== 'd';
        a.approximateEnds = route === 'a';
        if (a.approximateEnds) say('  Approximate: the route is published as a closed circuit with no start or finish; the date is set to the 1st of the month.');
        if (a.shared && !was) {
          a.gpx = undefined;
          a.links = undefined;
        }
        if (!a.shared) {
          a.gpx = undefined;
          a.links = [];
        }
      },
      show: () => (a.approximateEnds ? 'approximate' : a.shared ? 'shared' : 'discreet'),
    },
    {
      label: 'GPX',
      applies: () => a.shared === true,
      missing: () => !a.gpx,
      async ask() {
        a.gpx = await until(deps, 'GPX export (the file as Komoot or Wikiloc exported it)', (s) => {
          const file = pathOf(s);
          if (!existsSync(file)) throw new Error(`${file} does not exist`);
          const points = parseGpx(readFileSync(file, 'utf8')).length;
          if (points < 2) throw new Error(`${file} has no track points (a route-only export?)`);
          say(`  ${points} track points; only latitude, longitude and elevation will be kept.`);
          return file;
        }, withDefault(a.gpx));
      },
      show: () => a.gpx!,
    },
    {
      label: 'Links',
      applies: () => a.shared === true,
      missing: () => a.links === undefined,
      async ask() {
        const links: TripLink[] = [];
        if (tour && yes(await ask('Add the Komoot page as a public link? (y/n)', { default: 'y' }))) links.push({ label: 'Komoot', url: `https://www.komoot.com/tour/${tour.id}` });
        for (;;) {
          const line = (await ask('Public link as label=url, e.g. Komoot=https://… (empty to finish)', { default: '' })).trim();
          if (!line) break;
          const m = /^([^=]+)=(https?:\/\/\S+)$/.exec(line);
          if (!m) {
            say('  write it as label=https://…');
            continue;
          }
          links.push({ label: m[1].trim(), url: m[2] });
        }
        a.links = links;
      },
      show: () => (a.links!.length ? a.links!.map((l) => `${l.label} ${l.url}`).join(', ') : 'none'),
    },
    {
      label: 'Date',
      applies: () => true,
      missing: () => !a.date,
      async ask() {
        a.date = await until(deps, 'Date of the trip (YYYY-MM-DD)', (s) => {
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
          if (!m) throw new Error('write it as YYYY-MM-DD');
          const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
          if (Number.isNaN(d.getTime()) || d.getMonth() !== Number(m[2]) - 1) throw new Error('not a date');
          return d;
        }, withDefault(a.date && isoDay(a.date), tour?.date));
        if (!a.shared || a.approximateEnds) say(`  ${a.approximateEnds ? 'Approximate' : 'Discreet'}: the day is set to the 1st (${a.date.getFullYear()}-${pad2(a.date.getMonth() + 1)}-01).`);
      },
      show: () => (a.shared && !a.approximateEnds ? isoDay(a.date!) : `${a.date!.getFullYear()}-${pad2(a.date!.getMonth() + 1)}-01  (${a.approximateEnds ? 'approximate' : 'discreet'}: the 1st of the month)`),
    },
    {
      label: 'Cover',
      applies: () => true,
      missing: () => a.cover === undefined || a.cover > a.folder!.photos.length,
      async ask() {
        const { dir, photos } = a.folder!;
        photos.forEach((name, i) => say(`  ${String(i + 1).padStart(2)}  ${name}`));
        say(`  The photos are in ${dir}`);
        deps.reveal?.(dir);
        a.cover = await until(deps, 'Cover photo (its number above)', (s) => {
          const n = number(s, 'the cover', { integer: true, min: 1 });
          if (n > photos.length) throw new Error(`there are only ${photos.length} photos`);
          return n;
        }, { default: String(a.cover !== undefined && a.cover <= photos.length ? a.cover : 1) });
      },
      show: () => `${a.cover}  (${a.folder!.photos[a.cover! - 1]})`,
    },
    {
      label: 'Light cover',
      applies: () => true,
      missing: () => a.darkHeader === undefined,
      async ask() {
        a.darkHeader = yes(await ask('Is the cover light at the top or bottom, where the title sits? (y/n)', { default: yn(a.darkHeader) ?? 'n' }));
      },
      show: () => (a.darkHeader ? 'yes' : 'no'),
    },
    {
      label: 'Notes',
      applies: () => true,
      missing: () => a.notes === undefined,
      async ask() {
        if (a.notes) say(`  Current notes: ${a.notes.split('\n')[0].slice(0, 70)}${a.notes.length > 70 || a.notes.includes('\n') ? '…' : ''}  (an empty first line keeps them)`);
        const answer = await ask('Notes for the story, in your words: the route, what struck you, the conditions', { multiline: true });
        a.notes = answer.trim() || a.notes || '';
      },
      show: () => {
        const first = (a.notes ?? '').split('\n')[0];
        return first ? `${first.slice(0, 60)}${first.length > 60 || a.notes!.includes('\n') ? '…' : ''}` : '(none)';
      },
    },
  ];

  for (const step of steps) if (step.applies()) await step.ask();

  // The review: every answer by number; a number asks that question again, Enter creates the trip.
  for (;;) {
    const rows = steps.filter((step) => step.applies());
    say('');
    say('Review: type a number to change that answer, or press Enter to create the trip.');
    rows.forEach((step, i) => say(`  ${String(i + 1).padStart(2)}  ${step.label.padEnd(12)}${step.show()}`));
    const choice = (await ask('Change which?', { default: '' })).trim();
    if (!choice) break;
    const n = Number(choice);
    if (!Number.isInteger(n) || n < 1 || n > rows.length) {
      say(`  type a number from 1 to ${rows.length}, or press Enter to create the trip`);
      continue;
    }
    await rows[n - 1].ask();
    // A change can open or invalidate another answer: a ride needs a bike, a shared route a GPX, fewer photos a cover.
    for (const step of steps) if (step.applies() && step.missing()) await step.ask();
  }

  // Everything is confirmed: now create.
  const slug = a.slug!;
  const date = new Date(a.date!.getFullYear(), a.date!.getMonth(), a.shared && !a.approximateEnds ? a.date!.getDate() : 1, 12);
  const links = a.shared ? (a.links ?? []) : [];
  const trip: TripValues = {
    title: a.title, activity: a.activity, bike: a.bike, distance: a.distance, climb: a.climb, area: a.area, country: a.country,
    track: a.shared ? `${slug}.gpx` : false, approximateEnds: a.approximateEnds || undefined, links: links.length ? links : undefined, cover: a.cover, darkHeader: a.darkHeader,
  };
  const privacyZone = deps.privacyZone !== undefined ? deps.privacyZone : zoneFromEnv();
  // Checked before any photo is uploaded: writeTrack would refuse later, with the trip half made.
  if (a.shared && a.gpx && a.approximateEnds && !privacyZone) throw new Error('approximate ends need PRIVACY_ZONE ("lat,lon,radiusKm") in .env: without it the track still passes the door');
  const path = await scaffoldGallery({ slug, folder: a.folder!.dir, store: deps.store, contentDir: deps.contentDir, uploadsDir: deps.uploadsDir, date, kind: 'outdoors', trip });
  const approximateEnds = a.approximateEnds ? {} : undefined;
  const track = a.shared && a.gpx ? writeTrack(a.gpx, slug, deps.tracksDir, { approximateEnds, privacyZone }).path : undefined;
  let contours: string | undefined;
  if (track && deps.contours) {
    say('  Drawing the contour lines behind the route map…');
    try {
      contours = await deps.contours(`${slug}.gpx`);
    } catch (error) {
      // The trip is complete without them: the map just has no terrain until the command is run again.
      say(`  The contour lines were not drawn (${error instanceof Error ? error.message : error}); run npm run contours -- ${slug} later.`);
    }
  }

  mkdirSync(deps.notesDir, { recursive: true });
  const notesPath = join(deps.notesDir, `${slug}.md`);
  const meta = [
    `activity: ${a.activity}${a.bike ? ` (${a.bike} bike)` : ''}`,
    `area: ${a.area}, ${a.country}`,
    `distance: ${a.distance} km, climb: ${a.climb} m`,
    `date: ${isoDay(date)}`,
    // The real ride time, for the order among trips that share a published date; it stays here, never on the site.
    `ride: ${tour?.startedAt && tour.date === isoDay(a.date!) ? tour.startedAt : isoDay(a.date!)}`,
    a.shared ? `${a.approximateEnds ? 'approximate ends (a closed circuit, no start or finish), ' : ''}shared: ${links.map((l) => `${l.label} ${l.url}`).join(', ') || 'no public links'}` : 'DISCREET: no start, parking, access road, exact day or time in the story',
  ];
  writeFileSync(notesPath, `# ${a.title}\n\n${meta.map((m) => `- ${m}`).join('\n')}\n\n## Notes\n\n${(a.notes ?? '').trim()}\n`);
  orderTrips(deps.contentDir, deps.notesDir, say);

  say('');
  say(`Trip file: ${path}`);
  if (track) say(`Track: ${track}`);
  if (contours) say(`Contours: ${contours}`);
  say(`Notes: ${notesPath}`);
  say('Next: ask Claude to write the story and the alt texts from the notes, then run npm test and commit.');
  return { slug, path, track, contours, notes: notesPath, photos: a.folder!.photos.length, discreet: !a.shared };
}
