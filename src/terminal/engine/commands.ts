import type { Env, Line, Result, Seg, VNode } from './types';
import { canonical, display, find, lookup, normalize } from './vfs';

export interface Command {
  name: string;
  usage: string;
  summary: string;
  run(args: string[], env: Env): Result;
}

const err = (text: string): Result => ({ lines: [[{ text, tone: 'error' }]] });
const say = (...segs: Seg[]): Line => segs;

/** One entry of `ls` output: dirs run `ls` on click, files link to their page. */
function entry(node: VNode, path: string): Seg {
  return node.kind === 'dir'
    ? { text: node.name + '/', cmd: `ls ${display(path)}`, tone: 'accent' }
    : { text: node.name, href: node.url };
}

function splitFlags(args: string[]) {
  const flags = new Set(args.filter((a) => a.startsWith('-')).flatMap((a) => [...a.slice(1)]));
  return { flags, rest: args.filter((a) => !a.startsWith('-')) };
}

const ls: Command = {
  name: 'ls',
  usage: 'ls [-l] [path]',
  summary: 'list a directory (-l for descriptions)',
  run(args, env) {
    const { flags, rest } = splitFlags(args);
    const path = normalize(env.cwd, rest[0]);
    const node = lookup(env.root, path);
    if (!node) return err(`ls: ${rest[0]}: No such file or directory`);
    const real = canonical(env.root, path);
    if (node.kind === 'file') return { lines: [[entry(node, real)]] };
    const kids = node.children ?? [];
    if (!kids.length) return { lines: [] };
    if (!flags.has('l')) {
      return { lines: [kids.flatMap((k, i) => [...(i ? [{ text: '  ' }] : []), entry(k, `${real}/${k.name}`.replace('//', '/'))])] };
    }
    const width = Math.max(...kids.map((k) => k.name.length + (k.kind === 'dir' ? 1 : 0))) + 2;
    return {
      lines: kids.map((k) => {
        const e = entry(k, `${real}/${k.name}`.replace('//', '/'));
        const desc = k.description ?? '';
        const short = desc.length > 64 ? desc.slice(0, 63).trimEnd() + '…' : desc;
        return [e, { text: ' '.repeat(width - e.text.length) }, { text: short, tone: 'muted' }];
      }),
    };
  },
};

const cd: Command = {
  name: 'cd',
  usage: 'cd [dir]',
  summary: 'go to a directory (and its page)',
  run(args, env) {
    const path = normalize(env.cwd, args[0] ?? '~');
    const node = lookup(env.root, path);
    if (!node) return err(`cd: ${args[0]}: No such file or directory`);
    if (node.kind !== 'dir') return err(`cd: ${args[0]}: Not a directory`);
    return { lines: [], cwd: canonical(env.root, path), actions: node.url ? [{ type: 'navigate', url: node.url }] : [] };
  },
};

const cat: Command = {
  name: 'cat',
  usage: 'cat <file>',
  summary: 'open a file',
  run(args, env) {
    if (!args[0]) return err('usage: cat <file>');
    const node = lookup(env.root, normalize(env.cwd, args[0]));
    if (!node) return err(`cat: ${args[0]}: No such file or directory`);
    if (node.kind === 'dir') return err(`cat: ${args[0]}: Is a directory`);
    if (node.binary) return { lines: [say({ text: `cat: ${node.name}: binary file — try `, tone: 'error' }, { text: 'resume', cmd: 'resume' })] };
    return { lines: [], actions: node.url ? [{ type: 'navigate', url: node.url }, { type: 'close' }] : [] };
  },
};

const open: Command = {
  name: 'open',
  usage: 'open <project>',
  summary: 'open a project page',
  run(args, env) {
    if (!args[0]) return err('usage: open <project>   (try: ls ~/projects)');
    const hit = lookup(env.root, normalize(env.cwd, args[0])) ?? find(env.root, args[0])?.node;
    if (!hit?.url) return err(`open: ${args[0]}: no such project`);
    return { lines: [], actions: [{ type: 'navigate', url: hit.url }, { type: 'close' }] };
  },
};

const pwd: Command = {
  name: 'pwd',
  usage: 'pwd',
  summary: 'print the current directory',
  run: (_, env) => ({ lines: [[{ text: display(env.cwd) }]] }),
};

const resume: Command = {
  name: 'resume',
  usage: 'resume',
  summary: 'download my resume',
  run(_, env) {
    if (!env.resume) {
      return {
        lines: [say({ text: 'resume: not published yet — email ', tone: 'muted' }, { text: env.email, href: `mailto:${env.email}` }, { text: ' for a copy', tone: 'muted' })],
      };
    }
    return { lines: [say({ text: 'opening ' }, { text: 'resume.pdf', href: env.resume })], actions: [{ type: 'navigate', url: env.resume }] };
  },
};

const contact: Command = {
  name: 'contact',
  usage: 'contact',
  summary: 'copy my email address',
  run(_, env) {
    return {
      lines: [
        say({ text: 'email   ', tone: 'muted' }, { text: env.email, href: `mailto:${env.email}` }),
        say({ text: 'github  ', tone: 'muted' }, { text: env.github.replace('https://', ''), href: env.github }),
      ],
      actions: [{ type: 'copy', text: env.email }],
    };
  },
};

const theme: Command = {
  name: 'theme',
  usage: 'theme [name]',
  summary: 'list or switch colour themes',
  run(args, env) {
    if (!args[0]) {
      return {
        lines: env.themes.map((t) =>
          t === env.theme ? say({ text: `* ${t}`, tone: 'accent' }) : say({ text: '  ' }, { text: t, cmd: `theme ${t}` }),
        ),
      };
    }
    const name = args[0].toLowerCase();
    if (!env.themes.includes(name)) return err(`theme: ${args[0]}: unknown theme (${env.themes.join(', ')})`);
    return { lines: [say({ text: `theme set to ${name}`, tone: 'muted' })], actions: [{ type: 'theme', name }] };
  },
};

const clear: Command = { name: 'clear', usage: 'clear', summary: 'clear the output', run: () => ({ lines: [], actions: [{ type: 'clear' }] }) };
const exit: Command = { name: 'exit', usage: 'exit', summary: 'close the command line', run: () => ({ lines: [], actions: [{ type: 'close' }] }) };

const help: Command = {
  name: 'help',
  usage: 'help',
  summary: 'show this help',
  run() {
    const width = Math.max(...COMMANDS.map((c) => c.usage.length)) + 3;
    return {
      lines: [
        say({ text: 'commands', tone: 'strong' }),
        ...COMMANDS.map((c) => say({ text: c.usage, cmd: c.usage.includes('<') ? undefined : c.name }, { text: ' '.repeat(width - c.usage.length) + c.summary, tone: 'muted' })),
        [],
        say({ text: 'keys', tone: 'strong' }),
        ...KEYS.map(([k, d]) => say({ text: k.padEnd(width) }, { text: d, tone: 'muted' })),
      ],
    };
  },
};

export const KEYS: [string, string][] = [
  [':', 'command line'],
  ['/', 'search the page (n / N for next / previous)'],
  ['j / k', 'next / previous link'],
  ['gg / G', 'top / bottom of the page'],
  ['?', 'this help'],
  ['tab', 'complete commands, paths and themes'],
  ['↑ / ↓', 'command history'],
  ['esc', 'close'],
];

export const COMMANDS: Command[] = [help, ls, cd, cat, open, pwd, resume, contact, theme, clear, exit];
