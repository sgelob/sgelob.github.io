import type { HastPluginDefinition } from 'satteri';
import { iframeTitle } from './iframe-titles';

// A YouTube or VideoPress player costs hundreds of KB of third-party script and sets cookies, even when nobody
// presses play. Each such <iframe> in the content is swapped at build time for a link to the video with a
// ▶ (a "facade"); src/components/VideoEmbeds.astro turns it back into the player, on the click. Without
// JavaScript the link opens the video on its own site.

export interface Video {
  /** The page of the video, for the link. */
  watch: string;
  /** The player, loaded on the click. */
  embed: string;
  host: 'YouTube' | 'VideoPress';
}

const YOUTUBE = /^https?:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/([\w-]+)(?:\?(.*))?$/;
const VIDEOPRESS = /^https?:\/\/videopress\.com\/(?:embed|v)\/(\w+)/;

/** The video an embed `src` plays, or undefined for any other frame (slides, maps), which stays as it is. */
export function videoFor(src: string): Video | undefined {
  const yt = YOUTUBE.exec(src);
  if (yt) {
    const list = new URLSearchParams(yt[2] ?? '').get('list');
    const query = list ? `&list=${encodeURIComponent(list)}` : '';
    return {
      watch: `https://www.youtube.com/watch?v=${yt[1]}${query}`,
      embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1${query}`,
      host: 'YouTube',
    };
  }
  const vp = VIDEOPRESS.exec(src);
  if (vp) return { watch: `https://videopress.com/v/${vp[1]}`, embed: `https://videopress.com/embed/${vp[1]}?autoPlay=true`, host: 'VideoPress' };
  return undefined;
}

const escapeAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// An attribute value as written in the HTML, back to text, so escaping it again does not double its entities.
const unescapeAttr = (s: string): string =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** The facade for a video: a 16:9 link with a ▶, carrying the player URL and the frame title for the click. */
export function facade(video: Video, title: string): string {
  return (
    `<a class="video-embed" href="${escapeAttr(video.watch)}" data-embed="${escapeAttr(video.embed)}" data-title="${escapeAttr(title)}">` +
    `<span class="video-play mono"><span aria-hidden="true">▶</span> Play video · ${video.host}</span></a>`
  );
}

// The whole element: some migrated frames hold leftover editor markup between the tags.
const IFRAME = /<iframe\b([^>]*)>[\s\S]*?<\/iframe>/gi;
const attr = (attrs: string, name: string): string | undefined => {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attrs);
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
};

/** Replaces every video <iframe> in `html` with its facade; other frames and markup are left untouched. */
export function videoFacades(html: string): string {
  return html.replace(IFRAME, (tag, attrs: string) => {
    const src = attr(attrs, 'src');
    const video = src === undefined ? undefined : videoFor(src);
    const title = attr(attrs, 'title');
    return video ? facade(video, title === undefined ? iframeTitle(src) : unescapeAttr(title)) : tag;
  });
}

/** True when Markdown `body` embeds a video, so its page needs the facade script. */
export const hasVideoEmbed = (body: string | undefined): boolean =>
  [...(body ?? '').matchAll(IFRAME)].some(([, attrs]) => {
    const src = attr(attrs, 'src');
    return src !== undefined && videoFor(src) !== undefined;
  });

/** Sätteri hast plugin: the migrated posts keep their embeds as `raw` HTML nodes. */
export const videoEmbeds: HastPluginDefinition = {
  name: 'video-embeds',
  raw(node, ctx) {
    const value = videoFacades(node.value);
    if (value !== node.value) ctx.replaceNode(node, { type: 'raw', value });
  },
};
