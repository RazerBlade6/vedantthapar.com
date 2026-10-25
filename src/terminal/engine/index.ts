import { COMMANDS } from './commands';
import { EGGS } from './eggs';
import { nearest } from './suggest';
import type { Env, Result } from './types';

export * from './types';
export { complete } from './complete';
export { History } from './history';
export { display } from './vfs';

export const COMMAND_NAMES = COMMANDS.map((c) => c.name);

export function execute(line: string, env: Env): Result {
  const [name, ...args] = line.trim().split(/\s+/);
  if (!name) return { lines: [] };
  const cmd = [...COMMANDS, ...EGGS].find((c) => c.name === name.toLowerCase());
  if (cmd) return cmd.run(args, env);

  const guess = nearest(name, COMMAND_NAMES);
  return {
    lines: [
      guess
        ? [
            { text: `command not found: ${name} — did you mean `, tone: 'error' },
            { text: guess, cmd: [guess, ...args].join(' ') },
            { text: '?', tone: 'error' },
          ]
        : [
            { text: `command not found: ${name} — try `, tone: 'error' },
            { text: 'help', cmd: 'help' },
          ],
    ],
  };
}
