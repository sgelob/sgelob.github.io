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
UPLOADS_DIR=./olegs-be-data/uploads npm run photos -- --new <slug> <folder-with-jpegs>
```

This copies the photos into `UPLOADS_DIR/yyyy/mm/` (the local tree of originals, kept in sync with R2), uploads them with their 480, 960 and 1600 px variants, and writes `src/content/galleries/<slug>.md` with the photos in file-name order. It refuses to overwrite an existing gallery file. Then edit the title, genre, country, cover and date, reorder the photos if you like, commit and push. It needs a `.env` with the R2 keys, see `.env.example`.

- Originals are uploaded unchanged: the grid and the lightbox use the variants, but the original is what the no-JS link and old `/wp-content/uploads/` links serve. Export large camera files at 2400 px or less first.
- `cover` is an upload path, `yyyy/mm/file.jpg`, usually one of the gallery's photos.
- `darkHeader: true` is for covers that are light at the top or bottom: the hero darkens them more under the nav and the title.

## Add a post

Add a Markdown file to `src/content/posts/` with these frontmatter fields:

```
title, date, categories, cover?, lang, seoTitle?, seoDescription?, oldSlugs, excerpt
```

The URL is `/YYYY/MM/<filename>/`. Quote the date (`date: "2026-10-22T09:00:00"`): unquoted, YAML reads it as UTC and a post written near midnight can land in the wrong month. `cover` is an upload path like a gallery's, `yyyy/mm/file.jpg`.

Images: put the file in `UPLOADS_DIR/yyyy/mm/`, run `npm run photos -- --uploads $UPLOADS_DIR` (it uploads the new original and its variants, skipping what R2 already has), then reference a variant:

```md
![Alt text](https://img.olegs.be/uploads/yyyy/mm/name-960.jpg)
```

Variants are never upscaled: use `-960` only when the original is at least 960 px wide, `-480` when it is narrower, and the original itself (`name.jpg`) below 480 px. A GIF is always linked as the original, or it loses its animation. `npm test` with `UPLOADS_DIR` set checks every variant the content references.

## Data files

`src/data/*.yaml` holds the non-post content: the home page featured galleries (an empty list means 4 galleries picked at random each day by the scheduled rebuild) and the Photos intro, events, books, quotes, taxonomies and redirects.

## One-shot migration

```bash
npm run migrate -- --dump <sql>
```

This rebuilt everything from the WordPress dump once. Re-running it would overwrite every file under `src/content` and `src/data`, discarding hand edits, so it refuses while `src/content` has files unless you pass `--force`. Drafts were exported to `./olegs-be-drafts/` (git-ignored).

## Photos pipeline

```bash
npm run photos -- --uploads <dir> [--dry-run]
```

Uploads every original under `<dir>` (normally `UPLOADS_DIR`) unchanged, plus 480, 960 and 1600 px variants in webp and jpg, with keys `uploads/yyyy/mm/name-w.ext`; keys already in R2 are skipped, and no variant is wider than its original. `npm run fetch-uploads` pulls the originals from OVH using the `OVH_FTP_*` environment variables.

```bash
UPLOADS_DIR=./olegs-be-data/uploads npm run photos -- --fix-sizes
```

Fills in the photos with width 0 in the gallery files (as `--new` leaves them when a size cannot be read), measuring the originals in `UPLOADS_DIR`.

## Deploy

Push to `main`: GitHub Actions runs the tests and the build, then publishes to GitHub Pages. After a deploy, check the live URLs with:

```bash
npm run check-urls -- --base https://olegs.be
```
