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
