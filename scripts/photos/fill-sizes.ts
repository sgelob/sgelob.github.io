import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { writeMarkdown } from '../lib/frontmatter';
import type { Photo } from '../migrate/galleries';
import { imageSize } from './resize';

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export type FixSizesResult = { files: number; photos: number; missing: string[] };

/** Rewrites gallery files whose photos have `width: 0`, using sizes measured from the files in `uploadsDir`. */
export async function fixSizes(opts: { contentDir: string; uploadsDir: string; log: (s: string) => void }): Promise<FixSizesResult> {
  const { contentDir, uploadsDir, log } = opts;
  const result: FixSizesResult = { files: 0, photos: 0, missing: [] };

  for (const file of readdirSync(contentDir).filter((n) => n.endsWith('.md')).sort()) {
    const match = FRONTMATTER.exec(readFileSync(join(contentDir, file), 'utf8'));
    if (!match) continue;
    const frontmatter = parse(match[1]) as { photos?: Photo[] };
    const unsized = (frontmatter.photos ?? []).filter((p) => !p.width || !p.height);
    if (!unsized.length) continue;

    let fixed = 0;
    for (const photo of unsized) {
      try {
        Object.assign(photo, await imageSize(readFileSync(join(uploadsDir, photo.src))));
        fixed++;
      } catch {
        result.missing.push(photo.src);
        log(`${file}: cannot measure ${photo.src}`);
      }
    }
    if (!fixed) continue;
    writeMarkdown(contentDir, file.replace(/\.md$/, ''), frontmatter, match[2].replace(/^\n/, ''));
    result.files++;
    result.photos += fixed;
    log(`${file}: ${fixed} sizes filled`);
  }
  return result;
}
