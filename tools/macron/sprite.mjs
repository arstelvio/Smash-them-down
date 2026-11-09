// Builds img/macron.webp and img/macron-hit.webp from the cut-out portrait.
import fs from 'fs';
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [cut, outDir] = process.argv.slice(2);
const W = 400, H = 480, k = 0.84, ox = (W - 378 * k) / 2, oy = 2;
const P = (x, y) => [x * k + ox, y * k + oy];
const data = 'data:image/png;base64,' + fs.readFileSync(cut).toString('base64');
const OL = '#2e1c10';
const xEye = ([cx, cy], r) => `
  <ellipse cx="${cx}" cy="${cy + 1}" rx="${r * 1.25}" ry="${r * 0.9}" fill="#d6a07c" filter="url(#soft)"/>
  <path d="M${cx - r} ${cy - r * 0.85} L${cx + r} ${cy + r * 0.85} M${cx + r} ${cy - r * 0.85} L${cx - r} ${cy + r * 0.85}" stroke="#fff" stroke-width="11" stroke-linecap="round"/>
  <path d="M${cx - r} ${cy - r * 0.85} L${cx + r} ${cy + r * 0.85} M${cx + r} ${cy - r * 0.85} L${cx - r} ${cy + r * 0.85}" stroke="${OL}" stroke-width="6.5" stroke-linecap="round"/>`;
const [bx, by] = P(205, 62);
const overlay = `
  <defs><filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <radialGradient id="bump" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#ff9a8a"/><stop offset="1" stop-color="#e4483c"/></radialGradient></defs>
  ${xEye(P(147, 234), 15)}
  ${xEye(P(224, 232), 15)}
  <ellipse cx="${bx}" cy="${by}" rx="25" ry="21" fill="url(#bump)" stroke="${OL}" stroke-width="3.5"/>
  <ellipse cx="${bx - 8}" cy="${by - 7}" rx="8" ry="5" fill="#ffd2c8"/>`;
const page = (extra) => `<html><body style="margin:0;background:transparent">
  <div style="position:relative;width:${W}px;height:${H}px">
    <img src="${data}" style="position:absolute;left:${ox}px;top:${oy}px;width:${378 * k}px;height:${529 * k}px">
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0">${extra}</svg>
  </div></body></html>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const [name, extra] of [['macron', ''], ['macron-hit', overlay]]) {
  await p.setContent(page(extra)); await p.waitForTimeout(100);
  await p.screenshot({ path: `${outDir}/${name}.png`, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
}
await b.close();
