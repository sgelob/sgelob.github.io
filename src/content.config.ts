import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const lang = z.enum(['it', 'en']);

const galleries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/galleries' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string().optional(),
    date: z.coerce.date(),
    genre: z.string(),
    country: z.string(),
    cover: z.string(),
    darkHeader: z.boolean(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    oldSlugs: z.array(z.string()),
    photos: z.array(z.object({ src: z.string(), width: z.number(), height: z.number() })),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    categories: z.array(z.string()),
    cover: z.string().optional(),
    lang,
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    oldSlugs: z.array(z.string()),
    excerpt: z.string(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    path: z.string(),
    lang,
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

export const collections = { galleries, posts, pages };
