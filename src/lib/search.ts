// Pagefind marks for the pages the site search indexes (src/pages/search.astro reads them back).
// Plain TS, no Astro imports.

export type SearchType = 'gallery' | 'post' | 'outdoors' | 'records' | 'other';

export interface SearchMarks {
  /** The result group on the search page. */
  type: SearchType;
  /** Extra result fields, read back with `result.data().meta`. Undefined values are left out. */
  meta?: Record<string, string | undefined>;
}

/**
 * Attributes for the element that holds a page's searchable content. Pagefind indexes only pages
 * with a `data-pagefind-body`, so the pages without one (redirects, lists, the search page) stay out.
 * Each meta value is captured from an attribute of its own (`key[data-meta-key]`): written inline,
 * `key:value` takes the rest of the attribute as its value, so only one could be set that way.
 */
export function pagefindAttrs(marks: SearchMarks | undefined): Record<string, string> {
  if (!marks) return {};
  const attrs: Record<string, string> = {
    'data-pagefind-body': '',
    'data-pagefind-filter': `type:${marks.type}`,
  };
  const meta = Object.entries(marks.meta ?? {}).filter((e): e is [string, string] => e[1] !== undefined && e[1] !== '');
  if (meta.length > 0) {
    attrs['data-pagefind-meta'] = meta.map(([key]) => `${key}[data-meta-${key}]`).join(', ');
    for (const [key, value] of meta) attrs[`data-meta-${key}`] = value;
  }
  return attrs;
}
