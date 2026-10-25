import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

// Every built page through axe-core (WCAG 2.0, 2.1 and 2.2 A and AA, plus axe's best practices), at a desktop and a
// phone width, in headless Chrome. GitHub's ubuntu runners come with Google Chrome; elsewhere CHROME_PATH names a
// browser. Without one the scan is skipped locally and fails on CI, so it can never be skipped by accident there.

const DIST = 'dist';
const WIDTHS = [1280, 390];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const TABS = 4; // pages scanned at once

function chromePath(): string | undefined {
  const pw = '/opt/pw-browsers';
  const playwright = existsSync(pw)
    ? readdirSync(pw).filter((d) => d.startsWith('chromium-')).map((d) => join(pw, d, 'chrome-linux', 'chrome'))
    : [];
  return [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', ...playwright].find(
    (p): p is string => !!p && existsSync(p),
  );
}

const chrome = chromePath();
if (!chrome && process.env.CI) throw new Error('The accessibility scan needs Chrome: set CHROME_PATH');

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

/** URL paths of the built pages, without the redirect stubs (noindex pages that only point elsewhere). */
function pagePaths(): string[] {
  return readdirSync(DIST, { recursive: true, encoding: 'utf8' })
    .filter((f) => f === 'index.html' || f.endsWith('/index.html'))
    .filter((f) => !readFileSync(join(DIST, f), 'utf8').includes('http-equiv="refresh"'))
    .map((f) => `/${f.slice(0, -'index.html'.length)}`)
    .sort();
}

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.gpx': 'application/gpx+xml' };

/** `dist/` over HTTP, as GitHub Pages serves it: a directory answers with its index.html. */
function serve(): Promise<Server> {
  const server = createServer((req, res) => {
    let file = normalize(join(DIST, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)));
    if (!file.startsWith(DIST)) return void res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

type Finding = { rule: string; impact: string; help: string; target: string; why: string };

async function scan(page: Page): Promise<Finding[]> {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (tags) => {
    // @ts-expect-error axe is the global the script above defines
    const result = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return result.violations.flatMap((v: any) =>
      v.nodes.map((n: any) => ({ rule: v.id, impact: v.impact, help: v.help, target: n.target.join(' '), why: (n.failureSummary ?? '').split('\n')[1]?.trim() ?? '' })),
    );
  }, TAGS);
}

describe.skipIf(!chrome)('accessibility (axe-core)', () => {
  let server: Server;
  let browser: Browser;
  let origin: string;

  beforeAll(async () => {
    server = await serve();
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    browser = await puppeteer.launch({ executablePath: chrome, args: ['--no-sandbox'] });
  }, 60_000); // Chrome can take more than the default 10 s to start while the rest of the suite runs

  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  /** A tab that only reaches the local site: photos, players and fonts from elsewhere are not part of the page's markup. */
  async function tab(width: number): Promise<Page> {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', (r) => void (r.url().startsWith(origin) ? r.continue() : r.abort()));
    return page;
  }

  const report = (findings: (Finding & { where: string })[]) =>
    findings.map((f) => `${f.where} [${f.impact}] ${f.rule}: ${f.help} at ${f.target}${f.why ? ` (${f.why})` : ''}`);

  test(
    'every page, at a desktop and a phone width, has no violation',
    async () => {
      const paths = pagePaths();
      expect(paths.length).toBeGreaterThan(500);
      const jobs = WIDTHS.flatMap((width) => paths.map((path) => ({ path, width })));
      const findings: (Finding & { where: string })[] = [];
      await Promise.all(
        Array.from({ length: TABS }, async () => {
          for (let job = jobs.shift(); job; job = jobs.shift()) {
            const page = await tab(job.width);
            await page.goto(origin + job.path, { waitUntil: 'load' });
            for (const f of await scan(page)) findings.push({ ...f, where: `${job.path} @${job.width}` });
            await page.close();
          }
        }),
      );
      expect(report(findings)).toEqual([]);
    },
    20 * 60_000,
  );

  test.each([
    ['a gallery video, after ▶', '/gallery/abandoned-beldi-furnace-novara-italy/', 'a.video-embed'],
    ['the track of the day, after ▶', '/', 'a.play[data-video]'],
    ['a record track, after ▶', '/records/aphex-twin-selected-ambient-works-85-92/', 'a.play[data-video]'],
  ])('%s', async (_name, path, play) => {
    const page = await tab(1280);
    await page.goto(origin + path, { waitUntil: 'load' });
    await page.click(play);
    await page.waitForSelector('iframe');
    const findings = (await scan(page)).map((f) => ({ ...f, where: path }));
    await page.close();
    expect(report(findings)).toEqual([]);
  }, 60_000);
});
