import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';
import type { ObjectStore } from '../scripts/photos/r2';
import { pathOf, runWizard, slugify, type WizardDeps } from '../scripts/trip/wizard';
import type { KomootTour } from '../scripts/trip/komoot';
import { tripSchema } from '../src/lib/outdoors';

const fixture = (name: string) => new URL(`./fixtures/${name}`, import.meta.url).pathname;

/** A wizard wired to temp folders, answering from a script; invalid answers must be followed by valid ones. */
function setup(script: (photos: string) => string[], komoot?: (url: string) => Promise<KomootTour>, komootPhotos?: (tour: KomootTour) => Promise<string>) {
  const photos = mkdtempSync(join(tmpdir(), 'wiz-photos-'));
  copyFileSync(fixture('sample-1620x1080.jpg'), join(photos, 'IMG_0002.JPG'));
  copyFileSync(fixture('sample-1620x1080.jpg'), join(photos, 'IMG_0001.jpg'));
  const base = mkdtempSync(join(tmpdir(), 'wiz-'));
  const queue = script(photos);
  const said: string[] = [];
  const store: ObjectStore = { listKeys: async () => new Set(), put: async () => {} };
  const deps: WizardDeps = {
    ask: async (q, opts) => {
      if (!queue.length) throw new Error(`no scripted answer for: ${q}`);
      const a = queue.shift()!;
      return a === '' && opts?.default !== undefined && !opts.multiline ? opts.default : a;
    },
    say: (l) => said.push(l),
    store,
    uploadsDir: join(base, 'uploads'),
    contentDir: join(base, 'outdoors'),
    tracksDir: join(base, 'outdoors', 'tracks'),
    notesDir: join(base, 'drafts'),
    countries: ['italy', 'france', 'croatia'],
    komoot,
    komootPhotos,
  };
  mkdirSync(deps.tracksDir, { recursive: true });
  return { photos, deps, said, queue };
}

describe('trip wizard', () => {
  test('a shared ride: every answer lands in the trip file, the track is sanitised, the notes are kept', async () => {
    const { deps, said, queue } = setup((photos) => [
      photos, 'bike', 'ride', 'enduro', 'Colle delle Finestre', '', 'Val di Susa', 'itlay', 'italy', '38,5', '1700',
      'y', fixture('track.gpx'), 'Komoot=https://www.komoot.com/tour/1', 'not a link', '', '2026-06-14', '2', 'n',
      'Up the military road from Meana.\nTrail bike was the right call.',
      '', // the review: Enter creates the trip
    ]);
    const r = await runWizard(deps);
    expect(queue).toEqual([]);
    expect(r.slug).toBe('colle-delle-finestre');
    expect(r.discreet).toBe(false);
    const text = readFileSync(r.path, 'utf8');
    const data = parse(text.split('---')[1]);
    expect(data).toMatchObject({ title: 'Colle delle Finestre', activity: 'ride', bike: 'trail', distance: 38.5, climb: 1700, area: 'Val di Susa', country: 'italy', track: 'colle-delle-finestre.gpx', links: [{ label: 'Komoot', url: 'https://www.komoot.com/tour/1' }], cover: '2026/06/colle-delle-finestre-02.jpg', darkHeader: false });
    expect(text).toContain('date: "2026-06-14T12:00:00"');
    expect(() => tripSchema.parse(data)).toThrow(/alt/); // only the alt texts are still missing
    const track = readFileSync(r.track!, 'utf8');
    expect(track).toContain('<trkpt');
    for (const banned of ['<time', '<wpt', '<extensions', 'Parking']) expect(track).not.toContain(banned);
    const notes = readFileSync(r.notes, 'utf8');
    expect(notes).toContain('# Colle delle Finestre');
    expect(notes).toContain('Trail bike was the right call.');
    expect(notes).toContain('shared: Komoot https://www.komoot.com/tour/1');
    expect(said.some((l) => l.includes('answer hike or ride'))).toBe(true);
    expect(said.some((l) => l.includes('unknown country "itlay"'))).toBe(true);
    expect(said.some((l) => l.includes('write it as label=https://'))).toBe(true);
  });

  test('a discreet hike: no track, no links, the day on the 1st, and the notes flag it', async () => {
    const { deps, said } = setup((photos) => [photos, 'hike', 'Rocciamelone', 'hikes', 'rocciamelone', 'Val di Susa', '', '16', '1350', 'n', '2026-08-23', '', 'y', 'Long day, clear sky.', '']);
    const r = await runWizard(deps);
    expect(r.discreet).toBe(true);
    expect(r.track).toBeUndefined();
    expect(existsSync(join(deps.tracksDir, 'rocciamelone.gpx'))).toBe(false);
    const text = readFileSync(r.path, 'utf8');
    const data = parse(text.split('---')[1]);
    expect(data).toMatchObject({ activity: 'hike', track: false, country: 'italy', cover: '2026/08/rocciamelone-01.jpg', darkHeader: true });
    expect(data.bike).toBeUndefined();
    expect(data.links).toBeUndefined();
    expect(text).toContain('date: "2026-08-01T12:00:00"');
    expect(readFileSync(r.notes, 'utf8')).toContain('DISCREET');
    expect(said.some((l) => l.includes('taken by the hikes page'))).toBe(true);
    expect(said.some((l) => l.includes('the day is set to the 1st'))).toBe(true);
  });

  test('a Komoot link prefills activity, title, distance, climb and date, and offers its page as a link', async () => {
    const tour: KomootTour = { id: '1134841094', name: 'Colle delle Finestre', sport: 'mtb', distanceKm: 38.5, climb: 1700, date: '2026-06-14', startedAt: '2026-06-14T08:12:40.000+02:00', recorded: true, images: [], imagesTotal: 0 };
    const komoot = async (url: string) => { if (!url.includes('komoot')) throw new Error('not a Komoot tour link'); return tour; };
    // link (bad, then good), activity default, bike, title default, slug default, area, country default, distance default, climb default,
    // shared, gpx, Komoot link yes, no more links, date default, cover default, darkHeader, notes
    const { deps, said } = setup((photos) => ['https://example.com', 'https://www.komoot.com/tour/1134841094', photos, '', 'trail', '', '', 'Val di Susa', '', '', '', 'y', fixture('track.gpx'), '', '', '', '', '', 'Up and over.', ''], komoot);
    const r = await runWizard(deps);
    const data = parse(readFileSync(r.path, 'utf8').split('---')[1]);
    expect(data).toMatchObject({ title: 'Colle delle Finestre', activity: 'ride', bike: 'trail', distance: 38.5, climb: 1700, links: [{ label: 'Komoot', url: 'https://www.komoot.com/tour/1134841094' }] });
    expect(readFileSync(r.path, 'utf8')).toContain('date: "2026-06-14T12:00:00"');
    expect(said.some((l) => l.includes('not a Komoot tour link'))).toBe(true);
    expect(said.some((l) => l.startsWith('  Found: Colle delle Finestre, mtb, 38.5 km, 1700 m up, 2026-06-14'))).toBe(true);
    expect(readFileSync(r.notes, 'utf8')).toContain('- ride: 2026-06-14T08:12:40.000+02:00'); // the real time, kept only in the notes
  });

  test('with photos on Komoot, Enter at the folder question downloads them and the run goes on from that folder', async () => {
    const tour: KomootTour = { id: '907671487', name: 'Assietta ridge', sport: 'mtb', distanceKm: 52, climb: 1100, date: '2026-09-06', recorded: true, images: [{ id: 1, src: 'https://x/1', index: 1, createdAt: '', widthPx: 4608, heightPx: 3456 }], imagesTotal: 1 };
    let downloaded = '';
    const komootPhotos = async () => { downloaded = mkdtempSync(join(tmpdir(), 'wiz-komoot-')); copyFileSync(fixture('sample-1620x1080.jpg'), join(downloaded, '01.jpg')); return downloaded; };
    // link, folder (Enter → Komoot), activity, bike, title, slug, area, country, distance, climb, shared?, date, cover, darkHeader, notes
    const { deps, said } = setup(() => ['https://www.komoot.com/tour/907671487', '', '', 'xc', '', '', 'Val Chisone', '', '', '', 'n', '', '', '', 'Windy on the ridge.', ''], async () => tour, komootPhotos);
    const r = await runWizard(deps);
    expect(downloaded).not.toBe('');
    expect(r.photos).toBe(1);
    const data = parse(readFileSync(r.path, 'utf8').split('---')[1]);
    expect(data).toMatchObject({ title: 'Assietta ridge', activity: 'ride', bike: 'xc', distance: 52, climb: 1100, track: false, cover: '2026/09/assietta-ridge-01.jpg' });
    expect(said.some((l) => l.includes('1 photo.'))).toBe(true);
    expect(said.some((l) => l.includes('Downloading from Komoot'))).toBe(true);
    expect(said.some((l) => l === `  The photos are in ${downloaded}`)).toBe(true);
  });

  test('when Komoot lists only some of the photos (no login), they are not offered and the folder is asked for', async () => {
    const five = [1, 2, 3, 4, 5].map((id) => ({ id, src: `https://x/${id}`, index: id, createdAt: '', widthPx: 2048, heightPx: 1536 }));
    const tour: KomootTour = { id: '3297659281', name: 'Canosio – Gardetta', sport: 'mtb', distanceKm: 38.1, climb: 1500, date: '2026-09-20', recorded: true, images: five, imagesTotal: 26 };
    let offered = false;
    // link, folder (must be given), activity, bike, title, slug, area, country, distance, climb, shared?, date, cover, darkHeader, notes
    const { deps, said } = setup((photos) => ['https://www.komoot.com/tour/3297659281', '', photos, '', 'trail', '', '', 'Valle Maira', '', '', '', 'n', '', '', '', 'Gardetta plateau.', ''], async () => tour, async () => { offered = true; return ''; });
    const r = await runWizard(deps);
    expect(offered).toBe(false);
    expect(r.photos).toBe(2);
    expect(said.some((l) => l.includes('only 5 of the 26 photos without a login'))).toBe(true);
    expect(said.some((l) => l.includes('KOMOOT_EMAIL and KOMOOT_PASSWORD'))).toBe(true);
    expect(said.some((l) => l.includes('give the folder with the photos'))).toBe(true); // the empty answer is not taken as "download"
  });

  test('the review: a number re-asks that answer; turning discreet into shared asks for the GPX and the links, and keeps the real day', async () => {
    const { deps, said, queue } = setup((photos) => [
      photos, 'hike', 'Rocciamelone', '', 'Val di Susa', '', '16', '1350', 'n', '2026-08-23', '', 'n', 'Long day.',
      '3', 'Rocciamelone from the south', // row 3 is the title for a discreet hike
      '42', // not a row
      '9', 'y', fixture('track.gpx'), 'Strava=https://www.strava.com/activities/1', '', // the route made shared: GPX and links follow
      '',
    ]);
    const r = await runWizard(deps);
    expect(queue).toEqual([]);
    expect(said.some((l) => /^\s+3  Title\s+Rocciamelone$/.test(l))).toBe(true);
    expect(said.some((l) => l.includes('type a number from 1 to 13'))).toBe(true);
    const text = readFileSync(r.path, 'utf8');
    expect(parse(text.split('---')[1])).toMatchObject({ title: 'Rocciamelone from the south', track: 'rocciamelone.gpx', links: [{ label: 'Strava', url: 'https://www.strava.com/activities/1' }] });
    expect(text).toContain('date: "2026-08-23T12:00:00"'); // shared now: the real day, not the 1st
    expect(r.discreet).toBe(false);
    expect(existsSync(r.track!)).toBe(true);
  });

  test('the review: fewer photos re-ask the cover; a hike turned into a ride asks for the bike', async () => {
    const one = mkdtempSync(join(tmpdir(), 'wiz-one-'));
    copyFileSync(fixture('sample-1620x1080.jpg'), join(one, 'IMG_0009.jpg'));
    const { deps, queue } = setup((photos) => [
      photos, 'hike', 'Monte Musinè', '', 'Val di Susa', '', '24', '850', 'n', '2026-03-14', '2', 'n', 'Loop.',
      '1', one, // one photo now: cover 2 is gone, so the cover is asked again
      '',
      '2', 'ride', 'trail', // a ride: the bike follows
      '',
    ]);
    const r = await runWizard(deps);
    expect(queue).toEqual([]);
    const data = parse(readFileSync(r.path, 'utf8').split('---')[1]);
    expect(data).toMatchObject({ activity: 'ride', bike: 'trail', cover: '2026/03/monte-musine-01.jpg', track: false });
    expect(data.photos).toHaveLength(1);
    expect(r.photos).toBe(1);
  });

  test('a shared trip gets its contour layer drawn after the track; a failure is reported and the trip is still created', async () => {
    const drawn: string[] = [];
    const ok = setup((photos) => [photos, 'hike', 'Rocciamelone', '', 'Val di Susa', '', '16', '1350', 'y', fixture('track.gpx'), '', '2026-08-23', '', 'n', 'Long day.', '']);
    ok.deps.contours = async (track) => { drawn.push(track); return `/tracks/${track.replace('.gpx', '.contours.svg')}`; };
    const r = await runWizard(ok.deps);
    expect(drawn).toEqual(['rocciamelone.gpx']);
    expect(r.contours).toBe('/tracks/rocciamelone.contours.svg');
    expect(ok.said.some((l) => l === 'Contours: /tracks/rocciamelone.contours.svg')).toBe(true);

    const failing = setup((photos) => [photos, 'hike', 'Musinè', '', 'Val di Susa', '', '9', '800', 'y', fixture('track.gpx'), '', '2026-03-14', '', 'n', 'Short.', '']);
    failing.deps.contours = async () => { throw new Error('terrain tile 13/1/1 answered 503'); };
    const f = await runWizard(failing.deps);
    expect(f.contours).toBeUndefined();
    expect(existsSync(f.path)).toBe(true);
    expect(failing.said.some((l) => l.includes('were not drawn (terrain tile 13/1/1 answered 503); run npm run contours -- musine later'))).toBe(true);
  });

  test('approximate ends: the GPX and links as for a shared trip, the ends moved along the path, the day on the 1st', async () => {
    const { deps, said } = setup((photos) => [photos, 'ride', 'trail', 'Ridge loop', '', 'Collina torinese', '', '27', '1300', 'a', fixture('track.gpx'), 'Komoot=https://www.komoot.com/tour/2', '', '2026-10-17', '', 'n', 'Leaves.', '']);
    const r = await runWizard(deps);
    expect(r.discreet).toBe(false);
    const text = readFileSync(r.path, 'utf8');
    const data = parse(text.split('---')[1]);
    expect(data).toMatchObject({ track: 'ridge-loop.gpx', approximateEnds: true, links: [{ label: 'Komoot', url: 'https://www.komoot.com/tour/2' }] });
    expect(text).toContain('date: "2026-10-01T12:00:00"'); // approximate: the 1st of the month, as for a discreet trip
    expect(existsSync(join(deps.tracksDir, 'ridge-loop.profile.json'))).toBe(false);
    expect(said.some((l) => l.includes('Approximate: the route is published as a closed circuit with no start or finish'))).toBe(true);
    expect(readFileSync(r.notes, 'utf8')).toContain('approximate ends');
  });

  test('the area question offers the area of the latest trip, so Enter keeps it as written there', async () => {
    const { deps } = setup((photos) => [photos, 'ride', 'trail', 'Ridge loop', '', '', '', '27', '1300', 'd', '2026-10-17', '', 'n', '', '']);
    writeFileSync(join(deps.contentDir, 'older.md'), '---\ntitle: Older\ndate: "2026-08-01T12:00:00"\narea: Valle Maira\n---\n');
    writeFileSync(join(deps.contentDir, 'newer.md'), '---\ntitle: Newer\ndate: "2026-10-01T12:00:00"\norder: 2\narea: Metropolitan City of Turin\n---\n');
    const r = await runWizard(deps);
    expect(parse(readFileSync(r.path, 'utf8').split('---')[1])).toMatchObject({ area: 'Metropolitan City of Turin' });
  });

  test('a trip that shares its month with another is numbered by ride time, the latest after the earlier one', async () => {
    const { deps } = setup((photos) => [photos, 'ride', 'trail', 'Ridge loop', '', 'Collina torinese', '', '27', '1300', 'a', fixture('track.gpx'), '', '2026-10-17', '', 'n', 'Leaves.', '']);
    mkdirSync(deps.notesDir, { recursive: true });
    writeFileSync(join(deps.contentDir, 'earlier-loop.md'), '---\ntitle: Earlier loop\ndate: "2026-10-01T12:00:00"\nactivity: ride\n---\nStory.\n');
    writeFileSync(join(deps.notesDir, 'earlier-loop.md'), '# Earlier loop\n\n- ride: 2026-10-03T09:00:00+02:00\n');
    const r = await runWizard(deps);
    expect(readFileSync(r.notes, 'utf8')).toContain('- ride: 2026-10-17'); // no Komoot tour: the day given
    expect(readFileSync(r.path, 'utf8')).toMatch(/^date: "2026-10-01T12:00:00"\norder: 2$/m);
    expect(readFileSync(join(deps.contentDir, 'earlier-loop.md'), 'utf8')).toMatch(/^date: "2026-10-01T12:00:00"\norder: 1$/m);
  });

  test('a discreet trip gets no contour layer', async () => {
    let called = false;
    const d = setup((photos) => [photos, 'hike', 'Quiet valley', '', 'Val di Susa', '', '9', '500', 'n', '2026-03-14', '', 'n', 'Quiet.', '']);
    d.deps.contours = async () => { called = true; return ''; };
    await runWizard(d.deps);
    expect(called).toBe(false);
  });

  test('pathOf: a path dragged into the terminal, quoted or with escaped spaces', () => {
    expect(pathOf("'/Users/o/Downloads/2026-09-20 Canosio – Gardetta - komoot.gpx'")).toBe('/Users/o/Downloads/2026-09-20 Canosio – Gardetta - komoot.gpx');
    expect(pathOf('"/tmp/a b.gpx"')).toBe('/tmp/a b.gpx');
    expect(pathOf('/tmp/a\\ b/c\\ d.gpx ')).toBe('/tmp/a b/c d.gpx');
    expect(pathOf('~/x')).toBe(`${process.env.HOME}/x`);
  });

  test('slugify', () => {
    expect(slugify('Colle delle Finestre')).toBe('colle-delle-finestre');
    expect(slugify('Premužić trail, Velebit')).toBe('premuzic-trail-velebit');
  });
});
