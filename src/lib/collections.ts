// Astro-runtime only (uses getCollection). Pure helpers live in paths.ts.
import { getCollection } from 'astro:content';
import type { Activity, Trip } from './outdoors';
import { sortByDateDesc, type Gallery, type Post } from './paths';

export { galleryPath, groupGalleries, mergeSmallGroups, neighbours, postPath, related, sortByDateDesc } from './paths';
export type { Gallery, Group, Post, Related } from './paths';
export { trackPath, tripPath } from './outdoors';
export type { Trip } from './outdoors';

export async function getGalleries(): Promise<Gallery[]> {
  return sortByDateDesc(await getCollection('galleries'));
}

export async function getGalleriesBy(tax: 'genre' | 'country', slug: string): Promise<Gallery[]> {
  return (await getGalleries()).filter((g) => g.data[tax] === slug);
}

export async function getTrips(): Promise<Trip[]> {
  return sortByDateDesc(await getCollection('outdoors'));
}

export async function getTripsBy(activity: Activity): Promise<Trip[]> {
  return (await getTrips()).filter((t) => t.data.activity === activity);
}

export async function getPosts(): Promise<Post[]> {
  return sortByDateDesc(await getCollection('posts'));
}

export async function getPostsBy(category: string): Promise<Post[]> {
  return (await getPosts()).filter((p) => p.data.categories.includes(category));
}
