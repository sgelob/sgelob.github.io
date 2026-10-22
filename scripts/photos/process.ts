import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WIDTHS } from '../../src/lib/images';
import { contentTypeFor, isRaster, listUploadFiles } from './files';
import type { ObjectStore } from './r2';
import { imageSize, resizeVariants, variantKeys, type Size } from './resize';

const CONCURRENCY = 4;

export type ProcessOptions = {
  uploadsDir: string;
  store: ObjectStore;
  widths?: readonly number[];
  dryRun?: boolean;
  /** Relative `yyyy/mm/file` paths to process instead of walking the whole directory. */
  files?: readonly string[];
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

/** Uploads every original under `uploadsDir` plus webp/jpg variants of the raster images, skipping keys the store already has. */
export async function processUploads(opts: ProcessOptions): Promise<ProcessResult> {
  const { uploadsDir, store, widths = WIDTHS, dryRun = false, log } = opts;
  const files = [...(opts.files ?? listUploadFiles(uploadsDir))];
  const existing = await store.listKeys('uploads/');
  const result: ProcessResult = { files: files.length, uploaded: 0, skipped: 0, planned: 0, sizes: new Map(), errors: [] };

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
        if (variantKeys(key, size.width, widths).some((k) => !existing.has(k))) {
          const { variants } = await resizeVariants(original, key, widths);
          for (const v of variants) await send(v.key, v.body, contentTypeFor(v.key));
        } else {
          result.skipped += variantKeys(key, size.width, widths).length;
        }
      }
    } catch (error) {
      result.errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (++done % 100 === 0) log(`${done}/${files.length} files`);
  });
  return result;
}
