export interface Store {
  load(): string[];
  save(items: string[]): void;
}

const LIMIT = 100;

/** Shell-style history: ↑/↓ walk entries, and the line being typed is kept as the newest slot. */
export class History {
  private items: string[];
  private index: number;
  private draft = '';

  constructor(private store?: Store) {
    this.items = store?.load() ?? [];
    this.index = this.items.length;
  }

  push(line: string) {
    const trimmed = line.trim();
    if (trimmed && this.items.at(-1) !== trimmed) {
      this.items.push(trimmed);
      if (this.items.length > LIMIT) this.items.shift();
      this.store?.save(this.items);
    }
    this.index = this.items.length;
    this.draft = '';
  }

  prev(current: string): string {
    if (this.index === this.items.length) this.draft = current;
    if (this.index > 0) this.index--;
    return this.items[this.index] ?? current;
  }

  next(): string {
    if (this.index < this.items.length) this.index++;
    return this.index === this.items.length ? this.draft : this.items[this.index];
  }
}
