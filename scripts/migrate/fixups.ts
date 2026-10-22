/** Known-bad upload paths in gallery content, mapped to the file that really exists on the server. */
export const PATH_FIXUPS: Readonly<Record<string, string>> = {
  // The `.jpg.jpg` file does not exist on the server, the `.jpg` one does.
  '2007/01/snow-covered-road-sign-black-lake.jpg.jpg': '2007/01/snow-covered-road-sign-black-lake.jpg',
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replaces each broken path in the content with the real one. The broken name appears as `<name>.jpg.jpg` and,
 * in WordPress image sources, as `<name>.jpg-768x512.jpg` (a resize of the missing file): both are fixed.
 */
export function applyPathFixups(content: string): string {
  return Object.entries(PATH_FIXUPS).reduce((text, [broken, real]) => {
    const ext = broken.slice(broken.lastIndexOf('.'));
    const pattern = new RegExp(`${escapeRegExp(broken.slice(0, -ext.length))}(?:-\\d+x\\d+)?${escapeRegExp(ext)}`, 'g');
    return text.replace(pattern, () => real);
  }, content);
}
