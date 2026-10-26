---
name: outdoor-post
description: Publish a hike or ride from a Komoot tour to /outdoors as a wizard in the chat. Use when the user gives a Komoot tour link or id and asks to post, publish or add an outdoor trip, on the desktop or from a Claude Code session on the phone.
---

# Outdoor post from a Komoot tour

The terminal wizard (`npm run trip`) asks its questions on stdin. This is the same flow run in the chat: the session fetches everything, asks the user only the choices that are theirs, writes the post and publishes it. Talk to the user in their language; the post itself is in English.

## 0. Before starting

- `KOMOOT_EMAIL`, `KOMOOT_PASSWORD`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET` must be set (in `.env`, or in the cloud environment). Check that they exist; never print their values.
- `node -v` is at least the version Astro asks for (v22.23.4 today): an older Node makes `npm test` and `npm run check` stop with "Node.js … is not supported by Astro". In the cloud, `UPLOADS_DIR` is not set in the environment: the folder there holds only this session’s uploads, so the originals check in `npm test` would fail on old posts (CI skips it too). If either is wrong, tell the user what to fix in the environment and stop.
- `npm ci` has run. Start from an up-to-date `main` with a clean tree.

## 1. Fetch

`npm run trip-fetch -- <link or id>` saves the tour's facts, GPX export and photos to `olegs-be-drafts/komoot/<id>/` (git-ignored) and prints the places along the route and where each photo was taken. A tour with no photos cannot be posted: a trip needs a cover. Say so and stop.

Look at every photo (`photos/NN.jpg`). Note what each shows; name a place only when the photo's position on the track and a map agree (a peak or a castle seen from there, a village it was taken in).

## 2. Ask (AskUserQuestion, up to four questions at a time)

- **Route:** shared (map, GPX, real day), approximate (one closed circuit with no start or finish, day on the 1st of the month) or discreet (no map, no GPX, no links, day on the 1st). If earlier trips that start from the same place are `approximateEnds: true`, do the same and only say so; otherwise ask, recommending shared.
- **Bike** for a ride: `xc` or `trail`.
- **Cover:** three or four candidates, each described in a line. Point out a photo that gives away the time of day.
- **Area** when nearby trips do not settle it: a valley, massif, gulf or coast, never a village or trailhead (`grep -h '^area:' src/content/outdoors/*.md` lists the ones in use).
- **Notes:** offer to take the user's own words for the story. Ask too about anything the photos raise: other riders or walkers (mention them only if the user agrees, never by name), a private-looking house, an odd name in the title.

## 3. Build

- **Title:** Komoot's name, with emoji removed. **Slug:** from Komoot's name, as the wizard makes it (`slugify` in `scripts/trip/wizard.ts`).
- `npm run photos -- --new --outdoors <slug> olegs-be-drafts/komoot/<id>/photos --date <YYYY-MM-DD>`: uploads the photos and writes `src/content/outdoors/<slug>.md`. The date is the real day for a shared trip and the 1st of the month otherwise. It needs `UPLOADS_DIR`: in the cloud, give it to this command only, `UPLOADS_DIR=./olegs-be-data/uploads npm run photos -- …`.
- Fill the front matter: `title`, `activity`, `bike` (rides), `distance` and `climb` (Komoot's), `area`, `country`, `track` (`<slug>.gpx`, or `false` when discreet), `approximateEnds: true` when approximate, `links` (Komoot, not for a discreet trip), `cover` with `coverWidth`/`coverHeight`, `darkHeader: true` when the cover is light at the top or bottom.
- `npm run track -- olegs-be-drafts/komoot/<id>/<id>.gpx <slug>` (add `--approximate-ends` when approximate), then `npm run contours -- <slug>` (not for a discreet trip).
- Notes in `olegs-be-drafts/outdoors/<slug>.md`, with `- ride: <startedAt from tour.json>` and anything the user said.
- `npm run trips-order -- --komoot`: numbers trips that share a month by their real ride time, taking missing ride times from Komoot.

## 4. Write

- **Story** below the front matter, first person, concrete, a few short paragraphs. Open with the distance and climb in words. Then the route as it went, what the photos show, and a few facts found by searching the web (history, the place, a race), checked and given to the user as sources. Read the stories of nearby trips first and do not repeat their facts.
- **Alt text** for every photo: English, 4 to 12 words, no "photo of". People are "a rider ahead" or "walkers in the distance".
- **Privacy:** no brands, products or gear. Nothing the user did not say about who they were with or where they stay. For an approximate or discreet trip: no start, parking, access road, real day or time of day, in the story, the alt texts or the title.
- **Style:** curly apostrophes (’), an en dash with spaces between the places of a title, no em dashes, numbers like 1,861 metres.

## 5. Check and publish

- `npm test` and `npm run check` must pass.
- A content-only post goes straight to `main`: `git add src/content/outdoors`, commit as `content(outdoors): <title>`, push. If the change touched code or tests, use a branch and a pull request instead. If the push to `main` is refused, push a branch, open a pull request and tell the user.
- Wait for the deploy, then check that the trip page, its photos on img.olegs.be and the GPX download (`/outdoors/<slug>-olegs-be.gpx`) answer 200. Use `curl -A 'olegs.be post check'`, so the checks show up as ours in the site's analytics and not as bot traffic. For an approximate or discreet trip, also check that the real day is not on the page.
- Tell the user what is live, what the story covers, the sources, and the next tours not yet on the site if known.

## Cloud environment (Claude Code on the phone)

A cloud session sees only the repository. It needs an environment with:

- **Environment variables:** the six above, and not `UPLOADS_DIR` (`npm run photos` gets it on its own command line).
- **Network access** to `api.komoot.de`, `www.komoot.com`, `d2exd72xrrp1s7.cloudfront.net` (Komoot's photos), `<account id>.r2.cloudflarestorage.com` (R2 uploads), `s3.amazonaws.com` (Terrain Tiles for the contours), `nominatim.openstreetmap.org`, `olegs.be` and `img.olegs.be`, plus the npm registry and GitHub.
- **Setup script:** install a Node 22 recent enough for Astro (download it from nodejs.org, check it against `SHASUMS256.txt`, replace the `node` binary the container has), then `npm ci`. Add `nodejs.org` to the network access.

Notes and drafts written there are lost with the session; the trip files and the photos on R2 are what lasts.
