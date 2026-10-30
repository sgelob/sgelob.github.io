// Shared by the Astro site and the migration scripts: plain TS, no Astro imports.

export const IMG_BASE = 'https://img.olegs.be';
export const WIDTHS = [480, 960, 1600] as const;

export type ImageFormat = 'webp' | 'jpg';

function withoutExtension(path: string): string {
  return path.replace(/\.[^./]+$/, '');
}

export function variantUrl(path: string, width: number, format: ImageFormat): string {
  return `${IMG_BASE}/uploads/${withoutExtension(path)}-${width}.${format}`;
}

export function originalUrl(path: string): string {
  return `${IMG_BASE}/uploads/${path}`;
}

/** srcset with only the widths that do not exceed `maxWidth` (never upscale). */
export function srcset(path: string, format: ImageFormat, maxWidth: number): string {
  return WIDTHS.filter((w) => w <= maxWidth)
    .map((w) => `${variantUrl(path, w, format)} ${w}w`)
    .join(', ');
}

/**
 * The widest jpg variant not above `maxWidth`; the original when even the smallest is too wide. Only covers have jpg
 * variants (issue #69): this is for link previews, search results and the feed, which want a jpg, never for photos.
 */
export function largestVariantUrl(path: string, maxWidth: number): string {
  const width = WIDTHS.filter((w) => w <= maxWidth).at(-1);
  return width === undefined ? originalUrl(path) : variantUrl(path, width, 'jpg');
}

/** Width of the lightbox image: originals can be full camera files, too heavy to open one after another. */
export const LIGHTBOX_WIDTH = 1600;

/**
 * The lightbox source when it is not the original: the 1600 webp of a photo at least that wide. A narrower
 * original is already no wider than that variant, and better than any smaller one, so it is used as it is.
 */
export function lightboxUrl(path: string, width: number): string | undefined {
  return width >= LIGHTBOX_WIDTH ? variantUrl(path, LIGHTBOX_WIDTH, 'webp') : undefined;
}
