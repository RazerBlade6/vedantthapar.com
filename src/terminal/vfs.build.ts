import { getCollection } from 'astro:content';
import { site } from '../site';
import type { VNode } from './engine/types';

/** The terminal's filesystem, generated from the same content as the pages (PLAN.md §4.2). */
export async function buildVfs(): Promise<VNode> {
  const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  const file = (p: (typeof projects)[number], url: string): VNode => ({
    name: `${p.id}.md`,
    kind: 'file',
    url,
    description: p.data.summary,
  });

  return {
    name: '~',
    kind: 'dir',
    url: '/',
    children: [
      { name: 'about.txt', kind: 'file', url: '/#about', description: 'who I am' },
      { name: 'experience.log', kind: 'file', url: '/#experience', description: 'where I have worked' },
      { name: 'contact', kind: 'file', url: '/#contact', description: 'how to reach me' },
      ...(site.resume
        ? [{ name: 'resume.pdf', kind: 'file', url: site.resume, binary: true, description: 'my resume' } satisfies VNode]
        : []),
      {
        name: 'projects',
        kind: 'dir',
        url: '/#projects',
        description: 'selected projects',
        children: [
          ...projects.filter((p) => p.data.featured).map((p) => file(p, `/projects/${p.id}`)),
          {
            name: 'archive',
            kind: 'dir',
            url: '/projects/archive',
            description: 'smaller, older or unfinished',
            children: projects.filter((p) => !p.data.featured).map((p) => file(p, `/projects/archive#${p.id}`)),
          },
        ],
      },
    ],
  };
}
