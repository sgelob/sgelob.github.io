import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Document, isScalar, visit } from 'yaml';

// js-yaml (used by Astro's content loader) turns an unquoted timestamp into a Date, so keep these as quoted strings.
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}(?:[T ]|$)/;

/** Writes `<dir>/<slug>.md`: YAML frontmatter (keys in the given order), a blank line, the body. Creates `dir`, overwrites. */
export function writeMarkdown(dir: string, slug: string, frontmatter: object, body: string): void {
  mkdirSync(dir, { recursive: true });
  const doc = new Document(frontmatter);
  visit(doc, {
    Scalar(_key, node) {
      if (isScalar(node) && typeof node.value === 'string' && TIMESTAMP.test(node.value)) node.type = 'QUOTE_DOUBLE';
    },
  });
  const yaml = doc.toString({ lineWidth: 0 });
  const text = `---\n${yaml}---\n${body ? `\n${body.replace(/\n+$/, '')}\n` : ''}`;
  writeFileSync(join(dir, `${slug}.md`), text);
}
