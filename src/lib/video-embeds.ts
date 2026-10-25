import type { HastPluginDefinition } from 'satteri';
import type { Element, Root, RootContent } from 'hast';
import { iframeTitle } from './iframe-titles';

// A YouTube, VideoPress or SlideShare player costs hundreds of KB of third-party script and sets cookies, even when
// nobody presses play. Each such <iframe> in the content is swapped at build time for a link with a ▶ (a "facade");
// src/components/VideoEmbeds.astro turns it back into the player, on the click. Without JavaScript the link opens
// the video or the slides on their own site.

export interface Embed {
  /** The page of the video or the slides, for the link. */
  watch: string;
  /** The player, loaded on the click. */
  embed: string;
  host: 'YouTube' | 'VideoPress' | 'SlideShare';
  /** The visible label, before the host. */
  action: 'Play video' | 'View slides';
}

const YOUTUBE = /^https?:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/([\w-]+)(?:\?(.*))?$/;
const VIDEOPRESS = /^https?:\/\/videopress\.com\/(?:embed|v)\/(\w+)/;
const SLIDESHARE = /^(?:https?:)?\/\/(?:www\.)?slideshare\.net\/slideshow\/embed_code\/key\/(\w+)/;

/** What an embed `src` shows, or undefined for any other frame, which stays as it is. */
export function embedFor(src: string): Embed | undefined {
  const yt = YOUTUBE.exec(src);
  if (yt) {
    const list = new URLSearchParams(yt[2] ?? '').get('list');
    const query = list ? `&list=${encodeURIComponent(list)}` : '';
    return {
      watch: `https://www.youtube.com/watch?v=${yt[1]}${query}`,
      embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1${query}`,
      host: 'YouTube',
      action: 'Play video',
    };
  }
  const vp = VIDEOPRESS.exec(src);
  if (vp) return { watch: `https://videopress.com/v/${vp[1]}`, embed: `https://videopress.com/embed/${vp[1]}?autoPlay=true`, host: 'VideoPress', action: 'Play video' };
  const ss = SLIDESHARE.exec(src);
  // The embed address is the only one the posts keep, and it opens as a page of its own too.
  if (ss) {
    const player = `https://www.slideshare.net/slideshow/embed_code/key/${ss[1]}`;
    return { watch: player, embed: player, host: 'SlideShare', action: 'View slides' };
  }
  return undefined;
}

const escapeText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// An attribute value as written in the HTML, back to text, so escaping it again does not double its entities.
const unescapeAttr = (s: string): string =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/**
 * The facade: a 16:9 link with a ▶, carrying the player URL and the frame title for the click. `context`, the
 * heading the embed sits under, ends its accessible name, so a page with many videos does not list many identical
 * "Play video" links; it is visually hidden, after the visible label, which stays at the start of the name.
 */
export function facade(embed: Embed, title: string, context?: string): string {
  const named = context ? `${title}: ${context}` : title;
  return (
    `<a class="video-embed" href="${escapeAttr(embed.watch)}" data-embed="${escapeAttr(embed.embed)}" data-title="${escapeAttr(named)}">` +
    `<span class="video-play mono"><span aria-hidden="true">▶</span> ${embed.action} · ${embed.host}` +
    (context ? `<span class="visually-hidden">: ${escapeText(context)}</span>` : '') +
    `</span></a>`
  );
}

// The whole element: some migrated frames hold leftover editor markup between the tags.
const IFRAME = /<iframe\b([^>]*)>[\s\S]*?<\/iframe>/gi;
const attr = (attrs: string, name: string): string | undefined => {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attrs);
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
};

/**
 * Replaces every video or slides <iframe> in `html` with its facade; other frames and markup are left untouched.
 * `contextFor` gives the context of the n-th facade made by this call (0, 1, …).
 */
export function embedFacades(html: string, contextFor: (embed: Embed) => string | undefined = () => undefined): string {
  return html.replace(IFRAME, (tag, attrs: string) => {
    const src = attr(attrs, 'src');
    const embed = src === undefined ? undefined : embedFor(src);
    if (!embed) return tag;
    const title = attr(attrs, 'title');
    return facade(embed, title === undefined ? iframeTitle(src) : unescapeAttr(title), contextFor(embed));
  });
}

/** True when Markdown `body` embeds a video or slides, so its page needs the facade script. */
export const hasEmbedFacade = (body: string | undefined): boolean =>
  [...(body ?? '').matchAll(IFRAME)].some(([, attrs]) => {
    const src = attr(attrs, 'src');
    return src !== undefined && embedFor(src) !== undefined;
  });

const HEADING = /^h[1-6]$/;
const OPENING = /^\s*<iframe\b[^>]*>\s*$/i;
const CLOSING = /^\s*<\/iframe>\s*$/i;
/** Text of an element and its descendants, like DOM textContent. */
const textOf = (node: RootContent): string =>
  node.type === 'text' ? node.value : 'children' in node ? node.children.map(textOf).join('') : '';

/**
 * Sätteri hast plugin, one instance per document (a factory). The migrated posts keep their embeds as `raw` HTML
 * nodes; the tree is walked in document order so each facade knows the heading above it. Two facades of the same
 * kind under one heading are numbered, so their names still differ.
 */
export const embedFacadesPlugin = (): HastPluginDefinition => ({
  name: 'video-embeds',
  before(root, ctx) {
    let heading: string | undefined;
    const seen = new Map<string, number>();
    const contextFor = (embed: Embed): string | undefined => {
      if (!heading) return undefined;
      const key = `${embed.action}\u0000${heading}`;
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      return n === 1 ? heading : `${heading} (${n})`;
    };
    const walk = (nodes: readonly RootContent[]): void => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.type === 'element' && HEADING.test((node as Element).tagName)) {
          heading = textOf(node).replace(/\s+/g, ' ').trim() || heading;
        } else if (node.type === 'raw') {
          // Inside a paragraph the opening and the closing tag arrive as raw nodes of their own: the facade takes
          // the opening tag's place, and everything up to the closing tag goes.
          const close = OPENING.test(node.value) ? nodes.findIndex((n, j) => j > i && n.type === 'raw' && CLOSING.test(n.value)) : -1;
          const html = close === -1 ? node.value : `${node.value}</iframe>`;
          const value = embedFacades(html, contextFor);
          if (value === html) continue;
          ctx.replaceNode(node, { type: 'raw', value });
          if (close !== -1) {
            for (const n of nodes.slice(i + 1, close + 1)) ctx.removeNode(n);
            i = close;
          }
        } else if ('children' in node) {
          walk(node.children);
        }
      }
    };
    walk((root as Root).children);
  },
});
