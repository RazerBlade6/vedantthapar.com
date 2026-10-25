import { THEMES, type Theme } from '../../site';

export const currentTheme = () => (document.documentElement.dataset.theme ?? 'gruvbox') as Theme;

/** Set and remember a theme; listeners (status line label) update via the `themechange` event. */
export function setTheme(name: Theme) {
  document.documentElement.dataset.theme = name;
  try {
    localStorage.setItem('theme', name);
  } catch {}
  document.dispatchEvent(new CustomEvent('themechange', { detail: name }));
}

export function cycleTheme() {
  setTheme(THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length]);
}
