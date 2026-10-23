import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getGalleries, getPosts, galleryPath, postPath } from '../lib/collections';
import { coverSize } from '../lib/paths';
import { largestVariantUrl, originalUrl } from '../lib/images';
import { SITE } from '../lib/site';
import { categoryName, countryName, genreName } from '../lib/taxonomies';

export const FEED_TITLE = 'olegs — blog and photos';

const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The first paragraph of a Markdown body as plain text: links keep their label, emphasis marks go. */
export function firstParagraph(markdown: string): string {
  const para = markdown.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !p.startsWith('#') && !p.startsWith('<') && !p.startsWith('-')) ?? '';
  return para
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_)(\S[^*_]*?)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();
}

export const GET: APIRoute = async (context) => {
  const [posts, galleries] = await Promise.all([getPosts(), getGalleries()]);

  const postItems = posts.map((post) => ({
    title: post.data.title,
    pubDate: post.data.date,
    description: post.data.excerpt,
    link: postPath(post),
    categories: post.data.categories.map(categoryName),
  }));

  const galleryItems = galleries.map((gallery) => {
    const { title, date, cover, genre, country } = gallery.data;
    const description = firstParagraph(gallery.body ?? '') || `Photos from ${title}.`;
    const size = coverSize(gallery);
    const image = size ? largestVariantUrl(cover, Math.min(size.width, 960)) : originalUrl(cover);
    return {
      title,
      pubDate: date,
      description,
      link: galleryPath(gallery),
      categories: ['Photos', genreName(genre), countryName(country)],
      content: `<p><img src="${image}" alt="" /></p><p>${escapeHtml(description)}</p>`,
    };
  });

  return rss({
    title: FEED_TITLE,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: [...postItems, ...galleryItems].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()),
  });
};
