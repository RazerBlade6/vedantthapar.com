import { describe, expect, it } from 'vitest';
import { complete, execute, History, type Env, type Line, type VNode } from './index';
import { normalize, lookup } from './vfs';
import { nearest } from './suggest';

const root: VNode = {
  name: '~',
  kind: 'dir',
  url: '/',
  children: [
    { name: 'about.txt', kind: 'file', url: '/#about' },
    { name: 'resume.pdf', kind: 'file', url: '/resume.pdf', binary: true },
    {
      name: 'projects',
      kind: 'dir',
      url: '/#projects',
      children: [
        { name: 'apex.md', kind: 'file', url: '/projects/apex', description: 'TUI' },
        { name: 'r-lox.md', kind: 'file', url: '/projects/r-lox' },
        { name: 'archive', kind: 'dir', url: '/projects/archive', children: [{ name: 'novarv.md', kind: 'file', url: '/projects/archive#novarv' }] },
      ],
    },
  ],
};

const env = (over: Partial<Env> = {}): Env => ({
  root,
  cwd: '/',
  theme: 'gruvbox',
  themes: ['gruvbox', 'paper', 'phosphor', 'mocha', 'latte'],
  email: 'contact@example.com',
  github: 'https://github.com/x',
  resume: '/resume.pdf',
  ...over,
});

const text = (lines: Line[]) => lines.map((l) => l.map((s) => s.text).join('')).join('\n');

describe('paths', () => {
  it('normalizes relative, absolute, ~ and ..', () => {
    expect(normalize('/projects', 'apex.md')).toBe('/projects/apex.md');
    expect(normalize('/projects', '..')).toBe('/');
    expect(normalize('/projects', '~/about.txt')).toBe('/about.txt');
    expect(normalize('/projects/archive', '../../projects/./')).toBe('/projects');
    expect(normalize('/', '../..')).toBe('/');
  });

  it('looks up case-insensitively, with optional extensions', () => {
    expect(lookup(root, '/Projects/APEX.md')?.url).toBe('/projects/apex');
    expect(lookup(root, '/projects/apex')?.url).toBe('/projects/apex');
    expect(lookup(root, '/about.txt/x')).toBeUndefined();
  });
});

describe('commands', () => {
  it('ls lists a directory, dirs clickable', () => {
    const r = execute('ls projects', env());
    expect(text(r.lines)).toBe('apex.md  r-lox.md  archive/');
    expect(r.lines[0].find((s) => s.text === 'archive/')?.cmd).toBe('ls ~/projects/archive');
  });

  it('ls -l shows descriptions', () => {
    expect(text(execute('ls -l ~/projects', env()).lines)).toContain('apex.md   TUI');
  });

  it('ls errors on missing paths', () => {
    expect(text(execute('ls nope', env()).lines)).toBe('ls: nope: No such file or directory');
  });

  it('cd changes cwd and navigates', () => {
    const r = execute('cd PROJECTS/', env());
    expect(r.cwd).toBe('/projects');
    expect(r.actions).toEqual([{ type: 'navigate', url: '/#projects' }]);
    expect(execute('cd', env({ cwd: '/projects' })).cwd).toBe('/');
    expect(text(execute('cd about.txt', env()).lines)).toContain('Not a directory');
  });

  it('cat navigates to files and refuses dirs and binaries', () => {
    expect(execute('cat apex', env({ cwd: '/projects' })).actions?.[0]).toEqual({ type: 'navigate', url: '/projects/apex' });
    expect(text(execute('cat projects', env()).lines)).toContain('Is a directory');
    expect(text(execute('cat resume.pdf', env()).lines)).toBe('cat: resume.pdf: binary file — try resume');
  });

  it('open finds projects by name from anywhere', () => {
    expect(execute('open novarv', env()).actions?.[0]).toEqual({ type: 'navigate', url: '/projects/archive#novarv' });
    expect(text(execute('open nothing', env()).lines)).toContain('no such project');
  });

  it('theme lists, marks current, and switches', () => {
    expect(text(execute('theme', env()).lines)).toContain('* gruvbox');
    expect(execute('theme Mocha', env()).actions).toEqual([{ type: 'theme', name: 'mocha' }]);
    expect(text(execute('theme neon', env()).lines)).toContain('unknown theme');
  });

  it('resume explains when there is no PDF yet', () => {
    expect(text(execute('resume', env({ resume: undefined })).lines)).toContain('not published yet');
  });

  it('contact copies the email', () => {
    expect(execute('contact', env()).actions).toEqual([{ type: 'copy', text: 'contact@example.com' }]);
  });

  it('suggests the nearest command', () => {
    const r = execute('sl projects', env());
    expect(text(r.lines)).toBe('command not found: sl — did you mean ls?');
    expect(r.lines[0][1].cmd).toBe('ls projects');
    expect(text(execute('xyzzy', env()).lines)).toContain('try help');
    expect(nearest('thme', ['theme', 'help'])).toBe('theme');
  });
});

describe('completion', () => {
  it('completes commands', () => {
    expect(complete('th', env())).toEqual({ line: 'theme ', options: [] });
    expect(complete('c', env()).options).toEqual(['cd', 'cat', 'contact', 'clear']);
  });

  it('completes paths, adding / for dirs', () => {
    expect(complete('cd pro', env()).line).toBe('cd projects/');
    expect(complete('cat projects/a', env()).options).toEqual(['apex.md', 'archive/']);
    expect(complete('cat projects/ap', env()).line).toBe('cat projects/apex.md ');
    expect(complete('ls ~/projects/arc', env()).line).toBe('ls ~/projects/archive/');
  });

  it('completes theme names', () => {
    expect(complete('theme mo', env()).line).toBe('theme mocha');
  });
});

describe('history', () => {
  it('walks back and forward, keeping the draft', () => {
    const h = new History();
    h.push('ls');
    h.push('cd projects');
    expect(h.prev('draft')).toBe('cd projects');
    expect(h.prev('')).toBe('ls');
    expect(h.prev('')).toBe('ls');
    expect(h.next()).toBe('cd projects');
    expect(h.next()).toBe('draft');
  });

  it('skips blanks and consecutive duplicates', () => {
    const saved: string[][] = [];
    const h = new History({ load: () => [], save: (i) => saved.push([...i]) });
    h.push('ls');
    h.push('ls');
    h.push('  ');
    expect(saved).toEqual([['ls']]);
  });
});
