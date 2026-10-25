export const effectsOn = () => document.documentElement.dataset.effects === 'on';

/** Turn the CRT effects on/off and remember it; listeners (status line) update via `effectschange`. */
export function setEffects(on: boolean) {
  document.documentElement.dataset.effects = on ? 'on' : 'off';
  try {
    localStorage.setItem('effects', on ? 'on' : 'off');
  } catch {}
  document.dispatchEvent(new CustomEvent('effectschange', { detail: on }));
}
