import { describe, expect, test } from 'vitest';
import { read } from './helpers/dist';

/** The code of a page: its HTML and every module script it loads. */
const pageCode = (path: string) => {
  const html = read(path);
  const scripts = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map((m) => m[1]!);
  return { html, code: scripts.map((src) => read(`dist${src}`)).join('\n') };
};

describe('prefetch', () => {
  test.each(['dist/index.html', 'dist/photos/index.html', 'dist/outdoors/index.html'])(
    '%s fetches a linked page ahead when a link is hovered or focused, from a script file',
    (path) => {
      const { html, code } = pageCode(path);
      expect(code).toContain('prefetch');
      expect(code).toMatch(/mouseenter|focusin/);
      expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/); // nothing inline for the security policy to allow
    },
  );
});
