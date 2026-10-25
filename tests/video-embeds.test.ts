import { readdirSync } from 'node:fs';
import { markdownToHtml } from 'satteri';
import { describe, expect, test } from 'vitest';
import { read } from './helpers/dist';
import { hasVideoEmbed, videoEmbeds, videoFacades, videoFor } from '../src/lib/video-embeds';

describe('videoFor', () => {
  test('YouTube: the watch page and the no-cookie player, keeping a playlist', () => {
    expect(videoFor('https://www.youtube.com/embed/flL60i2Yg5w')).toEqual({
      watch: 'https://www.youtube.com/watch?v=flL60i2Yg5w',
      embed: 'https://www.youtube-nocookie.com/embed/flL60i2Yg5w?autoplay=1',
      host: 'YouTube',
    });
    expect(videoFor('https://www.youtube.com/embed/biFdRKVdVqo?list=PLx')?.embed).toBe('https://www.youtube-nocookie.com/embed/biFdRKVdVqo?autoplay=1&list=PLx');
  });

  test('VideoPress, from both its embed and its /v/ address', () => {
    expect(videoFor('https://videopress.com/embed/06cSoNri')).toEqual({ watch: 'https://videopress.com/v/06cSoNri', embed: 'https://videopress.com/embed/06cSoNri?autoPlay=true', host: 'VideoPress' });
    expect(videoFor('https://videopress.com/v/AG18FkM6')?.watch).toBe('https://videopress.com/v/AG18FkM6');
  });

  test('any other frame is not a video', () => {
    expect(videoFor('//www.slideshare.net/slideshow/embed_code/key/abc')).toBeUndefined();
    expect(videoFor('https://notyoutube.com/embed/x')).toBeUndefined();
  });
});

describe('videoFacades', () => {
  test('swaps a video frame, editor leftovers inside it included, for a link with the player in data-embed', () => {
    const html = '<p>x</p><iframe loading="lazy" src="https://www.youtube.com/embed/JSZnUQU4a4E" width="560"><span class="mce_SELRES_start">﻿</span></iframe><p>y</p>';
    expect(videoFacades(html)).toBe(
      '<p>x</p><a class="video-embed" href="https://www.youtube.com/watch?v=JSZnUQU4a4E" data-embed="https://www.youtube-nocookie.com/embed/JSZnUQU4a4E?autoplay=1" data-title="YouTube video">' +
        '<span class="video-play mono"><span aria-hidden="true">▶</span> Play video · YouTube</span></a><p>y</p>',
    );
  });

  test('keeps a frame title and leaves other frames alone', () => {
    expect(videoFacades('<iframe title="Talk &amp; slides" src="https://videopress.com/v/a1"></iframe>')).toContain('data-title="Talk &amp; slides"');
    const slides = '<iframe src="//www.slideshare.net/slideshow/embed_code/key/abc"></iframe>';
    expect(videoFacades(slides)).toBe(slides);
  });

  test('hasVideoEmbed tells a body with a video from one with only other frames', () => {
    expect(hasVideoEmbed('a\n\n<iframe src="https://www.youtube.com/embed/x"></iframe>\n')).toBe(true);
    expect(hasVideoEmbed('<iframe src="//www.slideshare.net/slideshow/embed_code/key/abc"></iframe>')).toBe(false);
    expect(hasVideoEmbed(undefined)).toBe(false);
  });

  test('the hast plugin swaps raw-HTML frames in Markdown', async () => {
    const { html } = await markdownToHtml('Intro\n\n<iframe loading="lazy" src="https://videopress.com/embed/06cSoNri" width="560"></iframe>\n\nAfter\n', { hastPlugins: [videoEmbeds] });
    expect(html).toContain('<a class="video-embed" href="https://videopress.com/v/06cSoNri"');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('<p>After</p>');
  });
});

describe('built pages', () => {
  const pages = readdirSync('dist', { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.html')).map((f) => ({ f, html: read(`dist/${f}`) }));
  const script = /<script[^>]+src="\/_astro\/VideoEmbeds[^"]*"/;

  test('no YouTube or VideoPress player or script loads with a page', () => {
    const offenders = pages.filter(({ html }) => /<iframe[^>]+src="[^"]*(youtube|videopress)|<script[^>]+src="[^"]*videopress/.test(html)).map(({ f }) => f);
    expect(offenders).toEqual([]);
  });

  test('the facade script comes with every page that has a facade, and only with those', () => {
    const withFacade = pages.filter(({ html }) => html.includes('class="video-embed"'));
    expect(withFacade.length).toBeGreaterThan(20);
    expect(withFacade.filter(({ html }) => !script.test(html)).map(({ f }) => f)).toEqual([]);
    expect(pages.filter(({ html }) => !html.includes('class="video-embed"') && script.test(html)).map(({ f }) => f)).toEqual([]);
  });

  test('a gallery video is a facade', () => {
    expect(read('dist/gallery/abandoned-beldi-furnace-novara-italy/index.html')).toContain(
      '<a class="video-embed" href="https://www.youtube.com/watch?v=flL60i2Yg5w" data-embed="https://www.youtube-nocookie.com/embed/flL60i2Yg5w?autoplay=1"',
    );
  });
});
