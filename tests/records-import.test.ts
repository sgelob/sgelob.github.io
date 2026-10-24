import { describe, expect, test } from 'vitest';
import { artistSortKey, cleanName, curly, formatOf, matchVideos, parseCollection, slugBase, uniqueSlugs, youtubeId } from '../scripts/records/collection';

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

  test('artistSortKey ignores a leading “The” and case', () => {
    expect(artistSortKey('The Prodigy')).toBe('prodigy');
    expect(artistSortKey('Theo Parrish')).toBe('theo parrish');
  });
});
