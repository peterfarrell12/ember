// Draws every brand image from the Ember mark (an open ring with an ember at its end, chosen by the owner),
// the app's colours and its display typeface:
//   web/public/   what the site itself uses: icons, start-up screens for iPhone, the link-preview image
//   brand/        the same mark for use elsewhere: logos with the name, and the 1024 px store icon
// Run again only if the mark, colours or name change:  node web/build/make-brand.mjs
// (needs Playwright, which the tests already use)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const web = fileURLToPath(new URL('..', import.meta.url));
const pub = path.join(web, 'public');
const brand = path.join(web, '..', 'brand');
const font = path.join(
  web,
  'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2',
);

const GREEN = '#0f3d2e', // the app's dark green
  EMBER = '#e4511b', // the ember on a light ground
  EMBER_BRIGHT = '#ff6b36', // the ember on the green, where the darker shade would sink
  PAPER = '#ecefea', // the app's light background
  INK = '#12211b';

/** The mark: an open ring with an ember at its end, in a square of `box` px. Drawn in a 24-unit box. */
const mark = (box, ring, ember, x = 0, y = 0) =>
  `<g transform="translate(${x} ${y}) scale(${box / 24})"><path d="M12 4.2a7.8 7.8 0 1 0 7.8 7.8" fill="none" stroke="${ring}" stroke-width="3.4" stroke-linecap="round"/><circle cx="18.1" cy="5.9" r="2.5" fill="${ember}"/></g>`;
/** A square icon: green ground, white ring, bright ember. `fill` is how much of the square the mark takes. */
const iconSvg = (size, { fill = 0.6, radius = 0 } = {}) => {
  const box = size * fill,
    off = (size - box) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius * size}" fill="${GREEN}"/>${mark(box, '#fff', EMBER_BRIGHT, off, off)}</svg>`;
};
/** The mark beside the name, as the app's header shows it. */
const logoHtml = (ground, ember, ink, height) => `
  <div style="display:inline-flex;align-items:center;gap:${height * 0.16}px;padding:${height * 0.3}px ${height * 0.4}px;background:${ground}">
    <svg width="${height * 0.78}" height="${height * 0.78}" viewBox="2.2 2.2 19.6 19.6">${mark(24, ink, ember)}</svg>
    <span style="font:800 ${height * 0.86}px/1 'Bricolage Grotesque';letter-spacing:-0.02em;color:${ink}">Ember</span>
  </div>`;

const b = await chromium.launch();
const pg = await b.newPage({ deviceScaleFactor: 1 });
// a page on disk, so it may load the typeface from node_modules
const shell = path.join(web, '.cache', 'brand.html');
fs.writeFileSync(
  shell,
  `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:'Bricolage Grotesque';font-weight:600 800;src:url('file://${font}') format('woff2')}html,body{margin:0;background:transparent}</style><body></body>`,
);
await pg.goto('file://' + shell);
const draw = async (file, width, height, html, { transparent = false } = {}) => {
  await pg.setViewportSize({ width, height });
  await pg.evaluate(h => (document.body.innerHTML = h), html);
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
};
const drawFit = async (file, html, opts) => {
  await pg.setViewportSize({ width: 2400, height: 1200 });
  await pg.evaluate(h => (document.body.innerHTML = h), html);
  await pg.evaluate(() => document.fonts.ready);
  const box = await pg.evaluate(() => {
    const r = document.body.firstElementChild.getBoundingClientRect();
    return { x: 0, y: 0, width: Math.ceil(r.width), height: Math.ceil(r.height) };
  });
  await pg.screenshot({ path: file, omitBackground: !!(opts && opts.transparent), clip: box });
};

// --- the site's own icons ---
await draw(path.join(pub, 'icon-192.png'), 192, 192, iconSvg(192, { radius: 0.22 }), { transparent: true });
await draw(path.join(pub, 'icon-512.png'), 512, 512, iconSvg(512, { radius: 0.22 }), { transparent: true });
await draw(path.join(pub, 'icon-maskable-512.png'), 512, 512, iconSvg(512, { fill: 0.46 })); // phones crop these to a circle
await draw(path.join(pub, 'apple-touch-icon.png'), 180, 180, iconSvg(180)); // iOS rounds the corners itself
fs.writeFileSync(path.join(pub, 'icon.svg'), iconSvg(64, { radius: 0.22 }));

// --- iPhone start-up screens (shown while the installed app opens): the mark, centred, on the green ---
const PHONES = [
  [750, 1334, 2], // SE, 8
  [828, 1792, 2], // XR, 11
  [1125, 2436, 3], // X, XS, 11 Pro
  [1170, 2532, 3], // 12, 13, 14
  [1179, 2556, 3], // 14 Pro, 15, 16
  [1284, 2778, 3], // 12/13 Pro Max, 14 Plus
  [1290, 2796, 3], // 14 Pro Max, 15/16 Plus
];
for (const [w, h] of PHONES) {
  const m = Math.round(w * 0.3);
  await draw(
    path.join(pub, `splash-${w}x${h}.png`),
    w,
    h,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${GREEN}"/>${mark(m, '#fff', EMBER_BRIGHT, (w - m) / 2, (h - m) / 2)}</svg>`,
  );
}
fs.writeFileSync(
  path.join(web, '.cache', 'splash-links.html'),
  PHONES.map(
    ([w, h, r]) =>
      `    <link rel="apple-touch-startup-image" href="./splash-${w}x${h}.png" media="(device-width: ${w / r}px) and (device-height: ${h / r}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" />`,
  ).join('\n') + '\n',
);

// --- the picture shown when a link to Ember is shared ---
await draw(
  path.join(pub, 'share.png'),
  1200,
  630,
  `<div style="width:1200px;height:630px;background:${GREEN};display:flex;flex-direction:column;justify-content:center;padding:0 96px;box-sizing:border-box">
     <div style="display:flex;align-items:center;gap:26px"><svg width="112" height="112" viewBox="2.2 2.2 19.6 19.6">${mark(24, '#fff', EMBER_BRIGHT)}</svg><span style="font:800 120px/1 'Bricolage Grotesque';letter-spacing:-0.02em;color:#fff">Ember</span></div>
     <div style="font:600 44px/1.25 'Bricolage Grotesque';color:#cfe0d8;margin-top:36px;max-width:900px">Calories, training and recovery in one place.</div>
   </div>`,
);

// --- for use elsewhere ---
fs.mkdirSync(brand, { recursive: true });
await draw(path.join(brand, 'app-icon-1024.png'), 1024, 1024, iconSvg(1024)); // square, no transparency: what the app stores ask for
fs.writeFileSync(
  path.join(brand, 'mark.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${mark(24, INK, EMBER)}</svg>`,
);
fs.writeFileSync(path.join(brand, 'app-icon.svg'), iconSvg(1024, { radius: 0.22 }));
await drawFit(path.join(brand, 'logo-on-light.png'), logoHtml(PAPER, EMBER, INK, 240));
await drawFit(path.join(brand, 'logo-on-green.png'), logoHtml(GREEN, EMBER_BRIGHT, '#ffffff', 240));
await drawFit(path.join(brand, 'logo-transparent-dark-text.png'), logoHtml('transparent', EMBER, INK, 240), {
  transparent: true,
});
await drawFit(
  path.join(brand, 'logo-transparent-light-text.png'),
  logoHtml('transparent', EMBER_BRIGHT, '#ffffff', 240),
  { transparent: true },
);
await b.close();
console.log('brand images written to', pub, 'and', brand);
