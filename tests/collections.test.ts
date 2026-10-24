import { describe, expect, it } from 'vitest';
import { coverSize, galleryPath, groupGalleries, mergeSmallGroups, neighbours, postPath, related, sortByDateDesc } from '../src/lib/paths';
import { formatDate, formatMonthYear } from '../src/lib/site';
import { categoryName, countryName, genreName, withoutCountry } from '../src/lib/taxonomies';

const entry = (id: string, date: string) => ({ id, data: { date: new Date(date) } }) as any;

describe('paths', () => {
  it('postPath uses year, zero-padded month and id', () => {
    expect(postPath({ data: { date: new Date('2016-05-03T10:00:00') }, id: 'x' } as any)).toBe('/2016/05/x/');
  });

  it('galleryPath uses the id', () => {
    expect(galleryPath({ id: 'venezia' } as any)).toBe('/gallery/venezia/');
  });

  it('sortByDateDesc orders newest first, ties by id ascending, without mutating', () => {
    const input = [entry('b', '2020-01-01T10:00:00'), entry('c', '2021-01-01T10:00:00'), entry('a', '2020-01-01T10:00:00')];
    expect(sortByDateDesc(input).map((e) => e.id)).toEqual(['c', 'a', 'b']);
    expect(input.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('neighbours: prev is newer, next is older; edges are undefined', () => {
    const list = [entry('new', '2022-01-01T10:00:00'), entry('mid', '2021-01-01T10:00:00'), entry('old', '2020-01-01T10:00:00')];
    expect(neighbours(list, 'new')).toEqual({ prev: undefined, next: list[1] });
    expect(neighbours(list, 'mid')).toEqual({ prev: list[0], next: list[2] });
    expect(neighbours(list, 'old')).toEqual({ prev: list[1], next: undefined });
  });

  it('neighbours of an unknown id are both undefined', () => {
    expect(neighbours([entry('a', '2020-01-01T10:00:00')], 'zzz')).toEqual({ prev: undefined, next: undefined });
  });
});

describe('site formatting', () => {
  it('formatMonthYear', () => {
    expect(formatMonthYear(new Date('2012-08-11'), 'en')).toBe('August 2012');
    expect(formatMonthYear(new Date('2012-08-11'), 'it')).toBe('agosto 2012');
  });

  it('formatDate', () => {
    expect(formatDate(new Date('2025-04-16T10:00:00'), 'en')).toBe('April 16, 2025');
    expect(formatDate(new Date('2025-04-16T10:00:00'), 'it')).toBe('16 aprile 2025');
  });
});

describe('taxonomies', () => {
  it('resolves names and falls back to the slug', () => {
    expect(genreName('abandoned-places')).toBe('Abandoned');
    expect(genreName('nope')).toBe('nope');
    expect(countryName('italy')).toBe('Italy');
    expect(countryName('nope')).toBe('nope');
    expect(categoryName('nope')).toBe('nope');
  });
});

describe('coverSize', () => {
  const photos = [{ src: 'a.jpg', width: 1620, height: 1080 }];
  const gallery = (data: object) => ({ data: { cover: 'a.jpg', photos, ...data } }) as any;

  it('prefers coverWidth/coverHeight', () => {
    expect(coverSize(gallery({ coverWidth: 800, coverHeight: 1079 }))).toEqual({ width: 800, height: 1079 });
  });

  it('falls back to the matching photo, else undefined', () => {
    expect(coverSize(gallery({}))).toEqual({ width: 1620, height: 1080 });
    expect(coverSize(gallery({ cover: 'b.jpg' }))).toBeUndefined();
  });
});

describe('related', () => {
  const g = (id: string, date: string, country: string, genre: string) => ({ id, data: { date: new Date(date), country, genre } }) as any;
  const venezia = g('venezia', '2012-08-11', 'italy', 'world-places');
  const list = [
    g('fiat', '2012-09-01', 'italy', 'abandoned-places'), // same country only, closest in date
    g('florence', '2012-05-01', 'italy', 'world-places'), // same country and genre
    g('rome', '2010-12-20', 'italy', 'world-places'),
    g('turin', '2015-07-23', 'italy', 'world-places'),
    g('munich', '2012-09-10', 'germany', 'world-places'), // same genre only
    g('zenit', '2012-08-12', 'world', 'old-film-cameras'), // nothing shared, even if close in date
    venezia,
  ];

  it('same country and genre first by date proximity, then same country, then same genre', () => {
    expect(related(list, 'venezia', 10)).toEqual({ by: 'country', galleries: [list[1], list[2], list[3], list[0], list[4]] });
  });

  it('stops at count and never includes the gallery itself', () => {
    const picks = related(list, 'venezia')!.galleries.map((e) => e.id);
    expect(picks).toEqual(['florence', 'rome', 'turin', 'fiat']);
  });

  it('is by genre when no other gallery shares the country', () => {
    expect(related(list, 'munich')).toEqual({ by: 'genre', galleries: [venezia, list[1], list[2], list[3]] });
  });

  it('is undefined when nothing is shared or the id is unknown', () => {
    expect(related(list, 'zenit')).toBeUndefined();
    expect(related(list, 'nope')).toBeUndefined();
  });
});

describe('groupGalleries and mergeSmallGroups', () => {
  const g = (id: string, date: string, country: string, genre = 'world-places') => ({ id, data: { date: new Date(date), country, genre } }) as any;
  const list = [
    g('rome', '2013-12-01', 'italy'), g('venezia', '2012-08-11', 'italy'), g('pisa', '2012-07-01', 'italy'),
    g('munich', '2012-09-10', 'germany'), g('berlin', '2009-12-20', 'germany'),
    g('paris', '2011-05-01', 'france'), g('vienna', '2011-04-01', 'austria'),
    g('fiat', '2012-09-01', 'italy', 'abandoned-places'),
  ];

  it('groups by a term, largest first, ties by key, keeping the input order inside a group', () => {
    const groups = groupGalleries(list, 'country');
    expect(groups.map((x) => [x.key, x.galleries.map((e) => e.id)])).toEqual([
      ['italy', ['rome', 'venezia', 'pisa', 'fiat']], ['germany', ['munich', 'berlin']], ['austria', ['vienna']], ['france', ['paris']],
    ]);
    expect(groupGalleries(list, 'genre').map((x) => x.key)).toEqual(['world-places', 'abandoned-places']);
  });

  it('merges the groups under the minimum into one last group, date descending', () => {
    const merged = mergeSmallGroups(groupGalleries(list, 'country'), 3, 'elsewhere');
    expect(merged.map((x) => [x.key, x.galleries.map((e) => e.id)])).toEqual([
      ['italy', ['rome', 'venezia', 'pisa', 'fiat']], ['elsewhere', ['munich', 'paris', 'vienna', 'berlin']],
    ]);
  });

  it('adds no merged group when nothing is small', () => {
    expect(mergeSmallGroups(groupGalleries(list, 'country'), 1, 'elsewhere').map((x) => x.key)).toEqual(['italy', 'germany', 'austria', 'france']);
  });
});

describe('withoutCountry', () => {
  it('drops the country a gallery title ends with, after a dash or a comma', () => {
    expect(withoutCountry('Abandoned Mill – Brandizzo, Italy', 'italy')).toBe('Abandoned Mill – Brandizzo');
    expect(withoutCountry('Moscow – Russia', 'russia')).toBe('Moscow');
    expect(withoutCountry('Amsterdam – The Netherlands', 'netherlands')).toBe('Amsterdam');
    expect(withoutCountry('Monte Carlo – Principality of Monaco', 'monaco')).toBe('Monte Carlo');
    expect(withoutCountry('Tarragona (Catalonia) – Spain', 'spain')).toBe('Tarragona (Catalonia)');
  });

  it('leaves a title that does not end with the country whole', () => {
    expect(withoutCountry('Ivrea, Italy – The Battle of the Oranges', 'italy')).toBe('Ivrea, Italy – The Battle of the Oranges');
    expect(withoutCountry('Boschetto Crew 3: Music Party in Susa Valley, Italy 2008', 'italy')).toBe('Boschetto Crew 3: Music Party in Susa Valley, Italy 2008');
    expect(withoutCountry('Sky and Clouds', 'world')).toBe('Sky and Clouds');
    expect(withoutCountry('Italy', 'italy')).toBe('Italy');
  });
});
