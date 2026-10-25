import { COMMANDS, type Command } from './commands';
import type { Env, Line, Result } from './types';

// Easter eggs: real commands people reflexively type. Deliberately absent from `help`,
// tab completion and "did you mean" suggestions — they're for finding.

const line = (text: string, tone?: 'muted' | 'error' | 'accent' | 'strong'): Line => [{ text, tone }];
const exit = COMMANDS.find((c) => c.name === 'exit')!;

const egg = (names: string[], run: (args: string[], env: Env, name: string) => Result): Command[] =>
  names.map((name) => ({ name, usage: name, summary: '', run: (args, env) => run(args, env, name) }));

export const EGGS: Command[] = [
  ...egg(['whoami'], () => ({
    lines: [line('guest'), [{ text: "(the person you're looking for is in ", tone: 'muted' }, { text: 'about.txt', cmd: 'cat about.txt' }, { text: ')', tone: 'muted' }]],
  })),
  ...egg(['sudo'], () => ({ lines: [line('guest is not in the sudoers file. This incident will be reported.', 'error')] })),
  ...egg(['rm'], (args) => ({
    lines: [
      args.some((a) => a === '/' || a === '/*' || a === '~')
        ? line("rm: refusing to remove that — this portfolio is load-bearing", 'error')
        : line('rm: read-only file system', 'error'),
    ],
  })),
  ...egg(['vim', 'vi', 'nvim'], () => ({
    lines: [[{ text: "you're already in it. ", tone: 'muted' }, { text: ':q', cmd: 'q' }, { text: ' to leave.', tone: 'muted' }]],
  })),
  ...egg(['emacs', 'nano'], (_, __, name) => ({ lines: [line(`${name}: this is a vim household.`, 'muted')] })),
  // :q and friends — in the status-line prompt the ':' is already typed, so plain `q` is what arrives
  ...egg(['q', 'q!', 'wq', 'x', ':q', ':q!', ':wq'], (args, env) => exit.run(args, env)),
  ...egg(['echo'], (args) => ({ lines: [line(args.join(' '))] })),
  ...egg(['man'], (args) => {
    if (!args[0]) return { lines: [line('What manual page do you want?')] };
    const cmd = COMMANDS.find((c) => c.name === args[0].toLowerCase());
    if (!cmd) return { lines: [line(`No manual entry for ${args[0]}`, 'error')] };
    return { lines: [[{ text: cmd.usage, tone: 'strong' }], line(`    ${cmd.summary}`, 'muted')] };
  }),
  ...egg(['neofetch', 'fastfetch'], (_, env) => {
    const rows: [string, string][] = [
      ['OS', 'Astro 7 on Cloudflare Workers'],
      ['Shell', 'vsh (a few hundred lines of TypeScript)'],
      ['Theme', env.theme],
      ['Font', 'IBM Plex Mono, Departure Mono'],
      ['Languages', 'Python, Go, Rust, TypeScript, C/C++'],
      ['Currently', 'R&D @ 1Kosmos'],
      ['Uptime', 'since Sep 2022 (BITS Pilani)'],
    ];
    return {
      lines: [
        [{ text: 'guest', tone: 'accent' }, { text: '@' }, { text: 'vedantthapar.com', tone: 'accent' }],
        line('----------------------'),
        ...rows.map(([k, v]): Line => [{ text: `${k}: `.padEnd(11), tone: 'accent' }, { text: v }]),
      ],
    };
  }),
];
