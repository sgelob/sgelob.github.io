import { parse } from 'yaml';
import raw from '../data/books.yaml?raw';

/** A titled list of books ('Favourite Books', 'Mixed Books'); entries are inline Markdown. */
export interface BookSection {
  title: string;
  entries: string[];
}

export const books = parse(raw) as BookSection[];
