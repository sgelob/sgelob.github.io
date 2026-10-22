import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { largestVariantUrl, originalUrl, variantUrl } from '../../src/lib/images';
import { uploadPath } from './uploads';

const IMG_SRC = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
const IMG_TAG = /<img\b[^>]*>/gi;
const CLEARFIX = /<div\s+class=["']clearfix["']\s*>\s*<\/div>/gi;
const A_HREF = /(<a\b[^>]*?\bhref\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi;
const BLOCK_START = /^(?:<(?:h[1-6]|ul|ol|li|div|blockquote|pre|table|iframe|script|figure|img|p|hr)\b|[\uE000\uE002])/i;
const RAW_SPAN = /<(pre|script)\b[\s\S]*?<\/\1>/gi;
const SCRIPT_SPAN = /<script\b[\s\S]*?<\/script>/gi;
// Markdown fenced code block (as turndown emits it) or a <script> element.
const VERBATIM_MD = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1[ \t]*$|<script\b[\s\S]*?<\/script>/gm;

/** Upload paths of every <img src> that points at an upload, in document order (duplicates kept). */
export function extractImages(html: string): string[] {
  const paths: string[] = [];
  for (const m of html.matchAll(IMG_SRC)) {
    const path = uploadPath(m[1] ?? m[2]);
    if (path) paths.push(path);
  }
  return paths;
}

export function stripImages(html: string): string {
  return html.replace(IMG_TAG, '').replace(CLEARFIX, '');
}

/** Width of the reading column's image: wider variants would only add weight. */
const POST_IMAGE_WIDTH = 960;

/** Original width of an upload path (relative to wp-content/uploads), when known. */
export type WidthOf = (path: string) => number | undefined;

/**
 * The URL an inline image is served from. Variants are never upscaled, so the widest one not above the original
 * (capped at the column's 960) is picked; a GIF (variants would lose the animation) or an image narrower than every
 * variant is served as the original. Of unknown width, the 960 variant is assumed.
 */
export function inlineImageUrl(path: string, width: number | undefined): string {
  if (/\.gif$/i.test(path)) return originalUrl(path);
  if (width === undefined) return variantUrl(path, POST_IMAGE_WIDTH, 'jpg');
  return largestVariantUrl(path, Math.min(width, POST_IMAGE_WIDTH));
}

/** <img src> to an upload becomes a jpg variant (see `inlineImageUrl`), <a href> to an upload the original. */
export function rewriteUploadUrls(html: string, widthOf: WidthOf = () => undefined): string {
  return html
    .replace(IMG_SRC, (tag, dq?: string, sq?: string) => {
      const src = dq ?? sq ?? '';
      const path = uploadPath(src);
      return path ? tag.replace(src, inlineImageUrl(path, widthOf(path))) : tag;
    })
    .replace(A_HREF, (whole, head: string, dq?: string, sq?: string) => {
      const href = dq ?? sq ?? '';
      const path = uploadPath(href);
      return path ? `${head}"${originalUrl(path)}"` : whole;
    });
}

/**
 * Swaps every match of `span` for a placeholder (`marker` + index + `marker`) so later steps cannot touch the
 * content; `restore` puts the original text back byte for byte.
 */
function protect(text: string, span: RegExp, marker: string): { text: string; restore: (t: string) => string } {
  const saved: string[] = [];
  const masked = text.replace(span, (m) => `${marker}${saved.push(m) - 1}${marker}`);
  const placeholder = new RegExp(`${marker}(\\d+)${marker}`, 'g');
  return { text: masked, restore: (t) => t.replace(placeholder, (_, i: string) => saved[Number(i)]) };
}

/**
 * Simplified WordPress wpautop: blank-line separated chunks that do not start with a block tag become <p>.
 * <pre> and <script> spans are never split or modified.
 */
export function autop(html: string): string {
  const raw = protect(html, RAW_SPAN, '');
  const wrapped = raw.text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (BLOCK_START.test(chunk) ? chunk : `<p>${chunk}</p>`))
    .join('\n\n');
  return raw.restore(wrapped);
}

/** Collapse 3+ newlines to 2, except inside fenced code blocks and <script> elements. */
function collapseBlankRuns(md: string): string {
  let out = '';
  let last = 0;
  for (const m of md.matchAll(VERBATIM_MD)) {
    out += md.slice(last, m.index).replace(/\n{3,}/g, '\n\n') + m[0];
    last = m.index + m[0].length;
  }
  return out + md.slice(last).replace(/\n{3,}/g, '\n\n');
}

function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });
  td.use(gfm);
  td.keep(['iframe', 'script']);
  // Turndown pads bullets to "-   item"; use the compact "- item" form. Nested content is indented by the
  // marker width ("1. " = 3, "10. " = 4) so CommonMark treats it as a child of the item.
  td.addRule('compactListItem', {
    filter: 'li',
    replacement(content, node, options) {
      const parent = node.parentNode as HTMLElement;
      let prefix = `${options.bulletListMarker} `;
      if (parent.nodeName === 'OL') {
        const start = parent.getAttribute('start');
        const index = Array.prototype.indexOf.call(parent.children, node);
        prefix = `${(start ? Number(start) : 1) + index}. `;
      }
      const pad = ' '.repeat(prefix.length);
      const body = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '')
        .replace(/\n(?=[^\n])/g, `\n${pad}`);
      // An item with a blank line inside makes the list loose: keep a blank line before the next item too.
      const gap = /\n\n/.test(body) ? '\n\n' : '\n';
      return prefix + body + (node.nextSibling ? gap : '');
    },
  });
  return td;
}

const turndown = createTurndown();

export function htmlToMarkdown(html: string): string {
  // Scripts bypass turndown (it would collapse their whitespace) and come back verbatim at the end.
  const scripts = protect(html, SCRIPT_SPAN, '');
  return scripts.restore(collapseBlankRuns(turndown.turndown(autop(scripts.text)))).trim();
}
