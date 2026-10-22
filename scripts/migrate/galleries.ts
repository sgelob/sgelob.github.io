import { extractImages, htmlToMarkdown, stripImages } from '../lib/html';
import { uploadPath } from '../lib/uploads';
import type { WpDb, WpPost, WpTerm } from '../lib/wp';

export type Photo = { src: string; width: number; height: number };

export type GalleryDoc = {
  slug: string;
  title: string;
  shortTitle?: string;
  date: string;
  genre: string;
  country: string;
  cover: string;
  darkHeader: boolean;
  photos: Photo[];
  seoTitle?: string;
  seoDescription?: string;
  oldSlugs: string[];
  body: string;
};

const DEFAULT_COUNTRY = 'world';

/** The `_yoast_wpseo_primary_genre` term when set, else the first genre term. */
function primaryGenre(db: WpDb, post: WpPost): WpTerm | undefined {
  const genres = db.terms(post.ID, 'genre');
  const primaryId = Number(db.meta(post.ID, '_yoast_wpseo_primary_genre'));
  const primary = primaryId ? (genres.find((t) => t.term_id === primaryId) ?? db.allTerms('genre').find((t) => t.term_id === primaryId)) : undefined;
  return primary ?? genres[0];
}

/** `_thumbnail_id` is an attachment post id; a missing or deleted attachment yields undefined. */
export function thumbnailPath(db: WpDb, post: WpPost): string | undefined {
  const id = Number(db.meta(post.ID, '_thumbnail_id'));
  const guid = id ? db.post(id)?.guid : undefined;
  return guid ? (uploadPath(guid) ?? undefined) : undefined;
}

export function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Optional text meta: absent and empty both mean "not set". */
export const optionalMeta = (db: WpDb, id: number, key: string): string | undefined => db.meta(id, key) || undefined;

export function buildGallery(db: WpDb, post: WpPost, warn: (msg: string) => void): GalleryDoc {
  const slug = post.post_name;
  const attachments = db.attachments();

  const photos = extractImages(post.post_content).map((src): Photo => {
    const att = attachments.get(src);
    if (!att) warn(`gallery ${slug}: no attachment for ${src}`);
    else if (!att.width || !att.height) warn(`gallery ${slug}: no dimensions for ${src}`);
    return { src, width: att?.width ?? 0, height: att?.height ?? 0 };
  });

  const genre = primaryGenre(db, post);
  if (!genre) throw new Error(`gallery ${slug}: no genre term`);
  const cover = thumbnailPath(db, post) ?? photos[0]?.src;
  if (!cover) throw new Error(`gallery ${slug}: no cover (no thumbnail and no photos)`);

  const doc: GalleryDoc = {
    slug,
    title: post.post_title,
    date: post.post_date.replace(' ', 'T'),
    genre: genre.slug,
    country: db.terms(post.ID, 'country')[0]?.slug ?? DEFAULT_COUNTRY,
    cover,
    darkHeader: db.meta(post.ID, 'dark_header') === 'true',
    photos,
    oldSlugs: db.metaValues(post.ID, '_wp_old_slug').map(decodeSlug),
    body: htmlToMarkdown(stripImages(post.post_content)),
  };
  const shortTitle = optionalMeta(db, post.ID, 'home_short_title');
  const seoTitle = optionalMeta(db, post.ID, '_yoast_wpseo_title');
  const seoDescription = optionalMeta(db, post.ID, '_yoast_wpseo_metadesc');
  if (shortTitle) doc.shortTitle = shortTitle;
  if (seoTitle) doc.seoTitle = seoTitle;
  if (seoDescription) doc.seoDescription = seoDescription;
  return doc;
}
