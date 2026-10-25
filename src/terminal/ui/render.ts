import type { Line } from '../engine';

const TONES = {
  muted: 'text-fg-muted',
  accent: 'text-accent',
  error: 'text-fg-strong',
  strong: 'text-fg-strong font-medium',
  title: 'block py-2 font-pixel text-3xl leading-none text-fg-strong sm:text-4xl',
} as const;

/** Build output DOM with textContent only — command output never goes through innerHTML. */
export function renderLine(line: Line, run: (cmd: string) => void): HTMLElement {
  const el = document.createElement('div');
  el.className = 'min-h-[1.5em]';
  for (const seg of line) {
    let node: HTMLElement;
    if (seg.href) {
      node = document.createElement('a');
      (node as HTMLAnchorElement).href = seg.href;
    } else if (seg.cmd) {
      const cmd = seg.cmd;
      node = document.createElement('button');
      (node as HTMLButtonElement).type = 'button';
      node.className = 'cursor-pointer underline decoration-border underline-offset-4 hover:text-link hover:decoration-link';
      node.addEventListener('click', () => run(cmd));
    } else {
      node = document.createElement('span');
    }
    if (seg.tone) node.className += ' ' + TONES[seg.tone];
    node.textContent = seg.text;
    el.append(node);
  }
  return el;
}
