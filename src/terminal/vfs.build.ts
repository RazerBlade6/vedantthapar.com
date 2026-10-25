import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../site';
import { inline, markdownToLines } from './engine/markdown';
import type { Line, VNode } from './engine/types';
import asciiPhoto from './ascii-photo.json';

type Project = CollectionEntry<'projects'>;

const src = (path: string) => `/term/${path}.json`;

async function projects() {
  return (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
}

/** The terminal's filesystem, generated from the same content as the pages (PLAN.md §4.2). */
export async function buildVfs(): Promise<VNode> {
  const all = await projects();
  const file = (p: Project, dir: string, url: string): VNode => ({
    name: `${p.id}.md`,
    kind: 'file',
    url,
    src: src(`${dir}/${p.id}.md`),
    description: p.data.summary,
  });

  return {
    name: '~',
    kind: 'dir',
    url: '/',
    children: [
      { name: 'about.txt', kind: 'file', url: '/#about', src: src('about.txt'), description: 'who I am' },
      { name: 'experience.log', kind: 'file', url: '/#experience', src: src('experience.log'), description: 'where I have worked' },
      { name: 'contact', kind: 'file', url: '/#contact', src: src('contact'), description: 'how to reach me' },
      ...(site.resume
        ? [{ name: 'resume.pdf', kind: 'file', url: site.resume, binary: true, description: 'my resume' } satisfies VNode]
        : []),
      {
        name: 'projects',
        kind: 'dir',
        url: '/#projects',
        description: 'selected projects',
        children: [
          ...all.filter((p) => p.data.featured).map((p) => file(p, 'projects', `/projects/${p.id}`)),
          {
            name: 'archive',
            kind: 'dir',
            url: '/projects/archive',
            description: 'smaller, older or unfinished',
            children: all.filter((p) => !p.data.featured).map((p) => file(p, 'projects/archive', `/projects/archive#${p.id}`)),
          },
        ],
      },
    ],
  };
}

/** A label/value row, e.g. `stack   Go · SQLite` */
const field = (label: string, value: string, href?: string): Line => [
  { text: label.padEnd(10), tone: 'muted' },
  { text: value, href },
];

function projectLines(p: Project): Line[] {
  const { title, summary, status, stack, repo, live } = p.data;
  return [
    [{ text: `# ${title}`, tone: 'accent' }],
    [],
    inline(summary),
    [],
    ...(status ? [field('status', status)] : []),
    field('stack', stack.join(' · ')),
    ...(repo ? [field('source', repo.replace('https://', ''), repo)] : []),
    ...(live ? [field('live', live.replace('https://', ''), live)] : []),
    ...(p.body?.trim() ? [[], ...markdownToLines(p.body)] : []),
  ];
}

async function experienceLines(): Promise<Line[]> {
  const jobs = (await getCollection('experience')).sort((a, b) => a.data.order - b.data.order);
  return jobs.flatMap(({ data: j }, i) => [
    ...(i ? [[]] : []),
    [
      { text: `[${j.start} → ${j.end ?? 'now'}]`.padEnd(22), tone: 'muted' },
      { text: j.role, tone: 'strong' },
      { text: ` · ${j.company} · ${j.location}` },
    ] satisfies Line,
    ...j.bullets.map((b): Line => [{ text: '  - ', tone: 'muted' }, ...inline(b)]),
  ]);
}

/** Rendered content of every file, keyed by path relative to ~ (served as /term/<path>.json). */
export async function buildBodies(): Promise<Map<string, Line[]>> {
  const bodies = new Map<string, Line[]>();
  bodies.set('about.txt', [
    // one block per scheme: which characters read as "bright" depends on the background
    [
      { text: asciiPhoto.dark, tone: 'art', scheme: 'dark' },
      { text: asciiPhoto.light, tone: 'art', scheme: 'light' },
    ],
    [],
    ...site.about.flatMap((para, i) => [...(i ? [[]] : []), inline(para)]),
  ]);
  bodies.set('experience.log', await experienceLines());
  bodies.set('contact', [
    inline(site.contactNote),
    [],
    field('email', site.email, `mailto:${site.email}`),
    field('github', site.github.replace('https://', ''), site.github),
    ...(site.linkedin ? [field('linkedin', site.linkedin.replace(/^https:\/\/(www\.)?/, ''), site.linkedin)] : []),
    ...(site.resume ? [field('resume', 'resume.pdf', site.resume)] : []),
  ]);
  for (const p of await projects()) {
    bodies.set(`projects/${p.data.featured ? '' : 'archive/'}${p.id}.md`, projectLines(p));
  }
  return bodies;
}
