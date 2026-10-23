# Outdoors: a section for hikes and mountain-bike rides

Design, 2026-10-23. Brainstormed with Oleg; mockups in `.superpowers/brainstorm/` (git-ignored).

## Intent

Oleg will publish his hikes and mountain-bike rides, in English, as a section of its own called
**Outdoors**: a story of the day with landscape and trail photos, a few numbers, and, when it is safe
to share, the route. The section is built now and held in an unmerged pull request until the first
trip's photos exist; the PR is merged together with that first trip.

Why a section rather than a genre inside Photos: Oleg wants to see it as a place of its own in the
nav. He may also drop the hobby one day; then the nav item is removed and the trips stay reachable.

Why not the Blog: the Blog is the Italian archive about work and web topics. New outdoor content is
English and photo-first. The Blog gets one line in its lead saying its posts are in Italian; that
small change is part of this work.

## Goals

- A visitor sees a trip the way they see a gallery: a full-width cover, a short story, the photos in
  the justified grid with the lightbox, captions and deep links that galleries already have.
- The numbers are a description of the day, not a scoreboard: activity, bike, distance, climb, area,
  month, in the mono meta line and on the cards.
- Trips that are safe to share carry the route as a self-contained drawing and a GPX download.
  Trips near home carry nothing that locates them beyond an area name.
- The section's lead speaks of time in the woods for its own sake (Shinrin-yoku), not performance.
- Everything derives from the content folder: adding a trip file is all it takes.

## Non-goals

- No interactive map and no third-party map tiles. The site makes no external requests beyond its
  own images on `img.olegs.be` and the Cloudflare analytics beacon; this keeps it that way.
- No gear, no people in the photos (Oleg's editorial rule; nothing to enforce in code).
- No comments, likes, Strava/Komoot embeds, heart-rate or time data.
- No per-country pages for Outdoors for now. `country` is stored so they can come later.

## Anti-goals (what would make it a failure)

- A page or file that reveals where a near-home trip starts or ends, or a routine ("every Sunday").
- A trip that was meant to be discreet shipping with a track because a field was forgotten.
- Outdoors looking like a different website: it must use the same type, colours, label rows, cards
  and spacing as Photos.

## Constraints

- Astro static site, content collections with the glob loader, tests with vitest (one build per
  run, `tests/helpers/dist.ts`, container renders via `tests/helpers/render.ts`), Pagefind search,
  `@astrojs/rss` feed, GitHub Pages deploy on push to `main` plus a daily cron.
- Photos live on R2 under `uploads/<yyyy>/<mm>/` with 480/960/1600 variants; the image contract is
  `src/lib/images.ts`; `scripts/photos.ts --new` creates a gallery from a folder.
- Oleg runs ImageOptim on the JPEGs before handing them over, which strips EXIF including GPS. The
  pipeline does not re-check this; the procedure says it.
- Page budgets: a gallery page stays under 70 KB with its inlined CSS; the lightbox entry chunk
  under 5 KB. Trip pages should fit the same budgets; the route SVG counts against the page.

## Decisions

### Name and URLs

- Section name **Outdoors** (noun, like Photos). The nav is reordered to **About, Photos, Outdoors,
  Blog, Search** (Oleg's order; About first because the site is a business card). The nav item is
  always present once this lands; the PR is not merged before the first trip exists.
- `/outdoors/` the index; `/outdoors/hikes/` and `/outdoors/rides/` the same index filtered;
  `/outdoors/<slug>/` a trip; `/outdoors/<slug>.gpx` the track download, only for trips that have one.

### Content: the `outdoors` collection

`src/content/outdoors/<slug>.md`, loaded like galleries. Front matter:

| field | type | notes |
|---|---|---|
| `title` | string | e.g. `Colle delle Finestre` |
| `date` | date | month precision is what the site shows (`formatMonthYear`); the day may be real or the 1st |
| `activity` | `hike` \| `ride` | shown as "Hike" / "MTB" |
| `bike` | `xc` \| `trail`, optional | rides only; shown as "XC bike" / "Trail bike"; schema refuses it on a hike |
| `distance` | number, km | from Komoot; authoritative for display |
| `climb` | number, metres | total ascent; authoritative for display |
| `area` | string | valley or massif scale, e.g. `Val di Susa`, `Velebit`; never a trailhead or village |
| `country` | string | slug from `src/data/taxonomies.yaml`; add `croatia` there (name "Croatia"). Trips never appear on the Photos country pages, and those pages are from now on built only for countries that have at least one gallery, so adding a country for Outdoors creates no empty Photos page (the existing `usa` page goes until a US gallery exists; adjust its test) |
| `track` | string \| `false`, **required** | GPX file name under `src/content/outdoors/tracks/`, or `false` for a discreet trip |
| `links` | `[{ label, url }]`, optional | e.g. the public Komoot or Trailforks route; discreet trips have none |
| `cover`, `coverWidth`, `coverHeight`, `darkHeader` | as galleries | |
| `seoDescription` | optional | |
| `photos` | as galleries, `alt` on every photo | |

The body is the story, Markdown, English, first person: what the day was like, the places along the
way, the trail character (for rides: what the descent is like, which bike and why). A discreet
trip's story names no start, parking, access road or exact timing.

`track` being required is the point: publishing forces the choice between sharing and withholding.

The repository is public, so anything under `src/content/outdoors/tracks/` and its git history is
public. Only tracks meant for sharing are committed there. The raw export of a discreet trip, if it
is kept at all while the story is written, lives in the git-ignored `olegs-be-data/` folder and
never in the repo. A build-time test refuses a repo where a `track` file name does not exist, and
where a file in `tracks/` is referenced by no trip (so a stray export cannot ship under any name).

**The published GPX is a sanitised rewrite, not the committed file.** `/outdoors/<slug>.gpx` is
generated at build time from the committed file and keeps only the track points' latitude,
longitude and elevation, plus a `<name>` equal to the trip title: no `<time>` stamps, no metadata,
author, heart-rate, cadence or other extensions. The committed file should already be clean, but
the endpoint guarantees it. Shared tracks are not trimmed at the ends: a trip is either shared
whole or discreet.

**Dates.** A discreet trip's `date` has the day set to the 1st; the schema or a build-time test
refuses any other day when `track` is `false`. The site only ever shows month and year, but the
full date also reaches the feed's `pubDate`, the search meta and the newest-first ordering, and a
real day there would reveal when Oleg goes out near home. Shared trips may carry their real day.
Two discreet trips in the same month order by slug.

### Index page

- Heading "Outdoors", lead (Oleg's words to be written, around the Shinrin-yoku idea: being in the
  woods and on the trails for the landscape and the quiet, the numbers only describing the day),
  then a filter row in the Photos style: All · Hikes · Rides.
- Trips newest first, grouped by year under the shared `SectionLabel` row ("2026", no link).
- A card is the gallery card with a different caption: title on the left; on the right, mono muted,
  `Hike · 16 km · 1,350 m` or `MTB · Trail · 38 km · 1,700 m`.
- Empty state in the `GalleryGrid` style: "No trips yet."

### Trip page

- Hero as the gallery hero (full-width cover, scrims, dark-header option), title, and the meta line:
  `Italy · MTB · Trail bike · 38 km · 1,700 m up · Val di Susa · June 2026 · 41 photos`. Country and
  activity are plain text (no pages behind them yet). Hikes omit the bike.
- The story body with the gallery body styles.
- The route block, only with a track: an inline SVG drawn at build time from the GPX, the route's
  shape (equirectangular, longitude scaled by the cosine of the mean latitude, fitted in a box) and
  an elevation profile beneath it, both in the foreground colour on the page background, with mono
  labels for the distance and climb from the front matter; then "Download GPX ↗" to
  `/outdoors/<slug>.gpx` and the optional `links`. No map tiles, no external requests.
- The photos: `JustifiedGrid` and `Lightbox` as they are (captions from `alt`, `#photo-n` links).
- After the photos: the older/newer pager as galleries, and a "More hikes" / "More rides" row of up
  to four other trips of the same activity, newest first, falling back to any trips, with the
  `SectionLabel` linking to `/outdoors/hikes/` or `/outdoors/rides/`.
- Search: indexed with `data-pagefind-body`, type `outdoors`, meta date, image, activity; the search
  page gets an "Outdoors" group between Galleries and Posts.
- Feed: trips are feed items like galleries, category "Outdoors" and the activity, cover in the
  content, first paragraph of the story as description.
- Sitemap: included like every page; the `.gpx` endpoint is not a page and stays out of it.

### Home page

- A row "Outdoors" with `SectionLabel` ("All n trips" linking to `/outdoors/`) and the four newest
  trips, placed between the Photos row and the Blog row. It renders only when at least one trip
  exists; since the PR merges with the first trip, the row is there from day one.
- The intro's link list (Events, Books, Quotes, Email) gets Outdoors as well, first, since it is a
  section and the others are lists.
- The intro text is the first two paragraphs of `src/content/pages/about.md` (`leadParagraphs`), so
  About's opening is rewritten. Approved wording:

  > Hi, I'm Oleg. I work in tech as a Product Manager, with a background in front-end engineering,
  > and I like building digital products that are clear, useful and respectful of people's privacy.
  >
  > Away from the screen I'm drawn to offline things: hiking and mountain biking in the Alps,
  > photographing landscapes, abandoned places and the cities I travel to, a record on the
  > turntable, a good book. This site is where those pictures and stories end up.

  About then continues with today's communities and open source paragraph (events link), the Turin
  meetups line and "How may I help you?", trimmed so nothing repeats; the curly apostrophe style of
  the file (`I’m`) is kept, and tests that pin "Hi, I’m Oleg" keep passing.

### Pipeline and procedure

- `scripts/photos.ts --new <slug> <folder> --date YYYY-MM-DD --outdoors` does what it does for a
  gallery but writes `src/content/outdoors/<slug>.md` with the photo list and a front-matter template
  whose fields are left for editing, `track` included and unset so the build fails until it is
  decided. `scripts/thumbs.ts` accepts a trip slug as it accepts a gallery slug.
- README gets an "Add a trip" section mirroring "Add a gallery", plus the editorial rules below.
- Memory (`adding-a-trip`, like `adding-a-gallery`): what Oleg hands over and what the assistant
  does. Oleg provides the photos through ImageOptim in shooting order, the activity and bike, the
  month, the area, distance and climb, whether the trip is discreet or the GPX file, and a few lines
  of notes. The assistant writes the story after looking the place and route up (Komoot, Wikiloc,
  Trailforks for rides, hut and club sites, blogs, the history of what is along the way), writes an
  alt for every photo, picks the cover, and for a discreet trip keeps every locating detail out.

### Blog lead

One sentence added to the Blog page lead saying the posts are in Italian. Wording left to the
builder; abstract, no counters.

## Left to the builder

- Component structure: whether `GalleryHero`, `GalleryCard` and `related()` are generalised to take
  a trip or get sibling components; the pager and the "More" row can share code with galleries.
- GPX parsing and writing in a pure module (`src/lib/gpx.ts`): points and elevation in, the
  sanitised GPX text out; simplification so the SVG stays small (a few hundred points is plenty);
  unit tests on a fixture under `tests/fixtures/` that carries timestamps and extensions to strip.
- The exact SVG sizes, stroke, and how the profile labels its axes.
- Container-render tests for the card, the meta line and the route block; build tests for the empty
  index, the filtered pages, the nav, the search group and the home page without the row. Build
  tests on a real trip page are written when the first trip joins the PR, as galleries were tested.
- Wording of the index lead, the empty states, the Blog sentence and the README section, in the
  site's voice (short, concrete, first person where Oleg speaks).
