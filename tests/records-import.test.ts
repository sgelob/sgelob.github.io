import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import type { ObjectStore } from '../scripts/photos/r2';
import { importRecords } from '../scripts/records/import';
import { artistSortKey, cleanName, cleanTitle, curly, formatOf, matchVideos, parseCollection, slugBase, uniqueSlugs, youtubeId } from '../scripts/records/collection';

describe('collection export', () => {
  test('parseCollection: quoted fields with commas and doubled quotes; one row per release, the first copy kept', () => {
    const csv = [
      'Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition,Collection Notes',
      'AB 1,Some Band,"Hits, Vol. 1",Label One,"12"", EP",5,1997,101,Uncategorized,2013-01-13 19:27:21,,,',
      'AB 1,Some Band,"Hits, Vol. 1",Label One,"12"", EP",,1997,101,Uncategorized,2024-01-03 02:40:37,Mint (M),,',
      'CD 2,Other Artist,Second,Label Two,"CD, Album",,0,202,Uncategorized,2013-01-13 20:30:39,,,',
      '',
    ].join('\n');
    const rows = parseCollection(csv);
    expect(rows).toEqual([
      { releaseId: '101', artist: 'Some Band', title: 'Hits, Vol. 1', label: 'Label One', format: '12", EP', released: '1997' },
      { releaseId: '202', artist: 'Other Artist', title: 'Second', label: 'Label Two', format: 'CD, Album', released: '0' },
    ]);
  });

  test('cleanName drops Discogs numbers and curls apostrophes', () => {
    expect(cleanName('Adele (3)')).toBe('Adele');
    expect(cleanName('Ohm (16) & Kvadrant')).toBe('Ohm & Kvadrant');
    expect(cleanName("Buzzin' Fly Records")).toBe('Buzzin’ Fly Records');
  });

  test('curly turns straight quotes into typographic ones', () => {
    expect(curly('He said "hi"')).toBe('He said “hi”');
    expect(curly("Coltrane's Sound")).toBe('Coltrane’s Sound');
    expect(curly('Warmin\' Up, Firin\' Off')).toBe('Warmin’ Up, Firin’ Off');
  });

  test('formatOf: the first format decides the kind; the text keeps quantities and joins mixed formats', () => {
    expect(formatOf('2xLP, Album')).toEqual({ kind: 'vinyl', text: '2×LP' });
    expect(formatOf('12", EP')).toEqual({ kind: 'vinyl', text: '12″' });
    expect(formatOf('3x12"')).toEqual({ kind: 'vinyl', text: '3×12″' });
    expect(formatOf('CD, Album')).toEqual({ kind: 'cd', text: 'CD' });
    expect(formatOf('2xCD, Comp')).toEqual({ kind: 'cd', text: '2×CD' });
    expect(formatOf('DVD, PAL')).toEqual({ kind: 'dvd', text: 'DVD' });
    expect(formatOf('LP, Album, RE, 180 + CD, Album')).toEqual({ kind: 'vinyl', text: 'LP + CD' });
    expect(formatOf('DVD-V, PAL + 8xFile, MP3, 320')).toEqual({ kind: 'dvd', text: 'DVD + 8×File' });
  });

  test('slugBase transliterates Cyrillic, names compilations after their title, and is never empty', () => {
    expect(slugBase('Мумий Тролль', 'Морская')).toBe('mumiy-troll-morskaya');
    expect(slugBase('Paul McCartney', 'Снова В СССР')).toBe('paul-mccartney-snova-v-sssr');
    expect(slugBase('Various', 'Planet Jazz II')).toBe('various-planet-jazz-ii');
    expect(slugBase('Björk', 'Biophilia')).toBe('bjork-biophilia');
    expect(slugBase('µ-Ziq', '…')).not.toBe('');
  });

  test('uniqueSlugs adds the year, then a number, on a collision', () => {
    expect(uniqueSlugs([{ base: 'a', year: 1996 }, { base: 'a', year: 2021 }, { base: 'a', year: 2021 }, { base: 'b' }])).toEqual(['a', 'a-2021', 'a-2021-2', 'b']);
  });

  test('youtubeId reads watch, short and embed links', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=ykfVTBRh428')).toBe('ykfVTBRh428');
    expect(youtubeId('https://youtu.be/ykfVTBRh428')).toBe('ykfVTBRh428');
    expect(youtubeId('https://www.youtube.com/embed/ykfVTBRh428?rel=0')).toBe('ykfVTBRh428');
    expect(youtubeId('https://vimeo.com/123')).toBeUndefined();
  });

  test('matchVideos: each video to at most one track by title, the rest kept as extra videos', () => {
    const tracks = [{ title: 'Rose Rouge' }, { title: 'So Flute' }, { title: 'Sure Thing' }];
    const videos = [
      { title: 'St Germain - So Flute', uri: 'https://www.youtube.com/watch?v=id1' },
      { title: 'Sure Thing', uri: 'https://www.youtube.com/watch?v=id2' },
      { title: 'Sure Thing (live)', uri: 'https://www.youtube.com/watch?v=id3' },
      { title: 'Other', uri: 'https://www.youtube.com/watch?v=id4' },
    ];
    expect(matchVideos(tracks, videos)).toEqual({
      trackVideo: [undefined, 'id1', 'id2'],
      extra: [{ title: 'Sure Thing (live)', id: 'id3' }, { title: 'Other', id: 'id4' }],
    });
  });

  test('matchVideos: a video Discogs lists twice is used once', () => {
    const videos = [
      { title: 'So Flute', uri: 'https://www.youtube.com/watch?v=id1' },
      { title: 'So Flute', uri: 'https://www.youtube.com/watch?v=id1' },
      { title: 'Live', uri: 'https://youtu.be/id9' },
      { title: 'Live (again)', uri: 'https://www.youtube.com/watch?v=id9' },
    ];
    expect(matchVideos([{ title: 'So Flute' }, { title: 'So Flute (Reprise)' }], videos)).toEqual({ trackVideo: ['id1', undefined], extra: [{ title: 'Live', id: 'id9' }] });
  });

  test('formatOf: a segment that names no medium (a description of the whole release) is left out', () => {
    expect(formatOf('DVD, PAL + CD, Mixed + S/Edition')).toEqual({ kind: 'dvd', text: 'DVD + CD' });
    expect(formatOf('3xLP, Etch + LP, S/Sided, Etch + Album, RE, RM')).toEqual({ kind: 'vinyl', text: '3×LP + LP' });
    expect(formatOf('4xLP, Album + Box')).toEqual({ kind: 'vinyl', text: '4×LP + Box' });
  });

  test('cleanTitle keeps a parenthesised number, which is part of a title, not a Discogs disambiguation', () => {
    expect(cleanTitle('Blue Note Re:imagined (2020)')).toBe('Blue Note Re:imagined (2020)');
    expect(cleanTitle("Coltrane's Sound")).toBe('Coltrane’s Sound');
  });

  test('curly turns two apostrophes after a digit into an inch mark', () => {
    expect(curly("Tape (12'' Edit)")).toBe('Tape (12″ Edit)');
  });

  test('artistSortKey ignores a leading “The” and case', () => {
    expect(artistSortKey('The Prodigy')).toBe('prodigy');
    expect(artistSortKey('Theo Parrish')).toBe('theo parrish');
  });
});

describe('importRecords', () => {
  const csv = [
    'Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition,Collection Notes',
    'B1,The Band (2),Hits,Label (4),"12"", EP",5,1997,101,Uncategorized,2013-01-13 19:27:21,Mint (M),,',
    'A1,Another,Second,Other Label,"CD, Album",,0,202,Uncategorized,2013-01-13 20:30:39,,,',
    'Z1,Zed,Gone,Lost,"LP, Album",,2001,303,Uncategorized,2013-01-13 20:30:39,,,',
  ].join('\n');
  const release = (id: number, extra: object) => JSON.stringify({ id, genres: ['Electronic'], styles: ['Techno'], tracklist: [], videos: [], images: [], ...extra });
  const releases: Record<string, string> = {
    '101': release(101, {
      images: [{ type: 'secondary', uri: 'https://img.test/101-back.jpg' }, { type: 'primary', uri: 'https://img.test/101.jpg' }],
      tracklist: [
        { position: 'A1', title: "Track's One", duration: '5:00', type_: 'track' },
        { position: '', title: 'Side B', duration: '', type_: 'heading' },
        { position: 'B1', title: 'Two', duration: '', type_: 'track' },
      ],
      videos: [{ title: "The Band - Track's One", uri: 'https://www.youtube.com/watch?v=abc' }, { title: 'Live somewhere', uri: 'https://www.youtube.com/watch?v=xyz' }],
    }),
    '202': release(202, { images: [{ type: 'primary', uri: 'https://img.test/202.jpg' }], tracklist: [{ position: '1', title: 'Only', duration: '3:00', type_: 'track' }] }),
  };
  const jpeg = readFileSync(new URL('./fixtures/sample-900x600.jpg', import.meta.url));

  function world() {
    const calls: string[] = [];
    const fetch = async (url: string) => {
      calls.push(url);
      const id = /\/releases\/(\d+)$/.exec(url)?.[1];
      if (id) return releases[id] ? { ok: true, status: 200, text: async () => releases[id], arrayBuffer: async () => new ArrayBuffer(0) } : { ok: false, status: 404, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) };
      return { ok: true, status: 200, text: async () => '', arrayBuffer: async () => jpeg.buffer.slice(jpeg.byteOffset, jpeg.byteOffset + jpeg.byteLength) };
    };
    const put: string[] = [];
    const store: ObjectStore = { listKeys: async () => new Set(put), put: async (key) => { put.push(key); } };
    return { calls, fetch, put, store };
  }
  const base = mkdtempSync(join(tmpdir(), 'records-'));
  const opts = { csv, uploadsDir: join(base, 'uploads'), cacheDir: join(base, 'cache'), month: '2026/10', log: () => {}, wait: async () => {} };

  test('builds the records from the export and the API, uploads the covers, reports what failed', async () => {
    const w = world();
    const { records, problems } = await importRecords({ ...opts, fetch: w.fetch, store: w.store });
    expect(records.map((r) => r.slug)).toEqual(['another-second', 'the-band-hits', 'zed-gone']); // A–Z, “The” ignored
    expect(records[1]).toEqual({
      slug: 'the-band-hits', artist: 'The Band', title: 'Hits', year: 1997, label: 'Label', kind: 'vinyl', format: '12″',
      genres: ['Electronic'], styles: ['Techno'], cover: { src: '2026/10/record-the-band-hits.jpg', width: 900, height: 600 },
      tracks: [{ position: 'A1', title: 'Track’s One', duration: '5:00', video: 'abc' }, { position: 'B1', title: 'Two' }],
      videos: [{ title: 'Live somewhere', id: 'xyz' }],
    });
    expect(records[0].year).toBeUndefined(); // released 0
    expect(records[0].kind).toBe('cd');
    expect(records[2]).toMatchObject({ slug: 'zed-gone', tracks: [], videos: [] });
    expect(records[2].cover).toBeUndefined();
    expect(problems.join('\n')).toMatch(/303/);
    expect(w.put).toContain('uploads/2026/10/record-the-band-hits.jpg');
    expect(w.put).toContain('uploads/2026/10/record-the-band-hits-480.webp');
    expect(JSON.stringify(records)).not.toMatch(/Mint|Uncategorized|2013-01-13/); // none of the owner’s own fields
  });

  test('a second run reads the cached releases and keeps the covers it already has', async () => {
    const w = world();
    await importRecords({ ...opts, fetch: w.fetch, store: w.store });
    expect(w.calls.filter((u) => /releases\/(101|202)$|img\.test/.test(u))).toEqual([]);
  });
});
