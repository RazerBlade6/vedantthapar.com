import { navigate } from 'astro:transitions/client';
import { THEMES, site, type Theme } from '../../site';
import { complete, display, execute, History, type Action, type Env, type Line, type VNode } from '../engine';
import { renderLine } from './render';
import { effectsOn, partsOff, setEffects, setPart } from './effects';
import { glitch, scheduleGlitches } from './glitch';
import { currentTheme, cycleTheme, setTheme } from './theme';

/** What the status-line prompt is doing. Full-buffer mode is separate: it has its own prompt. */
type Mode = 'normal' | 'command' | 'search';

const $ = <T extends HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && !!el.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');

/** Directory of the page being viewed: "~/projects/apex.md" → "/projects" */
function cwdFromFile(file: string): string {
  if (!file.startsWith('~')) return '/';
  const path = file.slice(1);
  return path.endsWith('/') ? path.slice(0, -1) || '/' : path.slice(0, path.lastIndexOf('/')) || '/';
}

const sessionStore = {
  load(): string[] {
    try {
      return JSON.parse(sessionStorage.getItem('term-history') ?? '[]');
    } catch {
      return [];
    }
  },
  save(items: string[]) {
    try {
      sessionStorage.setItem('term-history', JSON.stringify(items));
    } catch {}
  },
};

export function mountTerminal() {
  const root = document.getElementById('terminal');
  if (!root || root.dataset.mounted) return;
  root.dataset.mounted = 'true';

  // status line + command panel
  const panel = $<HTMLElement>(root, '[data-panel]');
  const output = $<HTMLElement>(root, '[data-output]');
  const chips = $<HTMLElement>(root, '[data-chips]');
  const modeBadge = $<HTMLElement>(root, '[data-mode]');
  const openBtn = $<HTMLButtonElement>(root, '[data-open]');
  const fileLabel = $<HTMLElement>(root, '[data-file]');
  const form = $<HTMLFormElement>(root, '[data-form]');
  const prompt = $<HTMLElement>(root, '[data-prompt]');
  const input = $<HTMLInputElement>(root, '[data-input]');
  const themeBtn = $<HTMLButtonElement>(root, '[data-theme-cycle]');
  const themeLabel = $<HTMLElement>(root, '[data-theme-label]');
  const fxBtn = $<HTMLButtonElement>(root, '[data-fx]');
  const fxLabel = $<HTMLElement>(root, '[data-fx-label]');
  // full-buffer mode
  const buffer = $<HTMLElement>(root, '[data-buffer]');
  const bufScroll = $<HTMLElement>(root, '[data-buf-scroll]');
  const bufOutput = $<HTMLElement>(root, '[data-buf-output]');
  const bufForm = $<HTMLFormElement>(root, '[data-buf-form]');
  const bufNumber = $<HTMLElement>(root, '[data-buf-number]');
  const bufPrompt = $<HTMLElement>(root, '[data-buf-prompt]');
  const bufInput = $<HTMLInputElement>(root, '[data-buf-input]');
  const vfs: VNode = JSON.parse($<HTMLElement>(root, '[data-vfs]').textContent ?? '{}');

  const commandHistory = new History(sessionStore);
  const fileCache = new Map<string, Line[]>();
  let mode: Mode = 'normal';
  let inBuffer = false;
  let lineNo = 0;
  let cwd = '/';
  let pageFile = fileLabel.textContent ?? '';
  let returnFocus: HTMLElement | null = null;
  let searchHits: HTMLElement[] = [];
  let searchIndex = -1;

  // ---- progressive enhancement: only now do the interactive bits appear ----
  openBtn.disabled = false;
  root.querySelectorAll<HTMLElement>('[data-hint]').forEach((h) => (h.hidden = false));
  themeBtn.hidden = false;
  fxBtn.hidden = false;

  const env = (): Env => ({
    root: vfs,
    mode: inBuffer ? 'buffer' : 'page',
    cwd,
    theme: currentTheme(),
    themes: THEMES,
    effects: { on: effectsOn(), off: partsOff() },
    email: site.email,
    github: site.github,
    resume: site.resume,
  });

  // ---- status line ----
  const renderTheme = () => {
    themeLabel.textContent = currentTheme();
    themeBtn.setAttribute('aria-label', `Theme: ${currentTheme()}. Switch theme`);
  };
  themeBtn.addEventListener('click', cycleTheme);
  document.addEventListener('themechange', renderTheme);

  const renderEffects = () => {
    const on = effectsOn();
    fxLabel.textContent = on ? 'on' : 'off';
    fxBtn.setAttribute('aria-pressed', String(on));
  };
  fxBtn.addEventListener('click', () => setEffects(!effectsOn()));
  document.addEventListener('effectschange', renderEffects);
  scheduleGlitches();

  function setMode(next: Mode) {
    mode = next;
    modeBadge.textContent = inBuffer ? 'TERM' : { normal: 'NORMAL', command: 'COMMAND', search: 'SEARCH' }[next];
    const typing = next !== 'normal';
    openBtn.hidden = typing;
    form.hidden = !typing;
    prompt.textContent = next === 'search' ? '/' : ':';
    input.setAttribute('aria-label', next === 'search' ? 'Search the page' : 'Command');
  }

  // ---- output: the panel above the status line, or the buffer when it's open ----
  function print(lines: Line[]) {
    const runCmd = (cmd: string) => run(cmd);
    if (inBuffer) {
      for (const line of lines) {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-[3ch_minmax(0,1fr)] gap-x-3';
        const n = document.createElement('span');
        n.setAttribute('aria-hidden', 'true');
        n.className = 'text-right text-fg-muted opacity-60 select-none';
        n.textContent = String(++lineNo);
        row.append(n, renderLine(line, runCmd));
        bufOutput.append(row);
      }
      bufNumber.textContent = String(lineNo + 1);
      bufForm.scrollIntoView({ block: 'nearest' });
      return;
    }
    for (const line of lines) output.append(renderLine(line, runCmd));
    showPanel();
    panel.scrollTop = panel.scrollHeight;
  }

  function showPanel() {
    panel.hidden = false;
    chips.hidden = output.childElementCount > 0;
  }
  const hidePanel = () => (panel.hidden = true);

  function open(next: 'command' | 'search', initial?: string) {
    if (inBuffer) return bufInput.focus();
    if (mode === 'normal') returnFocus = document.activeElement as HTMLElement | null;
    setMode(next);
    input.value = '';
    if (next === 'command') showPanel();
    else hidePanel();
    input.focus();
    if (initial) run(initial);
  }

  function close() {
    setMode('normal');
    hidePanel();
    input.value = '';
    if (inBuffer) return bufInput.focus();
    // hand focus back; never leave it on a hidden terminal input, or the next key would be swallowed
    if (returnFocus?.isConnected && returnFocus !== document.body) returnFocus.focus();
    else if (document.activeElement instanceof HTMLElement && root!.contains(document.activeElement)) document.activeElement.blur();
    returnFocus = null;
  }

  // ---- full-buffer mode ----
  function splash() {
    print([
      [{ text: site.name, tone: 'title' }],
      [{ text: site.tagline, tone: 'muted' }],
      [],
      [
        { text: 'type ' },
        { text: 'help', cmd: 'help' },
        { text: ' for commands, ' },
        { text: 'ls', cmd: 'ls' },
        { text: ' to look around, ' },
        { text: 'exit', cmd: 'exit' },
        { text: ' (or esc twice) to leave' },
      ],
      [],
    ]);
  }

  function enterBuffer() {
    if (inBuffer) return;
    if (mode === 'normal') returnFocus = document.activeElement as HTMLElement | null;
    hidePanel();
    inBuffer = true;
    setMode('normal');
    buffer.hidden = false;
    root!.toggleAttribute('data-in-buffer', true);
    document.documentElement.style.overflow = 'hidden';
    if (!lineNo) splash();
    renderPrompt();
    bufInput.focus();
  }

  function leaveBuffer() {
    if (!inBuffer) return;
    inBuffer = false;
    buffer.hidden = true;
    root!.toggleAttribute('data-in-buffer', false);
    fileLabel.textContent = pageFile;
    document.documentElement.style.overflow = '';
    close();
  }

  // in the buffer, the status line shows the buffer's directory rather than the page's file
  function renderPrompt() {
    bufPrompt.textContent = `${display(cwd)} $`;
    fileLabel.textContent = `${display(cwd)}/`.replace('~//', '~/');
  }

  async function printFile(src: string) {
    let lines = fileCache.get(src);
    if (!lines) {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(String(res.status));
        lines = (await res.json()) as Line[];
        fileCache.set(src, lines);
      } catch {
        return print([[{ text: `cat: couldn't read ${src}`, tone: 'error' }]]);
      }
    }
    print(lines);
  }

  // ---- running commands ----
  async function go(url: string) {
    const target = new URL(url, location.href);
    if (/\.pdf$/i.test(target.pathname)) return void window.open(target.href, '_blank', 'noopener');
    if (target.pathname !== location.pathname) return navigate(target.pathname + target.hash);
    const el = target.hash ? document.getElementById(decodeURIComponent(target.hash.slice(1))) : null;
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      window.history.replaceState(window.history.state, '', target.hash);
    } else window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  async function perform(action: Action) {
    switch (action.type) {
      case 'navigate':
        return go(action.url);
      case 'theme':
        return setTheme(action.name as Theme);
      case 'effects':
        return action.part ? setPart(action.part, action.on) : setEffects(action.on);
      case 'glitch':
        return glitch();
      case 'print':
        return printFile(action.src);
      case 'term':
        return action.on ? enterBuffer() : leaveBuffer();
      case 'clear':
        if (inBuffer) {
          bufOutput.replaceChildren();
          lineNo = 0;
          bufNumber.textContent = '1';
          return;
        }
        output.replaceChildren();
        return showPanel();
      case 'close':
        return close();
      case 'copy':
        try {
          await navigator.clipboard.writeText(action.text);
          print([[{ text: `copied ${action.text} to the clipboard`, tone: 'muted' }]]);
        } catch {
          print([[{ text: `couldn't reach the clipboard — the address is ${action.text}`, tone: 'muted' }]]);
        }
    }
  }

  async function run(line: string) {
    if (!inBuffer && mode === 'normal') open('command');
    commandHistory.push(line);
    print([[{ text: `${display(cwd)} $ `, tone: 'accent' }, { text: line }]]);
    const result = execute(line, env());
    if (result.cwd) cwd = result.cwd;
    print(result.lines);
    for (const action of result.actions ?? []) await perform(action);
    if (inBuffer) renderPrompt();
  }

  // ---- search (/) ----
  function search(query: string) {
    const q = query.trim().toLowerCase();
    const candidates = [...document.querySelectorAll<HTMLElement>('main :is(a[href], h1, h2, h3, p, li)')];
    const matching = candidates.filter((el) => el.textContent?.toLowerCase().includes(q));
    // keep the innermost match so a <li> doesn't shadow the link inside it
    searchHits = matching.filter((el) => !matching.some((other) => other !== el && el.contains(other)));
    searchIndex = -1;
    return searchHits.length;
  }

  function jumpToHit(step: 1 | -1) {
    if (!searchHits.length) return;
    searchIndex = (searchIndex + step + searchHits.length) % searchHits.length;
    focusEl(searchHits[searchIndex]);
  }

  // ---- input handling ----
  /** Tab completion and ↑/↓ history, shared by the status-line prompt and the buffer prompt. */
  function shellKeys(e: KeyboardEvent, field: HTMLInputElement): boolean {
    if (e.key === 'Tab') {
      const { line, options } = complete(field.value, env());
      field.value = line;
      if (options.length > 1) print([options.flatMap((o, i) => [...(i ? [{ text: '  ' }] : []), { text: o, tone: 'muted' as const }])]);
    } else if (e.key === 'ArrowUp') field.value = commandHistory.prev(field.value);
    else if (e.key === 'ArrowDown') field.value = commandHistory.next();
    else return false;
    e.preventDefault();
    return true;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value;
    input.value = '';
    if (mode === 'search') {
      const n = value.trim() ? search(value) : 0;
      close();
      if (n) jumpToHit(1);
      else if (value.trim()) {
        open('command');
        print([[{ text: `Pattern not found: ${value}`, tone: 'error' }]]);
      }
      return;
    }
    if (value.trim()) run(value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || (e.key === 'Backspace' && input.value === '')) {
      // like vim: Esc, or backspacing past the start of : or /, drops back to normal mode
      e.preventDefault();
      close();
    } else if (mode === 'command') shellKeys(e, input);
  });

  bufForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = bufInput.value;
    bufInput.value = '';
    if (value.trim()) run(value);
    else print([[{ text: `${display(cwd)} $ `, tone: 'accent' }]]);
  });

  let lastEsc = 0;
  bufInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      // first Esc clears the line, a second one within a moment leaves
      if (Date.now() - lastEsc < 600) leaveBuffer();
      else bufInput.value = '';
      lastEsc = Date.now();
    } else shellKeys(e, bufInput);
  });

  // clicking anywhere in the buffer (except on a link or button, or while selecting text) focuses the prompt
  bufScroll.addEventListener('mouseup', (e) => {
    if ((e.target as HTMLElement).closest('a, button') || getSelection()?.toString()) return;
    bufInput.focus({ preventScroll: true });
  });

  openBtn.addEventListener('click', () => open('command'));
  $<HTMLButtonElement>(root, '[data-close]').addEventListener('click', close);
  $<HTMLButtonElement>(root, '[data-buf-close]').addEventListener('click', leaveBuffer);
  chips.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-chip]');
    if (chip?.dataset.chip) run(chip.dataset.chip);
  });

  // ---- vim keys (page mode) ----
  const navItems = () =>
    [...document.querySelectorAll<HTMLElement>('main a[href], main button')].filter((el) => el.offsetParent !== null);

  function focusEl(el: HTMLElement) {
    if (!el.matches('a[href], button, input, [tabindex]')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  function move(step: 1 | -1) {
    const items = navItems();
    if (!items.length) return;
    let i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) {
      // start from what's on screen rather than the top of the page
      i =
        step > 0
          ? items.findIndex((el) => el.getBoundingClientRect().top >= 0)
          : items.findLastIndex((el) => el.getBoundingClientRect().bottom <= innerHeight);
      if (i < 0) i = step > 0 ? 0 : items.length - 1;
    } else i = Math.min(items.length - 1, Math.max(0, i + step));
    focusEl(items[i]);
  }

  function scrollToEdge(edge: 'top' | 'bottom') {
    (document.activeElement as HTMLElement | null)?.blur();
    const top = edge === 'top' ? 0 : document.documentElement.scrollHeight;
    window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  let lastG = 0;
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;

    // in the buffer, every keystroke belongs to its prompt
    if (inBuffer) {
      if (e.key.length === 1 || e.key === 'Escape') bufInput.focus();
      return;
    }

    const handled = () => e.preventDefault();
    switch (e.key) {
      case ':':
        handled();
        return open('command');
      case '/':
        handled();
        return open('search');
      case '?':
        handled();
        return open('command', 'help');
      case 'Escape':
        if (mode !== 'normal' || !panel.hidden) close();
        return;
      case 'j':
        handled();
        return move(1);
      case 'k':
        handled();
        return move(-1);
      case 'n':
        return jumpToHit(1);
      case 'N':
        return jumpToHit(-1);
      // gg / G only scroll; they drop the j/k cursor so the next j/k starts from what's on screen
      case 'G':
        handled();
        return scrollToEdge('bottom');
      case 'g': {
        const now = Date.now();
        if (now - lastG < 500) {
          handled();
          scrollToEdge('top');
          lastG = 0;
        } else lastG = now;
      }
    }
  });

  // ---- per page ----
  document.addEventListener('astro:page-load', () => {
    pageFile = document.querySelector<HTMLElement>('main[data-file]')?.dataset.file ?? '';
    // the buffer keeps its own working directory and status label
    if (!inBuffer) {
      fileLabel.textContent = pageFile;
      cwd = cwdFromFile(pageFile);
    }
    searchHits = [];
    renderTheme();
    renderEffects();
  });
}
