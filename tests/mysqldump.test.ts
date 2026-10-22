import { describe, expect, test } from 'vitest';
import { parseDump } from '../scripts/lib/mysqldump';

const MINI = 'tests/fixtures/dump-mini.sql';

describe('parseDump (mini fixture)', () => {
  test('parses escaped strings, NULL and numbers', async () => {
    const t = await parseDump(MINI);
    const rows = t.get('yo_posts')!;
    expect(rows).toHaveLength(3);
    expect(rows[0].post_title).toBe("It's");
    expect(rows[1].post_content).toBe('line1\nline2');
    expect(rows[2].post_status).toBeNull();
    expect(rows[0].ID).toBe(1);
  });

  test('filters tables', async () => {
    const t = await parseDump(MINI, ['yo_nope']);
    expect(t.size).toBe(0);
  });

  test('keeps only requested tables', async () => {
    const t = await parseDump(MINI, ['yo_options']);
    expect([...t.keys()]).toEqual(['yo_options']);
  });

  test('keys rows by column name, skipping index lines', async () => {
    const t = await parseDump(MINI);
    expect(Object.keys(t.get('yo_posts')![0])).toEqual([
      'ID',
      'post_title',
      'post_content',
      'post_type',
      'post_status',
    ]);
  });

  test('handles every MySQL escape and doubled quotes', async () => {
    const t = await parseDump(MINI);
    expect(t.get('yo_posts')![0].post_content).toBe("Plain, text (with parens) and a 'doubled' quote");
    expect(t.get('yo_escapes')![0].body).toBe('line1\nline2\r\n\ttab \\ backslash "dq" nul\0 z\x1a end');
  });

  test('preserves unicode and delimiters inside strings', async () => {
    const rows = (await parseDump(MINI)).get('yo_posts')!;
    expect(rows[2].post_title).toBe('Three ; semi');
    expect(rows[2].post_content).toBe('Привіт, світ — ünïcode');
  });

  test('parses integers and floats as numbers, quoted values stay strings', async () => {
    const rows = (await parseDump(MINI)).get('yo_options')!;
    expect(rows[0]).toEqual({ option_id: 1, option_name: 'siteurl', ratio: 1.5, offset: -2.25, code: '007' });
    expect(rows[1]).toEqual({ option_id: 2, option_name: 'blogname', ratio: -3, offset: 1000, code: '' });
  });

  test('accumulates rows across multiple INSERT lines', async () => {
    const rows = (await parseDump(MINI)).get('yo_options')!;
    expect(rows).toHaveLength(3);
    expect(rows[2]).toEqual({ option_id: 3, option_name: 'second insert line', ratio: null, offset: 0.5, code: 'x' });
  });
});

describe('parseDump (real dump)', () => {
  test.skipIf(!process.env.DUMP_PATH)('real dump has the expected tables', async () => {
    const started = performance.now();
    const t = await parseDump(process.env.DUMP_PATH!, ['yo_posts']);
    const ms = performance.now() - started;
    console.log(`parsed yo_posts in ${ms.toFixed(0)} ms`);
    expect(t.get('yo_posts')!.length).toBe(4572);
    expect(ms).toBeLessThan(5000);
  });
});
