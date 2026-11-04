---
title: Colophon
path: /colophon/
lang: en
seoTitle: Colophon – how olegs.be is built
seoDescription: "How olegs.be is made: a static site built with Astro from Markdown and YAML, light pages, images on a CDN, search in the browser, and no cookies."
---

How this site is made, for the curious. I spent years on web performance, so this page is also a promise: the site should stay fast, light and respectful of the people who read it.

## Built from text files

The whole site is a **static site** built with [Astro](https://astro.build/): no database and no server code, just HTML pages made in advance. Every post, gallery, trip, book and record is a Markdown or YAML file in a [public repository on GitHub](https://github.com/sgelob/sgelob.github.io), so the content is plain text I can read, move and keep for decades.

Until October 2026 it ran on WordPress. I moved it in a little over a week, working with an AI coding agent, and I told the story in [a blog post, in Italian](/2026/10/migrazione-sito-wordpress-astro-sito-statico-claude-code/).

## Hosting and publishing

- The pages are served by **GitHub Pages**, behind **Cloudflare**.
- Every change I push is built and published by a workflow in a few minutes.
- The site also rebuilds itself **every morning**, so the home page shows a new quote, a new record and new galleries each day.

## Light pages

- **No JavaScript framework.** Pages are plain HTML and CSS; the few scripts there are load only where they are needed: the photo lightbox, the record player, the search, and the video players, each a couple of kilobytes.
- **The stylesheet is inlined** (about 8 KB), so a page needs a single request to show its text.
- The **home page is about 37 KB** of HTML, **8 KB** compressed.
- **Videos are click-to-play:** nothing loads from the video site until you press play.
- **Links load ahead:** hovering a link fetches its page in the background, so the click lands on a page that is already there.

## Images

- Photos are served from **img.olegs.be**, a storage bucket behind the same CDN, in **WebP** at three sizes (480, 960 and 1600 px), so each screen gets the smallest file that looks sharp on it.
- Every image has its width and height, so nothing jumps while the page loads, and an alt text that says what it shows.

## Fonts

- **Inter** for the text and **IBM Plex Mono** for the small labels.
- Both are served from this site, not from a font service.

## Search

- The [search](/search/) runs **in your browser** with **Pagefind**: the index is built with the site and downloaded in small pieces as you type.
- No query ever reaches a server.

## Outdoors

- The trips come from the tours I record outdoors. Each has a downloadable **GPX** track and a small **contour map** drawn from the terrain.
- Where a tour starts or ends at home, the track is shortened and the date is only approximate.

## Privacy

- **No cookies**, no ads and no trackers.
- Visits are counted with the CDN’s privacy-first analytics, which uses no cookies.
- The email address is protected from spam bots.

## Quality

- Before anything is published, **more than 400 automated tests** check the pages: that every old link still works, that pages stay under their size budgets, that the photos have alt texts, and that the main pages pass automatic accessibility checks.
- A strict content security policy lets the browser load scripts only from the site itself and from the analytics service.

---

If something on the site is slow, broken or hard to use, I’d like to know: [write to me](mailto:44_tildes_agog@icloud.com?subject=Message%20from%20olegs.be).
