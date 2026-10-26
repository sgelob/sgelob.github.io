import { vi, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { checkUrls } from '../scripts/check-urls';

const received: string[] = [];
let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    received.push(req.url ?? '');
    if (req.url === '/moved/') {
      res.writeHead(301, { location: '/a/' });
    } else {
      res.statusCode = req.url === '/a/' || req.url?.startsWith('/gallery/%D0') ? 200 : 404;
    }
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

test('checkUrls reports the status of each path, in input order', async () => {
  expect(await checkUrls(base, ['/a/', '/b/'])).toEqual([
    { path: '/a/', status: 200 },
    { path: '/b/', status: 404 },
  ]);
});

test('checkUrls percent-encodes a Cyrillic path before requesting it', async () => {
  received.length = 0;
  const path = '/gallery/лубитель/';
  expect(await checkUrls(base, [path])).toEqual([{ path, status: 200 }]);
  expect(received).toEqual([encodeURI(path)]);
  expect(received[0]).toBe('/gallery/%D0%BB%D1%83%D0%B1%D0%B8%D1%82%D0%B5%D0%BB%D1%8C/');
});

test('checkUrls reports a redirect as is instead of following it', async () => {
  expect(await checkUrls(base, ['/moved/'])).toEqual([{ path: '/moved/', status: 301 }]);
});

test('checkUrls keeps input order across the concurrency limit', async () => {
  const paths = Array.from({ length: 20 }, (_, i) => `/n${i}/`);
  expect((await checkUrls(base, paths)).map((r) => r.path)).toEqual(paths);
});

afterEach(() => vi.unstubAllGlobals());

test('checkUrls names itself in the User-Agent, so the site’s analytics can tell our checks from bots', async () => {
  const seen: { url: string; ua: string | undefined }[] = [];
  vi.stubGlobal('fetch', async (url: URL, init?: RequestInit) => {
    seen.push({ url: String(url), ua: new Headers(init?.headers).get('user-agent') ?? undefined });
    return new Response(null, { status: 200 });
  });
  const results = await checkUrls('https://example.test', ['/a/', '/b c/']);
  expect(results.map((r) => r.status)).toEqual([200, 200]);
  expect(seen.map((s) => s.url)).toEqual(['https://example.test/a/', 'https://example.test/b%20c/']);
  expect(seen.every((s) => s.ua === 'olegs.be check-urls')).toBe(true);
});
