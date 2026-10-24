import { parse } from 'yaml';
import raw from '../data/books.yaml?raw';

/** A book on a shelf: title and author as written, the first publication year and the cover when known. */
export interface Book {
  title: string;
  author?: string;
  year?: number;
  /** Under uploads/ on R2; absent until a cover is found, and the page shows a plain placeholder. */
  cover?: { src: string; width: number; height: number };
}

/** A titled shelf of books ('Favourite Books', 'Mixed Books'), in the order they are listed. */
export interface BookShelf {
  title: string;
  books: Book[];
}

export const books = parse(raw) as BookShelf[];
