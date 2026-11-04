import { expect, test } from 'vitest';
import { blogFilters, FILTER_MIN_POSTS } from '../src/lib/blog-filters';

const terms = [
  { slug: 'ai', name: 'AI' },
  { slug: 'events', name: 'Events' },
  { slug: 'web-performance', name: 'Web Performance', short: 'Web Perf' },
  { slug: 'wordpress', name: 'WordPress' },
];
const post = (...categories: string[]) => ({ data: { categories } });

test('All first, then the categories with enough posts, by their short name if any, most posts first; WordPress never', () => {
  const posts = [
    ...Array.from({ length: 5 }, () => post('web-performance', 'events')),
    ...Array.from({ length: FILTER_MIN_POSTS }, () => post('events', 'wordpress')),
    ...Array.from({ length: FILTER_MIN_POSTS }, () => post('wordpress')),
    post('ai'),
  ];
  expect(blogFilters(posts, terms)).toEqual([
    { slug: 'all', name: 'All', href: '/blog/', count: posts.length },
    { slug: 'events', name: 'Events', href: '/category/events/', count: 5 + FILTER_MIN_POSTS },
    { slug: 'web-performance', name: 'Web Perf', href: '/category/web-performance/', count: 5 },
  ]);
});
