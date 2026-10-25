import { EFFECT_PARTS, type EffectPart } from '../engine';

// CRT effects state lives on <html>: data-effects="on|off" is the master switch and
// data-fx-off lists parts switched off ("roll glitch"). Base.astro sets both before paint.

const html = () => document.documentElement;

export const effectsOn = () => html().dataset.effects === 'on';

export const partsOff = (): EffectPart[] =>
  (html().dataset.fxOff ?? '').split(' ').filter((p): p is EffectPart => (EFFECT_PARTS as readonly string[]).includes(p));

/** Is a part actually running (master on, part not switched off)? */
export const partOn = (part: EffectPart) => effectsOn() && !partsOff().includes(part);

const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

const changed = () => document.dispatchEvent(new CustomEvent('effectschange'));

/** Master switch. */
export function setEffects(on: boolean) {
  html().dataset.effects = on ? 'on' : 'off';
  store('effects', on ? 'on' : 'off');
  changed();
}

/** One part on or off, independent of the master switch. */
export function setPart(part: EffectPart, on: boolean) {
  const off = new Set(partsOff());
  if (on) off.delete(part);
  else off.add(part);
  html().dataset.fxOff = [...off].join(' ');
  store('effects-off', html().dataset.fxOff!);
  changed();
}
