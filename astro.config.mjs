// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { parse } from 'yaml';
import { iframeTitles } from './src/lib/iframe-titles.ts';
import { embedFacadesPlugin } from './src/lib/video-embeds.ts';

// Redirect stubs and the search page are noindex pages, so they stay out of the sitemap. Read with fs: the `?raw`
// import of src/lib/redirects.ts does not work here. `from` keeps raw Unicode; sitemap URLs are
// percent-encoded, hence decodeURI below.
/** @type {{ from: string }[]} */
const redirects = parse(readFileSync(new URL('./src/data/redirects.yaml', import.meta.url), 'utf8'));
const REDIRECT_PATHS = new Set(redirects.map((r) => r.from));
// The search page is noindex too: its results are the pages the sitemap already lists.
const NOINDEX_PATHS = new Set([...REDIRECT_PATHS, '/search/']);

// https://astro.build/config
export default defineConfig({
  site: 'https://olegs.be',
  trailingSlash: 'always',
  // The shared stylesheet is ~8 KB: inlined, it no longer blocks first paint behind a second request.
  build: { format: 'directory', inlineStylesheets: 'always' },
  // Component scripts always go to a file of their own: the Content Security Policy allows scripts from the site
  // itself, not inline ones (Astro would otherwise inline a script under Vite's 4 KB limit).
  vite: { build: { assetsInlineLimit: 0 } },
  // Every internal link loads its page in the background when hovered or focused, so the click lands on a page
  // already in the browser cache. A small script file of Astro's, allowed by the security policy like the others.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  // Video and slide players become click-to-play links (no third-party request before ▶), and every other embedded
  // <iframe> gets a title from its host, so none is announced as a bare "frame".
  markdown: { processor: satteri({ hastPlugins: [embedFacadesPlugin, iframeTitles] }) },
  integrations: [sitemap({ filter: (page) => !NOINDEX_PATHS.has(decodeURI(new URL(page).pathname)) })],
});
