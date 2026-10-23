import { expect, test } from 'vitest';
import { pageTitle } from '../src/lib/site';

test('pageTitle: parts joined by a middle dot, then the full name after an en dash', () => {
  expect(pageTitle('Books')).toBe('Books – Olegs Belousovs');
  expect(pageTitle('Canosio – Gardetta', 'MTB', 'Valle Maira', 2026, 'Outdoors')).toBe('Canosio – Gardetta · MTB · Valle Maira · 2026 · Outdoors – Olegs Belousovs');
  expect(pageTitle('Blog', undefined, '')).toBe('Blog – Olegs Belousovs');
});

test('pageTitle leaves a title that already names the author as it is', () => {
  expect(pageTitle('Photography by Olegs Belousovs')).toBe('Photography by Olegs Belousovs');
});
