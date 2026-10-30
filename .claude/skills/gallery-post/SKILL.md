---
name: gallery-post
description: Publish a photo gallery to /photos from a folder of photos on the Mac, as a wizard in the chat. Use when the user asks to post, publish or add a gallery, an album or a set of photos (a city, a trip, an abandoned place, an event, a camera), and gives or will give a folder of JPEGs.
---

# Gallery from a folder of photos

`npm run photos -- --new` uploads a folder and writes a gallery file with placeholders. This is the whole flow run in the chat: the session checks the photos, asks the user only the choices that are theirs, writes the gallery and publishes it. Talk to the user in their language; the gallery itself is in English.

## 0. Before starting

- This runs on the desktop, where the photos are: the user gives the path of a folder of JPEGs on the Mac. A cloud session cannot see it: say so and stop.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `UPLOADS_DIR` must be set (in `.env`). Check that they exist; never print their values.
- `node -v` is at least the version Astro asks for (v22.23.4 today), `npm ci` has run, and the work starts from an up-to-date `main` with a clean tree.

## 1. Check the photos

- The folder holds the photos to publish and nothing else, in the order they should appear (natural file-name order: `shot 2` before `shot 10`). Large camera files are exported at 2400 px or less on the long side.
- **Metadata:** originals are uploaded unchanged and served as they are, so a photo must carry no EXIF, XMP or IPTC: they hold the camera, the exact time and often the GPS position. Check every photo:

  ```bash
  node -e "
  const sharp=require('sharp'),fs=require('fs'),p=require('path');const d=process.argv[1];
  (async()=>{let bad=0;for(const n of fs.readdirSync(d).filter(n=>/\.(jpe?g|png|webp|heic|tiff?)$/i.test(n))){const m=await sharp(p.join(d,n)).metadata();const tags=['exif','xmp','iptc'].filter(k=>m[k]);if(tags.length){bad++;console.log(n+': '+tags.join(', '))}}console.log(bad?bad+' photos still carry metadata':'no metadata')})()" "<folder>"
  ```

  If any photo still carries metadata, list them, ask the user to run the folder through ImageOptim (it strips the EXIF, GPS included) and stop until they have. Do not strip it yourself.
- Look at every photo. Note what each shows; name a place, a building or a camera model only when it can be read in the photo or the user says it.

## 2. Ask (AskUserQuestion, up to four questions at a time)

- **What and where:** the place or subject and the country, when the folder name and the photos do not settle it.
- **Date:** the shooting month and year (the day if known). It sets the gallery date and the upload folder `yyyy/mm`.
- **Genre:** one of the slugs in `src/data/taxonomies.yaml` (`abandoned-places`, `abstract`, `music-events`, `old-film-cameras`, `people`, `world-places`), recommending the one that fits.
- **Cover:** three or four candidates, each described in a line, saying which are landscape (a landscape cover fills the hero best).
- **Notes:** offer to take the user's own words for the introduction. Ask too about anything the photos raise: people who can be recognised (show them only if the user agrees, never name them unless the user does), a private house, a sign or a name that needs reading.

## 3. Build

- **Title:** the house style is `Place – Country` (`Ljubljana – Slovenia`, `Alassio (Liguria) – Italy`); an abandoned place is `Abandoned “Name” Kind – Town, Italy`. If the title is longer than 61 characters (`CARD_TITLE_MAX`), add a shorter `cardTitle` for the cards (`Abandoned “DEA” Factory – Moncalieri`).
- **Slug:** from the title, as `slugify` in `scripts/trip/wizard.ts` makes it (`Alassio (Liguria) – Italy` → `alassio-liguria-italy`). Check it is not taken in `src/content/galleries/`.
- `npm run photos -- --new <slug> "<folder>" --date <YYYY-MM-DD>` copies the photos into `UPLOADS_DIR/yyyy/mm/`, uploads them with their variants, renames them `<slug>-01.jpg`… and writes `src/content/galleries/<slug>.md`. It refuses to overwrite a gallery.
- Fill the front matter: `title` (and `cardTitle` if needed), `date` (`"YYYY-MM-DDT12:00:00"` when only the day is known), `genre`, `country` (a slug from `countries` in `src/data/taxonomies.yaml`; add the country there, in alphabetical order of its name, if it is new), `cover` with `coverWidth`/`coverHeight` from the cover photo's entry, `darkHeader: true` when the cover is light at the top or bottom.
- `npm run photos -- --covers`: makes the jpg variants of a cover that is not the first photo. Photos are webp only; covers keep jpg for link previews, search results and the feed (issue #69).
- Reorder the photos only if the user asks.

## 4. Write

- **Alt text** for every photo: English, 4 to 12 words, what the photo shows, no "photo of". People are "a man at the bar", "dancers in the crowd", never a name.
- **Introduction** below the front matter, one to three short paragraphs, as in `ljubljana-slovenia.md` or `salou-spain.md`: where and when, then what the photos show, in the order a visitor would meet it. A few facts found by searching the web (history, what the place was), checked and given to the user as sources. Read the introductions of the galleries of the same genre first and do not repeat their facts.
- **Privacy and safety:** no brands, products or gear unless they are the subject (a camera in `old-film-cameras`). Nothing the user did not say about who they were with. For an abandoned place: no way in, no access route, no hint that it can still be entered.
- **Style:** curly apostrophes and quotes (’ “ ”), an en dash with spaces in the title, no em dashes, numbers like 1,861.

## 5. Check and publish

- `npm test` and `npm run check` must pass.
- A content-only gallery goes straight to `main`: `git add src/content/galleries src/data/taxonomies.yaml`, commit as `content: <title> gallery (<Month YYYY>)`, push. If the change touched code or tests, use a branch and a pull request instead. If the push to `main` is refused, push a branch, open a pull request and tell the user.
- Wait for the deploy, then check that `/gallery/<slug>/` and the photos on `img.olegs.be/uploads/<yyyy>/<mm>/<slug>-NN.jpg` answer 200, with `curl -A 'olegs.be post check'`, so the checks show up as ours in the site's analytics and not as bot traffic.
- Tell the user what is live, what the introduction covers, and the sources.
