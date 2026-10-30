// Covers keep jpg variants, every other photo is webp only (issue #69): link previews, search results and the feed
// want a jpg. This lists the covers, makes their missing jpg variants, and finds the jpg variants R2 can drop.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { WIDTHS } from '../../src/lib/images';
import type { ObjectStore } from './r2';
import { resizeVariants, variantKeys, variantStem } from './resize';

export type Cover = { path: string; width: number };

const JPG_ONLY = { jpg: true, webp: false };
// Only the widths the site makes: gallery photos end in a number too (`-01.jpg`) and are originals.
const VARIANT = new RegExp(`^(.+)-(${WIDTHS.join('|')})\\.(jpg|webp)$`);

const frontMatter = (file: string): Record<string, unknown> => parse(readFileSync(file, 'utf8').split(/^---$/m)[1] ?? '') ?? {};
const markdownIn = (dir: string): string[] =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => join(dir, f));

/** The covers of the galleries, trips and records, with their widths. `root` is the project root. */
export function coverImages(root: string): Cover[] {
  const covers: Cover[] = [];
  for (const kind of ['galleries', 'outdoors']) {
    for (const file of markdownIn(join(root, 'src/content', kind))) {
      const fm = frontMatter(file) as { cover?: string; coverWidth?: number; photos?: { src: string; width: number }[] };
      const width = fm.coverWidth ?? fm.photos?.find((p) => p.src === fm.cover)?.width;
      if (fm.cover && width) covers.push({ path: fm.cover, width });
    }
  }
  const records = parse(readFileSync(join(root, 'src/data/records.yaml'), 'utf8')) as { cover?: { src: string; width: number } }[];
  for (const r of records) if (r.cover) covers.push({ path: r.cover.src, width: r.cover.width });
  return covers;
}

/** jpg variants linked by hand in the content (blog posts link a few `-960.jpg` directly). */
export function linkedJpgKeys(root: string): Set<string> {
  const keys = new Set<string>();
  const walk = (dir: string): void => {
    for (const f of readdirSync(dir).sort()) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(md|mdx|yaml)$/.test(f)) {
        for (const m of readFileSync(p, 'utf8').matchAll(/img\.olegs\.be\/(uploads\/[^\s"'<>)]+-\d+\.jpg)/g)) keys.add(m[1]!);
      }
    }
  };
  walk(join(root, 'src/content'));
  return keys;
}

/** Every jpg variant the site may link: those of the covers, and those written in the content. */
export function keptJpgKeys(root: string): Set<string> {
  const kept = linkedJpgKeys(root);
  for (const c of coverImages(root)) for (const k of variantKeys(`uploads/${c.path}`, c.width, WIDTHS, JPG_ONLY)) kept.add(k);
  return kept;
}

export type EnsureOptions = {
  covers: readonly Cover[];
  store: ObjectStore;
  /** The original of a cover, by its `yyyy/mm/file` path. */
  readOriginal: (path: string) => Promise<Buffer>;
  dryRun?: boolean;
  log: (s: string) => void;
};

/** Makes the jpg variants a cover lacks (a cover changed after upload), from its original. Idempotent. */
export async function ensureCoverJpgs(opts: EnsureOptions): Promise<{ created: number; planned: number; errors: string[] }> {
  const { covers, store, readOriginal, dryRun = false, log } = opts;
  const existing = await store.listKeys('uploads/');
  const result = { created: 0, planned: 0, errors: [] as string[] };
  for (const { path, width } of covers) {
    const key = `uploads/${path}`;
    const missing = variantKeys(key, width, WIDTHS, JPG_ONLY).filter((k) => !existing.has(k));
    if (!missing.length) continue;
    if (dryRun) {
      result.planned += missing.length;
      continue;
    }
    try {
      const { variants } = await resizeVariants(await readOriginal(path), key, WIDTHS, JPG_ONLY);
      for (const v of variants.filter((v) => missing.includes(v.key))) {
        await store.put(v.key, v.body, 'image/jpeg');
        result.created++;
      }
      log(`${path}: ${missing.length} jpg variants`);
    } catch (error) {
      result.errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return result;
}

/**
 * The jpg variants R2 can drop: `<stem>-<width>.jpg` beside an original `<stem>.<ext>` (so it can be rebuilt), not kept.
 * A jpg named like a variant with no original beside it is an original itself, or an orphan: left alone.
 */
export function jpgVariantsToDelete(keys: ReadonlySet<string>, kept: ReadonlySet<string>): string[] {
  const originals = new Set([...keys].filter((k) => !VARIANT.test(k)).map(variantStem));
  return [...keys]
    .filter((k) => {
      const m = VARIANT.exec(k);
      return m?.[3] === 'jpg' && originals.has(m[1]!) && !kept.has(k);
    })
    .sort();
}
