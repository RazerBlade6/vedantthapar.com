import { COMMANDS } from './commands';
import type { Env } from './types';
import { lookup, normalize } from './vfs';

export interface Completion {
  /** The line with the last word completed as far as it's unambiguous */
  line: string;
  /** Candidates when more than one matches (shown to the user) */
  options: string[];
}

function commonPrefix(words: string[]): string {
  let prefix = words[0] ?? '';
  for (const w of words) while (!w.toLowerCase().startsWith(prefix.toLowerCase())) prefix = prefix.slice(0, -1);
  return prefix;
}

export function complete(line: string, env: Env): Completion {
  const words = line.split(' ');
  const word = words.at(-1) ?? '';
  const head = words.slice(0, -1);
  const withWord = (w: string) => [...head, w].join(' ');

  // first word: command names
  if (!head.length) {
    const hits = COMMANDS.map((c) => c.name).filter((n) => n.startsWith(word.toLowerCase()));
    if (hits.length === 1) return { line: hits[0] + ' ', options: [] };
    return { line: withWord(commonPrefix(hits) || word), options: hits };
  }

  // `theme <name>`
  if (head[0] === 'theme') {
    const hits = env.themes.filter((t) => t.startsWith(word.toLowerCase()));
    if (hits.length === 1) return { line: withWord(hits[0]), options: [] };
    return { line: withWord(commonPrefix(hits) || word), options: [...hits] };
  }

  // paths: complete the last segment within its directory
  const slash = word.lastIndexOf('/');
  const dirPart = slash >= 0 ? word.slice(0, slash + 1) : '';
  const partial = word.slice(slash + 1).toLowerCase();
  const dir = lookup(env.root, normalize(env.cwd, dirPart || '.'));
  const names = (dir?.children ?? [])
    .filter((k) => k.name.toLowerCase().startsWith(partial))
    .map((k) => k.name + (k.kind === 'dir' ? '/' : ''));

  if (names.length === 1) return { line: withWord(dirPart + names[0]) + (names[0].endsWith('/') ? '' : ' '), options: [] };
  const prefix = commonPrefix(names);
  return { line: withWord(dirPart + (prefix.length > partial.length ? prefix : word.slice(slash + 1))), options: names };
}
