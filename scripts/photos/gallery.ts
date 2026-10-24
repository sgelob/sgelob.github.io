// A gallery file as the photo scripts write it: its front matter and the order of its keys.

export type Photo = { src: string; width: number; height: number; alt?: string };

export type GalleryDoc = {
  slug: string;
  title: string;
  cardTitle?: string;
  date: string;
  genre: string;
  country: string;
  cover: string;
  /** Size of the cover's attachment: the cover is not always one of the photos. */
  coverWidth?: number;
  coverHeight?: number;
  darkHeader: boolean;
  photos: Photo[];
  seoTitle?: string;
  seoDescription?: string;
  oldSlugs: string[];
  body: string;
};

// The key order of the written files is decided here, not by the order the object was built in.
const GALLERY_KEYS = ['title', 'cardTitle', 'date', 'genre', 'country', 'cover', 'coverWidth', 'coverHeight', 'darkHeader', 'seoTitle', 'seoDescription', 'oldSlugs', 'photos'] as const;
const PHOTO_KEYS = ['src', 'width', 'height', 'alt'] as const;

/** The listed keys of `doc`, in that order; keys that are undefined are left out. */
function pick<T extends object, K extends keyof T>(doc: T, keys: readonly K[]): Pick<T, K> {
  const out: Partial<Pick<T, K>> = {};
  for (const key of keys) if (doc[key] !== undefined) out[key] = doc[key];
  return out as Pick<T, K>;
}

/** Old slugs without empty or repeated entries. */
const cleanOldSlugs = (slugs: readonly string[]): string[] => [...new Set(slugs.filter(Boolean))];

export const galleryFrontmatter = (doc: GalleryDoc) => ({
  ...pick(doc, GALLERY_KEYS),
  oldSlugs: cleanOldSlugs(doc.oldSlugs),
  photos: doc.photos.map((photo) => pick(photo, PHOTO_KEYS)),
});
