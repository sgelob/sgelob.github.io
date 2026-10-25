import { readdirSync } from 'node:fs';
import { markdownToHtml } from 'satteri';
import { describe, expect, test } from 'vitest';
import { read } from './helpers/dist';
import { embedFacades, embedFacadesPlugin, embedFor, hasEmbedFacade } from '../src/lib/video-embeds';

describe('embedFor', () => {
  test('YouTube: the watch page and the no-cookie player, keeping a playlist', () => {
    expect(embedFor('https://www.youtube.com/embed/flL60i2Yg5w')).toEqual({
      watch: 'https://www.youtube.com/watch?v=flL60i2Yg5w',
      embed: 'https://www.youtube-nocookie.com/embed/flL60i2Yg5w?autoplay=1',
      host: 'YouTube',
      action: 'Play video',
    });
    expect(embedFor('https://www.youtube.com/embed/biFdRKVdVqo?list=PLx')?.embed).toBe('https://www.youtube-nocookie.com/embed/biFdRKVdVqo?autoplay=1&list=PLx');
  });

  test('VideoPress, from both its embed and its /v/ address', () => {
    expect(embedFor('https://videopress.com/embed/06cSoNri')).toEqual({ watch: 'https://videopress.com/v/06cSoNri', embed: 'https://videopress.com/embed/06cSoNri?autoPlay=true', host: 'VideoPress', action: 'Play video' });
    expect(embedFor('https://videopress.com/v/AG18FkM6')?.watch).toBe('https://videopress.com/v/AG18FkM6');
  });

  test('SlideShare, from its protocol-relative embed address', () => {
    expect(embedFor('//www.slideshare.net/slideshow/embed_code/key/eAfTPJ8ZnpAPhn')).toEqual({
      watch: 'https://www.slideshare.net/slideshow/embed_code/key/eAfTPJ8ZnpAPhn',
      embed: 'https://www.slideshare.net/slideshow/embed_code/key/eAfTPJ8ZnpAPhn',
      host: 'SlideShare',
      action: 'View slides',
    });
  });

  test('any other frame stays a frame', () => {
    expect(embedFor('https://www.google.com/maps/embed?pb=x')).toBeUndefined();
    expect(embedFor('https://notyoutube.com/embed/x')).toBeUndefined();
  });
});

describe('embedFacades', () => {
  test('swaps a video frame, editor leftovers inside it included, for a link with the player in data-embed', () => {
    const html = '<p>x</p><iframe loading="lazy" src="https://www.youtube.com/embed/JSZnUQU4a4E" width="560"><span class="mce_SELRES_start">\uFEFF</span></iframe><p>y</p>';
    expect(embedFacades(html)).toBe(
      '<p>x</p><a class="video-embed" href="https://www.youtube.com/watch?v=JSZnUQU4a4E" data-embed="https://www.youtube-nocookie.com/embed/JSZnUQU4a4E?autoplay=1" data-title="YouTube video">' +
        '<span class="video-play mono"><span aria-hidden="true">▶</span> Play video · YouTube</span></a><p>y</p>',
    );
  });

  test('a context ends the name, visually hidden after the visible label, and the player title', () => {
    const html = embedFacades('<iframe src="//www.slideshare.net/slideshow/embed_code/key/k1"></iframe>', () => 'Talk <A>');
    expect(html).toContain('data-title="SlideShare presentation: Talk &lt;A>"');
    expect(html).toContain('▶</span> View slides · SlideShare<span class="visually-hidden">: Talk &lt;A&gt;</span></span></a>');
  });

  test('keeps a frame title and leaves other frames alone', () => {
    expect(embedFacades('<iframe title="Talk &amp; slides" src="https://videopress.com/v/a1"></iframe>')).toContain('data-title="Talk &amp; slides"');
    const map = '<iframe src="https://www.google.com/maps/embed?pb=x"></iframe>';
    expect(embedFacades(map)).toBe(map);
  });

  test('hasEmbedFacade tells a body with a video or slides from one with only other frames', () => {
    expect(hasEmbedFacade('a\n\n<iframe src="https://www.youtube.com/embed/x"></iframe>\n')).toBe(true);
    expect(hasEmbedFacade('<iframe src="//www.slideshare.net/slideshow/embed_code/key/abc"></iframe>')).toBe(true);
    expect(hasEmbedFacade('<iframe src="https://www.google.com/maps/embed?pb=x"></iframe>')).toBe(false);
    expect(hasEmbedFacade(undefined)).toBe(false);
  });
});

describe('the hast plugin', () => {
  const md = [
    'Intro, no heading yet',
    '<iframe src="https://videopress.com/embed/a0"></iframe>',
    '## Talk A',
    '<iframe src="https://videopress.com/embed/a1"></iframe>',
    '<iframe src="https://videopress.com/embed/a2"></iframe>',
    '<iframe src="//www.slideshare.net/slideshow/embed_code/key/k1"></iframe>',
    '### <span lang="en">Talk B</span> (in English)',
    'Inline in a paragraph<iframe loading="lazy" src="https://www.youtube.com/embed/b1"></iframe> and after.',
    '',
  ].join('\n\n');
  const render = async () => (await markdownToHtml(md, { hastPlugins: [embedFacadesPlugin] })).html;
  const names = (html: string) => [...html.matchAll(/<span class="video-play mono">([\s\S]*?)<\/span><\/a>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));

  test('names each facade after the heading above it, numbering a second video under the same heading', async () => {
    expect(names(await render())).toEqual([
      '▶ Play video · VideoPress',
      '▶ Play video · VideoPress: Talk A',
      '▶ Play video · VideoPress: Talk A (2)',
      '▶ View slides · SlideShare: Talk A',
      '▶ Play video · YouTube: Talk B (in English)',
    ]);
  });

  test('swaps a frame split across raw nodes inside a paragraph and keeps the text around it', async () => {
    const html = await render();
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('</iframe>');
    expect(html).toMatch(/<p>Inline in a paragraph<a class="video-embed" href="https:\/\/www\.youtube\.com\/watch\?v=b1"[\s\S]*?<\/a> and after\.<\/p>/);
  });

  test('a fresh count for each document', async () => {
    const one = await render();
    expect(names(await render())).toEqual(names(one));
  });
});

describe('built pages', () => {
  const pages = readdirSync('dist', { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.html')).map((f) => ({ f, html: read(`dist/${f}`) }));
  const script = /<script[^>]+src="\/_astro\/VideoEmbeds[^"]*"/;

  test('no YouTube, VideoPress or SlideShare player or script loads with a page', () => {
    const offenders = pages.filter(({ html }) => /<iframe[^>]+src="[^"]*(youtube|videopress|slideshare)|<script[^>]+src="[^"]*(videopress|slideshare)/.test(html)).map(({ f }) => f);
    expect(offenders).toEqual([]);
  });

  test('the facade script comes with every page that has a facade, and only with those', () => {
    const withFacade = pages.filter(({ html }) => html.includes('class="video-embed"'));
    expect(withFacade.length).toBeGreaterThan(20);
    expect(withFacade.filter(({ html }) => !script.test(html)).map(({ f }) => f)).toEqual([]);
    expect(pages.filter(({ html }) => !html.includes('class="video-embed"') && script.test(html)).map(({ f }) => f)).toEqual([]);
  });

  test('slides are facades too, inline ones included', () => {
    expect(read('dist/2016/11/note-impressioni-conferenza-webperfdays-amsterdam/index.html')).toMatch(/<a class="video-embed" href="https:\/\/www\.slideshare\.net\/slideshow\/embed_code\/key\/\w+"[^>]*>[\s\S]*?View slides · SlideShare/);
  });

  test('the 18 videos of the WordCamp post each have their own name, from the talk heading', () => {
    const names = [...read('dist/2017/04/video-slide-wordpress-wordcamp-torino-2017/index.html').matchAll(/<span class="video-play mono">([\s\S]*?)<\/span><\/a>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
    expect(names).toHaveLength(18);
    expect(new Set(names).size).toBe(18);
    expect(names[0]).toBe('▶ Play video · VideoPress: Tammie Lister: Know your users (in inglese)');
  });

  test('a gallery video is a facade', () => {
    expect(read('dist/gallery/abandoned-beldi-furnace-novara-italy/index.html')).toContain(
      '<a class="video-embed" href="https://www.youtube.com/watch?v=flL60i2Yg5w" data-embed="https://www.youtube-nocookie.com/embed/flL60i2Yg5w?autoplay=1"',
    );
  });
});
