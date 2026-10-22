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
