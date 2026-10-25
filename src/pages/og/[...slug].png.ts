import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { site } from '../../site';

// Social preview images (og:image), one per page, drawn as the site's own terminal in gruvbox.

type Card = {
  title: string;
  summary: string;
  file: string;
  command: string;
};

export const getStaticPaths = (async () => {
  const projects = await getCollection('projects', (p) => p.data.featured);
  const cards: [string, Card][] = [
    ['index', { title: site.name, summary: site.tagline, file: '~/index.md', command: 'whoami' }],
    [
      'projects/archive',
      { title: 'Archive', summary: 'Smaller, older or unfinished projects.', file: '~/projects/archive/', command: 'ls projects/archive' },
    ],
    ...projects.map((p): [string, Card] => [
      `projects/${p.id}`,
      { title: p.data.title, summary: p.data.summary, file: `~/projects/${p.id}.md`, command: `cat projects/${p.id}.md` },
    ]),
  ];
  return cards.map(([slug, card]) => ({ params: { slug }, props: card }));
}) satisfies GetStaticPaths;

const C = { bg: '#282828', bar: '#1d2021', fg: '#ebdbb2', strong: '#fbf1c7', muted: '#a89984', accent: '#fabd2f' };

// satori takes React-shaped element objects; this keeps the tree readable without JSX
type Node = { type: string; props: Record<string, unknown> };
const h = (style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

const require = createRequire(import.meta.url);
const fonts = Promise.all([
  readFile('src/assets/fonts/DepartureMono-Regular.otf'),
  readFile(require.resolve('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff')),
]);

export const GET: APIRoute = async ({ props }) => {
  const { title, summary, file, command } = props as Card;
  const [departure, plex] = await fonts;

  const tree = h(
    { width: '100%', height: '100%', flexDirection: 'column', background: C.bg, fontFamily: 'Plex' },
    h(
      { flex: 1, flexDirection: 'column', padding: '72px 80px 0' },
      h({ fontSize: 28, color: C.accent }, `~/vedant $ ${command}`),
      h({ marginTop: 36, fontFamily: 'Departure', fontSize: title.length > 14 ? 84 : 112, lineHeight: 1, color: C.strong }, title),
      h({ marginTop: 40, fontSize: 34, lineHeight: 1.45, color: C.fg, maxWidth: 1000 }, summary),
    ),
    h(
      { height: 72, alignItems: 'center', justifyContent: 'space-between', background: C.bar, fontSize: 26, color: C.muted },
      h(
        { height: '100%', alignItems: 'center' },
        h({ height: '100%', alignItems: 'center', padding: '0 24px', background: C.accent, color: C.bg }, 'NORMAL'),
        h({ marginLeft: 24 }, file),
      ),
      h({ marginRight: 32, color: C.strong }, 'vedantthapar.com'),
    ),
  );

  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Departure', data: departure, weight: 400, style: 'normal' },
      { name: 'Plex', data: plex, weight: 400, style: 'normal' },
    ],
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
