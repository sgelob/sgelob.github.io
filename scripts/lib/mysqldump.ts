import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export type Row = Record<string, string | number | null>;
export type DumpTables = Map<string, Row[]>;

const CREATE_RE = /^CREATE TABLE `([^`]+)` \(/;
const COLUMN_RE = /^\s+`([^`]+)`/;
const INSERT_RE = /^INSERT INTO `([^`]+)` VALUES /;
const NUMBER_RE = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;

const ESCAPES: Record<string, string> = {
  '0': '\0',
  n: '\n',
  r: '\r',
  t: '\t',
  b: '\b',
  Z: '\x1a',
};

type Value = string | number | null;

/** Reads the quoted string starting at `start` (the opening quote). Returns [value, indexAfterClosingQuote]. */
function readString(s: string, start: number): [string, number] {
  const quote = s[start];
  let i = start + 1;
  let out = '';
  for (;;) {
    // Jump to the next character that needs attention instead of stepping one by one.
    let j = i;
    while (j < s.length) {
      const c = s.charCodeAt(j);
      if (c === 92 /* \ */ || c === quote.charCodeAt(0)) break;
      j++;
    }
    if (j >= s.length) throw new Error('Unterminated string literal in INSERT');
    out += s.slice(i, j);
    if (s.charCodeAt(j) === 92) {
      const next = s[j + 1];
      if (next === undefined) throw new Error('Dangling backslash in INSERT');
      // Unknown escapes (\' \" \\ \%  \_ ...) resolve to the escaped character itself.
      out += ESCAPES[next] ?? next;
      i = j + 2;
    } else if (s[j + 1] === quote) {
      out += quote; // doubled quote
      i = j + 2;
    } else {
      return [out, j + 1];
    }
  }
}

/** Reads an unquoted token (NULL, number, hex literal) ending at `,` or `)`. */
function readBare(s: string, start: number): [Value, number] {
  let j = start;
  while (j < s.length) {
    const c = s.charCodeAt(j);
    if (c === 44 /* , */ || c === 41 /* ) */) break;
    j++;
  }
  const token = s.slice(start, j).trim();
  if (token === 'NULL') return [null, j];
  if (NUMBER_RE.test(token)) return [Number(token), j];
  return [token, j];
}

/** Parses the `(...),(...);` tail of an INSERT statement into rows. */
function parseValues(s: string, from: number, columns: string[], table: string, out: Row[]): void {
  let i = from;
  for (;;) {
    if (s[i] !== '(') throw new Error(`Expected "(" at offset ${i} in INSERT for ${table}`);
    i++;
    const row: Row = {};
    let col = 0;
    for (;;) {
      let value: Value;
      const c = s[i];
      if (c === "'" || c === '"') [value, i] = readString(s, i);
      else [value, i] = readBare(s, i);
      if (col >= columns.length) {
        throw new Error(`Row in ${table} has more values than the ${columns.length} known columns`);
      }
      row[columns[col++]] = value;
      const sep = s[i++];
      if (sep === ',') continue;
      if (sep === ')') break;
      throw new Error(`Unexpected "${sep}" at offset ${i - 1} in INSERT for ${table}`);
    }
    if (col !== columns.length) {
      throw new Error(`Row in ${table} has ${col} values, expected ${columns.length}`);
    }
    out.push(row);
    const after = s[i++];
    if (after === ',') continue;
    return; // ';' (or end of line)
  }
}

/**
 * Streams a mysqldump file and returns the rows of each table, keyed by column name.
 * Only tables listed in `tables` are kept when given.
 */
export async function parseDump(path: string, tables?: string[]): Promise<DumpTables> {
  const wanted = tables ? new Set(tables) : null;
  const result: DumpTables = new Map();
  const columnsByTable = new Map<string, string[]>();

  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  let currentCreate: { name: string; columns: string[] } | null = null;

  for await (const line of rl) {
    if (currentCreate) {
      if (line.startsWith(')')) {
        columnsByTable.set(currentCreate.name, currentCreate.columns);
        currentCreate = null;
      } else {
        const m = COLUMN_RE.exec(line);
        if (m) currentCreate.columns.push(m[1]);
      }
      continue;
    }

    if (line.startsWith('CREATE TABLE ')) {
      const m = CREATE_RE.exec(line);
      if (m) {
        currentCreate = { name: m[1], columns: [] };
        if (!wanted || wanted.has(m[1])) result.set(m[1], []);
      }
      continue;
    }

    if (line.startsWith('INSERT INTO ')) {
      const m = INSERT_RE.exec(line);
      if (!m) throw new Error(`Unsupported INSERT statement: ${line.slice(0, 80)}`);
      const name = m[1];
      if (wanted && !wanted.has(name)) continue;
      const columns = columnsByTable.get(name);
      if (!columns) throw new Error(`INSERT into ${name} without a preceding CREATE TABLE`);
      parseValues(line, m[0].length, columns, name, result.get(name)!);
    }
  }

  return result;
}
