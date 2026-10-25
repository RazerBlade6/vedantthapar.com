import type { VNode } from './types';

/** Resolve `input` against `cwd` into an absolute path ("/" is ~). Handles ~, ., .. and trailing slashes. */
export function normalize(cwd: string, input = ''): string {
  const absolute = input.startsWith('/') || input.startsWith('~');
  const parts = absolute ? [] : cwd.split('/').filter(Boolean);
  for (const seg of input.replace(/^~/, '').split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return '/' + parts.join('/');
}

const stem = (name: string) => name.replace(/\.[^.]+$/, '').toLowerCase();

function child(dir: VNode, seg: string): VNode | undefined {
  const kids = dir.children ?? [];
  const lower = seg.toLowerCase();
  // exact (case-insensitive) first, then extension-less: `cat apex` finds apex.md
  return kids.find((k) => k.name.toLowerCase() === lower) ?? kids.find((k) => stem(k.name) === lower);
}

/** Look up an absolute path; case-insensitive, file extensions optional. */
export function lookup(root: VNode, path: string): VNode | undefined {
  let node: VNode | undefined = root;
  for (const seg of path.split('/').filter(Boolean)) {
    if (node?.kind !== 'dir') return undefined;
    node = child(node, seg);
  }
  return node;
}

/** Canonical absolute path of a lookup (real names, not what was typed). */
export function canonical(root: VNode, path: string): string {
  const out: string[] = [];
  let node = root;
  for (const seg of path.split('/').filter(Boolean)) {
    const next = child(node, seg);
    if (!next) break;
    out.push(next.name);
    node = next;
  }
  return '/' + out.join('/');
}

/** "/projects" → "~/projects" */
export const display = (path: string) => (path === '/' ? '~' : '~' + path);

/** Depth-first search for a file or dir by name (extension optional). */
export function find(root: VNode, name: string): { node: VNode; path: string } | undefined {
  const lower = name.toLowerCase();
  const walk = (node: VNode, path: string): { node: VNode; path: string } | undefined => {
    for (const k of node.children ?? []) {
      const p = `${path}/${k.name}`;
      if (k.name.toLowerCase() === lower || stem(k.name) === lower) return { node: k, path: p };
      const hit = k.kind === 'dir' ? walk(k, p) : undefined;
      if (hit) return hit;
    }
  };
  return walk(root, '');
}
