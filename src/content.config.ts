import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    stack: z.array(z.string()),
    repo: z.url().optional(),
    live: z.url().optional(),
    status: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

const experience = defineCollection({
  loader: file('./src/content/experience.yaml'),
  schema: z.object({
    order: z.number(),
    role: z.string(),
    company: z.string(),
    location: z.string(),
    start: z.string(),
    end: z.string().optional(),
    expanded: z.boolean().default(false),
    bullets: z.array(z.string()),
  }),
});

// Hidden until the first post exists (PLAN.md §2).
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    draft: z.boolean().default(true),
  }),
});

export const collections = { projects, experience, posts };
