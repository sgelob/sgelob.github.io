import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { writeMarkdown } from '../lib/frontmatter';
import { galleryFrontmatter, type GalleryDoc, type Photo } from './gallery';
import { isRaster } from './files';
import { processUploads } from './process';
import type { ObjectStore } from './r2';

export type ScaffoldOptions = {
  slug: string;
  /** Folder with the photos of the new gallery. */
  folder: string;
  store: ObjectStore;
  contentDir: string;
  /** Local uploads tree the photos are copied into; defaults to `UPLOADS_DIR`. */
  uploadsDir?: string;
  date?: Date;
  /** `'outdoors'` writes a trip file (to be completed by hand) instead of a gallery. Default `'gallery'`. */
  kind?: 'gallery' | 'outdoors';
  /** Values for the trip file when they are already known (the wizard); what is left out stays undecided. */
  trip?: TripValues;
};

export type TripLink = { label: string; url: string };

/** What a trip's front matter can be given up front. `cover` is the 1-based number of the photo in file-name order. */
export type TripValues = {
  title?: string;
  activity?: 'hike' | 'ride';
  bike?: 'xc' | 'trail';
  distance?: number;
  climb?: number;
  area?: string;
  country?: string;
  track?: string | false;
  links?: TripLink[];
  cover?: number;
  darkHeader?: boolean;
};

/** A trip file's front matter: what `--outdoors` leaves undecided (`undefined`) the build refuses until it is set. */
export type TripDoc = {
  slug: string;
  title: string;
  date: string;
  activity: 'hike' | 'ride' | undefined;
  bike?: 'xc' | 'trail';
  distance: number | undefined;
  climb: number | undefined;
  area: string;
  country: string;
  track: string | false | undefined;
  links?: TripLink[];
  cover: string;
  darkHeader: boolean;
  photos: Photo[];
};

/**
 * The front matter of a new trip, as text (the YAML writer cannot leave a key empty or keep a comment).
 * `activity:`, `distance:`, `climb:` and `track:` have no value on purpose: the build fails until each is set (`track` to a .gpx name or `false`),
 * so a forgotten edit cannot ship a plausible placeholder. The cover's size is filled when known.
 */
export function tripFrontmatter(doc: TripDoc): string {
  const field = (key: string, value: unknown) => stringify({ [key]: value }, { lineWidth: 0 });
  const photos = doc.photos.map(({ src, width, height, alt }) => ({ src, width, height, ...(alt === undefined ? {} : { alt }) }));
  const coverPhoto = doc.photos.find((p) => p.src === doc.cover);
  return (
    '---\n' +
    field('title', doc.title) +
    `date: ${JSON.stringify(doc.date)}\n` +
    (doc.activity === undefined ? 'activity:\n' : field('activity', doc.activity)) +
    (doc.bike === undefined ? '# bike: xc | trail\n' : field('bike', doc.bike)) +
    (doc.distance === undefined ? 'distance:\n' : field('distance', doc.distance)) +
    (doc.climb === undefined ? 'climb:\n' : field('climb', doc.climb)) +
    field('area', doc.area) +
    field('country', doc.country) +
    (doc.track === undefined ? 'track:\n' : field('track', doc.track)) +
    (doc.links?.length ? field('links', doc.links) : '') +
    field('cover', doc.cover) +
    (coverPhoto && coverPhoto.width > 0 ? field('coverWidth', coverPhoto.width) + field('coverHeight', coverPhoto.height) : '') +
    field('darkHeader', doc.darkHeader) +
    field('photos', photos) +
    '---\n'
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local time without a zone, the format the migrated galleries use. */
const timestamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const titleFromSlug = (slug: string) => slug.split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

const uploadName = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

/**
 * A photo's public file name, for galleries and trips alike: `<slug>-NN.<ext>`, numbered in the order of the originals.
 * The slug says what the photo belongs to, and camera or phone names (`IMG_4021.JPG`, `PXL_20260614_073512.jpg`,
 * the latter with the exact day and time) never end up in the photo URLs.
 */
export const photoName = (slug: string, index: number, count: number, original: string) => {
  const ext = /\.[^.]+$/.exec(original)?.[0].toLowerCase() ?? '';
  return `${slug}-${String(index + 1).padStart(Math.max(2, String(count).length), '0')}${ext}`;
};

/** Copies the folder's photos into the uploads tree, uploads them, and writes the gallery's markdown file. Returns its path. */
export async function scaffoldGallery(opts: ScaffoldOptions): Promise<string> {
  const { slug, folder, store, contentDir, date = new Date(), kind = 'gallery' } = opts;
  const target = join(contentDir, `${slug}.md`);
  // Checked before anything is copied or uploaded: rewriting it would discard the edited title, cover and order.
  if (existsSync(target)) throw new Error(`${target} already exists: pick another slug, or delete the file first to start the ${kind === 'outdoors' ? 'trip' : 'gallery'} over`);
  const uploadsDir = opts.uploadsDir ?? process.env.UPLOADS_DIR;
  if (!uploadsDir) throw new Error('UPLOADS_DIR is not set');

  const names = readdirSync(folder).filter((n) => !n.startsWith('.') && isRaster(n));
  if (!names.length) throw new Error(`no images in ${folder}`);
  // Natural order, so `shot 2.jpg` comes before `shot 10.jpg` without zero-padding the originals first.
  const sorted = names.map((name) => ({ from: join(folder, name), name: uploadName(name) })).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  const photos = sorted.map((p, i) => ({ ...p, name: photoName(slug, i, sorted.length, p.name) }));

  console.log(
    'Originals are uploaded unchanged: the lightbox opens the 1600 px variant, but the original is what the no-JS link ' +
      'and old /wp-content/uploads/ links serve. Export large camera files at 2400 px or less first.',
  );
  const month = `${date.getFullYear()}/${pad(date.getMonth() + 1)}`;
  mkdirSync(join(uploadsDir, month), { recursive: true });
  for (const { from, name } of photos) {
    const to = join(uploadsDir, month, name);
    if (existsSync(to) && statSync(to).size !== statSync(from).size) throw new Error(`${to} already exists with different content`);
    copyFileSync(from, to);
  }

  const paths = photos.map(({ name }) => `${month}/${name}`);
  const { sizes, errors } = await processUploads({ uploadsDir, store, files: paths, log: console.log });
  if (errors.length) throw new Error(`could not process:\n${errors.join('\n')}`);

  const photoDocs = paths.map((src): Photo => ({ src, ...(sizes.get(src) ?? { width: 0, height: 0 }) }));
  if (kind === 'outdoors') {
    const given = opts.trip ?? {};
    const trip: TripDoc = {
      slug,
      title: given.title ?? titleFromSlug(slug),
      date: timestamp(date),
      activity: given.activity,
      bike: given.bike,
      distance: given.distance,
      climb: given.climb,
      area: given.area ?? '',
      country: given.country ?? 'italy',
      track: given.track,
      links: given.links,
      cover: paths[(given.cover ?? 1) - 1] ?? paths[0],
      darkHeader: given.darkHeader ?? false,
      photos: photoDocs,
    };
    mkdirSync(contentDir, { recursive: true });
    writeFileSync(target, tripFrontmatter(trip));
    return target;
  }

  const doc: GalleryDoc = {
    slug,
    title: titleFromSlug(slug),
    date: timestamp(date),
    genre: 'world-places',
    country: 'world',
    cover: paths[0],
    darkHeader: false,
    oldSlugs: [],
    photos: photoDocs,
    body: '',
  };
  writeMarkdown(contentDir, slug, galleryFrontmatter(doc), '');
  return target;
}
