import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

/** WordPress thumbnails such as `a-768x512.jpg`: derived files that the pipeline regenerates itself. */
const SIZE_VARIANT = /-\d+x\d+\.(jpe?g|png|gif|webp)$/i;
const RASTER = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export const isSizeVariant = (name: string): boolean => SIZE_VARIANT.test(name);

export const isRaster = (name: string): boolean => RASTER.has(extname(name).toLowerCase());

export const contentTypeFor = (name: string): string => CONTENT_TYPES[extname(name).toLowerCase()] ?? 'application/octet-stream';

/** The FTP fetch skips derived thumbnails and files that are already local with the same size. */
export const needsDownload = (name: string, remoteSize: number, localSize: number | undefined): boolean => !isSizeVariant(name) && localSize !== remoteSize;

/** Every upload under `root` as a `/`-separated relative path, sorted; thumbnails and dotfiles are left out. */
export function listUploadFiles(root: string, dir = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listUploadFiles(root, rel));
    else if (entry.isFile() && !isSizeVariant(entry.name)) out.push(rel);
  }
  return out.sort();
}
