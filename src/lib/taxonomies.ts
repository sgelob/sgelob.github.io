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

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A gallery title without the country it ends with ("Abandoned Mill – Brandizzo, Italy" → "Abandoned Mill –
 * Brandizzo"), for places that show the country beside it. The last `–` or `,` part goes when it ends in the
 * country's name, so "– Principality of Monaco" goes too; a title that does not end with it is left whole.
 */
export function withoutCountry(title: string, slug: string): string {
  const name = escapeRegExp(countryName(slug));
  const rest = title.replace(new RegExp(`\\s*[–,]\\s*(?:[^–,]*\\s)?${name}$`), '');
  return rest.trim() === '' ? title : rest;
}
