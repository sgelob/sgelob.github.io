# olegs.be

Personal site of Olegs Belousovs. An Astro static site deployed to GitHub Pages; photos live on Cloudflare R2 and are served from `img.olegs.be`.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # vitest (builds the site once, then checks the output)
npm run build    # static site into dist/
```

## Add a gallery

```bash
npm run photos -- --new <slug> <folder-with-jpegs>
```

This creates `src/content/galleries/<slug>.md` and uploads the photos to R2. Then edit the title, genre, country, cover and date in the new file, commit and push. It needs a `.env` with the R2 keys, see `.env.example`.

## Add a post

Add a Markdown file to `src/content/posts/` with these frontmatter fields:

```
title, date, categories, cover?, lang, seoTitle?, seoDescription?, oldSlugs, excerpt
```

The URL is `/YYYY/MM/<filename>/`.

## Data files

`src/data/*.yaml` holds the non-post content: the home page featured galleries and the Photos intro, events, books, quotes, taxonomies and redirects.

## One-shot migration

```bash
npm run migrate -- --dump <sql>
```

This rebuilt everything from the WordPress dump once. Re-running it overwrites every file under `src/content` and `src/data`, so do not run it again unless you mean to discard hand edits. Drafts were exported to `~/olegs-be-drafts/`.

## Photos pipeline

```bash
npm run photos -- --uploads <dir> [--dry-run]
```

Generates 480, 960 and 1600 px variants in webp and jpg, uploaded with keys `uploads/yyyy/mm/name-w.ext`. `npm run fetch-uploads` pulls the originals from OVH using the `OVH_FTP_*` environment variables.

## Deploy

Push to `main`: GitHub Actions runs the tests and the build, then publishes to GitHub Pages. After a deploy, check the live URLs with:

```bash
npm run check-urls -- --base https://olegs.be
```
