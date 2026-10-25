import type { Line, Seg } from './types';

/**
 * Inline markdown → segments: **bold**, *em*, `code`, [text](url).
 * Emphasis markers are dropped; bold and code are shown strong, links stay clickable.
 */
export function inline(text: string): Seg[] {
  const segs: Seg[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*(.+?)\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) segs.push({ text: m[1].replace(/`/g, ''), tone: 'strong' }); // **bold `code`**
    else if (m[2] !== undefined) segs.push({ text: m[2], tone: 'strong' });
    else if (m[3] !== undefined) segs.push({ text: m[3].replace(/[*`]/g, ''), href: m[4] }); // [*emphasised*](url)
    else segs.push({ text: m[5] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ text: text.slice(last) });
  return segs;
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

/**
 * A markdown/MDX document as terminal lines, the way it'd look in a vim buffer: headings keep
 * their #s, code blocks are verbatim, MDX imports/comments vanish, and components become a note.
 */
export function markdownToLines(md: string): Line[] {
  const out: Line[] = [];
  let fence = false;
  let blank = true; // collapse runs of blank lines (and drop leading ones)

  const push = (line: Line) => {
    const isBlank = line.length === 0;
    if (isBlank && blank) return;
    out.push(line);
    blank = isBlank;
  };

  const source = md.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''); // MDX comments, possibly multi-line
  for (const raw of source.split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) {
      fence = !fence;
      continue;
    }
    if (fence) {
      out.push([{ text: line }]);
      blank = false;
      continue;
    }
    if (/^import\s.+from\s/.test(line)) continue;
    if (/^<[A-Z]/.test(line)) {
      const caption = attr(line, 'caption');
      if (caption) push([{ text: `[demo: ${caption}]`, tone: 'muted' }]);
      continue;
    }
    if (!line.trim()) {
      push([]);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      if (!blank) push([]);
      push([{ text: `${heading[1]} ${heading[2]}`, tone: 'accent' }]);
      continue;
    }
    const item = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (item) {
      push([{ text: `${item[1]}- `, tone: 'muted' }, ...inline(item[2])]);
      continue;
    }
    push(inline(line));
  }
  while (out.length && out.at(-1)!.length === 0) out.pop();
  return out;
}
