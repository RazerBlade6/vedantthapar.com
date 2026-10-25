/** A run of styled text in terminal output. `href` makes it a link; `cmd` makes it run a command when clicked. */
export interface Seg {
  text: string;
  href?: string;
  cmd?: string;
  tone?: 'muted' | 'accent' | 'error' | 'strong';
}

export type Line = Seg[];

/** Side effects a command asks the UI to perform. The engine itself never touches the DOM. */
export type Action =
  | { type: 'navigate'; url: string }
  | { type: 'theme'; name: string }
  | { type: 'copy'; text: string }
  | { type: 'clear' }
  | { type: 'close' };

export interface VNode {
  name: string;
  kind: 'dir' | 'file';
  url?: string;
  description?: string;
  binary?: boolean;
  children?: VNode[];
}

export interface Env {
  root: VNode;
  /** Absolute path, "/" is home (~) */
  cwd: string;
  theme: string;
  themes: readonly string[];
  email: string;
  github: string;
  resume?: string;
}

export interface Result {
  lines: Line[];
  actions?: Action[];
  cwd?: string;
}
