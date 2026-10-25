# olegs.be

Personal site of Olegs Belousovs. An Astro static site deployed to GitHub Pages; photos live on Cloudflare R2 and are served from `img.olegs.be`.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # vitest (builds the site once, then checks the output)
npm run build    # static site into dist/, then its search index into dist/pagefind/
```

`npm test` also runs every built page through [axe-core](https://github.com/dequelabs/axe-core) (WCAG 2.2 A and AA plus best practices) at 1280 and 390 px in headless Chrome, which takes about three minutes. It finds Chrome at `CHROME_PATH` or the usual install paths; without one the scan is skipped locally, and on CI it fails.

Search (`/search/`) runs on a [Pagefind](https://pagefind.app) index that `npm run build` writes after the Astro build; the dev server has no index, so try search with `npm run build && npm run preview`.

## Add a gallery

```bash
UPLOADS_DIR=./olegs-be-data/uploads npm run photos -- --new <slug> <folder-with-jpegs> --date YYYY-MM-DD
```

This copies the photos into `UPLOADS_DIR/yyyy/mm/` (the local tree of originals, kept in sync with R2), uploads them with their 480, 960 and 1600 px variants, and writes `src/content/galleries/<slug>.md` with the photos in file-name order (natural order, so `shot 2` comes before `shot 10`). Every photo is renamed `<slug>-01.jpg`, `<slug>-02.jpg`, … so the URLs say what the photo belongs to and no camera or phone name reaches them; trips are named the same way. It refuses to overwrite an existing gallery file. Then edit the title, genre, country, cover and date, reorder the photos if you like, commit and push. It needs a `.env` with the R2 keys, see `.env.example`.

- Originals are uploaded unchanged: the grid and the lightbox use the variants, but the original is what the no-JS link and old `/wp-content/uploads/` links serve. Export large camera files at 2400 px or less first.
- `cover` is an upload path, `yyyy/mm/file.jpg`, usually one of the gallery's photos.
- `darkHeader: true` is for covers that are light at the top or bottom: the hero darkens them more under the nav and the title.

## Add a trip

A trip is a hike or a mountain-bike ride in `src/content/outdoors/<slug>.md`, with its photos and an optional GPX track. The wizard asks for everything step by step:

```bash
npm run trip
```

It starts with a Komoot tour link if there is one: a public tour prefills the title, hike or ride, distance, climb and date from `api.komoot.de`, offers its page as a public link, and offers its photos (only those facts are read, never the start point or the photos' locations; a private tour is refused and the questions are asked as usual). Then the photos: a folder of JPEGs (through ImageOptim, in shooting order), or Enter to download the tour's photos from Komoot in their order along the track, served at up to 2048 px on the long side, enough for the site's 1600 px variants but less than an original. Komoot lists all of a tour's photos only to a logged-in account, so the download is offered only with `KOMOOT_EMAIL` and `KOMOOT_PASSWORD` in `.env` (the password goes only to `api.komoot.de`); without them it lists the first five, and the wizard asks for the folder instead. Then hike or ride and the bike, title, area at valley or massif scale, country, distance and climb, whether the route is shared (then the GPX export and any public links) or discreet, the date, the cover and a few notes. For a shared trip it also draws the contour layer behind the route map (`src/content/outdoors/tracks/<slug>.contours.svg`, contours every 100 m from EU-DEM terrain data via the open Terrain Tiles on AWS, fetched once; the site serves the file itself). To draw it again, or for a trip made by hand: `npm run contours -- <slug>`. Before creating anything it shows a review: every answer with a number; type a number to change that answer (answers that depend on it are asked again, e.g. the GPX when a discreet route becomes shared), or press Enter to go ahead. Then it uploads the photos, writes the trip file with those answers, sanitises the track into `src/content/outdoors/tracks/`, and saves the notes to `olegs-be-drafts/outdoors/<slug>.md` for the story. What is left after it: the story and an `alt` for every photo. It needs `.env` with the R2 keys and `UPLOADS_DIR`.

The same without the questions (the fields are then left empty to fill by hand):

```bash
UPLOADS_DIR=./olegs-be-data/uploads npm run photos -- --new --outdoors <slug> <folder-with-jpegs> --date YYYY-MM-DD
```

This does what a gallery does (photos copied into `UPLOADS_DIR/yyyy/mm/`, uploaded with their variants) and writes the trip file with placeholders. The photos are renamed `<slug>-01.jpg`, `<slug>-02.jpg`... in the order of the original names, so a phone's `PXL_20260614_073512.jpg` (the exact day and time) never reaches a URL. It refuses to overwrite an existing trip. Run the photos through ImageOptim first: it strips the EXIF, GPS position included, and they are uploaded unchanged.

Front matter to complete, in this order:

- `activity: hike | ride`, `distance` in km and `climb` in metres: left empty by the scaffold, so the build fails until they are set. `bike: xc | trail` for rides only (a comment in the scaffold).
- `area` (the range or valley) and `country` (a slug from `src/data/taxonomies.yaml`; an unknown one fails the build). Unknown front matter keys fail it too.
- `track`: required, and left empty on purpose, so the build fails until it is set. Either the bare name of a `.gpx` file (no folders) in `src/content/outdoors/tracks/` (the page then shows the route, the elevation profile and a GPX download), or `false` for a discreet trip.
- `links`: optional list of `label` and `url`, such as the route on Komoot or Wikiloc. Not for a discreet trip.
- `cover` (with `coverWidth` and `coverHeight`), `darkHeader`, optional `seoDescription`, and `photos` with a non-empty `alt` for each one.

Shareable GPX files are committed under `src/content/outdoors/tracks/`: the repository is public, so only tracks that are fine to share go there, and never a raw export (it carries times, heart rate, waypoints and the device). Turn the export into the track with:

```bash
npm run track -- <export.gpx> <slug>
```

This writes `src/content/outdoors/tracks/<slug>.gpx` with the route only (latitude, longitude, elevation; visitors download it as `<slug>-olegs-be.gpx`), refuses to overwrite a track, and prints the point count; then set `track: <slug>.gpx`. The tests fail on a committed track that still has times, extensions, metadata or waypoints. A discreet trip (`track: false`) never has its export in the repo: if it is kept, it stays in `olegs-be-data/`, which is git-ignored.

A discreet trip has its `date` on the 1st of the month and no `links` (the build checks both), and nothing it publishes names or hints at a start, parking, access road or exact timing: not the story, and not the slug, the title, the alt texts or the `seoDescription` either. The photo file names are guaranteed by the scaffold (`<slug>-NN.jpg`). The slugs `hikes` and `rides` are taken by the filter pages.

The story is English and first person, below the front matter. Research the place and the route before writing: Komoot, Wikiloc and, for rides, Trailforks; hut and club sites; blogs; and the history of what is along the way.

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

## Photos pipeline

```bash
npm run photos -- --uploads <dir> [--dry-run]
```

Uploads every original under `<dir>` (normally `UPLOADS_DIR`) unchanged, plus 480, 960 and 1600 px variants in webp and jpg, with keys `uploads/yyyy/mm/name-w.ext`; keys already in R2 are skipped, and no variant is wider than its original.

```bash
UPLOADS_DIR=./olegs-be-data/uploads npm run photos -- --fix-sizes
```

Fills in the photos with width 0 in the gallery files (as `--new` leaves them when a size cannot be read), measuring the originals in `UPLOADS_DIR`.

## Deploy

Push to `main`: GitHub Actions runs the tests and the build, then publishes to GitHub Pages. After a deploy, check the live URLs with:

```bash
npm run check-urls -- --base https://olegs.be
```
