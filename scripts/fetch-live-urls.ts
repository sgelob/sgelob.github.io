import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const SITEMAP_INDEX = 'https://olegs.be/sitemap.xml';
const NOT_A_PAGE = /\.(xml|xsl|jpe?g|png|gif|webp|avif|svg|pdf)$|\/feed\/?$/i;

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': 'olegs.be check-urls' } });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.text();
}

const locs = (xml: string): string[] => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]!);

/** Every page `<loc>` of the live sitemap index, following each child sitemap. */
async function sitemapPaths(): Promise<string[]> {
  const urls: string[] = [];
  for (const child of locs(await fetchText(SITEMAP_INDEX))) urls.push(...locs(await fetchText(child)));
  return urls.map((url) => decodeURI(new URL(url).pathname)).filter((path) => !NOT_A_PAGE.test(path));
}

const readYaml = <T>(file: string): T => parse(readFileSync(new URL(`../src/data/${file}`, import.meta.url), 'utf8')) as T;

function dataPaths(): string[] {
  const { categories, countries } = readYaml<{ categories: { slug: string }[]; countries: { slug: string }[] }>('taxonomies.yaml');
  const quotes = readYaml<{ author: { slug: string } }[]>('quotes.yaml');
  const redirects = readYaml<{ from: string }[]>('redirects.yaml');
  return [
    ...categories.map((c) => `/category/${c.slug}/`),
    ...countries.map((c) => `/photos/country/${c.slug}/`),
    ...quotes.map((q) => `/quote-author/${q.author.slug}/`),
    ...redirects.map((r) => r.from),
  ];
}

const paths = [...new Set([...(await sitemapPaths()), ...dataPaths()])].sort();
process.stdout.write(paths.join('\n') + '\n');
