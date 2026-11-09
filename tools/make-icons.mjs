// Generates the PNG app icons from the game's own SVG artwork.
// Usage (needs Node 18+ and Playwright with Chromium):  node tools/make-icons.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artSrc = fs.readFileSync(path.join(root, 'js/art.js'), 'utf8');
const art = await import('data:text/javascript,' + encodeURIComponent(artSrc));

const OL = '#2e1c10';

// The icon shows Macron (picture-based character), knocked out.
const macronHit = 'data:image/webp;base64,' + fs.readFileSync(path.join(root, art.IMAGE_CHARACTERS.macron.hit)).toString('base64');
const placeImage = (href, x, y, w) => `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${w * 1.2}"/>`;

// Places a 200x240 character SVG inside the icon.
const place = (svgStr, x, y, w) =>
  svgStr.replace(/<svg [^>]*>/, `<svg x="${x}" y="${y}" width="${w}" height="${w * 1.2}" viewBox="0 0 200 240">`);

const star = (cx, cy, r, rot = 0) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="#ffe14d" stroke="${OL}" stroke-width="6" stroke-linejoin="round"/>`;
};

function background() {
  return `
    <defs>
      <radialGradient id="bg" cx="50%" cy="30%" r="80%">
        <stop offset="0" stop-color="#95e065"/><stop offset="1" stop-color="#3c8a2c"/>
      </radialGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg)"/>
    <g fill="#ffffff" opacity="0.08">
      <rect y="64" width="512" height="64"/><rect y="192" width="512" height="64"/><rect y="320" width="512" height="64"/><rect y="448" width="512" height="64"/>
    </g>`;
}

function scene() {
  const hole = { cx: 256, cy: 404, rx: 160, ry: 48 };
  const hammer = art.hammerSVG.replace(/<svg [^>]*>/, '<svg x="0" y="0" width="152" height="100" viewBox="0 0 152 100">');
  return `
    <defs>
      <linearGradient id="mound" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c08550"/><stop offset="1" stop-color="#7a4a24"/>
      </linearGradient>
      <linearGradient id="lip" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#b77b44"/><stop offset="1" stop-color="#6f4220"/>
      </linearGradient>
      <clipPath id="above">
        <rect x="${hole.cx - hole.rx}" y="0" width="${hole.rx * 2}" height="${hole.cy}"/>
        <ellipse cx="${hole.cx}" cy="${hole.cy}" rx="${hole.rx}" ry="${hole.ry}"/>
      </clipPath>
    </defs>
    <ellipse cx="${hole.cx}" cy="${hole.cy + 10}" rx="${hole.rx * 1.24}" ry="${hole.ry * 1.62}" fill="url(#mound)" stroke="${OL}" stroke-width="8"/>
    <ellipse cx="${hole.cx}" cy="${hole.cy}" rx="${hole.rx}" ry="${hole.ry}" fill="#140a04" stroke="${OL}" stroke-width="6"/>
    <g clip-path="url(#above)">
      ${placeImage(macronHit, 96, 146, 320)}
    </g>
    <path d="M${hole.cx - hole.rx * 1.24} ${hole.cy + 10}
             A ${hole.rx * 1.24} ${hole.ry * 1.62} 0 0 0 ${hole.cx + hole.rx * 1.24} ${hole.cy + 10}
             L ${hole.cx + hole.rx} ${hole.cy}
             A ${hole.rx} ${hole.ry} 0 0 1 ${hole.cx - hole.rx} ${hole.cy} Z"
          fill="url(#lip)" stroke="${OL}" stroke-width="8" stroke-linejoin="round"/>
    ${star(118, 150, 34, 0.2)}
    ${star(402, 214, 26, 0.5)}
    ${star(150, 64, 20, 0.9)}
    <g transform="translate(248 18) rotate(18 0 0) scale(1.75)">${hammer}</g>
  `;
}

function iconSVG(size, { maskable = false } = {}) {
  const inner = scene();
  const k = maskable ? 0.8 : 1;
  const off = (512 * (1 - k)) / 2;
  const content = background() + (maskable ? `<g transform="translate(${off} ${off}) scale(${k})">${inner}</g>` : inner);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${content}</svg>`;
}

const outputs = [
  ['icons/icon-512.png', 512, {}],
  ['icons/icon-192.png', 192, {}],
  ['icons/apple-touch-icon.png', 180, {}],
  ['icons/favicon-32.png', 32, {}],
  ['icons/icon-maskable-512.png', 512, { maskable: true }],
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [file, size, opts] of outputs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${iconSVG(size, opts)}</body></html>`);
  await page.screenshot({ path: path.join(root, file), clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', file);
}
await browser.close();
