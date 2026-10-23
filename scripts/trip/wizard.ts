// The questions behind `npm run trip`, kept apart from the terminal so a test can script the answers.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseGpx } from '../../src/lib/gpx';
import type { ObjectStore } from '../photos/r2';
import { scaffoldGallery, type TripLink, type TripValues } from '../photos/scaffold';
import { writeTrack } from '../track';
import { activityFromSport, type KomootTour } from './komoot';

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
}

export interface WizardResult {
  slug: string;
  /** The trip file. */
  path: string;
  /** The sanitised track, when the route is shared. */
  track?: string;
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

/** Runs the wizard: asks, then creates the trip, the track and the notes. Nothing is written before every answer is in. */
export async function runWizard(deps: WizardDeps): Promise<WizardResult> {
  const { ask, say } = deps;
  say('A new trip for Outdoors. Answers in brackets are defaults; press Enter to take them.');

  const folder = await until(deps, 'Folder with the photos (JPEGs through ImageOptim, in shooting order)', (s) => {
    const dir = resolve(s.trim().replace(/^~(?=\/|$)/, process.env.HOME ?? '~'));
    if (!existsSync(dir)) throw new Error(`${dir} does not exist`);
    const photos = readdirSync(dir).filter((n) => !n.startsWith('.') && RASTER.test(n)).sort();
    if (!photos.length) throw new Error(`no JPEG, PNG or WebP files in ${dir}`);
    return { dir, photos };
  });
  say(`  ${folder.photos.length} photo${folder.photos.length === 1 ? '' : 's'} found.`);

  let tour: KomootTour | undefined;
  if (deps.komoot) {
    tour = await until(deps, 'Komoot tour link, to prefill the numbers (empty to skip)', async (s) => {
      const url = s.trim();
      if (!url) return undefined;
      return deps.komoot!(url);
    }, { default: '' });
    if (tour) {
      say(`  Found: ${tour.name}, ${tour.sport}, ${tour.distanceKm} km, ${tour.climb} m up, ${tour.date}${tour.recorded ? '' : ' (a planned tour, not a recording)'}.`);
      say('  Each answer below is prefilled from it; press Enter to keep it or type another.');
    }
  }
  const sportActivity = tour && activityFromSport(tour.sport);

  const activity = await until(deps, 'Hike or ride? (hike/ride)', (s): 'hike' | 'ride' => {
    const a = s.trim().toLowerCase();
    if (a === 'hike' || a === 'h') return 'hike';
    if (a === 'ride' || a === 'r' || a === 'mtb') return 'ride';
    throw new Error('answer hike or ride');
  }, sportActivity ? { default: sportActivity } : undefined);
  const bike = activity === 'ride'
    ? await until(deps, 'Which bike? (xc/trail)', (s): 'xc' | 'trail' => {
        const b = s.trim().toLowerCase();
        if (b === 'xc' || b === 'trail') return b;
        if (b === 'enduro') return 'trail';
        throw new Error('answer xc or trail');
      })
    : undefined;

  const title = await until(deps, 'Title (e.g. Colle delle Finestre)', (s) => {
    const t = s.trim();
    if (!t) throw new Error('the title cannot be empty');
    return t;
  }, tour ? { default: tour.name } : undefined);
  const slug = await until(deps, 'Slug (the URL: /outdoors/<slug>/)', (s) => {
    const v = s.trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v)) throw new Error('lowercase letters, digits and single dashes only');
    if (RESERVED_SLUGS.has(v)) throw new Error(`"${v}" is taken by the ${v} page; pick another`);
    if (existsSync(join(deps.contentDir, `${v}.md`))) throw new Error(`a trip called ${v} already exists`);
    return v;
  }, { default: slugify(title) });

  const area = await until(deps, 'Area, at valley or massif scale (never a trailhead or village)', (s) => {
    const a = s.trim();
    if (!a) throw new Error('the area cannot be empty');
    return a;
  });
  const country = await until(deps, `Country slug (${deps.countries.join(', ')})`, (s) => {
    const c = s.trim().toLowerCase();
    if (!deps.countries.includes(c)) throw new Error(`unknown country "${c}"; add it to src/data/taxonomies.yaml first`);
    return c;
  }, { default: 'italy' });

  const distance = await until(deps, 'Distance in km (as Komoot reports it)', (s) => number(s, 'the distance', { min: 0.1 }), tour ? { default: String(tour.distanceKm) } : undefined);
  const climb = await until(deps, 'Climb in metres', (s) => number(s, 'the climb', { integer: true }), tour ? { default: String(tour.climb) } : undefined);

  say('  A shared trip gets its route drawn on the page and the GPX offered for download.');
  say('  A discreet trip (near home) gets no route, no download, no links, and its date on the 1st of the month.');
  const shared = yes(await ask('Share the route? (y/N)', { default: 'n' }));

  let gpx: string | undefined;
  const links: TripLink[] = [];
  if (shared) {
    gpx = await until(deps, 'GPX export (the file as Komoot or Wikiloc exported it)', (s) => {
      const file = resolve(s.trim().replace(/^~(?=\/|$)/, process.env.HOME ?? '~'));
      if (!existsSync(file)) throw new Error(`${file} does not exist`);
      const points = parseGpx(readFileSync(file, 'utf8')).length;
      if (points < 2) throw new Error(`${file} has no track points (a route-only export?)`);
      say(`  ${points} track points; only latitude, longitude and elevation will be kept.`);
      return file;
    });
    if (tour && yes(await ask('Add the Komoot page as a public link? (Y/n)', { default: 'y' }))) links.push({ label: 'Komoot', url: `https://www.komoot.com/tour/${tour.id}` });
    for (;;) {
      const line = (await ask('Public link as label=url, e.g. Komoot=https://… (empty to finish)', { default: '' })).trim();
      if (!line) break;
      const m = /^([^=]+)=(https?:\/\/\S+)$/.exec(line);
      if (!m) { say('  write it as label=https://…'); continue; }
      links.push({ label: m[1].trim(), url: m[2] });
    }
  }

  const date = await until(deps, 'Date of the trip (YYYY-MM-DD)', (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) throw new Error('write it as YYYY-MM-DD');
    const d = new Date(Number(m[1]), Number(m[2]) - 1, shared ? Number(m[3]) : 1, 12);
    if (Number.isNaN(d.getTime())) throw new Error('not a date');
    return d;
  }, tour ? { default: tour.date } : undefined);
  if (!shared) say(`  Discreet: the day is set to the 1st (${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01).`);

  folder.photos.forEach((name, i) => say(`  ${String(i + 1).padStart(2)}  ${name}`));
  const cover = await until(deps, 'Cover photo (its number above)', (s) => number(s, 'the cover', { integer: true, min: 1 }), { default: '1' });
  if (cover > folder.photos.length) throw new Error(`there are only ${folder.photos.length} photos`);
  const darkHeader = yes(await ask('Is the cover light at the top or bottom, where the title sits? (y/N)', { default: 'n' }));

  const notes = await ask('Notes for the story, in your words: the route, what struck you, the conditions', { multiline: true });

  // Everything is known: now create.
  const trip: TripValues = { title, activity, bike, distance, climb, area, country, track: shared ? `${slug}.gpx` : false, links: links.length ? links : undefined, cover, darkHeader };
  const path = await scaffoldGallery({ slug, folder: folder.dir, store: deps.store, contentDir: deps.contentDir, uploadsDir: deps.uploadsDir, date, kind: 'outdoors', trip });
  const track = gpx ? writeTrack(gpx, slug, deps.tracksDir).path : undefined;

  mkdirSync(deps.notesDir, { recursive: true });
  const notesPath = join(deps.notesDir, `${slug}.md`);
  const meta = [`activity: ${activity}${bike ? ` (${bike} bike)` : ''}`, `area: ${area}, ${country}`, `distance: ${distance} km, climb: ${climb} m`, `date: ${date.toISOString().slice(0, 10)}`, shared ? `shared: ${links.map((l) => `${l.label} ${l.url}`).join(', ') || 'no public links'}` : 'DISCREET: no start, parking, access road, exact day or time in the story'];
  writeFileSync(notesPath, `# ${title}\n\n${meta.map((m) => `- ${m}`).join('\n')}\n\n## Notes\n\n${notes.trim()}\n`);

  say('');
  say(`Trip file: ${path}`);
  if (track) say(`Track: ${track}`);
  say(`Notes: ${notesPath}`);
  say('Next: ask Claude to write the story and the alt texts from the notes, then run npm test and commit.');
  return { slug, path, track, notes: notesPath, photos: folder.photos.length, discreet: !shared };
}
