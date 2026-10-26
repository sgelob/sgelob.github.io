import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const CONCURRENCY = 8;
// Named so the site's analytics can tell these checks from bots: every run requests every page.
const HEADERS = { 'User-Agent': 'olegs.be check-urls' };

export interface UrlResult {
  path: string;
  status: number;
}

/** Requests every path under `base` (percent-encoded, redirects not followed); results keep the input order. */
export async function checkUrls(base: string, paths: string[]): Promise<UrlResult[]> {
  const results: UrlResult[] = new Array(paths.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < paths.length) {
      const index = next++;
      const path = paths[index]!;
      const response = await fetch(new URL(encodeURI(path), base), { redirect: 'manual', headers: HEADERS });
      await response.body?.cancel();
      results[index] = { path, status: response.status };
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, paths.length) }, worker));
  return results;
}

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { base: { type: 'string' }, file: { type: 'string', default: 'tests/fixtures/live-urls.txt' } } });
  if (!values.base) {
    console.error('usage: npm run check-urls -- --base http://localhost:4321 [--file tests/fixtures/live-urls.txt]');
    return 2;
  }
  const paths = readFileSync(values.file!, 'utf8').split('\n').filter(Boolean);
  const results = await checkUrls(values.base, paths);
  const failures = results.filter((r) => r.status !== 200);
  for (const { path, status } of failures) console.log(`${status} ${path}`);
  console.log(`${paths.length} urls checked, ${failures.length} failures`);
  return failures.length > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
