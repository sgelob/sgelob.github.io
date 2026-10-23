// Pure helpers over collection entries: no Astro runtime, so they are unit-testable.
import type { CollectionEntry } from 'astro:content';

export type Gallery = CollectionEntry<'galleries'>;
export type Post = CollectionEntry<'posts'>;

/** Date descending; ties broken by id ascending. Returns a new array. */
export function sortByDateDesc<T extends { id: string; data: { date: Date } }>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}

export function postPath(post: Pick<Post, 'id' | 'data'>): string {
  const d = post.data.date;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `/${d.getFullYear()}/${mm}/${post.id}/`;
}

export function galleryPath(gallery: Pick<Gallery, 'id'>): string {
  return `/gallery/${gallery.id}/`;
}

/** `galleries` must be date-desc: `prev` is the newer neighbour, `next` the older one. */
export function neighbours<T extends { id: string }>(
  galleries: readonly T[],
  id: string,
): { prev?: T; next?: T } {
  const i = galleries.findIndex((g) => g.id === id);
  if (i === -1) return {};
  return { prev: galleries[i - 1], next: galleries[i + 1] };
}

/** Anything with a cover and its photos: a gallery or a trip. */
export interface HasCover {
  data: {
    cover: string;
    coverWidth?: number;
    coverHeight?: number;
    photos: { src: string; width: number; height: number }[];
  };
}

/** The cover's size: from `coverWidth`/`coverHeight`, else from the matching photo; undefined when unknown. */
export function coverSize(gallery: HasCover): { width: number; height: number } | undefined {
  const { cover, coverWidth, coverHeight, photos } = gallery.data;
  if (coverWidth && coverHeight) return { width: coverWidth, height: coverHeight };
  const photo = photos.find((p) => p.src === cover);
  return photo && { width: photo.width, height: photo.height };
}

export interface Related<T> {
  /** What the first pick shares with the gallery, for the heading: its country or only its genre. */
  by: 'country' | 'genre';
  galleries: T[];
}

/**
 * Up to `count` other galleries to show after one. Same country and genre come first, then the same
 * country, then the same genre; within a tier the closest in date wins. Undefined when nothing is shared.
 */
export function related<T extends { id: string; data: { date: Date; country: string; genre: string } }>(
  galleries: readonly T[],
  id: string,
  count = 4,
): Related<T> | undefined {
  const self = galleries.find((g) => g.id === id);
  if (!self) return undefined;
  const tier = (g: T) => (g.data.country === self.data.country ? 2 : 0) + (g.data.genre === self.data.genre ? 1 : 0);
  const distance = (g: T) => Math.abs(g.data.date.getTime() - self.data.date.getTime());
  const picks = galleries
    .filter((g) => g.id !== id && tier(g) > 0)
    .sort((a, b) => tier(b) - tier(a) || distance(a) - distance(b) || a.id.localeCompare(b.id))
    .slice(0, count);
  if (picks.length === 0) return undefined;
  return { by: picks[0].data.country === self.data.country ? 'country' : 'genre', galleries: picks };
}

export interface Group<T> {
  /** The genre or country slug, or the name of a merged group. */
  key: string;
  galleries: T[];
}

/**
 * Galleries grouped by genre or country, largest group first (ties by key), each group keeping
 * the order of `galleries`. A term with no galleries has no group.
 */
export function groupGalleries<T extends { data: { genre: string; country: string } }>(
  galleries: readonly T[],
  by: 'genre' | 'country',
): Group<T>[] {
  const groups = new Map<string, T[]>();
  for (const g of galleries) {
    const key = g.data[by];
    groups.set(key, [...(groups.get(key) ?? []), g]);
  }
  return [...groups]
    .map(([key, items]) => ({ key, galleries: items }))
    .sort((a, b) => b.galleries.length - a.galleries.length || a.key.localeCompare(b.key));
}

/**
 * Groups smaller than `min` galleries are merged into one last group named `into`, date descending.
 * Groups keep their order otherwise; no merged group is added when nothing is small.
 */
export function mergeSmallGroups<T extends { id: string; data: { date: Date } }>(
  groups: readonly Group<T>[],
  min: number,
  into: string,
): Group<T>[] {
  const kept = groups.filter((g) => g.galleries.length >= min);
  const small = groups.filter((g) => g.galleries.length < min).flatMap((g) => g.galleries);
  return small.length > 0 ? [...kept, { key: into, galleries: sortByDateDesc(small) }] : [...kept];
}
