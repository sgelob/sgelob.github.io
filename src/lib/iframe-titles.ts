import type { HastPluginDefinition } from 'satteri';

// Every embedded frame needs an accessible name (WCAG 4.1.2): without one a screen reader announces
// only "frame". The posts embed players straight from WordPress, none with a `title`, so this names
// each from its host at build time, and covers new posts too.

const TITLES: [RegExp, string][] = [
  [/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/, 'YouTube video'],
  [/(^|\.)slideshare\.net$/, 'SlideShare presentation'],
  [/(^|\.)vimeo\.com$/, 'Vimeo video'],
  [/(^|\.)(videopress\.com|video\.wordpress\.com)$/, 'VideoPress video'],
  [/(^|\.)speakerdeck\.com$/, 'Speaker Deck presentation'],
];

/** A title for a frame showing `src`, from its host; `Embedded content` when the host is unknown. */
export function iframeTitle(src: string | undefined): string {
  let host = '';
  try {
    host = new URL(src ?? '', 'https://olegs.be').hostname;
  } catch {
    // An unparsable src falls through to the generic title.
  }
  return TITLES.find(([pattern]) => pattern.test(host))?.[1] ?? 'Embedded content';
}

const IFRAME_TAG = /<iframe\b[^>]*>/gi;
const TITLE_ATTR = /\stitle\s*=/i;
const SRC_ATTR = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/** Adds a `title` to every `<iframe>` tag in `html` that has none; other markup is left untouched. */
export function addIframeTitles(html: string): string {
  return html.replace(IFRAME_TAG, (tag) => {
    if (TITLE_ATTR.test(tag)) return tag;
    const m = SRC_ATTR.exec(tag);
    // Appended last, so the tag keeps its existing attribute order.
    return tag.replace(/\s*\/?>$/, ` title="${iframeTitle(m?.[1] ?? m?.[2] ?? m?.[3])}"$&`);
  });
}

/**
 * Sätteri hast plugin. Markdown keeps embedded HTML as `raw` nodes, where the iframes of the
 * migrated posts live; `element` covers an iframe that reaches the tree as a real element.
 */
export const iframeTitles: HastPluginDefinition = {
  name: 'iframe-titles',
  raw(node, ctx) {
    const value = addIframeTitles(node.value);
    if (value !== node.value) ctx.replaceNode(node, { type: 'raw', value });
  },
  element: {
    filter: ['iframe'],
    visit(node, ctx) {
      if (node.properties.title === undefined) {
        const src = node.properties.src;
        ctx.setProperty(node, 'title', iframeTitle(typeof src === 'string' ? src : undefined));
      }
    },
  },
};
