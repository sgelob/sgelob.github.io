import { parse } from 'yaml';
import raw from '../data/home.yaml?raw';

export interface Home {
  photosIntro: string;
  featuredGalleries: string[];
}

export const home = parse(raw) as Home;

/** The galleries listed by id, in that order; with no ids, the first `count` of `galleries` (date-desc). */
export function pickFeatured<T extends { id: string }>(galleries: readonly T[], ids: readonly string[], count = 4): T[] {
  if (ids.length === 0) return galleries.slice(0, count);
  return ids.map((id) => {
    const gallery = galleries.find((g) => g.id === id);
    if (!gallery) throw new Error(`home.yaml featuredGalleries: no gallery with id "${id}"`);
    return gallery;
  });
}

/** The first `count` paragraphs of a Markdown body (paragraphs are separated by blank lines). */
export const leadParagraphs = (body: string, count = 2): string[] =>
  body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, count);
