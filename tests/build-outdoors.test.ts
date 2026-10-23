import { describe, expect, test } from 'vitest';
import { count, read } from './helpers/dist';

describe('outdoors index', () => {
  test('heading, lead, filter row and the empty state (no trips yet)', () => {
    const html = read('dist/outdoors/index.html');
    expect(html).toContain('<title>Outdoors — olegs</title>');
    expect(html).toMatch(/<h1[^>]*>Outdoors<\/h1>/);
    expect(html).toContain('a kind of shinrin-yoku on foot or on two wheels');
    expect(html).toMatch(/<a href="\/outdoors\/" aria-current="page"[^>]*>All<\/a>/);
    expect(html).toContain('href="/outdoors/hikes/"'); expect(html).toContain('href="/outdoors/rides/"');
    expect(html).toContain('No trips yet.');
  });
  test('hikes and rides pages exist with their filter active', () => {
    expect(read('dist/outdoors/hikes/index.html')).toMatch(/<a href="\/outdoors\/hikes\/" aria-current="page"[^>]*>Hikes<\/a>/);
    expect(read('dist/outdoors/rides/index.html')).toMatch(/<a href="\/outdoors\/rides\/" aria-current="page"[^>]*>Rides<\/a>/);
    expect(read('dist/outdoors/rides/index.html')).toContain('<title>Rides — Outdoors — olegs</title>');
  });
});

describe('nav', () => {
  test('order About, Photos, Outdoors, Blog, Search; Outdoors active on its pages', () => {
    const html = read('dist/outdoors/index.html');
    const hrefs = [...html.matchAll(/<a href="(\/[a-z]*\/)"[^>]*>(About|Photos|Outdoors|Blog|Search)<\/a>/g)].map((m) => m[1]);
    expect(hrefs.slice(0, 5)).toEqual(['/about/', '/photos/', '/outdoors/', '/blog/', '/search/']);
    expect(html).toMatch(/<a href="\/outdoors\/" aria-current="page"[^>]*>Outdoors<\/a>/);
    expect(count(html, 'aria-current="page"')).toBe(2); // nav + filter
  });
});
