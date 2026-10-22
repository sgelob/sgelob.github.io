# olegs.be Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild olegs.be as a static Astro site on GitHub Pages, with all WordPress content migrated from the MySQL dump, photos served from Cloudflare R2, and the dark grid design from the spec.

**Architecture:** Three independent pieces in one repo: (1) a one-shot migration script that turns the MySQL dump into Markdown and YAML under `src/content` and `src/data`; (2) a photo pipeline that resizes the OVH uploads and pushes them to R2 under `uploads/<yyyy>/<mm>/<name>-<w>.<ext>`; (3) the Astro site, which reads only the repo and `img.olegs.be`. Infrastructure (Cloudflare, GitHub Pages, DNS) is the last phase and is done with Oleg at the keyboard.

**Tech Stack:** Node 22+, npm, TypeScript, Astro (latest, 7.x at time of writing), `@astrojs/rss`, `@astrojs/sitemap`, `photoswipe` 5, `sharp`, `turndown` + `turndown-plugin-gfm`, `@aws-sdk/client-s3` (R2 is S3-compatible), `yaml`, `vitest`, `tsx`, `@fontsource-variable/inter`, `@fontsource/ibm-plex-mono`.

**Spec:** `docs/superpowers/specs/2026-10-22-olegs-be-migration-design.md`

## Global Constraints

- Every public URL in spec §6.1 keeps its path, with trailing slash; Astro `trailingSlash: 'always'`, `build.format: 'directory'`, `site: 'https://olegs.be'`.
- Images are never stored in the repo. Every image URL is `https://img.olegs.be/uploads/<yyyy>/<mm>/<name>-<w>.<webp|jpg>` with `w ∈ {480, 960, 1600}`, or the original at `https://img.olegs.be/uploads/<yyyy>/<mm>/<name>.<ext>`. (The spec names variants `<slug-galleria>/<name>-<w>`; this plan keeps the WordPress upload path instead so one rule covers galleries, posts and pages and matches the `/wp-content/uploads/*` redirect. Same information, one scheme.)
- Dark theme only: background `#0c0c0c`, text `#ececec`, secondary `#8a8a8a`, rules `#222`. Sans: Inter (variable). Mono: IBM Plex Mono 400/500, uppercase, `letter-spacing: 0.08em`. No Google Fonts, fonts self-hosted via fontsource.
- No JavaScript on text pages except the Cloudflare Web Analytics beacon (rendered only when `PUBLIC_CF_BEACON_TOKEN` is set). The lightbox is the only other script and loads on first click.
- Gallery pages: HTML + CSS under 50 KB.
- Drafts never enter the repo. The migration writes them to `DRAFTS_DIR` (default `~/olegs-be-drafts`).
- Photo order inside a gallery = order of `<img>` tags in the WordPress `post_content`. Attachment rows give width/height; `post_parent` is ignored (5 photos belong to other posts, 1 reference has no attachment row: log it and take dimensions from the file).
- Gallery date = WordPress `post_date` as-is (local time, gmt_offset 1). Primary genre = `_yoast_wpseo_primary_genre` term when set, else the first `genre` term.
- Yoast `_yoast_wpseo_title` and `_yoast_wpseo_metadesc` are plain strings (no `%%` templates); use them verbatim when present.
- Migration verification counts: 85 galleries, 3,638 gallery photos, 39 posts, 6 pages, 188 quotes, 141 quote authors, 6 genres, 13 countries, 9 categories, 21 `_wp_old_slug` rows → 15 redirect entries (10 galleries, 5 posts; the 6 quote rows have no public URL).
- GitHub repo name: `sgelob/sgelob.github.io` (free as of 2026-10-22), public, so the preview lives at `https://sgelob.github.io/` with no base path until the custom domain is set.
- Commit after every task with a conventional-commit message. Never commit `.env`.

## Review Focus

Inputs the spec implies but no task's tests cover without the lines added below:

1. A gallery whose cover (`_thumbnail_id`) is missing or points to a deleted attachment: the card must still render, using the first photo. (Test added to Task 5.)
2. A post whose body embeds an `<iframe>` or `<script>` (70 iframes, 6 scripts in the dump): the HTML must survive Markdown conversion untouched. (Test added to Task 4.)
3. An upload URL in content with an `http://` scheme or a `-WxH` size suffix (1,915 of 3,638 gallery refs are sized): both must resolve to the same `uploads/yyyy/mm/name.ext` key. (Test added to Task 4.)
4. A genre or country with zero galleries, or a category with zero posts (`uncategorized`, `product-management`): the page must build with an empty grid, not crash in `getStaticPaths`. (Test added to Task 11 and Task 13.)
5. A photo whose original is narrower than 1600 px (1,247 files are under 1,500 px): the pipeline must not upscale and the `srcset` must only list widths that exist. (Test added to Task 8 and Task 9.)

---

### Task 1: Repository bootstrap

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`, `README.md` (stub), `public/robots.txt`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `test` (`vitest run`), `check` (`astro check`), `migrate` (`tsx scripts/migrate.ts`), `photos` (`tsx scripts/photos.ts`), `check-urls` (`tsx scripts/check-urls.ts`). Path alias `@/` → `src/`.

- [ ] **Step 1: Init git and Astro**

Run in `/Users/olegs/Projects/olegs-be`: `git init -b main`, then `npm create astro@latest -- . --template minimal --typescript strict --no-install --no-git`. Keep the generated files; delete the sample page content later.

- [ ] **Step 2: Install dependencies**

`npm install astro @astrojs/rss @astrojs/sitemap photoswipe sharp turndown turndown-plugin-gfm @aws-sdk/client-s3 yaml @fontsource-variable/inter @fontsource/ibm-plex-mono` and `npm install -D vitest tsx @types/turndown @types/node`.

- [ ] **Step 3: Configure**

`astro.config.mjs`: `site: 'https://olegs.be'`, `trailingSlash: 'always'`, `build: { format: 'directory' }`, integrations `sitemap()`. `vitest.config.ts`: use `getViteConfig` from `astro/config`, `test.include: ['tests/**/*.test.ts']`. `.gitignore`: `node_modules`, `dist`, `.astro`, `.env`, `.superpowers/`, `.photos-cache/`. `.env.example` with `R2_ACCOUNT_ID=`, `R2_ACCESS_KEY_ID=`, `R2_SECRET_ACCESS_KEY=`, `R2_BUCKET=olegs-be-img`, `PUBLIC_CF_BEACON_TOKEN=`, `DUMP_PATH=`, `UPLOADS_DIR=`, `DRAFTS_DIR=`. `public/robots.txt`: `User-agent: *` / `Allow: /` / `Sitemap: https://olegs.be/sitemap-index.xml`.

- [ ] **Step 4: Write the smoke test**

```ts
// tests/smoke.test.ts
import { test, expect } from 'vitest';
test('vitest runs', () => { expect(1 + 1).toBe(2); });
```

- [ ] **Step 5: Verify**

Run: `npm test` → PASS. Run: `npm run build` → `dist/index.html` exists.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: bootstrap astro project with vitest"
```

---

### Task 2: MySQL dump parser

**Files:**
- Create: `scripts/lib/mysqldump.ts`
- Test: `tests/mysqldump.test.ts`, `tests/fixtures/dump-mini.sql`

**Interfaces:**
- Produces: `type Row = Record<string, string | number | null>`; `type DumpTables = Map<string, Row[]>`; `parseDump(path: string, tables?: string[]): Promise<DumpTables>` — reads the file as a stream, collects column names from `CREATE TABLE` blocks, parses every `INSERT INTO \`t\` VALUES (...),(...);` line into rows keyed by column name. Handles `\'`, `\\`, `\n`, `\r`, `\0`, `''`, `NULL`, integers and floats. Only tables in `tables` are kept when given.

- [ ] **Step 1: Write the fixture**

`tests/fixtures/dump-mini.sql`: a `CREATE TABLE \`yo_posts\`` with columns `ID, post_title, post_content, post_type, post_status` and one `INSERT` line with three rows: a title containing `It\'s`, a content containing `line1\nline2` and a `NULL` status.

- [ ] **Step 2: Write the failing test**

```ts
test('parses escaped strings, NULL and numbers', async () => {
  const t = await parseDump('tests/fixtures/dump-mini.sql');
  const rows = t.get('yo_posts')!;
  expect(rows).toHaveLength(3);
  expect(rows[0].post_title).toBe("It's");
  expect(rows[1].post_content).toBe('line1\nline2');
  expect(rows[2].post_status).toBeNull();
  expect(rows[0].ID).toBe(1);
});
test('filters tables', async () => {
  const t = await parseDump('tests/fixtures/dump-mini.sql', ['yo_nope']);
  expect(t.size).toBe(0);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/mysqldump.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement `parseDump`**

Character-level scanner over the VALUES string (same approach as a hand-written tokenizer: inside quotes handle backslash escapes and doubled quotes; outside quotes split on `,` and `)`). Use `readline` over a stream; INSERT lines can be 50 KB+.

- [ ] **Step 5: Run test to verify it passes** → PASS.

- [ ] **Step 6: Integration test against the real dump (skipped when absent)**

```ts
test.skipIf(!process.env.DUMP_PATH)('real dump has the expected tables', async () => {
  const t = await parseDump(process.env.DUMP_PATH!, ['yo_posts']);
  expect(t.get('yo_posts')!.length).toBe(4572);
});
```

Run with `DUMP_PATH=~/Downloads/d919081c-b883-4c21-8468-e50babe9151d-mysql509.olegsbh680.2026-10-22-08h51 npx vitest run tests/mysqldump.test.ts` → PASS.

- [ ] **Step 7: Commit** `feat(migrate): mysql dump parser`

---

### Task 3: WordPress data access

**Files:**
- Create: `scripts/lib/wp.ts`
- Test: `tests/wp.test.ts` (extend `tests/fixtures/dump-mini.sql` with `yo_postmeta`, `yo_terms`, `yo_term_taxonomy`, `yo_term_relationships`, `yo_options`)

**Interfaces:**
- Consumes: `parseDump` (Task 2).
- Produces:
  ```ts
  type WpPost = { ID: number; post_name: string; post_title: string; post_content: string; post_excerpt: string; post_type: string; post_status: string; post_date: string; post_parent: number; guid: string; post_mime_type: string; menu_order: number };
  type WpTerm = { term_id: number; name: string; slug: string; taxonomy: string; description: string; count: number };
  type Attachment = { path: string; width: number | null; height: number | null; mime: string };  // path = "2012/08/venezia-italy-01.jpg"
  class WpDb {
    static async fromDump(path: string): Promise<WpDb>;
    posts(filter: { type: string; status?: string | string[] }): WpPost[];   // sorted by post_date desc
    post(id: number): WpPost | undefined;
    meta(postId: number, key: string): string | undefined;
    metaAll(key: string): Map<number, string>;
    terms(postId: number, taxonomy: string): WpTerm[];
    allTerms(taxonomy: string): WpTerm[];
    option(name: string): string | undefined;
    attachments(): Map<string, Attachment>;  // keyed by path; width/height parsed from serialized _wp_attachment_metadata with regex /s:5:"width";i:(\d+);s:6:"height";i:(\d+)/
  }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
test('posts filter and sort', ...)            // fixture: 2 galleries, 1 draft → posts({type:'galleries',status:'publish'}) length 2, newest first
test('meta and terms', ...)                   // meta(1,'home_short_title') === 'Short'; terms(1,'genre')[0].slug === 'abandoned-places'
test('attachments keyed by upload path', ...) // attachments().get('2012/08/a.jpg') → {width:1620,height:1080,mime:'image/jpeg'}
test.skipIf(!process.env.DUMP_PATH)('real dump counts', ...) // galleries publish 85, posts publish 39, quotes 188, attachments 3785, allTerms('quote-author') 141
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement `WpDb`.** **Step 4: Run → PASS** (also with `DUMP_PATH`).

- [ ] **Step 5: Commit** `feat(migrate): typed access to wordpress tables`

---

### Task 4: Upload paths and HTML conversion

**Files:**
- Create: `src/lib/images.ts` (shared by scripts and site), `scripts/lib/uploads.ts`, `scripts/lib/html.ts`
- Test: `tests/images.test.ts`, `tests/uploads.test.ts`, `tests/html.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/lib/images.ts (no Astro imports, plain TS so scripts can use it)
  const IMG_BASE = 'https://img.olegs.be';
  const WIDTHS = [480, 960, 1600] as const;
  variantUrl(path: string, width: number, format: 'webp' | 'jpg'): string;  // `${IMG_BASE}/uploads/2012/08/a-960.webp`
  originalUrl(path: string): string;             // `${IMG_BASE}/uploads/2012/08/a.jpg`
  srcset(path: string, format: 'webp' | 'jpg', maxWidth: number): string;   // only widths ≤ maxWidth (Review Focus 5): "…-480.webp 480w, …-960.webp 960w"
  // scripts/lib/uploads.ts
  uploadPath(url: string): string | null;        // "https://olegs.be/wp-content/uploads/2012/08/a-768x512.jpg" → "2012/08/a.jpg"; http:// too; non-upload URL → null
  stripSizeSuffix(path: string): string;
  // html.ts
  extractImages(html: string): string[];         // ordered upload paths of every <img src> that is an upload; others skipped
  stripImages(html: string): string;             // removes <img ...> tags and <div class="clearfix"></div>
  rewriteUploadUrls(html: string): string;       // every src/href that is an upload → variantUrl(path, 960, 'jpg') for <img src>, originalUrl for <a href>
  htmlToMarkdown(html: string): string;          // turndown + gfm; keep(['iframe','script']); headingStyle 'atx'; bulletListMarker '-'; blank-line-separated text becomes paragraphs
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// uploads
expect(uploadPath('http://olegs.be/wp-content/uploads/2012/08/a-768x512.jpg')).toBe('2012/08/a.jpg');
expect(uploadPath('https://olegs.be/wp-content/uploads/2012/08/a.jpg')).toBe('2012/08/a.jpg');
expect(uploadPath('https://example.com/x.jpg')).toBeNull();
expect(variantUrl('2012/08/a.jpg', 960, 'webp')).toBe('https://img.olegs.be/uploads/2012/08/a-960.webp');
expect(srcset('2012/08/a.jpg', 'webp', 1620)).toBe('https://img.olegs.be/uploads/2012/08/a-480.webp 480w, https://img.olegs.be/uploads/2012/08/a-960.webp 960w, https://img.olegs.be/uploads/2012/08/a-1600.webp 1600w');
expect(srcset('2020/01/s.jpg', 'jpg', 900)).toBe('https://img.olegs.be/uploads/2020/01/s-480.jpg 480w');   // Review Focus 5
// html
expect(extractImages('<img src="https://olegs.be/wp-content/uploads/2012/08/a-768x512.jpg"><img src="https://olegs.be/wp-content/uploads/2012/08/b.jpg">')).toEqual(['2012/08/a.jpg','2012/08/b.jpg']);
expect(htmlToMarkdown('Ciao\n\n<h2>T</h2>\n<ul>\n\t<li><a href="https://x">L</a></li>\n</ul>')).toBe('Ciao\n\n## T\n\n- [L](https://x)');
expect(htmlToMarkdown('<iframe src="https://www.youtube.com/embed/x"></iframe>')).toContain('<iframe src="https://www.youtube.com/embed/x"></iframe>');   // Review Focus 2
expect(htmlToMarkdown('<script src="https://gist.github.com/x.js"></script>')).toContain('<script src=');
expect(rewriteUploadUrls('<img src="http://olegs.be/wp-content/uploads/2016/05/c-1024x683.jpg">')).toContain('https://img.olegs.be/uploads/2016/05/c-960.jpg');  // Review Focus 3
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** **Step 4: Run → PASS.**

- [ ] **Step 5: Commit** `feat(migrate): upload path mapping and html to markdown`

---

### Task 5: Galleries migration

**Files:**
- Create: `scripts/migrate/galleries.ts`, `scripts/lib/frontmatter.ts`
- Test: `tests/galleries.test.ts`

**Interfaces:**
- Consumes: `WpDb` (Task 3), `extractImages`, `stripImages`, `htmlToMarkdown`, `uploadPath` (Task 4).
- Produces:
  ```ts
  type Photo = { src: string; width: number; height: number };
  type GalleryDoc = { slug: string; title: string; shortTitle?: string; date: string /* ISO */; genre: string; country: string; cover: string; darkHeader: boolean; photos: Photo[]; seoTitle?: string; seoDescription?: string; oldSlugs: string[]; body: string };
  buildGallery(db: WpDb, post: WpPost, warn: (msg: string) => void): GalleryDoc;
  writeMarkdown(dir: string, slug: string, frontmatter: object, body: string): void;   // frontmatter.ts, YAML via `yaml`
  ```
  Rules: `photos` from `extractImages(post_content)`; dimensions from `db.attachments()`; a path with no attachment row gets `width: 0, height: 0` and a warning (the photo pipeline fills real sizes, Task 8). `cover` = attachment path of `_thumbnail_id`, falling back to `photos[0].src` (Review Focus 1). `genre` = primary genre slug (see Global Constraints), `country` = first country slug or `world`. `oldSlugs` = all `_wp_old_slug` meta values for the post (decoded with `decodeURIComponent`). `body` = `htmlToMarkdown(stripImages(post_content))`, empty for most galleries.

- [ ] **Step 1: Write the failing tests** (fixture gallery in `dump-mini.sql` with 2 sized `<img>`, one thumbnail, one old slug; plus a gallery with a missing `_thumbnail_id`)

```ts
test('photos follow content order with attachment sizes', ...) // photos[0].src === '2012/08/a.jpg', width 1620
test('cover falls back to first photo', ...)                  // Review Focus 1
test('old slugs decoded', ...)                                // 'lubitel-%d0%bb…' → contains 'любитель'
test.skipIf(!process.env.DUMP_PATH)('all 85 galleries, 3638 photos, ≤1 size warning', ...)
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** **Step 4: Run → PASS.**

- [ ] **Step 5: Commit** `feat(migrate): galleries to markdown`

---

### Task 6: Posts and pages migration (About split into events and books)

**Files:**
- Create: `scripts/migrate/posts.ts`, `scripts/migrate/pages.ts`
- Test: `tests/posts.test.ts`, `tests/pages.test.ts`

**Interfaces:**
- Consumes: Tasks 3, 4, `writeMarkdown` (Task 5).
- Produces:
  ```ts
  type PostDoc = { slug: string; title: string; date: string; categories: string[]; cover?: string; lang: 'it' | 'en'; seoTitle?: string; seoDescription?: string; oldSlugs: string[]; excerpt: string; body: string };
  buildPost(db: WpDb, post: WpPost): PostDoc;          // body = htmlToMarkdown(rewriteUploadUrls(post_content)); lang 'it'; excerpt = post_excerpt or first paragraph of body, 200 chars
  type PageDoc = { slug: string; title: string; lang: 'it' | 'en'; seoTitle?: string; seoDescription?: string; body: string };
  buildPage(db: WpDb, post: WpPost): PageDoc;          // lang: 'it' for privacy-policy and cookie-policy, else 'en'
  splitAbout(html: string): { intro: string; events: EventYear[]; books: BookSection[]; outro: string };
  type EventYear = { year: number; entries: string[] };        // entries = each <li> inner HTML converted to Markdown
  type BookSection = { title: string; entries: string[] };     // 'Favourite Books' (ol reversed) and 'Mixed Books'
  ```
  `splitAbout`: `intro` = everything before `<h2 id="events">`; events = `<h3>YEAR</h3><ul>…</ul>` pairs until `<h2 id="books">`; books = `<h3>Section</h3><ol|ul>…` pairs until the next `<h2>`; `outro` = from `<h2>How May I Help You?</h2>` to the end. Drop `<div class="excerpt"></div>`. The About body written to `pages/about.md` is `intro + outro` in Markdown, with internal anchors `#events` and `#books` rewritten to `/events/` and `/books/`.

- [ ] **Step 1: Write the failing tests**

```ts
test('post body rewrites upload images and keeps iframes', ...)
test('post lang is it, page cookie-policy lang is it, about lang is en', ...)
test('splitAbout finds years and sections', () => { const r = splitAbout(ABOUT_FIXTURE); expect(r.events[0].year).toBe(2026); expect(r.events[0].entries[0]).toMatch(/^\[Product Heroes/); expect(r.books[0].title).toBe('Favourite Books'); expect(r.intro).toContain('Hi, I’m Oleg'); });
test.skipIf(!process.env.DUMP_PATH)('39 posts, 6 pages, 12 event years, 2 book sections', ...)
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** **Step 4: Run → PASS.**

- [ ] **Step 5: Commit** `feat(migrate): posts, pages, events and books`

---

### Task 7: Quotes, taxonomies, redirects, home config and the migrate CLI

**Files:**
- Create: `scripts/migrate/quotes.ts`, `scripts/migrate/taxonomies.ts`, `scripts/migrate/redirects.ts`, `scripts/migrate.ts`
- Test: `tests/migrate.test.ts`

**Interfaces:**
- Consumes: Tasks 3 to 6.
- Produces files (all generated, committed):
  - `src/content/galleries/<slug>.md`, `src/content/posts/<slug>.md`, `src/content/pages/<slug>.md` (slugs: `about`, `photos`, `blog`, `quotes`, `privacy-policy`, `cookie-policy`; the URL for `about` is `/agile-scrum-product-owner-manager-turin-italy/` and for `quotes` is `/my-favourite-inspirational-quotes-life-design/`, stored in frontmatter `path`).
  - `src/data/quotes.yaml`: `[{ text, author: { name, slug } }]` sorted by author name then text; `text` = `post_content` stripped of tags and trimmed.
  - `src/data/taxonomies.yaml`: `{ genres: [{slug,name,description}], countries: [...], categories: [...] }` in WordPress order by name; descriptions converted to Markdown.
  - `src/data/events.yaml`, `src/data/books.yaml` from `splitAbout`.
  - `src/data/redirects.yaml`: `[{ from: '/gallery/<old>/', to: '/gallery/<slug>/' }, { from: '/YYYY/MM/<old>/', to: '/YYYY/MM/<slug>/' }]`; quotes skipped (no public URL). Expected 15 entries (10 galleries, 5 posts); pin 15 in the integration test.
  - `src/data/home.yaml`: `{ photosIntro: '<Photos page body if non-empty, else the spec placeholder sentence>', featuredGalleries: [] }`.
  - `DRAFTS_DIR/posts/*.md`, `DRAFTS_DIR/galleries/*.md`: same format as the published ones, never inside the repo.
  - CLI: `npm run migrate -- --dump <path> [--out src] [--drafts ~/olegs-be-drafts] [--dry-run]`; prints a summary table of counts and all warnings; exits non-zero if counts differ from Global Constraints unless `--no-assert`.

- [ ] **Step 1: Write the failing tests** (run `migrate` in-process against the mini fixture into a temp dir)

```ts
test('writes galleries, posts, pages, data files and drafts outside out dir', ...)
test('redirect entries use the type-specific url pattern', ...)   // galleries → /gallery/, post → /YYYY/MM/
test.skipIf(!process.env.DUMP_PATH)('real migration counts match constraints', ...)
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** **Step 4: Run → PASS.**

- [ ] **Step 5: Run the real migration**

`DUMP_PATH=<dump> npm run migrate -- --dump "$DUMP_PATH"` → summary shows 85 / 3638 / 39 / 6 / 188 / 141 / 6 / 13 / 9. Spot-check `src/content/galleries/venezia-italy.md` (60 photos, first `2012/08/venezia-italy-01.jpg`) and `src/content/posts/podcast-naval-ravikant-dure-verita-felicita-natura-umana.md`.

- [ ] **Step 6: Commit** `feat(content): migrate wordpress content` (content files included; drafts are outside the repo)

---

### Task 8: Photo pipeline (resize, R2 upload, new-gallery scaffold)

**Files:**
- Create: `scripts/photos/resize.ts`, `scripts/photos/r2.ts`, `scripts/photos.ts`, `scripts/fetch-uploads.sh`
- Test: `tests/resize.test.ts`, `tests/photos.test.ts`, `tests/fixtures/sample-1620x1080.jpg`, `tests/fixtures/sample-900x600.jpg`

**Interfaces:**
- Consumes: `WIDTHS` (`src/lib/images.ts`), `uploadPath`, `stripSizeSuffix` (Task 4).
- Produces:
  ```ts
  type Variant = { width: number; format: 'webp' | 'jpg'; body: Buffer; key: string };
  resizeVariants(input: Buffer, key: string, widths?: readonly number[]): Promise<{ width: number; height: number; variants: Variant[] }>;  // never upscales (Review Focus 5); jpeg quality 80, webp quality 80; key like 'uploads/2012/08/a.jpg' → variant keys 'uploads/2012/08/a-480.webp' etc.
  interface ObjectStore { listKeys(prefix: string): Promise<Set<string>>; put(key: string, body: Buffer, contentType: string): Promise<void>; }
  class R2Store implements ObjectStore { constructor(env: { accountId; accessKeyId; secretAccessKey; bucket }) }  // S3 client, endpoint https://<accountId>.r2.cloudflarestorage.com, region 'auto'
  processUploads(opts: { uploadsDir: string; store: ObjectStore; widths?: number[]; dryRun?: boolean; log: (s: string) => void }): Promise<{ files: number; uploaded: number; skipped: number; sizes: Map<string, {width:number;height:number}> }>;
  // walks uploadsDir recursively, ignores files matching /-\d+x\d+\.(jpe?g|png|gif|webp)$/i and non-images, uploads the original plus every variant whose key is not already in listKeys('uploads/')
  scaffoldGallery(opts: { slug: string; folder: string; store: ObjectStore; contentDir: string; date?: Date }): Promise<string>;  // copies photos into uploads/<yyyy>/<mm>/ naming, runs processUploads on them, writes src/content/galleries/<slug>.md with title from slug, genre/country placeholders, photos in filename order with real sizes; returns the file path
  ```
  CLI: `npm run photos -- --uploads <dir> [--dry-run] [--width 2400]` and `npm run photos -- --new <slug> <folder>`. Reads R2 env from `.env`.
  Also: `scripts/photos/fill-sizes.ts` step inside `processUploads`: when `sizes` is returned, `photos.ts --fix-sizes` rewrites any gallery photo with `width: 0` using the measured size.

- [ ] **Step 1: Write the failing tests**

```ts
test('variants never exceed the original width', async () => { const r = await resizeVariants(sample900, 'uploads/2020/01/s.jpg'); expect(r.variants.map(v => v.width)).toEqual([480, 480]); /* webp+jpg at 480 only */ });  // Review Focus 5
test('1620 source yields 480, 960, 1600 in both formats', ...)   // 6 variants + keys end with '-960.webp' etc.
test('processUploads skips -WxH files and existing keys', ...)    // in-memory ObjectStore fake with one key pre-populated → uploaded count excludes it
test('scaffoldGallery writes frontmatter with sizes in filename order', ...)
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement with `sharp`.** **Step 4: Run → PASS.**

- [ ] **Step 5: Dry run on the real uploads folder**

Download first: `scripts/fetch-uploads.sh` (curl over FTP, listing recursively, skipping `-WxH` names; credentials from `OVH_FTP_USER`/`OVH_FTP_PASS` env, never in the repo) into `UPLOADS_DIR`. Verify `find "$UPLOADS_DIR" -type f | wc -l` → 3784. Then `npm run photos -- --uploads "$UPLOADS_DIR" --dry-run` → reports 3784 files, 0 uploaded (dry), no errors.

- [ ] **Step 6: Commit** `feat(photos): resize pipeline and r2 upload`

---

### Task 9: Content collections, image helpers, site helpers

**Files:**
- Create: `src/content.config.ts`, `src/lib/site.ts`, `src/lib/collections.ts`
- Test: `tests/collections.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // content.config.ts: collections 'galleries', 'posts', 'pages' with glob loaders over src/content/<name>/*.md; zod schemas mirroring GalleryDoc / PostDoc / PageDoc frontmatter (photos: array of {src, width, height}; date: z.coerce.date()).
- Consumes: `variantUrl`, `srcset` from `src/lib/images.ts` (Task 4).
  // site.ts
  SITE = { name: 'olegs', author: 'Olegs Belousovs', description: 'Product Management and Photography', url: 'https://olegs.be', email: '<from WordPress menu mailto>' };
  formatMonthYear(d: Date, lang: 'en' | 'it'): string;  // 'August 2012' / 'agosto 2012'
  formatDate(d: Date, lang): string;                     // 'April 16, 2025' / '16 aprile 2025'
  // collections.ts
  getGalleries(): Promise<Gallery[]>;           // sorted date desc
  getGalleriesBy(tax: 'genre' | 'country', slug: string): Promise<Gallery[]>;
  getPosts(): Promise<Post[]>;                  // sorted date desc
  getPostsBy(category: string): Promise<Post[]>;
  postPath(post): string;                       // `/${yyyy}/${mm}/${slug}/`
  galleryPath(g): string;                       // `/gallery/${slug}/`
  neighbours(galleries, slug): { prev?: Gallery; next?: Gallery };
  ```

- [ ] **Step 1: Write the failing tests**

```ts
expect(postPath({ data: { date: new Date('2016-05-03T10:00:00'), }, id: 'x' } as any)).toBe('/2016/05/x/');
expect(formatMonthYear(new Date('2012-08-11'), 'en')).toBe('August 2012');
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** **Step 4: Run → PASS; `npm run check` passes against the migrated content.**

- [ ] **Step 5: Commit** `feat(site): content collections and helpers`

---

### Task 10: Base layout, design tokens, navigation, 404

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/Seo.astro`, `src/pages/404.astro`
- Modify: `src/pages/index.astro` (temporary: Base layout with a heading; replaced in Task 14)
- Test: `tests/layout.test.ts` (Astro container API: render `Base.astro` to a string)

**Interfaces:**
- Produces: `Base.astro` props `{ title: string; description?: string; lang?: 'en' | 'it'; ogImage?: string; canonical?: string }`; slot default. CSS custom properties on `:root`: `--bg: #0c0c0c; --fg: #ececec; --muted: #8a8a8a; --rule: #222; --gutter: 48px (16px under 720px); --font-sans; --font-mono`. Utility class `.mono` (mono, uppercase, 11px, letter-spacing .08em). `Seo.astro` renders `<title>`, description, canonical (`site + Astro.url.pathname`), Open Graph, `<link rel="alternate" type="application/rss+xml" href="/feed.xml">`. Beacon: `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"…"}'>` only if `import.meta.env.PUBLIC_CF_BEACON_TOKEN`.
- Nav: left `olegs` (bold sans, link to `/`), right mono links `Photos` `/photos/`, `Blog` `/blog/`, `About` `/agile-scrum-product-owner-manager-turin-italy/`; current section underlined. Footer: mono, `© <year> Olegs Belousovs`, links Email, RSS, Privacy.

- [ ] **Step 1: Write the failing test**

```ts
test('Base renders nav links and no beacon without token', async () => { const html = await render(Base, { props: { title: 'T' }, slots: { default: 'X' } }); expect(html).toContain('href="/photos/"'); expect(html).not.toContain('cloudflareinsights'); expect(html).toContain('<html lang="en"'); });
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement layout, CSS, fonts (import fontsource CSS in `Base.astro`).** The test's `render` helper wraps Astro's container API (`experimental_AstroContainer` from `astro/container`, or its stable name in the installed Astro version); put it in `tests/helpers/render.ts` for reuse. **Step 4: Run → PASS; `npm run build` emits `dist/404.html`.**

- [ ] **Step 5: Commit** `feat(site): base layout, tokens, nav, 404`

---

### Task 11: Photos index, genre and country pages

**Files:**
- Create: `src/components/Pic.astro`, `src/components/GalleryCard.astro`, `src/components/GalleryGrid.astro`, `src/components/PhotosHeader.astro`, `src/pages/photos/index.astro`, `src/pages/photos/genre/[slug].astro`, `src/pages/photos/country/[slug].astro`
- Test: `tests/build-photos.test.ts` (reads `dist/` after `astro build`)

**Interfaces:**
- Consumes: Task 9 helpers, Task 10 layout.
- Produces: `Pic.astro` props `{ src: string; width: number; height: number; alt: string; sizes: string; maxWidth?: number; loading?: 'lazy' | 'eager'; class?: string }` → `<picture>` with webp `srcset` + jpg fallback, `width`/`height` attributes. `GalleryCard.astro` props `{ gallery }` → cover `Pic` at 4:3 (`object-fit: cover`), caption row mono: `shortTitle ?? title` left, `Country · YYYY` right. `GalleryGrid.astro` props `{ galleries }` → 4/2/1 column CSS grid, gap 24px. `PhotosHeader.astro` props `{ intro?: string; active: string }` → intro sentence (sans 28px) and the genre filter row from `taxonomies.yaml` with `All` first.

- [ ] **Step 1: Write the failing test**

```ts
beforeAll(() => execSync('npm run build'));
test('photos index lists 85 cards with webp srcset', () => { const html = read('dist/photos/index.html'); expect(count(html, 'class="gallery-card"')).toBe(85); expect(html).toContain('-480.webp 480w'); });
test('genre page filters', () => { expect(count(read('dist/photos/genre/abandoned-places/index.html'), 'class="gallery-card"')).toBe(29); });
test('country with galleries builds; every taxonomy slug has a page', () => { for (const slug of ['italy','russia','usa']) expect(existsSync(`dist/photos/country/${slug}/index.html`)).toBe(true); });  // Review Focus 4: 'usa' has 0 galleries
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** `getStaticPaths` iterates `taxonomies.yaml`, not the galleries, so empty terms still get a page. **Step 4: Run → PASS.**

- [ ] **Step 5: Commit** `feat(site): photos index, genre and country pages`

---

### Task 12: Gallery page with cover, justified grid and lightbox

**Files:**
- Create: `src/components/GalleryHero.astro`, `src/components/JustifiedGrid.astro`, `src/components/Lightbox.astro`, `src/components/Redirect.astro`, `src/pages/gallery/[slug].astro`
- Test: `tests/build-gallery.test.ts`

**Interfaces:**
- Consumes: Tasks 9 to 11.
- Produces: `GalleryHero.astro` props `{ gallery }` → full-bleed cover (`Pic` 1600 max, `loading="eager"`, 640px tall on desktop, 60vw mobile, 25% black overlay), title (sans 44px), meta row mono: country name, genre name, `formatMonthYear`, `N photos`. `JustifiedGrid.astro` props `{ photos: Photo[]; galleryTitle: string }` → CSS-only justified rows: each `<a class="ph" href=original data-pswp-width data-pswp-height style="--r: w/h">` with `flex-grow: var(--r); width: calc(var(--r) * 300px); aspect-ratio: var(--r)` inside a `display:flex; flex-wrap:wrap; gap:8px` container, plus a trailing spacer `flex-grow: 10000`. Target row height 300px desktop, 180px mobile. `Lightbox.astro` → `<script>` that, on first click inside `.justified`, dynamically imports `photoswipe/lightbox` and `photoswipe/style.css`, binds `gallery: '.justified', children: 'a.ph'`, opens the clicked index. Page bottom: mono prev/next links from `neighbours()`; `body` Markdown rendered between hero and grid when present.
- `Redirect.astro` props `{ to: string }` → minimal HTML with `<meta http-equiv="refresh" content="0; url=TO">`, `<link rel="canonical" href="https://olegs.be + TO">`, `<meta name="robots" content="noindex">` and a text link. `[slug].astro`'s `getStaticPaths` yields both real galleries and `redirects.yaml` entries whose `from` starts with `/gallery/`, passing `props.redirectTo`; Task 13 and Task 14 reuse `Redirect.astro`.

- [ ] **Step 1: Write the failing test**

```ts
test('venezia gallery renders 81 photos, hero, neighbours', () => { const html = read('dist/gallery/venezia-italy/index.html'); expect(count(html, 'class="ph"')).toBe(81); expect(html).toContain('data-pswp-width="1620"'); expect(html).toContain('81 photos'); expect(html).toMatch(/href="\/gallery\/[a-z0-9-]+\/"[^>]*rel="prev"/); });
test('gallery html stays under 50 KB and has no inline photoswipe', () => { const html = read('dist/gallery/berlin-germany/index.html'); expect(Buffer.byteLength(html)).toBeLessThan(50 * 1024); expect(html).not.toContain('PhotoSwipeLightbox'); });
test('old gallery slug builds a redirect page', () => { expect(read('dist/gallery/tarragona-spain/index.html')).toContain('http-equiv="refresh" content="0; url=/gallery/tarragona-catalonia-spain/"'); });
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** **Step 4: Run → PASS.**

- [ ] **Step 5: Commit** `feat(site): gallery page with justified grid and lightbox`

---

### Task 13: Blog, categories, date archives, post page, RSS

**Files:**
- Create: `src/layouts/Reading.astro`, `src/components/PostList.astro`, `src/pages/blog/index.astro`, `src/pages/category/[slug].astro`, `src/pages/[year]/index.astro`, `src/pages/[year]/[month]/index.astro`, `src/pages/[year]/[month]/[slug].astro`, `src/pages/feed.xml.ts`
- Test: `tests/build-blog.test.ts`

**Interfaces:**
- Consumes: Task 9, 10.
- Produces: `Reading.astro` (Base + 680px column, prose styles for h2/h3/ul/ol/blockquote/code/iframe at column width). `PostList.astro` props `{ posts; heading?: string }` → mono date and category, sans 17px title, excerpt. `[year]/[month]/[slug].astro`: `getStaticPaths` yields posts plus `redirects.yaml` entries matching `/YYYY/MM/<old>/`; renders `Reading` with `lang` from frontmatter, title, mono date and categories, body via `render()`. `feed.xml.ts`: `@astrojs/rss` with all posts, `link: postPath`, `description: excerpt`.

- [ ] **Step 1: Write the failing test**

```ts
test('blog index lists 39 posts; empty category builds', () => { expect(count(read('dist/blog/index.html'), 'class="post-item"')).toBe(39); expect(existsSync('dist/category/product-management/index.html')).toBe(true); });  // Review Focus 4
test('post page keeps iframe and uses it lang', () => { const html = read('dist/2017/04/video-slide-wordpress-wordcamp-torino-2017/index.html'); expect(html).toContain('<iframe'); expect(html).toContain('<html lang="it"'); });
test('year and month archives and feed exist', () => { for (const p of ['dist/2016/index.html','dist/2016/05/index.html','dist/feed.xml']) expect(existsSync(p)).toBe(true); expect(read('dist/feed.xml')).toContain('<item>'); });
test('old post slug redirects', () => { expect(read('dist/2018/01/web-performance-fattore-ranking-siti-web-carlo-piazzano/index.html')).toContain('url=/2018/01/web-performance-fattore-ranking-seo-siti-web-carlo-piazzano/'); });
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** **Step 4: Run → PASS.**

- [ ] **Step 5: Commit** `feat(site): blog, archives, post page, rss`

---

### Task 14: Home, About, Events, Books, Quotes, authors, policies, redirects

**Files:**
- Create: `src/pages/index.astro` (replace), `src/pages/[page].astro`, `src/pages/events.astro`, `src/pages/books.astro`, `src/pages/my-favourite-inspirational-quotes-life-design.astro`, `src/pages/quote-author/[slug].astro`, `src/components/QuoteList.astro`
- Test: `tests/build-home.test.ts`

**Interfaces:**
- Consumes: Tasks 9 to 13, `home.yaml`, `quotes.yaml`, `events.yaml`, `books.yaml`.
- Consumes also `Redirect.astro` (Task 12).
- Produces: Home: intro = first two paragraphs of `pages/about.md` rendered at 30px sans, mono link row (`Events ↗ /events/`, `Books ↗ /books/`, `Quotes ↗ /my-favourite-…/`, `Email ↗ mailto`), `Photos` section with `featuredGalleries` (else 4 most recent) in `GalleryGrid` and `All 85 galleries ↗` (count computed), `Blog` section with 3 latest in `PostList`. `[page].astro`: `getStaticPaths` from the `pages` collection using frontmatter `path`, excluding `photos`, `blog`, `quotes` (own templates); renders `Reading`. Quotes page: `QuoteList` grouped by author with `<h2 id=slug>` anchors; `quote-author/[slug].astro` renders the same list filtered, title = author name.

- [ ] **Step 1: Write the failing test**

```ts
test('home has intro, 4 gallery cards, 3 posts', () => { const html = read('dist/index.html'); expect(html).toContain('Hi, I’m Oleg'); expect(count(html,'class="gallery-card"')).toBe(4); expect(count(html,'class="post-item"')).toBe(3); expect(html).toContain('All 85 galleries'); });
test('about keeps its slug, events and books exist', () => { for (const p of ['dist/agile-scrum-product-owner-manager-turin-italy/index.html','dist/events/index.html','dist/books/index.html','dist/privacy-policy/index.html','dist/cookie-policy/index.html']) expect(existsSync(p)).toBe(true); expect(read('dist/events/index.html')).toContain('2026'); });
test('quotes page and 141 author pages', () => { expect(count(read('dist/my-favourite-inspirational-quotes-life-design/index.html'), 'class="quote"')).toBe(188); expect(readdirSync('dist/quote-author').length).toBe(141); });
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** **Step 4: Run → PASS.**

- [ ] **Step 5: Commit** `feat(site): home, about, events, books, quotes, redirects`

---

### Task 15: URL coverage check against the live site's URL set

**Files:**
- Create: `scripts/fetch-live-urls.ts`, `scripts/check-urls.ts`, `tests/fixtures/live-urls.txt` (generated once, committed)
- Test: `tests/check-urls.test.ts`

**Interfaces:**
- Produces: `fetch-live-urls.ts` reads `https://olegs.be/sitemap_index.xml` recursively plus the slugs of `taxonomies.yaml` (`/category/<slug>/`, `/photos/country/<slug>/`) and `quotes.yaml` authors (`/quote-author/<slug>/`), writes one path per line. `checkUrls(base: string, paths: string[]): Promise<{ path: string; status: number }[]>` with concurrency 8; CLI `npm run check-urls -- --base http://localhost:4321 [--file tests/fixtures/live-urls.txt]` prints failures and exits 1 when any status is not 200 (a redirect page is a 200 with meta refresh, which is what GitHub Pages will serve).

- [ ] **Step 1: Generate the fixture** `npx tsx scripts/fetch-live-urls.ts > tests/fixtures/live-urls.txt`; expect about 134 sitemap URLs (39 + 4 + 85 + 6) plus 9 + 13 + 141 = about 297 lines.

- [ ] **Step 2: Write the failing test** (unit, with a local `http.createServer` returning 200 for `/a/` and 404 for `/b/`): `expect(await checkUrls(base, ['/a/','/b/'])).toEqual([{path:'/a/',status:200},{path:'/b/',status:404}])`.

- [ ] **Step 3: Run → FAIL. Step 4: Implement. Step 5: Run → PASS.**

- [ ] **Step 6: Full check**: `npm run build && (npm run preview & sleep 3; npm run check-urls -- --base http://localhost:4321; kill %1)` → `0 failures`. Fix any missing route before moving on.

- [ ] **Step 7: Commit** `test: live url coverage check`

---

### Task 16: GitHub repository, Actions deploy, Pages preview

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md` (how to update the site: new gallery, new post, run migrate, run photos)

**Interfaces:**
- Produces: workflow on `push` to `main`: checkout, `actions/setup-node` 22 with npm cache, `npm ci`, `npm test`, `npm run build`, `actions/upload-pages-artifact` (`dist`), `actions/deploy-pages`. Permissions `pages: write`, `id-token: write`. Secret `PUBLIC_CF_BEACON_TOKEN` passed as env (empty until Task 17).

- [ ] **Step 1: Create the repo and push**

```bash
gh repo create sgelob/sgelob.github.io --public --source=. --remote=origin --push
gh api -X POST repos/sgelob/sgelob.github.io/pages -f build_type=workflow
```

- [ ] **Step 2: Verify** the Actions run is green (`gh run watch`), then `curl -sI https://sgelob.github.io/photos/ | head -1` → `200`, and `npm run check-urls -- --base https://sgelob.github.io` → 0 failures (images 404 until Task 17, pages fine).

- [ ] **Step 3: Commit** `ci: deploy to github pages`

---

### Task 17: Cloudflare zone, R2, redirects, analytics, real photo upload (with Oleg)

Manual steps in the Cloudflare dashboard or via the Cloudflare MCP server installed on 2026-10-22; each has a verification command.

- [ ] **Step 1: Add zone `olegs.be`** to Oleg's Cloudflare account (free plan). Let Cloudflare import the existing DNS records, then delete the OVH `MX` records and the OVH `SPF` TXT; add TXT `v=spf1 -all`. Do not change nameservers yet.

- [ ] **Step 2: R2**: create bucket `olegs-be-img`; add custom domain `img.olegs.be`; create an R2 API token (Object Read & Write, this bucket) and put `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` in local `.env`.

- [ ] **Step 3: Upload the photos**: `npm run photos -- --uploads "$UPLOADS_DIR"` → `3784 files, uploaded ≈ 26,500 objects` (originals + up to 6 variants each; fewer for small files). Then `npm run photos -- --fix-sizes` and commit any gallery file that changed. Verify: `curl -sI https://img.olegs.be/uploads/2012/08/venezia-italy-01-960.webp | head -1` → `200` (works only after Step 6; before that use the R2 S3 endpoint listing: `npx tsx -e "…listKeys…"` count).

- [ ] **Step 4: Redirect Rules** (Rules → Redirect Rules): `www.olegs.be/*` → `https://olegs.be/${1}` 301; `olegs.be/feed/` → `https://olegs.be/feed.xml` 301; `olegs.be/wp-content/uploads/*` → `https://img.olegs.be/uploads/${1}` 301. SSL/TLS: mode Full, "Always Use HTTPS" on.

- [ ] **Step 5: Web Analytics**: add site `olegs.be`, copy the beacon token into the GitHub secret `PUBLIC_CF_BEACON_TOKEN` (`gh secret set PUBLIC_CF_BEACON_TOKEN`), trigger a deploy, verify `curl -s https://sgelob.github.io/ | grep -c cloudflareinsights` → `1`.

- [ ] **Step 6: Prepare DNS records** in the Cloudflare zone (inactive until nameservers move): `A olegs.be` → `185.199.108.153`, `.109.153`, `.110.153`, `.111.153` (proxied), `AAAA` → `2606:50c0:8000::153`, `8001::153`, `8002::153`, `8003::153` (proxied), `CNAME www` → `sgelob.github.io` (proxied). `img` is managed by R2.

- [ ] **Step 7: Commit** any content changes from `--fix-sizes`: `chore(content): fill measured photo sizes`.

---

### Task 18: Switch and decommission (with Oleg)

- [ ] **Step 1: Custom domain on GitHub Pages**: add `public/CNAME` containing `olegs.be`, commit `chore: custom domain`, push; in repo settings → Pages set custom domain `olegs.be`.

- [ ] **Step 2: Nameservers**: in the OVH manager change olegs.be nameservers to the two Cloudflare ones shown in the zone overview. Wait until `dig +short NS olegs.be` returns them (minutes to hours).

- [ ] **Step 3: Enforce HTTPS** on GitHub Pages once the certificate is issued (`gh api repos/sgelob/sgelob.github.io/pages --jq .https_enforced` → `true` after enabling).

- [ ] **Step 4: Verify everything**: `npm run check-urls -- --base https://olegs.be` → 0 failures; `curl -sI https://www.olegs.be/ | grep -i location` → `https://olegs.be/`; `curl -sI https://olegs.be/feed/ | grep -i location` → `/feed.xml`; `curl -sI https://olegs.be/wp-content/uploads/2012/08/venezia-italy-01.jpg | grep -i location` → `https://img.olegs.be/uploads/2012/08/venezia-italy-01.jpg`; `curl -sI https://img.olegs.be/uploads/2012/08/venezia-italy-01-960.webp | head -1` → `200`; open `https://olegs.be/gallery/venezia-italy/` and click a photo: lightbox opens.

- [ ] **Step 5: Jetpack**: Oleg exports newsletter subscribers from WordPress.com if any exist (Jetpack → Subscribers → Export) before Step 6.

- [ ] **Step 6: Two weeks later**: cancel the OVH hosting plan (keep the domain), change the OVH FTP password beforehand, delete `UPLOADS_DIR` copies only after confirming the R2 object count matches.

- [ ] **Step 7: Deliver the drafts folder** path to Oleg and note it in `README.md`.

---

## Self-review notes

- Spec §4.2 names variant files `<slug-galleria>/<name>-<w>`; this plan uses `uploads/<yyyy>/<mm>/<name>-<w>` (Global Constraints) so one scheme serves galleries, posts and pages and the originals redirect. Same information, documented divergence.
- Spec §5.2 "4 galleries in evidenza in a config file, else the 4 most recent": Task 14 (`home.yaml.featuredGalleries`).
- Spec §6.1 year/month archives: Task 13. Quote author pages: Task 14. 404: Task 10. Sitemap: Task 1 integration. RSS: Task 13. Redirect pages: `Redirect.astro` created in Task 12, reused in Tasks 13 and 14.
- Spec §6.4 50 KB gallery page: Task 12 test. No JS on text pages: Task 10 test (no beacon without token) plus Task 13 post page is built from `Reading.astro` which includes no script.
- Spec §6.5 new gallery flow: Task 8 `--new`. README: Task 16.
- Drafts outside the repo: Task 7.
