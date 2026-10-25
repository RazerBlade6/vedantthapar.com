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
        { name: 'apex.md', kind: 'file', url: '/projects/apex', src: '/term/projects/apex.md.json', description: 'TUI' },
        { name: 'r-lox.md', kind: 'file', url: '/projects/r-lox' },
        { name: 'archive', kind: 'dir', url: '/projects/archive', children: [{ name: 'novarv.md', kind: 'file', url: '/projects/archive#novarv' }] },
      ],
    },
  ],
};

const env = (over: Partial<Env> = {}): Env => ({
  root,
  mode: 'page',
  cwd: '/',
  theme: 'gruvbox',
  themes: ['gruvbox', 'paper', 'phosphor', 'mocha', 'latte'],
  effects: { on: true, off: [] },
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

  it('effects lists every part and its state', () => {
    const out = text(execute('effects', env({ effects: { on: true, off: ['glitch'] } })).lines);
    expect(out).toMatch(/scanlines\s+on/);
    expect(out).toMatch(/glitch\s+off/);
    expect(text(execute('effects', env({ effects: { on: false, off: [] } })).lines)).toMatch(/glow\s+off/);
  });

  it('effects on|off is the master switch', () => {
    expect(execute('effects OFF', env()).actions).toEqual([{ type: 'effects', on: false }]);
    expect(execute('effects on', env()).actions).toEqual([{ type: 'effects', on: true }]);
  });

  it('effects <part> switches one part, bare toggles it', () => {
    expect(execute('effects glitch off', env()).actions).toEqual([{ type: 'effects', on: false, part: 'glitch' }]);
    expect(execute('effects roll', env()).actions).toEqual([{ type: 'effects', on: false, part: 'roll' }]);
    expect(execute('effects roll', env({ effects: { on: true, off: ['roll'] } })).actions).toEqual([{ type: 'effects', on: true, part: 'roll' }]);
  });

  it('turning a part on while everything is off turns the master on too', () => {
    expect(execute('effects glow on', env({ effects: { on: false, off: [] } })).actions).toEqual([
      { type: 'effects', on: true },
      { type: 'effects', on: true, part: 'glow' },
    ]);
  });

  it('effects rejects nonsense', () => {
    expect(text(execute('effects sparkle', env()).lines)).toContain('expected on, off or one of');
    expect(text(execute('effects glow maybe', env()).lines)).toContain('expected on or off');
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

describe('buffer mode', () => {
  const buf = (over: Partial<Env> = {}) => env({ mode: 'buffer', ...over });

  it('term enters, and says so when already there', () => {
    expect(execute('term', env()).actions).toEqual([{ type: 'term', on: true }]);
    expect(text(execute('term', buf()).lines)).toContain('already here');
  });

  it('cat prints instead of navigating', () => {
    expect(execute('cat projects/apex', buf()).actions).toEqual([{ type: 'print', src: '/term/projects/apex.md.json' }]);
  });

  it('cd only changes directory', () => {
    const r = execute('cd projects', buf());
    expect(r.cwd).toBe('/projects');
    expect(r.actions).toBeUndefined();
  });

  it('ls entries cat files instead of linking', () => {
    const seg = execute('ls projects', buf()).lines[0][0];
    expect(seg).toEqual({ text: 'apex.md', cmd: 'cat ~/projects/apex.md' });
  });

  it('open and exit leave the buffer', () => {
    expect(execute('open apex', buf()).actions?.[0]).toEqual({ type: 'term', on: false });
    expect(execute('exit', buf()).actions).toEqual([{ type: 'term', on: false }]);
    expect(execute('exit', env()).actions).toEqual([{ type: 'close' }]);
  });
});

describe('easter eggs', () => {
  it('answer the classics', () => {
    expect(text(execute('sudo rm -rf /', env()).lines)).toContain('not in the sudoers file');
    expect(text(execute('rm -rf /', env()).lines)).toContain('load-bearing');
    expect(text(execute('whoami', env()).lines)).toContain('guest');
    expect(text(execute('echo hello world', env()).lines)).toBe('hello world');
    expect(text(execute('man ls', env()).lines)).toContain('ls [-l] [path]');
    expect(text(execute('neofetch', env({ theme: 'mocha' })).lines)).toMatch(/Theme:\s+mocha/);
  });

  it(':q quits like exit', () => {
    expect(execute('q', env()).actions).toEqual([{ type: 'close' }]);
    expect(execute(':wq', env({ mode: 'buffer' })).actions).toEqual([{ type: 'term', on: false }]);
  });

  it('stay hidden from help, completion and suggestions', () => {
    expect(text(execute('help', env()).lines)).not.toContain('sudo');
    expect(complete('sud', env()).options).toEqual([]);
    expect(complete('sud', env()).line).toBe('sud');
    expect(text(execute('neofech', env()).lines)).not.toContain('neofetch');
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
