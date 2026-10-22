import { parse } from 'yaml';
import raw from '../data/home.yaml?raw';

export interface Home {
  photosIntro: string;
  featuredGalleries: string[];
}

export const home = parse(raw) as Home;
