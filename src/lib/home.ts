import { parse } from 'yaml';
import raw from '../data/home.yaml?raw';

export interface Home {
  photosIntro: string;
  featuredGalleries: string[];
}

export const home = parse(raw) as Home;

/** The galleries listed by id, in that order; with no ids, the first `count` of `galleries` (date-desc). */
/** Deterministic 32-bit PRNG (mulberry32), so a build is reproducible for a given seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed from a date, so the pick changes once a day (the site is rebuilt by a daily workflow). */
export const daySeed = (date = new Date()): number =>
  date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

/** `count` galleries drawn at random with a seeded shuffle; same seed, same pick. */
export function pickRandom<T>(items: readonly T[], count: number, seed: number): T[] {
  const rand = mulberry32(seed);
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/** The galleries shown on the home: the ids listed in home.yaml, else `count` picked at random for the day. */
export function pickFeatured<T extends { id: string }>(galleries: readonly T[], ids: readonly string[], count = 4, seed = daySeed()): T[] {
  if (ids.length === 0) return pickRandom(galleries, count, seed);
  return ids.map((id) => {
    const gallery = galleries.find((g) => g.id === id);
    if (!gallery) throw new Error(`home.yaml featuredGalleries: no gallery with id "${id}"`);
    return gallery;
  });
}

/** The first `count` paragraphs of a Markdown body (paragraphs are separated by blank lines). */
export const leadParagraphs = (body: string, count = 2): string[] =>
  body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, count);
