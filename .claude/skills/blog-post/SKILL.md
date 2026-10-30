---
name: blog-post
description: Write and publish a post to the blog (/blog/, URL /YYYY/MM/<slug>/) in Oleg's own voice, as a wizard in the chat. Use when the user asks to write, draft, publish or add a blog post or an article, or to turn notes, an idea issue, a talk, a podcast or a book into a post.
---

# Blog post in Oleg's voice

Posts are Markdown files in `src/content/posts/`. This is the whole flow run in the chat: the session gathers the material, asks the user only the choices that are theirs, writes the post in the voice of the existing ones, shows the draft, and publishes it. Talk to the user in their language; the post is in Italian unless they ask otherwise (`lang: en`).

## 0. Before starting

- `node -v` is at least the version Astro asks for (v22.23.4 today) and `npm ci` has run. Start from an up-to-date `main` with a clean tree.
- For images: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET` must be set; never print them. In the cloud `UPLOADS_DIR` is not set: give it to each `npm run photos` command only (`UPLOADS_DIR=./olegs-be-data/uploads`).
- Read three or four posts close to the new one before writing a line, and always the most recent (`ls -t src/content/posts`, or sort by `date:`): the style below is a summary, the posts are the reference.

## 1. Gather

- The source: the user's notes, an idea issue (read it with the GitHub tools, comments included), a talk, a podcast, a book, a link. Read it whole.
- Facts, figures and quotes in the post are checked by searching the web; every one is linked to its source in the text and given to the user as a source list. Nothing invented: no figure, quote or anecdote the source or the user did not give.
- Look for the posts and pages of the site it can link to (galleries, trips, records, books, events, other posts): the existing posts link to each other and to the site freely.

## 2. Ask (AskUserQuestion, up to four questions at a time)

- **Angle:** what the post should leave the reader with, and who it is for, when the source does not settle it. Offer two or three angles, recommending one.
- **Personal side:** the posts are first person and anchored in Oleg's own experience. Ask for the personal story or example that opens it, if the notes have none. Never make one up.
- **Category:** one or two slugs from `categories` in `src/data/taxonomies.yaml` (`design`, `meetup`, `organization`, `personal-growth`, `product-management`, `user-experience`, `web-performance`, `wordpress`), recommending one.
- **Cover:** none, or one of the user's images (a path, or an attachment), or a photo already on the site. People who can be recognised are shown only if the user agrees.
- **Date:** today unless the user says otherwise.

## 3. Write in his voice

What the existing posts do, and the new ones keep doing:

- **Person and address:** first person, talking to the reader as *tu*: «Ti racconto…», «Ti consiglio…», «Vediamo insieme…». Plain, warm, direct; never academic or corporate.
- **Opening:** straight in with a concrete personal moment or the occasion of the post («L’altro giorno ho ascoltato…», «Ho scritto questo articolo su carta, mentre…», «Era cominciato tutto nel 2011…»). No preamble about what the post will do.
- **Body:** short paragraphs; `##` headings that say the point, often as a statement or a question («Disattiva completamente le notifiche sui tuoi dispositivi», «Dove vorrei arrivare con questo discorso?»). Lists for steps and takeaways, items ending with `;` and the last with `.`.
- **Emphasis:** the key phrase of a paragraph in **bold**, one or two per paragraph at most; *italics* for a term or a light aside.
- **Links:** inline on the words they support, to the primary source (studies, docs, the speaker's site, the book), never a bare URL in running text. Quotes in a `>` blockquote with the person named before it.
- **Tone marks:** an aside in parentheses, an ellipsis (`…`) to trail off, the occasional emoji in personal and lighter posts (🙂 😉), none in technical ones. Recent posts are more sober than the 2016 ones: match the most recent unless the subject is personal and light.
- **Ending:** a short closing thought, often a thank-you to the people involved, and for personal or practical topics an italic question to the reader («*E tu tieni traccia dei tuoi soldi?…*»).
- **Typography:** Italian quotation marks «…», curly apostrophes (’), an en dash with spaces (–) in titles and asides, no em dashes, the ellipsis character (…).
- **Length:** like the posts of the same kind: a recap or a podcast summary is short; a how-to with sections is long. Do not pad.
- **Privacy:** nothing about other people the user did not say; family and friends only as the user names them.
- **No company or brand names**: no companies, brands, products or services (also as comparisons, «like X»), in the post, its title, excerpt, alt texts and in the idea issues, unless the user explicitly asks for a name. Describe them generically instead.

## 4. Build

- **File name (slug):** Italian keywords of the title, lowercase, words joined by `-`, articles and most prepositions dropped, accents removed (`come-essere-produttivo-usando-email-modo-efficiente-ridurre-distrazioni`, `podcast-naval-ravikant-dure-verita-felicita-natura-umana`). It becomes `/YYYY/MM/<slug>/`. Check it is not taken.
- **Front matter**, in this order:
  - `title`: the headline as a sentence, «…» for titles of books or talks, an en dash before a subtitle.
  - `date`: quoted local time, `"YYYY-MM-DDTHH:MM:SS"` (unquoted, YAML reads it as UTC).
  - `categories`: the slugs chosen.
  - `cover`: `yyyy/mm/file.jpg` under uploads, or left out.
  - `lang: it` (or `en`).
  - `seoTitle` and `seoDescription`: only when the title is not a good search title or is longer than about 60 characters; the description under about 160 characters.
  - `oldSlugs: []`.
  - `excerpt`: one or two sentences in the post's voice that tell the reader what they will get; it shows on the blog index and in feeds. Quote it if it holds a colon.
- **Images:** put the file in `UPLOADS_DIR/yyyy/mm/` with a descriptive name, run `npm run photos -- --uploads <UPLOADS_DIR>` (in the cloud, `UPLOADS_DIR=./olegs-be-data/uploads` before it), then reference a variant: `![Alt in Italian](https://img.olegs.be/uploads/yyyy/mm/name-960.jpg)`. `-960` only when the original is at least 960 px wide, `-480` when narrower, the original below 480 px; a GIF always as the original. Every image has an Italian alt text that says what it shows.

## 5. Show, check, publish

- Show the user the draft (title, excerpt, the text) before publishing, and change what they ask.
- **Nothing goes to GitHub until the user has read and approved the content locally**: no commit and no push, not even to a draft branch, until they say to publish. The draft stays an uncommitted file in the working tree; send it to the user (SendUserFile) after each change. If a hook asks to commit the untracked draft, do not: tell the user the draft is waiting for their approval.
- Code the post needs (a test that counts posts, for example) goes in its own pull request, without the post.
- `npm test` and `npm run check` must pass (in the cloud run `npm test` with `UPLOADS_DIR` unset, as CI does).
- A content-only post goes straight to `main`: `git add src/content/posts` (and the data or image files it needs), commit as `content(blog): <title>`, push. If the push to `main` is refused, push a branch, open a pull request and tell the user.
- Wait for the deploy, then check that `/YYYY/MM/<slug>/` and its images answer 200, with `curl -A 'olegs.be post check'`.
- If the post came from an idea issue, comment on the issue with the link and close it as completed.
- Tell the user what is live, and the sources.
