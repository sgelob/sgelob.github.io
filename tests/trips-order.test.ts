import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { komootTourId, matchRideTime, missingRideTimes, orderTrips, readRideTime, recordRideTime, rideOrders, writeOrder } from '../scripts/trip/order';
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

  test('komootTourId: the tour behind a trip’s Komoot link, or nothing for a trip without one', () => {
    expect(komootTourId('---\nlinks:\n  - label: Komoot\n    url: https://www.komoot.com/tour/3105861221\n---\n')).toBe('3105861221');
    expect(komootTourId('---\ntrack: false\n---\n')).toBeUndefined();
  });

  test('missingRideTimes lists the trips whose notes have no ride time; recordRideTime fills them in once', () => {
    const base = mkdtempSync(join(tmpdir(), 'ride-'));
    const content = join(base, 'outdoors'); const notes = join(base, 'notes');
    mkdirSync(content); mkdirSync(notes);
    const trip = (slug: string, tour?: string) => writeFileSync(join(content, `${slug}.md`), `---\ntitle: ${slug}\ndate: "2026-10-01T12:00:00"\ndistance: 23.1\nclimb: 1055\n${tour ? `links:\n  - label: Komoot\n    url: https://www.komoot.com/tour/${tour}\n` : ''}---\n`);
    trip('noted', '1'); trip('unnoted', '2'); trip('discreet');
    writeFileSync(join(notes, 'noted.md'), '# noted\n\n- ride: 2026-10-03T07:00:00Z\n');
    expect(missingRideTimes(content, notes)).toEqual([
      { slug: 'discreet', tourId: undefined, month: '2026-10', distanceKm: 23.1, climb: 1055 },
      { slug: 'unnoted', tourId: '2', month: '2026-10', distanceKm: 23.1, climb: 1055 },
    ]);
    recordRideTime(notes, 'unnoted', '2026-10-10T07:00:00Z');
    recordRideTime(notes, 'unnoted', '2026-10-10T07:00:00Z');
    expect(readFileSync(join(notes, 'unnoted.md'), 'utf8').match(/- ride: /g)).toHaveLength(1);
    expect(missingRideTimes(content, notes).map((t) => t.slug)).toEqual(['discreet']);
  });
  test('matchRideTime: the one tour of the trip’s month with its distance and climb, in Italian time; nothing when none or several match', () => {
    const trip = { slug: 'loop', month: '2026-05', distanceKm: 23.1, climb: 1055 };
    const tours = [
      { distanceKm: 23.1, climb: 1055, startedAt: '2026-05-21T14:43:50.000Z' },
      { distanceKm: 23.1, climb: 1055, startedAt: '2026-06-21T14:43:50.000Z' }, // another month
      { distanceKm: 23.2, climb: 1055, startedAt: '2026-05-02T07:00:00.000Z' }, // another distance
    ];
    expect(matchRideTime(trip, tours)).toBe('2026-05-21T14:43:50.000Z');
    expect(matchRideTime({ ...trip, month: '2026-06' }, [{ distanceKm: 23.1, climb: 1055, startedAt: '2026-05-31T22:30:00.000Z' }])).toBe('2026-05-31T22:30:00.000Z'); // 00:30 on 1 June in Turin
    expect(matchRideTime(trip, [...tours, { distanceKm: 23.1, climb: 1055, startedAt: '2026-05-28T07:00:00.000Z' }])).toBeUndefined();
    expect(matchRideTime({ ...trip, climb: undefined }, tours)).toBeUndefined();
  });
});
