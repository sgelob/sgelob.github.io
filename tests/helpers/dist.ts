import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Reads a build output file; `path` is relative to the project root, e.g. `dist/photos/index.html`. */
export const read = (path: string): string => readFileSync(ROOT + path, 'utf8');

export const exists = (path: string): boolean => existsSync(ROOT + path);

/** Number of non-overlapping occurrences of `needle` in `html`. */
export const count = (html: string, needle: string): number => html.split(needle).length - 1;

/** Number of Markdown entries in a content collection folder (src/content/<name>), so tests follow new content. */
export const contentCount = (name: string): number =>
  readdirSync(new URL(`../../src/content/${name}/`, import.meta.url)).filter((f) => f.endsWith('.md')).length;
