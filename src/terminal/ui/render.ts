import type { Line } from '../engine';

/** Another site (http/https on a different host); mailto: and in-site links open in place. */
const isExternal = (href: string) => /^https?:/i.test(href) && new URL(href).host !== location.host;

const TONES = {
  muted: 'text-fg-muted',
  accent: 'text-accent',
  error: 'text-fg-strong',
  strong: 'text-fg-strong font-medium',
  title: 'block py-2 font-pixel text-3xl leading-none text-fg-strong sm:text-4xl',
  // fixed-width block that never wraps: 56 columns fit a phone at this size
  art: 'block overflow-x-auto py-2 text-[9px] leading-[1.15] whitespace-pre text-fg-muted sm:text-xs',
} as const;

/** Build output DOM with textContent only — command output never goes through innerHTML. */
export function renderLine(line: Line, run: (cmd: string) => void): HTMLElement {
  const el = document.createElement('div');
  el.className = 'min-h-[1.5em]';
  for (const seg of line) {
    let node: HTMLElement;
    if (seg.href) {
      const a = document.createElement('a');
      a.href = seg.href;
      if (isExternal(seg.href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', `${seg.text} (opens in a new tab)`);
      }
      node = a;
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
    if (seg.scheme) node.className += ` scheme-${seg.scheme}`;
    node.textContent = seg.text;
    el.append(node);
  }
  return el;
}
