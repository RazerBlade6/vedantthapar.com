// Turns a source photo into the site's retro renditions. Run locally, commit the outputs:
//
//   node scripts/process-photo.mjs path/to/photo.png
//
// The source photo itself stays out of the repo. Outputs:
//   public/photo/dither-light.png  1-bit mask of the dark pixels  (ink on light themes)
//   public/photo/dither-dark.png   1-bit mask of the light pixels (ink on dark themes)
//   public/favicon.svg, public/apple-touch-icon.png   pixel-art face
//   src/terminal/ascii-photo.json  ASCII art for `cat about.txt` in the buffer, one per scheme
//
// Crops are tuned to the current photo; adjust PHOTO_CROP / FACE_CROP when it changes.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/process-photo.mjs <photo>');

const PHOTO_CROP = { left: 170, top: 0, width: 540, height: 540 }; // head and shoulders
const FACE_CROP = { left: 345, top: 85, width: 230, height: 230 };
const PHOTO_SIZE = 120; // dither resolution: chunky pixels at the 240px display size
const MASK_SCALE = 4; // CSS masks are smoothed when scaled, so pre-scale with nearest-neighbour for crisp pixels
const FAVICON_SIZE = 32;
const ASCII = { cols: 56, rows: 28 };
const BG_THRESHOLD = 150; // after normalising; low enough to catch the shadowed wall corner, the face is enclosed by hair and beard // characters are ~2:1, so a square crop needs half the rows

async function gray(crop, width, height = width) {
  const { data } = await sharp(src).extract(crop).resize(width, height).grayscale().normalise().raw().toBuffer({ resolveWithObject: true });
  return Float32Array.from(data);
}

/**
 * The plain wall behind the subject: bright pixels connected to the top/sides (flood fill), so a light
 * shirt inside the silhouette isn't mistaken for background. Returns 1 for background pixels.
 */
function background(px, w, h, threshold = BG_THRESHOLD) {
  const bg = new Uint8Array(w * h);
  const stack = [];
  // seed from the top and sides only: the subject runs off the bottom of the frame
  for (let x = 0; x < w; x++) stack.push(x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (bg[i] || px[i] < threshold) continue;
    bg[i] = 1;
    const x = i % w, y = (i - x) / w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  return bg;
}

/** Atkinson dithering (classic Mac): crisp, high-contrast 1-bit. Returns 1 for light pixels. */
function atkinson(px, w, h) {
  const bits = new Uint8Array(w * h);
  const spread = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const on = px[i] >= 128;
      bits[i] = on ? 1 : 0;
      const err = (px[i] - (on ? 255 : 0)) / 8;
      for (const [dx, dy] of spread) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < w && yy < h) px[yy * w + xx] += err;
      }
    }
  }
  return bits;
}

function maskPng(bits, bg, size, want) {
  const rgba = Buffer.alloc(size * size * 4);
  bits.forEach((b, i) => (rgba[i * 4 + 3] = b === want && !bg[i] ? 255 : 0));
  return sharp(rgba, { raw: { width: size, height: size, channels: 4 } })
    .resize(size * MASK_SCALE, size * MASK_SCALE, { kernel: 'nearest' })
    .png({ palette: true, colours: 2 })
    .toBuffer();
}

// --- dithered photo masks ---
mkdirSync('public/photo', { recursive: true });
const photoPx = await gray(PHOTO_CROP, PHOTO_SIZE);
const photoBg = background(photoPx, PHOTO_SIZE, PHOTO_SIZE);
const photo = atkinson(photoPx.slice(), PHOTO_SIZE, PHOTO_SIZE);
writeFileSync('public/photo/dither-dark.png', await maskPng(photo, photoBg, PHOTO_SIZE, 1));
writeFileSync('public/photo/dither-light.png', await maskPng(photo, photoBg, PHOTO_SIZE, 0));

// --- favicon: the face as 3-tone pixel art on gruvbox yellow (dithering is just noise at 32px) ---
const facePx = await gray(FACE_CROP, FAVICON_SIZE);
const faceBg = background(facePx, FAVICON_SIZE, FAVICON_SIZE, 200);
const TONES = [
  { min: 150, fill: '#ebdbb2' },
  { min: 80, fill: '#a89984' },
  { min: -Infinity, fill: '#282828' },
];
const paths = TONES.map(() => '');
facePx.forEach((v, i) => {
  if (faceBg[i]) return;
  const t = TONES.findIndex((tone) => v >= tone.min);
  paths[t] += `M${i % FAVICON_SIZE} ${Math.floor(i / FAVICON_SIZE)}h1v1h-1z`;
});
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FAVICON_SIZE} ${FAVICON_SIZE}" shape-rendering="crispEdges">` +
  `<rect width="${FAVICON_SIZE}" height="${FAVICON_SIZE}" fill="#fabd2f"/>` +
  TONES.map((tone, t) => `<path fill="${tone.fill}" d="${paths[t]}"/>`).join('') +
  '</svg>\n';
writeFileSync('public/favicon.svg', svg);
writeFileSync('public/apple-touch-icon.png', await sharp(Buffer.from(svg)).resize(180, 180, { kernel: 'nearest' }).png().toBuffer());

// --- ASCII art ---
const RAMP = ' .:-=+*#%@';
const lum = await gray(PHOTO_CROP, ASCII.cols, ASCII.rows);
const lumBg = background(lum, ASCII.cols, ASCII.rows);
const art = (dense) => {
  const lines = [];
  for (let y = 0; y < ASCII.rows; y++) {
    let line = '';
    for (let x = 0; x < ASCII.cols; x++) {
      const i = y * ASCII.cols + x;
      if (lumBg[i]) {
        line += ' ';
        continue;
      }
      const l = Math.min(255, Math.max(0, lum[i]));
      line += RAMP[Math.min(RAMP.length - 1, Math.floor(((dense === 'light' ? l : 255 - l) / 256) * RAMP.length))];
    }
    lines.push(line.trimEnd());
  }
  return lines.join('\n');
};
// on a dark background bright pixels should be dense characters, and the reverse on light
writeFileSync('src/terminal/ascii-photo.json', JSON.stringify({ dark: art('light'), light: art('dark') }, null, 2) + '\n');

console.log('wrote public/photo/*, public/favicon.svg, public/apple-touch-icon.png, src/terminal/ascii-photo.json');
