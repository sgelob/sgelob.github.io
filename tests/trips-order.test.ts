import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { orderTrips, readRideTime, rideOrders, writeOrder } from '../scripts/trip/order';
import { sortTrips } from '../src/lib/outdoors';

describe('ride order', () => {
  test('rideOrders numbers the trips that share a published date by their real ride time, earliest first', () => {
    const orders = rideOrders([
      { slug: 'c', date: '2026-10-01T12:00:00', ride: '2026-10-24T07:10:00Z' },
      { slug: 'a', date: '2026-10-01T12:00:00', ride: '2026-10-03T08:00:00Z' },
      { slug: 'b', date: '2026-10-01T12:00:00', ride: '2026-10-17T06:30:00Z' },
      { slug: 'alone', date: '2026-09-20T12:00:00', ride: '2026-09-20T07:00:00Z' },
    ]);
    expect(Object.fromEntries(orders)).toEqual({ a: 1, b: 2, c: 3, alone: undefined });
  });

  test('rideOrders numbers a whole published month, also when one trip shows its day and another only the month', () => {
    const orders = rideOrders([
      { slug: 'day', date: '2026-09-20T12:00:00', ride: '2026-09-20T07:57:00Z' },
      { slug: 'month', date: '2026-09-01T12:00:00', ride: '2026-09-26T05:26:00Z' },
      { slug: 'august', date: '2026-08-30T12:00:00', ride: '2026-08-30T06:00:00Z' },
    ]);
    expect(Object.fromEntries(orders)).toEqual({ day: 1, month: 2, august: undefined });
  });

  test('a trip without a recorded ride time keeps its place untouched and is reported', () => {
    const problems: string[] = [];
    const orders = rideOrders([
      { slug: 'a', date: '2026-10-01T12:00:00', ride: '2026-10-03T08:00:00Z' },
      { slug: 'x', date: '2026-10-01T12:00:00' },
    ], problems);
    expect(orders.has('x')).toBe(false);
    expect(problems.join()).toMatch(/x/);
  });

  test('writeOrder adds, replaces or removes the order line right after the date', () => {
    const doc = '---\ntitle: T\ndate: "2026-10-01T12:00:00"\nactivity: ride\n---\nStory.\n';
    const one = writeOrder(doc, 2);
    expect(one).toBe('---\ntitle: T\ndate: "2026-10-01T12:00:00"\norder: 2\nactivity: ride\n---\nStory.\n');
    expect(writeOrder(one, 3)).toContain('\norder: 3\nactivity');
    expect(writeOrder(one, undefined)).toBe(doc);
    expect(writeOrder(doc, undefined)).toBe(doc);
  });

  test('readRideTime reads the ride line of a trip’s notes', () => {
    expect(readRideTime('# T\n\n- activity: ride\n- ride: 2026-10-17T06:30:00Z\n- date: 2026-10-01\n')).toBe('2026-10-17T06:30:00Z');
    expect(readRideTime('# T\n\n- date: 2026-10-01\n')).toBeUndefined();
  });

  test('orderTrips numbers the trip files from the notes, and a second run changes nothing', () => {
    const base = mkdtempSync(join(tmpdir(), 'order-'));
    const content = join(base, 'outdoors'); const notes = join(base, 'notes');
    mkdirSync(content); mkdirSync(notes);
    const trip = (slug: string, ride: string) => {
      writeFileSync(join(content, `${slug}.md`), `---\ntitle: ${slug}\ndate: "2026-10-01T12:00:00"\nactivity: ride\n---\n`);
      writeFileSync(join(notes, `${slug}.md`), `# ${slug}\n\n- ride: ${ride}\n`);
    };
    trip('late', '2026-10-24T07:00:00Z'); trip('early', '2026-10-03T07:00:00Z');
    expect(orderTrips(content, notes, () => {}).changed.sort()).toEqual(['early', 'late']);
    expect(readFileSync(join(content, 'early.md'), 'utf8')).toContain('\norder: 1\n');
    expect(readFileSync(join(content, 'late.md'), 'utf8')).toContain('\norder: 2\n');
    expect(orderTrips(content, notes, () => {}).changed).toEqual([]);
  });

  test('sortTrips: newest published date first, then the latest ride of that date', () => {
    const t = (id: string, date: string, order?: number) => ({ id, data: { date: new Date(date), order } });
    const sorted = sortTrips([t('sept', '2026-09-20T12:00:00'), t('a', '2026-10-01T12:00:00', 1), t('c', '2026-10-01T12:00:00', 3), t('b', '2026-10-01T12:00:00', 2)]);
    expect(sorted.map((x) => x.id)).toEqual(['c', 'b', 'a', 'sept']);
  });

  test('sortTrips: within a month the ride order wins over the published day', () => {
    const t = (id: string, date: string, order?: number) => ({ id, data: { date: new Date(date), order } });
    const sorted = sortTrips([t('august', '2026-08-30T12:00:00'), t('day', '2026-09-20T12:00:00', 1), t('month', '2026-09-01T12:00:00', 2)]);
    expect(sorted.map((x) => x.id)).toEqual(['month', 'day', 'august']);
  });
});
