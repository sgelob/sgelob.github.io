import sharp from 'sharp';
import { WIDTHS } from '../../src/lib/images';

export type Variant = { width: number; format: 'webp' | 'jpg'; body: Buffer; key: string };
export type Size = { width: number; height: number };

const QUALITY = 80;

/** Displayed size: EXIF orientations 5-8 are rotated a quarter turn, so width and height swap. */
export async function imageSize(input: Buffer): Promise<Size> {
  const { width, height, orientation } = await sharp(input).metadata();
  if (!width || !height) throw new Error('image has no dimensions');
  return orientation && orientation >= 5 ? { width: height, height: width } : { width, height };
}

/** `uploads/2012/08/a.jpg` -> `uploads/2012/08/a-960.webp`; must agree with `variantUrl` in src/lib/images.ts. */
export const variantKey = (key: string, width: number, format: Variant['format']): string => `${variantStem(key)}-${width}.${format}`;

/** The key without its extension: files that share a stem (`a.jpg`, `a.png`) share variant keys. */
export const variantStem = (key: string): string => key.replace(/\.[^./]+$/, '');

/**
 * Which formats to make. Photos get webp only; a cover also gets jpg, which link previews, search results and the
 * feed want (issue #69). `webp: false` makes the jpg alone, for a cover whose webp variants already exist.
 */
export type Formats = { jpg?: boolean; webp?: boolean };

const formatsOf = ({ jpg = false, webp = true }: Formats): Variant['format'][] => [...(webp ? ['webp' as const] : []), ...(jpg ? ['jpg' as const] : [])];

/** The variant keys `resizeVariants` produces for an image of the given width (never upscaled), webp before jpg. */
export function variantKeys(key: string, imageWidth: number, widths: readonly number[] = WIDTHS, formats: Formats = {}): string[] {
  return widths.filter((w) => w <= imageWidth).flatMap((w) => formatsOf(formats).map((f) => variantKey(key, w, f)));
}

export async function resizeVariants(
  input: Buffer,
  key: string,
  widths: readonly number[] = WIDTHS,
  formats: Formats = {},
): Promise<{ width: number; height: number; variants: Variant[] }> {
  const { width, height } = await imageSize(input);
  const variants: Variant[] = [];
  for (const w of widths.filter((w) => w <= width)) {
    const resized = () => sharp(input).rotate().resize({ width: w, withoutEnlargement: true });
    for (const format of formatsOf(formats)) {
      const body =
        format === 'webp'
          ? await resized().webp({ quality: QUALITY }).toBuffer()
          : await resized().flatten({ background: '#ffffff' }).jpeg({ quality: QUALITY }).toBuffer();
      variants.push({ width: w, format, body, key: variantKey(key, w, format) });
    }
  }
  return { width, height, variants };
}
