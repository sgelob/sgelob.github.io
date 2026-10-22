// Inline Markdown for one-line data entries (events, books, the home intro): links, bold, italic and
// backslash escapes. Block syntax is out of scope; content pages go through Astro's own pipeline.

const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Renders one line of inline Markdown to HTML; text is escaped first, so the result is safe for `set:html`. */
export function renderInline(md: string): string {
  const literals: string[] = [];
  const keep = (ch: string) => `\u0000${literals.push(ch) - 1}\u0000`;
  return escapeHtml(md.replace(/\\([\\`*_[\]()#+\-.!])/g, (_, ch: string) => keep(ch)))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text: string, href: string) => `<a href="${href.replace(/"/g, '&quot;')}">${text}</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\u0000(\d+)\u0000/g, (_, i: string) => escapeHtml(literals[Number(i)] ?? ''));
}
