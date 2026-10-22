// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { parse } from 'yaml';

// Redirect stubs are noindex pages, so they stay out of the sitemap. Read with fs: the `?raw`
// import of src/lib/redirects.ts does not work here. `from` keeps raw Unicode; sitemap URLs are
// percent-encoded, hence decodeURI below.
/** @type {{ from: string }[]} */
const redirects = parse(readFileSync(new URL('./src/data/redirects.yaml', import.meta.url), 'utf8'));
const REDIRECT_PATHS = new Set(redirects.map((r) => r.from));

// https://astro.build/config
export default defineConfig({
  site: 'https://olegs.be',
  trailingSlash: 'always',
  // The shared stylesheet is ~8 KB: inlined, it no longer blocks first paint behind a second request.
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [sitemap({ filter: (page) => !REDIRECT_PATHS.has(decodeURI(new URL(page).pathname)) })],
});
