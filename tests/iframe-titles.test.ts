import { markdownToHtml } from 'satteri';
import { describe, expect, test } from 'vitest';
import { addIframeTitles, iframeTitle, iframeTitles } from '../src/lib/iframe-titles';

describe('iframeTitle', () => {
  test.each([
    ['https://www.youtube.com/embed/flL60i2Yg5w', 'YouTube video'],
    ['//www.youtube-nocookie.com/embed/x', 'YouTube video'],
    ['https://www.slideshare.net/slideshow/embed_code/key/abc', 'SlideShare presentation'],
    ['https://player.vimeo.com/video/1', 'Vimeo video'],
    ['https://videopress.com/embed/06cSoNri', 'VideoPress video'],
    ['https://speakerdeck.com/player/abc', 'Speaker Deck presentation'],
    ['https://example.com/widget', 'Embedded content'],
    ['https://notyoutube.com/embed/x', 'Embedded content'],
    [undefined, 'Embedded content'],
  ])('%s → %s', (src, title) => expect(iframeTitle(src)).toBe(title));
});

describe('addIframeTitles', () => {
  test('adds a title to an iframe without one, keeping its other attributes', () => {
    expect(addIframeTitles('<iframe loading="lazy" width="560" src="https://www.youtube.com/embed/x" allowfullscreen=""></iframe>')).toBe(
      '<iframe loading="lazy" width="560" src="https://www.youtube.com/embed/x" allowfullscreen="" title="YouTube video"></iframe>',
    );
  });

  test('keeps an existing title, handles several frames and leaves other markup alone', () => {
    const html = '<p>x</p><iframe title="Talk" src="https://videopress.com/v/a"></iframe><IFRAME src=\'https://vimeo.com/1\'></IFRAME>';
    expect(addIframeTitles(html)).toBe('<p>x</p><iframe title="Talk" src="https://videopress.com/v/a"></iframe><IFRAME src=\'https://vimeo.com/1\' title="Vimeo video"></IFRAME>');
    expect(addIframeTitles('<p>no frames</p>')).toBe('<p>no frames</p>');
    expect(addIframeTitles('<iframe src="https://example.com/x" />')).toBe('<iframe src="https://example.com/x" title="Embedded content" />');
  });
});

test('the hast plugin titles raw-HTML iframes in Markdown', async () => {
  const md = 'Intro\n\n<iframe loading="lazy" src="https://videopress.com/embed/06cSoNri" width="560" height="315"></iframe>\n\nAfter\n';
  const { html } = await markdownToHtml(md, { hastPlugins: [iframeTitles] }); // sync here; typed as maybe-async
  expect(html).toContain('<iframe loading="lazy" src="https://videopress.com/embed/06cSoNri" width="560" height="315" title="VideoPress video">');
  expect(html).toContain('<p>After</p>');
});
