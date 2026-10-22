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
export const variantKey = (key: string, width: number, format: Variant['format']): string => `${key.replace(/\.[^./]+$/, '')}-${width}.${format}`;

/** The variant keys `resizeVariants` produces for an image of the given width (never upscaled), webp before jpg. */
export function variantKeys(key: string, imageWidth: number, widths: readonly number[] = WIDTHS): string[] {
  return widths.filter((w) => w <= imageWidth).flatMap((w) => [variantKey(key, w, 'webp'), variantKey(key, w, 'jpg')]);
}

export async function resizeVariants(
  input: Buffer,
  key: string,
  widths: readonly number[] = WIDTHS,
): Promise<{ width: number; height: number; variants: Variant[] }> {
  const { width, height } = await imageSize(input);
  const variants: Variant[] = [];
  for (const w of widths.filter((w) => w <= width)) {
    const resized = () => sharp(input).rotate().resize({ width: w, withoutEnlargement: true });
    const webp = await resized().webp({ quality: QUALITY }).toBuffer();
    const jpg = await resized().flatten({ background: '#ffffff' }).jpeg({ quality: QUALITY }).toBuffer();
    variants.push({ width: w, format: 'webp', body: webp, key: variantKey(key, w, 'webp') }, { width: w, format: 'jpg', body: jpg, key: variantKey(key, w, 'jpg') });
  }
  return { width, height, variants };
}
