// Draws the home-screen icons from the app's own flame mark and colours and writes them to public/.
// Run once, and again only if the mark or colours change:  node build/make-icons.mjs
// (needs Playwright, which the tests already use)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = fileURLToPath(new URL('../public/', import.meta.url));
const FLAME =
  'M12.6 2.2c.5 3.3 4.9 5.4 4.9 10.6a5.5 5.5 0 0 1-11 0c0-2.2.9-3.9 2.2-5.2.1 1.8.8 2.9 1.8 3.3.1-3.4.7-6.3 2.1-8.7z';
const HERO = '#0f3d2e', // the app's dark green
  EMBER = '#ff6b36'; // the flame, in its brighter shade so it holds against the green
// the mark's box is 80% of the square (the flame itself fills about half of that box); "maskable" icons leave more margin because phones crop them to a circle
const svg = (size, { mark = 0.8, radius = 0 } = {}) => {
  const s = (size * mark) / 24,
    off = (size - 24 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius * size}" fill="${HERO}"/><path transform="translate(${off} ${off}) scale(${s})" fill="${EMBER}" d="${FLAME}"/></svg>`;
};
const b = await chromium.launch();
const pg = await b.newPage();
const png = async (name, size, opts) => {
  await pg.setViewportSize({ width: size, height: size });
  await pg.setContent(`<body style="margin:0;background:transparent">${svg(size, opts)}</body>`);
  await pg.screenshot({ path: out + name, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
};
await png('icon-192.png', 192, { radius: 0.22 });
await png('icon-512.png', 512, { radius: 0.22 });
await png('icon-maskable-512.png', 512, { mark: 0.62 });
await png('apple-touch-icon.png', 180); // iOS rounds the corners itself
fs.writeFileSync(out + 'icon.svg', svg(64, { radius: 0.22 }));
await b.close();
console.log('icons written to', out);
