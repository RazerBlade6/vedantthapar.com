import { describe, expect, it } from 'vitest';
import { inline, markdownToLines } from './markdown';
import type { Line } from './types';

const text = (lines: Line[]) => lines.map((l) => l.map((s) => s.text).join('')).join('\n');

describe('inline', () => {
  it('handles bold, code, links and emphasis', () => {
    expect(inline('a **b** `c` [d](https://e.f) *g*')).toEqual([
      { text: 'a ' },
      { text: 'b', tone: 'strong' },
      { text: ' ' },
      { text: 'c', tone: 'strong' },
      { text: ' ' },
      { text: 'd', href: 'https://e.f' },
      { text: ' ' },
      { text: 'g' },
    ]);
  });

  it('drops code markers nested inside bold', () => {
    expect(inline('**A `Warehouse` interface.** rest')[0]).toEqual({ text: 'A Warehouse interface.', tone: 'strong' });
  });
});

describe('markdownToLines', () => {
  const mdx = [
    "import Demo from '../../components/Demo.astro';",
    '',
    '<Demo kind="gif" caption="it works" />',
    '',
    '## The problem',
    'Some **bold** text.',
    '',
    '',
    '{/* DRAFT — a comment',
    'over two lines */}',
    '- one',
    '- two',
    '```text',
    'box  │  ',
    '',
    '└─┘',
    '```',
    '',
  ].join('\n');

  const lines = markdownToLines(mdx);

  it('renders the document the way a buffer would show it', () => {
    expect(text(lines)).toBe(['[demo: it works]', '', '## The problem', 'Some bold text.', '', '- one', '- two', 'box  │', '', '└─┘'].join('\n'));
  });

  it('keeps headings marked and code verbatim', () => {
    expect(lines[2]).toEqual([{ text: '## The problem', tone: 'accent' }]);
    expect(lines).toContainEqual([{ text: '└─┘' }]);
  });
});
