import { parse } from 'yaml';
import raw from '../data/redirects.yaml?raw';

/** An old public path and the path it moved to; `from` keeps raw Unicode, as WordPress served it. */
export interface Redirect {
  from: string;
  to: string;
}

export const redirects = parse(raw) as Redirect[];

export const redirectsUnder = (prefix: string): Redirect[] => redirects.filter((r) => r.from.startsWith(prefix));
