import { EFFECT_PARTS, type Action, type EffectPart, type Env, type Line, type Result, type Seg, type VNode } from './types';
import { canonical, display, find, lookup, normalize } from './vfs';

export interface Command {
  name: string;
  usage: string;
  summary: string;
  run(args: string[], env: Env): Result;
}

const err = (text: string): Result => ({ lines: [[{ text, tone: 'error' }]] });
const leaveBuffer = (env: Env): Action[] => (env.mode === 'buffer' ? [{ type: 'term', on: false }] : []);
const say = (...segs: Seg[]): Line => segs;

/** One entry of `ls` output: dirs run `ls` on click; files link to their page, or `cat` themselves in buffer mode. */
function entry(node: VNode, path: string, mode: Env['mode']): Seg {
  if (node.kind === 'dir') return { text: node.name + '/', cmd: `ls ${display(path)}`, tone: 'accent' };
  return mode === 'buffer' ? { text: node.name, cmd: `cat ${display(path)}` } : { text: node.name, href: node.url };
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
    if (node.kind === 'file') return { lines: [[entry(node, real, env.mode)]] };
    const kids = node.children ?? [];
    if (!kids.length) return { lines: [] };
    if (!flags.has('l')) {
      return { lines: [kids.flatMap((k, i) => [...(i ? [{ text: '  ' }] : []), entry(k, `${real}/${k.name}`.replace('//', '/'), env.mode)])] };
    }
    const width = Math.max(...kids.map((k) => k.name.length + (k.kind === 'dir' ? 1 : 0))) + 2;
    return {
      lines: kids.map((k) => {
        const e = entry(k, `${real}/${k.name}`.replace('//', '/'), env.mode);
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
  summary: 'change directory (and go to that section)',
  run(args, env) {
    const path = normalize(env.cwd, args[0] ?? '~');
    const node = lookup(env.root, path);
    if (!node) return err(`cd: ${args[0]}: No such file or directory`);
    if (node.kind !== 'dir') return err(`cd: ${args[0]}: Not a directory`);
    const cwd = canonical(env.root, path);
    // in the buffer, cd is just cd; on the page it also takes you to that section
    if (env.mode === 'buffer' || !node.url) return { lines: [], cwd };
    return { lines: [], cwd, actions: [{ type: 'navigate', url: node.url }] };
  },
};

const cat: Command = {
  name: 'cat',
  usage: 'cat <file>',
  summary: 'show a file',
  run(args, env) {
    if (!args[0]) return err('usage: cat <file>');
    const node = lookup(env.root, normalize(env.cwd, args[0]));
    if (!node) return err(`cat: ${args[0]}: No such file or directory`);
    if (node.kind === 'dir') return err(`cat: ${args[0]}: Is a directory`);
    if (node.binary) return { lines: [say({ text: `cat: ${node.name}: binary file — try `, tone: 'error' }, { text: 'resume', cmd: 'resume' })] };
    if (env.mode === 'buffer') {
      return node.src ? { lines: [], actions: [{ type: 'print', src: node.src }] } : err(`cat: ${args[0]}: nothing to show`);
    }
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
    // open always shows the page, so it leaves the buffer
    return { lines: [], actions: [...leaveBuffer(env), { type: 'navigate', url: hit.url }, { type: 'close' }] };
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

const EFFECT_INFO: Record<EffectPart, string> = {
  glow: 'phosphor glow on text',
  scanlines: 'horizontal scanlines',
  roll: 'scanlines crawl, a refresh band rolls down',
  glitch: 'the occasional tear',
};

const effects: Command = {
  name: 'effects',
  usage: 'effects [part] [on|off]',
  summary: 'CRT effects: list them, or switch all / one',
  run(args, env) {
    const [a, b] = args.map((x) => x.toLowerCase());
    const isSwitch = (x?: string) => x === 'on' || x === 'off';

    // `effects` — show what's on
    if (!a) {
      const state = (on: boolean) => ({ text: on ? 'on ' : 'off', tone: on ? ('accent' as const) : ('muted' as const) });
      return {
        lines: [
          [{ text: 'effects'.padEnd(14) }, state(env.effects.on)],
          ...EFFECT_PARTS.map((p): Line => [
            { text: `  ${p}`.padEnd(14), cmd: `effects ${p}` },
            state(env.effects.on && !env.effects.off.includes(p)),
            { text: `  ${EFFECT_INFO[p]}`, tone: 'muted' },
          ]),
          [],
          say({ text: 'effects on|off switches everything; effects <part> [on|off] switches one', tone: 'muted' }),
        ],
      };
    }

    // `effects on|off` — the master switch
    if (isSwitch(a) && !b) {
      return { lines: [say({ text: `effects ${a}`, tone: 'muted' })], actions: [{ type: 'effects', on: a === 'on' }] };
    }

    // `effects <part> [on|off]` — one part; bare toggles it
    if (!(EFFECT_PARTS as readonly string[]).includes(a)) return err(`effects: ${args[0]}: expected on, off or one of ${EFFECT_PARTS.join(', ')}`);
    if (b && !isSwitch(b)) return err(`effects: ${args[1]}: expected on or off`);
    const part = a as EffectPart;
    const on = b ? b === 'on' : env.effects.off.includes(part);
    const actions: Action[] = [{ type: 'effects', on, part }];
    // switching a part on while everything is off would do nothing visible, so turn the master on too
    if (on && !env.effects.on) actions.unshift({ type: 'effects', on: true });
    return { lines: [say({ text: `${part} ${on ? 'on' : 'off'}`, tone: 'muted' })], actions };
  },
};

const clear: Command = { name: 'clear', usage: 'clear', summary: 'clear the output', run: () => ({ lines: [], actions: [{ type: 'clear' }] }) };
const exit: Command = {
  name: 'exit',
  usage: 'exit',
  summary: 'leave the terminal',
  run: (_, env) => ({ lines: [], actions: env.mode === 'buffer' ? leaveBuffer(env) : [{ type: 'close' }] }),
};

const term: Command = {
  name: 'term',
  usage: 'term',
  summary: 'full-screen terminal mode',
  run: (_, env) =>
    env.mode === 'buffer'
      ? { lines: [say({ text: 'term: already here — ', tone: 'muted' }, { text: 'exit', cmd: 'exit' }, { text: ' to leave', tone: 'muted' })] }
      : { lines: [], actions: [{ type: 'term', on: true }] },
};

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
  ['esc', 'close (twice in full-screen mode)'],
];

export const COMMANDS: Command[] = [help, ls, cd, cat, open, pwd, resume, contact, theme, effects, term, clear, exit];
