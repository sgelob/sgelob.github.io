export const SITE = {
  name: 'olegs',
  author: 'Olegs Belousovs',
  description: 'Product Management and Photography',
  url: 'https://olegs.be',
  email: '44_tildes_agog@icloud.com',
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
