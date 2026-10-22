import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { originalUrl, variantUrl } from '../../src/lib/images';
import { uploadPath } from './uploads';

const IMG_SRC = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
const IMG_TAG = /<img\b[^>]*>/gi;
const CLEARFIX = /<div\s+class=["']clearfix["']\s*>\s*<\/div>/gi;
const A_HREF = /(<a\b[^>]*?\bhref\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi;
const BLOCK_START = /^<(?:h[1-6]|ul|ol|li|div|blockquote|pre|table|iframe|script|figure|img|p|hr)\b/i;

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

/** <img src> to an upload becomes the 960px jpg variant, <a href> to an upload the original. */
export function rewriteUploadUrls(html: string): string {
  return html
    .replace(IMG_SRC, (tag, dq?: string, sq?: string) => {
      const src = dq ?? sq ?? '';
      const path = uploadPath(src);
      return path ? tag.replace(src, variantUrl(path, 960, 'jpg')) : tag;
    })
    .replace(A_HREF, (whole, head: string, dq?: string, sq?: string) => {
      const href = dq ?? sq ?? '';
      const path = uploadPath(href);
      return path ? `${head}"${originalUrl(path)}"` : whole;
    });
}

/** Simplified WordPress wpautop: blank-line separated chunks that do not start with a block tag become <p>. */
export function autop(html: string): string {
  return html
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (BLOCK_START.test(chunk) ? chunk : `<p>${chunk}</p>`))
    .join('\n\n');
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
  // Turndown pads bullets to "-   item"; use the compact "- item" form.
  td.addRule('compactListItem', {
    filter: 'li',
    replacement(content, node, options) {
      const body = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n')
        .replace(/\n/gm, '\n  ');
      const parent = node.parentNode as HTMLElement;
      let prefix = `${options.bulletListMarker} `;
      if (parent.nodeName === 'OL') {
        const start = parent.getAttribute('start');
        const index = Array.prototype.indexOf.call(parent.children, node);
        prefix = `${(start ? Number(start) : 1) + index}. `;
      }
      return prefix + body + (node.nextSibling && !/\n$/.test(body) ? '\n' : '');
    },
  });
  return td;
}

const turndown = createTurndown();

export function htmlToMarkdown(html: string): string {
  return turndown
    .turndown(autop(html))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
