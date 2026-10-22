import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { writeMarkdown } from '../lib/frontmatter';
import type { GalleryDoc, Photo } from '../migrate/galleries';
import { galleryFrontmatter } from '../migrate/frontmatter-order';
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
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Local time without a zone, the format the migrated galleries use. */
const timestamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const titleFromSlug = (slug: string) => slug.split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

const uploadName = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

/** Copies the folder's photos into the uploads tree, uploads them, and writes the gallery's markdown file. Returns its path. */
export async function scaffoldGallery(opts: ScaffoldOptions): Promise<string> {
  const { slug, folder, store, contentDir, date = new Date() } = opts;
  const uploadsDir = opts.uploadsDir ?? process.env.UPLOADS_DIR;
  if (!uploadsDir) throw new Error('UPLOADS_DIR is not set');

  const names = readdirSync(folder).filter((n) => !n.startsWith('.') && isRaster(n));
  if (!names.length) throw new Error(`no images in ${folder}`);
  const photos = names.map((name) => ({ from: join(folder, name), name: uploadName(name) })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

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

  const doc: GalleryDoc = {
    slug,
    title: titleFromSlug(slug),
    date: timestamp(date),
    genre: 'world-places',
    country: 'world',
    cover: paths[0],
    darkHeader: false,
    oldSlugs: [],
    photos: paths.map((src): Photo => ({ src, ...(sizes.get(src) ?? { width: 0, height: 0 }) })),
    body: '',
  };
  writeMarkdown(contentDir, slug, galleryFrontmatter(doc), '');
  return join(contentDir, `${slug}.md`);
}
