import type { APIRoute, GetStaticPaths } from 'astro';
import { buildBodies } from '../../terminal/vfs.build';

// One JSON file of terminal lines per filesystem file, fetched by `cat` in full-buffer mode.
export const getStaticPaths = (async () => {
  const bodies = await buildBodies();
  return [...bodies].map(([path, lines]) => ({ params: { path: `${path}.json` }, props: { lines } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.lines), { headers: { 'Content-Type': 'application/json' } });
