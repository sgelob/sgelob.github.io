import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WIDTHS } from '../../src/lib/images';
import { contentTypeFor, isRaster, listUploadFiles } from './files';
import type { ObjectStore } from './r2';
import { imageSize, resizeVariants, variantKeys, variantStem, type Size } from './resize';

const CONCURRENCY = 4;

export type ProcessOptions = {
  uploadsDir: string;
  store: ObjectStore;
  widths?: readonly number[];
  dryRun?: boolean;
  /** Relative `yyyy/mm/file` paths to process instead of walking the whole directory. */
  files?: readonly string[];
  /** Relative paths of covers: they get jpg variants as well as webp (issue #69). */
  jpgFor?: ReadonlySet<string>;
  log: (s: string) => void;
};

export type ProcessResult = {
  files: number;
  /** Objects put to the store (always 0 in a dry run). */
  uploaded: number;
  /** Objects that were already in the store. */
  skipped: number;
  /** Objects a dry run would have put. */
  planned: number;
  sizes: Map<string, Size>;
  errors: string[];
};

async function runPool<T>(items: readonly T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await work(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/**
 * The variant key scheme drops the extension, so `a.jpg` and `a.png` map to the same variant keys.
 * The first file (in path order) keeps them; a later file whose keys collide gets an error and no variants.
 * Only files that share a stem can collide, so only those are measured up front.
 */
async function findCollisions(uploadsDir: string, files: readonly string[], widths: readonly number[]): Promise<{ skip: Set<string>; errors: string[] }> {
  const byStem = new Map<string, string[]>();
  for (const path of files.filter(isRaster)) {
    const stem = variantStem(`uploads/${path}`);
    byStem.set(stem, [...(byStem.get(stem) ?? []), path]);
  }
  const skip = new Set<string>();
  const errors: string[] = [];
  for (const group of byStem.values()) {
    if (group.length < 2) continue;
    const owners = new Map<string, string>();
    for (const path of [...group].sort()) {
      let width: number;
      try {
        ({ width } = await imageSize(readFileSync(join(uploadsDir, path))));
      } catch {
        continue; // unreadable: the main pass reports it
      }
      const keys = variantKeys(`uploads/${path}`, width, widths);
      const clashes = keys.filter((k) => owners.has(k));
      const byOwner = Map.groupBy(clashes, (k) => owners.get(k));
      for (const [owner, ks] of byOwner) errors.push(`${path}: variant keys ${ks.join(', ')} are already produced by ${owner}; variants of ${path} skipped`);
      if (clashes.length) skip.add(path);
      else for (const k of keys) owners.set(k, path);
    }
  }
  return { skip, errors };
}

/** Uploads every original under `uploadsDir` plus webp variants of the raster images (jpg too for covers), skipping keys the store already has. */
export async function processUploads(opts: ProcessOptions): Promise<ProcessResult> {
  const { uploadsDir, store, widths = WIDTHS, dryRun = false, jpgFor = new Set<string>(), log } = opts;
  const files = [...(opts.files ?? listUploadFiles(uploadsDir))];
  const existing = await store.listKeys('uploads/');
  const collisions = await findCollisions(uploadsDir, files, widths);
  const result: ProcessResult = { files: files.length, uploaded: 0, skipped: 0, planned: 0, sizes: new Map(), errors: [...collisions.errors] };

  const send = async (key: string, body: Buffer, contentType: string) => {
    if (existing.has(key)) {
      result.skipped++;
      return;
    }
    if (dryRun) {
      result.planned++;
      return;
    }
    await store.put(key, body, contentType);
    existing.add(key);
    result.uploaded++;
  };

  let done = 0;
  await runPool(files, CONCURRENCY, async (path) => {
    try {
      const original = readFileSync(join(uploadsDir, path));
      const key = `uploads/${path}`;
      await send(key, original, contentTypeFor(path));
      if (isRaster(path)) {
        const size = await imageSize(original);
        result.sizes.set(path, size);
        if (collisions.skip.has(path)) return;
        const formats = { jpg: jpgFor.has(path) };
        const keys = variantKeys(key, size.width, widths, formats);
        if (keys.some((k) => !existing.has(k))) {
          const { variants } = await resizeVariants(original, key, widths, formats);
          for (const v of variants) await send(v.key, v.body, contentTypeFor(v.key));
        } else {
          result.skipped += keys.length;
        }
      }
    } catch (error) {
      result.errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (++done % 100 === 0) log(`${done}/${files.length} files`);
  });
  return result;
}
