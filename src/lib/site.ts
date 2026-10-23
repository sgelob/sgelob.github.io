const EMAIL = '44_tildes_agog@icloud.com';

export const SITE = {
  name: 'olegs',
  author: 'Olegs Belousovs',
  description: 'Product Management and Photography',
  url: 'https://olegs.be',
  email: EMAIL,
  /** Every Email link: the subject tells the owner the message came from the site. */
  mailto: `mailto:${EMAIL}?subject=${encodeURIComponent('Message from olegs.be')}`,
} as const;

export type Lang = 'en' | 'it';

const LOCALES: Record<Lang, string> = { en: 'en-US', it: 'it-IT' };

// No timeZone option on purpose: content dates are naive local strings that zod
// coerces in the build's timezone, so they must be formatted in that same timezone.
export function formatMonthYear(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { month: 'long', year: 'numeric' }).format(d);
}

export function formatDate(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** `YYYY-MM-DD` in the build's timezone, for `<time datetime>` (toISOString would shift to UTC). */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * A page's <title>: its parts joined by “ · ”, then “ – Olegs Belousovs”, so the name stays distinct from the en dashes
 * many titles carry (“Canosio – Gardetta · MTB · Valle Maira · 2026 · Outdoors – Olegs Belousovs”).
 * A title that already names the author (some stored SEO titles do) is left as it is.
 */
export function pageTitle(...parts: (string | number | undefined)[]): string {
  const title = parts.filter((part) => part !== undefined && part !== '').join(' · ');
  return title.includes(SITE.author) ? title : `${title} – ${SITE.author}`;
}
