// The collection itself, read from src/data/records.yaml (written by `npm run records`).
import raw from '../data/records.yaml?raw';
import { parseRecords } from './records';

export const records = parseRecords(raw);
