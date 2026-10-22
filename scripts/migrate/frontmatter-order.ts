import type { GalleryDoc } from './galleries';
import type { PageDoc } from './pages';
import type { PostDoc } from './posts';

// The builders return unordered objects: the key order of the written files is decided here.
const GALLERY_KEYS = ['title', 'shortTitle', 'date', 'genre', 'country', 'cover', 'coverWidth', 'coverHeight', 'darkHeader', 'seoTitle', 'seoDescription', 'oldSlugs', 'photos'] as const;
const POST_KEYS = ['title', 'date', 'categories', 'cover', 'lang', 'seoTitle', 'seoDescription', 'oldSlugs', 'excerpt'] as const;
const PAGE_KEYS = ['title', 'path', 'lang', 'seoTitle', 'seoDescription'] as const;

/** The listed keys of `doc`, in that order; keys that are undefined are left out. */
function pick<T extends object, K extends keyof T>(doc: T, keys: readonly K[]): Pick<T, K> {
  const out: Partial<Pick<T, K>> = {};
  for (const key of keys) if (doc[key] !== undefined) out[key] = doc[key];
  return out as Pick<T, K>;
}

/** `_wp_old_slug` rows can be empty or repeated. */
export const cleanOldSlugs = (slugs: readonly string[]): string[] => [...new Set(slugs.filter(Boolean))];

export const galleryFrontmatter = (doc: GalleryDoc) => ({ ...pick(doc, GALLERY_KEYS), oldSlugs: cleanOldSlugs(doc.oldSlugs) });
export const postFrontmatter = (doc: PostDoc) => ({ ...pick(doc, POST_KEYS), oldSlugs: cleanOldSlugs(doc.oldSlugs) });
export const pageFrontmatter = (doc: PageDoc) => pick(doc, PAGE_KEYS);

/** Drafts are the published format with `draft: true` as the first key. */
export const draftFrontmatter = <T extends object>(frontmatter: T) => ({ draft: true, ...frontmatter });
