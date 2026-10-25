import { partOn } from './effects';

// The occasional CRT tear: a thin band of the screen jumps sideways and slides down for half a
// second. Drawn by the #crt-glitch SVG filter (Terminal.astro) on the content, or on the buffer
// when it's open: one band of the element is offset, the rest stays put.

const DURATION = 480;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

let running = false;

export function glitch() {
  const filter = document.getElementById('crt-glitch');
  const target =
    document.querySelector<HTMLElement>('[data-buffer]:not([hidden])') ?? document.querySelector<HTMLElement>('main');
  if (!filter || !target || running || reducedMotion()) return;

  const bands = filter.querySelectorAll('[data-band]');
  const offset = filter.querySelector('feOffset')!;
  const height = Math.round(rand(6, 22));
  const startY = rand(0.05, 0.4) * innerHeight;
  const endY = startY + rand(0.3, 0.55) * innerHeight;
  const shift = rand(8, 26) * (Math.random() < 0.5 ? -1 : 1);

  running = true;
  target.style.filter = 'url(#crt-glitch)';
  const start = performance.now();

  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / DURATION);
    // band position in the target's own coordinates (filters measure from the element's box)
    const y = startY + (endY - startY) * t - target.getBoundingClientRect().top;
    bands.forEach((b) => {
      b.setAttribute('y', String(y));
      b.setAttribute('height', String(height));
    });
    // jitter the tear a little as it falls
    offset.setAttribute('dx', String(shift * (0.6 + Math.random() * 0.4)));
    if (t < 1) requestAnimationFrame(frame);
    else {
      target.style.filter = '';
      running = false;
    }
  };
  requestAnimationFrame(frame);
}

/** Every 20–60 s, while the page is visible and the glitch effect is on. */
export function scheduleGlitches() {
  const next = () =>
    setTimeout(() => {
      if (document.visibilityState === 'visible' && partOn('glitch')) glitch();
      next();
    }, rand(20_000, 60_000));
  next();
}
