import { htmlToMarkdown } from '../lib/html';
import type { WpDb } from '../lib/wp';
import { decodeEntities } from './posts';

export type TaxonomyTerm = { slug: string; name: string; description?: string };
export type Taxonomies = { genres: TaxonomyTerm[]; countries: TaxonomyTerm[]; categories: TaxonomyTerm[] };

function termsOf(db: WpDb, taxonomy: string): TaxonomyTerm[] {
  return db
    .allTerms(taxonomy)
    .map((t): TaxonomyTerm => {
      const term: TaxonomyTerm = { slug: t.slug, name: decodeEntities(t.name) };
      const description = htmlToMarkdown(t.description).trim();
      if (description) term.description = description;
      return term;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

export const buildTaxonomies = (db: WpDb): Taxonomies => ({
  genres: termsOf(db, 'genre'),
  countries: termsOf(db, 'country'),
  categories: termsOf(db, 'category'),
});
