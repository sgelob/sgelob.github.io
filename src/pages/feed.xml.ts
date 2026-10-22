import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts, postPath } from '../lib/collections';
import { SITE } from '../lib/site';
import { categoryName } from '../lib/taxonomies';

export const GET: APIRoute = async (context) => {
  const posts = await getPosts();
  return rss({
    title: 'olegs — blog',
    description: SITE.description,
    site: context.site ?? SITE.url,
    customData: '<language>it-IT</language>',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt,
      link: postPath(post),
      categories: post.data.categories.map(categoryName),
    })),
  });
};
