// Astro-runtime only (uses getCollection). Pure helpers live in paths.ts.
import { getCollection } from 'astro:content';
import { sortByDateDesc, type Gallery, type Post } from './paths';

export { galleryPath, neighbours, postPath, sortByDateDesc } from './paths';
export type { Gallery, Post } from './paths';

export async function getGalleries(): Promise<Gallery[]> {
  return sortByDateDesc(await getCollection('galleries'));
}

export async function getGalleriesBy(tax: 'genre' | 'country', slug: string): Promise<Gallery[]> {
  return (await getGalleries()).filter((g) => g.data[tax] === slug);
}

export async function getPosts(): Promise<Post[]> {
  return sortByDateDesc(await getCollection('posts'));
}

export async function getPostsBy(category: string): Promise<Post[]> {
  return (await getPosts()).filter((p) => p.data.categories.includes(category));
}
