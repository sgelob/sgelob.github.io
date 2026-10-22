import { describe, expect, it } from 'vitest';
import { galleryPath, neighbours, postPath, sortByDateDesc } from '../src/lib/paths';
import { formatDate, formatMonthYear } from '../src/lib/site';
import { categoryName, countryName, genreName } from '../src/lib/taxonomies';

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
