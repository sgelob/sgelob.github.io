import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import sharp from 'sharp';
import { expect, test } from 'vitest';
import { WIDTHS } from '../src/lib/images';

const CONTENT = 'src/content';
const UPLOADS_DIR = process.env.UPLOADS_DIR;
const UPLOAD_URL = /https:\/\/img\.olegs\.be\/uploads\/(\d{4}\/\d{2}\/[^\s)"'<>]+)/g;
const VARIANT = /^(.+)-(\d+)\.(jpg|webp)$/;

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

/** Upload paths (relative to uploads/) referenced from the content, with the file that references them. */
function referencedUploads(): { file: string; path: string }[] {
  return markdownFiles(CONTENT).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(UPLOAD_URL)].map((m) => ({ file, path: decodeURI(m[1]) })),
  );
}

/** The original a variant was made from: same directory and name, any extension. */
function originalOf(stem: string): string | undefined {
  const dir = join(UPLOADS_DIR!, dirname(stem));
  if (!existsSync(dir)) return undefined;
  const name = basename(stem);
  const match = readdirSync(dir).find((file) => file.slice(0, -extname(file).length || undefined) === name && extname(file));
  return match && join(dir, match);
}

test('content references some upload variants', () => {
  expect(referencedUploads().filter(({ path }) => VARIANT.test(path)).length).toBeGreaterThan(0);
});

// Variants are never upscaled and GIFs get none (they would lose the animation): a URL to a variant
// wider than its original, or to a variant of a GIF, is a 404 on img.olegs.be.
test.skipIf(!UPLOADS_DIR)('every referenced variant exists: not wider than its original, not from a GIF', async () => {
  const problems: string[] = [];
  for (const { file, path } of referencedUploads()) {
    if (existsSync(join(UPLOADS_DIR!, path))) continue; // a link to the original itself
    const m = VARIANT.exec(path);
    if (!m) {
      problems.push(`${file}: ${path} is neither an original in UPLOADS_DIR nor a variant`);
      continue;
    }
    const [, stem, w] = m;
    const width = Number(w);
    if (!(WIDTHS as readonly number[]).includes(width)) problems.push(`${file}: ${path}: no ${width} px variant is generated`);
    const original = originalOf(stem);
    if (!original) {
      problems.push(`${file}: ${path}: no original ${stem}.* in UPLOADS_DIR`);
      continue;
    }
    if (/\.gif$/i.test(original)) {
      problems.push(`${file}: ${path}: the original is a GIF, link ${basename(original)} itself`);
      continue;
    }
    const { width: actual } = await sharp(original).metadata();
    if (actual !== undefined && width > actual) problems.push(`${file}: ${path}: wider than the ${actual} px original`);
  }
  expect(problems).toEqual([]);
});
