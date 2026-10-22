import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { writeMarkdown } from '../lib/frontmatter';
import { WpDb, type WpPost } from '../lib/wp';
import { applyPathFixups } from './fixups';
import { draftFrontmatter, galleryFrontmatter, pageFrontmatter, postFrontmatter } from './frontmatter-order';
import { buildGallery, type GalleryDoc } from './galleries';
import { ABOUT_ID, buildAboutPage, buildPage, type BookSection, type EventYear, type PageDoc } from './pages';
import { buildPost } from './posts';
import { buildQuotes } from './quotes';
import { buildRedirects } from './redirects';
import { buildTaxonomies } from './taxonomies';

export type Counts = {
  galleries: number;
  photos: number;
  posts: number;
  pages: number;
  quotes: number;
  quoteAuthors: number;
  genres: number;
  countries: number;
  categories: number;
  redirects: number;
};
export type Summary = Counts & {
  draftPosts: number;
  draftGalleries: number;
  /** Problems in the published content. */
  warnings: string[];
  /** Drafts that could not be built (no genre, no cover) and were left out: reported, but not a content problem. */
  skippedDrafts: string[];
};
export type Options = {
  /** MySQL dump of the WordPress database. */
  dump: string;
  /** The `src` directory the content and data files are written to. */
  out: string;
  /** Where draft posts and galleries go: outside the repository. */
  drafts: string;
  dryRun: boolean;
};

/** What the real dump must produce. */
export const EXPECTED: Counts = {
  galleries: 85,
  photos: 3638,
  posts: 39,
  pages: 6,
  quotes: 188,
  quoteAuthors: 141,
  genres: 6,
  countries: 13,
  categories: 9,
  redirects: 15,
};

const PHOTOS_PAGE_SLUG = 'photos';
const PHOTOS_INTRO_PLACEHOLDER = 'Fifteen years of places, abandoned factories and Soviet cameras, shot between Turin and the rest of Europe.';
const DATA_FILES = ['quotes', 'taxonomies', 'events', 'books', 'redirects', 'home'].map((name) => `${name}.yaml`);
const CONTENT_DIRS = ['galleries', 'posts', 'pages'];

/** One line per count that differs from `EXPECTED`. */
export function mismatches(summary: Summary): string[] {
  return (Object.keys(EXPECTED) as (keyof Counts)[])
    .filter((key) => summary[key] !== EXPECTED[key])
    .map((key) => `${key}: expected ${EXPECTED[key]}, got ${summary[key]}`);
}

const LABELS: [keyof Counts | 'draftPosts' | 'draftGalleries', string][] = [
  ['galleries', 'galleries'],
  ['photos', 'photos'],
  ['posts', 'posts'],
  ['pages', 'pages'],
  ['quotes', 'quotes'],
  ['quoteAuthors', 'quote authors'],
  ['genres', 'genres'],
  ['countries', 'countries'],
  ['categories', 'categories'],
  ['redirects', 'redirects'],
  ['draftPosts', 'draft posts'],
  ['draftGalleries', 'draft galleries'],
];

export function formatSummary(summary: Summary): string {
  const rows = [...LABELS.map(([key, label]) => [label, summary[key]] as const), ['warnings', summary.warnings.length] as const];
  const width = Math.max(...rows.map(([label]) => label.length));
  return rows.map(([label, n]) => `${label.padEnd(width)}  ${String(n).padStart(5)}`).join('\n');
}

/** Slug for a draft: drafts often have no `post_name` yet, and two can share one. */
function draftSlug(post: WpPost, taken: Set<string>): string {
  let slug = post.post_name || `draft-${post.ID}`;
  if (taken.has(slug)) slug = `${slug}-${post.ID}`;
  taken.add(slug);
  return slug;
}

function removeMarkdown(dir: string): void {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) if (name.endsWith('.md')) rmSync(join(dir, name));
}

function writeYaml(dir: string, file: string, value: unknown): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), stringify(value, { lineWidth: 0 }));
}

/** Reads the dump, builds everything in memory, then (unless `dryRun`) replaces the files this migration owns. */
export async function runMigration(opts: Options): Promise<Summary> {
  const db = await WpDb.fromDump(opts.dump);
  const warnings: string[] = [];
  const skippedDrafts: string[] = [];
  const warn = (msg: string) => warnings.push(msg);

  const galleryOf = (post: WpPost): GalleryDoc => buildGallery(db, { ...post, post_content: applyPathFixups(post.post_content) }, warn);
  const galleries = db.posts({ type: 'galleries', status: 'publish' }).map(galleryOf);
  const posts = db.posts({ type: 'post', status: 'publish' }).map((p) => buildPost(db, p));

  const draftGallerySlugs = new Set<string>();
  const draftGalleries: GalleryDoc[] = [];
  for (const post of db.posts({ type: 'galleries', status: 'draft' })) {
    const named = { ...post, post_name: draftSlug(post, draftGallerySlugs) };
    try {
      draftGalleries.push(galleryOf(named));
    } catch (error) {
      skippedDrafts.push(`draft gallery ${named.post_name} (${post.post_title}): ${(error as Error).message}`);
    }
  }
  const draftPostSlugs = new Set<string>();
  const draftPosts = db.posts({ type: 'post', status: 'draft' }).map((p) => buildPost(db, { ...p, post_name: draftSlug(p, draftPostSlugs) }));

  const pages: PageDoc[] = [];
  let events: EventYear[] = [];
  let books: BookSection[] = [];
  for (const post of db.posts({ type: 'page', status: 'publish' })) {
    if (post.ID === ABOUT_ID) {
      const { events: e, books: b, ...about } = buildAboutPage(db, post);
      pages.push(about);
      events = [...e].sort((a, b) => b.year - a.year);
      books = b;
    } else pages.push(buildPage(db, post));
  }

  const quotes = buildQuotes(db, warn);
  const taxonomies = buildTaxonomies(db);
  const redirects = buildRedirects(galleries, posts);
  const photosBody = pages.find((p) => p.slug === PHOTOS_PAGE_SLUG)?.body.trim();
  const home = { photosIntro: photosBody || PHOTOS_INTRO_PLACEHOLDER, featuredGalleries: [] };

  const summary: Summary = {
    galleries: galleries.length,
    photos: galleries.reduce((n, g) => n + g.photos.length, 0),
    posts: posts.length,
    pages: pages.length,
    quotes: quotes.length,
    quoteAuthors: new Set(quotes.map((q) => q.author.slug)).size,
    genres: taxonomies.genres.length,
    countries: taxonomies.countries.length,
    categories: taxonomies.categories.length,
    redirects: redirects.length,
    draftPosts: draftPosts.length,
    draftGalleries: draftGalleries.length,
    warnings,
    skippedDrafts,
  };
  if (opts.dryRun) return summary;

  const content = join(opts.out, 'content');
  const data = join(opts.out, 'data');
  for (const dir of CONTENT_DIRS) removeMarkdown(join(content, dir));
  for (const file of DATA_FILES) rmSync(join(data, file), { force: true });

  for (const g of galleries) writeMarkdown(join(content, 'galleries'), g.slug, galleryFrontmatter(g), g.body);
  for (const p of posts) writeMarkdown(join(content, 'posts'), p.slug, postFrontmatter(p), p.body);
  for (const p of pages) writeMarkdown(join(content, 'pages'), p.slug, pageFrontmatter(p), p.body);
  for (const g of draftGalleries) writeMarkdown(join(opts.drafts, 'galleries'), g.slug, draftFrontmatter(galleryFrontmatter(g)), g.body);
  for (const p of draftPosts) writeMarkdown(join(opts.drafts, 'posts'), p.slug, draftFrontmatter(postFrontmatter(p)), p.body);

  writeYaml(data, 'quotes.yaml', quotes);
  writeYaml(data, 'taxonomies.yaml', taxonomies);
  writeYaml(data, 'events.yaml', events);
  writeYaml(data, 'books.yaml', books);
  writeYaml(data, 'redirects.yaml', redirects);
  writeYaml(data, 'home.yaml', home);
  return summary;
}
