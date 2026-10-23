import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
// usage: npm run thumbs -- <gallery-or-trip-slug>  → 512px thumbnails in olegs-be-data/thumbs/<slug>/NNN.jpg (frontmatter order)
const slug = process.argv[2];
if (!slug) { console.error('usage: npm run thumbs -- <gallery-or-trip-slug>'); process.exit(2); }
const file = ['galleries', 'outdoors'].map((dir) => `src/content/${dir}/${slug}.md`).find(existsSync);
if (!file) { console.error(`no gallery or trip "${slug}" in src/content/galleries or src/content/outdoors`); process.exit(2); }
const md = readFileSync(file, 'utf8');
const fm = parse(md.split('\n---\n')[0].replace(/^---\n/, ''));
const out = `olegs-be-data/thumbs/${slug}`; mkdirSync(out, { recursive: true });
let n = 0;
for (const [i, p] of fm.photos.entries()) {
  const dest = `${out}/${String(i + 1).padStart(3, '0')}.jpg`;
  if (!existsSync(dest)) await sharp(`olegs-be-data/uploads/${p.src}`).resize(512, 512, { fit: 'inside' }).jpeg({ quality: 70 }).toFile(dest);
  n++;
}
console.log(slug, n, 'thumbs in', out);
