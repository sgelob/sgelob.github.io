import { parse } from 'yaml';
import raw from '../data/taxonomies.yaml?raw';

export interface Term {
  slug: string;
  name: string;
  description?: string;
}

const data = parse(raw) as { genres: Term[]; countries: Term[]; categories: Term[] };

export const genres = data.genres;
export const countries = data.countries;
export const categories = data.categories;

const nameIn = (terms: Term[], slug: string): string => terms.find((t) => t.slug === slug)?.name ?? slug;

export const genreName = (slug: string): string => nameIn(genres, slug);
export const countryName = (slug: string): string => nameIn(countries, slug);
export const categoryName = (slug: string): string => nameIn(categories, slug);
