import { parse } from 'yaml';
import raw from '../data/events.yaml?raw';

/** One year of events; entries are inline Markdown, newest first. */
export interface EventYear {
  year: number;
  entries: string[];
}

export const events = parse(raw) as EventYear[];
