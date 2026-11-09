// Character artwork.
// Macron, Obama and de Funès are painted caricatures (img/, see
// IMAGE_CHARACTERS); the casseur and the taxpayer are drawn as inline SVG.
// Every character uses the same 200 x 240 frame: the head sits in the upper
// part and the shoulders at the bottom are what disappears into the hole.
// Expressions: 'idle', 'hit' and, for the two-hit casseur, 'hurt'.

const OL = '#2e1c10'; // outline colour
const SW = 3.5; // outline width

const svg = (inner, w = 200, h = 240) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;

/* ---------- shared face parts ---------- */

function eyesHit(y = 102, lx = 78, rx = 122) {
  const x = (cx) => `<path d="M${cx - 8} ${y - 7} L${cx + 8} ${y + 7} M${cx + 8} ${y - 7} L${cx - 8} ${y + 7}"/>`;
  return `<g stroke="${OL}" stroke-width="5" stroke-linecap="round" fill="none">${x(lx)}${x(rx)}</g>`;
}

const browsWorried = (color, y = 84, w = 5.5) =>
  `<path d="M64 ${y + 4} Q76 ${y - 2} 90 ${y - 6} M110 ${y - 6} Q124 ${y - 2} 136 ${y + 4}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;

/* ---------- The black bloc rioter ("casseur") ---------- */

function casseur(expr) {
  const skin = '#d8a37b', cloth = '#1e1e23', cap = '#131316', mask = '#25252b', fold = '#3d3d47', brow = '#2a1d15';
  const hit = expr === 'hit', hurt = expr === 'hurt';
  // raised black-gloved fist holding a paving stone (dropped once knocked out)
  const stone = hit ? '' : `
    <path d="M152 206 C161 178 166 150 163 124 L187 121 C192 150 187 184 174 210 Z" fill="${cloth}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M152 76 L186 76 L195 65 L161 65 Z" fill="#cdc9c1" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M186 76 L195 65 L195 93 L186 104 Z" fill="#817d76" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="152" y="76" width="34" height="28" fill="#a7a39b" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M158 86 L167 84 M172 95 L181 93" stroke="#8c887f" stroke-width="2" stroke-linecap="round"/>
    <rect x="157" y="96" width="32" height="30" rx="11" fill="#2b2b31" stroke="${OL}" stroke-width="${SW}"/>
    <path d="M163 105 L183 105 M163 113 L183 113" stroke="#4a4a54" stroke-width="2.2" stroke-linecap="round"/>`;
  // after the first hit: two crossed plasters stuck on the cap
  const plaster = (rot) => `<g transform="rotate(${rot} 122 46)">
      <rect x="104" y="40" width="36" height="12" rx="6" fill="#f2c38f" stroke="${OL}" stroke-width="2"/>
      <rect x="117" y="40" width="10" height="12" fill="#e7ad73"/></g>`;
  const bandAid = plaster(35) + plaster(-35);
  let eyes, brows;
  if (hit) {
    eyes = eyesHit(109, 80, 120);
    brows = browsWorried(brow, 102, 6);
  } else {
    eyes = `
      <ellipse cx="80" cy="109" rx="10.5" ry="7.5" fill="#fff" stroke="${OL}" stroke-width="2.3"/>
      <ellipse cx="120" cy="109" rx="10.5" ry="7.5" fill="#fff" stroke="${OL}" stroke-width="2.3"/>
      <circle cx="82" cy="110" r="4.8" fill="#4a3020"/><circle cx="118" cy="110" r="4.8" fill="#4a3020"/>
      <circle cx="82" cy="110" r="2.3" fill="#0d0d0d"/><circle cx="118" cy="110" r="2.3" fill="#0d0d0d"/>
      <circle cx="83.6" cy="108.2" r="1.5" fill="#fff"/><circle cx="119.6" cy="108.2" r="1.5" fill="#fff"/>`;
    brows = hurt
      ? `<path d="M65 96 L91 105 M109 105 L135 96" stroke="${brow}" stroke-width="6.5" fill="none" stroke-linecap="round"/>`
      : `<path d="M66 98 L91 103 M109 103 L134 98" stroke="${brow}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  }
  const capTilt = hit ? 'translate(-4 -14) rotate(-12 100 64)' : hurt ? 'translate(0 -8) rotate(6 100 64)' : 'translate(0 -8)';
  return svg(`
    <path d="M8 242 C10 204 34 186 68 178 L132 178 C166 186 190 204 192 242 Z" fill="${cloth}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M60 196 C72 206 128 206 140 196" fill="none" stroke="#33333b" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M100 18 C56 18 33 56 33 102 C33 142 47 170 66 188 L134 188 C153 170 167 142 167 102 C167 56 144 18 100 18 Z" fill="${cloth}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M90 186 L87 222 M110 186 L113 222" stroke="#d9d9de" stroke-width="3" stroke-linecap="round"/>
    <rect x="84.5" y="220" width="5" height="8" rx="1.5" fill="#9a9aa3"/><rect x="110.5" y="220" width="5" height="8" rx="1.5" fill="#9a9aa3"/>
    <ellipse cx="100" cy="114" rx="50" ry="60" fill="#0d0d10"/>
    <ellipse cx="100" cy="114" rx="44" ry="55" fill="${skin}"/>
    <path d="M57 90 C70 86 130 86 143 90 L144 98 C130 94 70 94 56 98 Z" fill="#000" opacity="0.22"/>
    ${brows}
    ${eyes}
    <path d="M55 120 C72 128 128 128 145 120 C149 154 132 170 100 172 C68 170 51 154 55 120 Z" fill="${mask}" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M92 127 C95 136 105 136 108 127" fill="none" stroke="${fold}" stroke-width="3" stroke-linecap="round"/>
    <path d="M64 142 C80 150 120 150 136 142 M72 157 C86 163 114 163 128 157" fill="none" stroke="${fold}" stroke-width="2.2" stroke-linecap="round"/>
    ${hit ? `<ellipse cx="100" cy="150" rx="10" ry="11" fill="#121216" stroke="${fold}" stroke-width="2.5"/>` : ''}
    <g transform="${capTilt}">
      <path d="M54 88 C52 51 74 28 100 28 C126 28 148 51 146 88 Z" fill="${cap}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M100 30 L100 84 M77 37 C70 52 68 70 70 86 M123 37 C130 52 132 70 130 86" fill="none" stroke="#2d2d35" stroke-width="2" stroke-linecap="round"/>
      <circle cx="100" cy="29" r="4" fill="${cap}" stroke="${OL}" stroke-width="2"/>
      <g transform="translate(100 60)">
        <circle r="11" fill="none" stroke="#f1f1f1" stroke-width="2.6"/>
        <path d="M-8.5 10 L0 -13 L8.5 10 M-11.5 3 L11.5 3" fill="none" stroke="#e53935" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <path d="M43 88 C66 76 134 76 157 88 C151 98 130 101 100 101 C70 101 49 98 43 88 Z" fill="#0b0b0d" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path d="M56 90 C76 84 124 84 144 90" fill="none" stroke="#26262c" stroke-width="2" stroke-linecap="round"/>
      ${hurt ? bandAid : ''}
    </g>
    ${stone}
  `);
}

/* ---------- The innocent taxpayer mole (do not hit!) ---------- */

function taxpayer(expr) {
  const fur = '#7b5a42', furDark = '#5e4331', belly = '#cfa883';
  const hit = expr === 'hit';
  const eyes = hit
    ? `<g stroke="${OL}" stroke-width="4.5" stroke-linecap="round" fill="none">
         <path d="M74 108 L88 120 M88 108 L74 120 M112 108 L126 120 M126 108 L112 120"/></g>
       <path d="M76 124 Q72 136 76 142 Q80 136 76 124 Z M124 124 Q120 136 124 142 Q128 136 124 124 Z" fill="#6cc4ff" stroke="#3b8fd0" stroke-width="1.2"/>`
    : `<circle cx="81" cy="114" r="6.5" fill="#141414"/><circle cx="119" cy="114" r="6.5" fill="#141414"/>
       <circle cx="83" cy="111.5" r="2.2" fill="#fff"/><circle cx="121" cy="111.5" r="2.2" fill="#fff"/>`;
  return svg(`
    <path d="M24 242 C20 160 46 66 100 62 C154 66 180 160 176 242 Z" fill="${fur}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
    <ellipse cx="100" cy="206" rx="52" ry="44" fill="${belly}"/>
    <path d="M46 96 C50 66 74 50 100 50 C126 50 150 66 154 96 C140 87 120 83 100 83 C80 83 60 87 46 96 Z" fill="#6c7480" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 97 C64 84 136 84 160 97 C154 106 140 106 100 103 C60 106 46 106 40 97 Z" fill="#555c66" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="100" cy="52" r="4.5" fill="#555c66" stroke="${OL}" stroke-width="2"/>
    ${eyes}
    <path d="M60 130 Q74 126 84 132 M58 142 Q72 140 84 138 M140 130 Q126 126 116 132 M142 142 Q128 140 116 138" fill="none" stroke="${furDark}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="100" cy="134" rx="17" ry="12.5" fill="#f59cb0" stroke="${OL}" stroke-width="3"/>
    <ellipse cx="95" cy="130" rx="5" ry="3" fill="#ffd3dd"/>
    ${hit
      ? `<ellipse cx="100" cy="158" rx="9" ry="8" fill="#5a1717" stroke="${OL}" stroke-width="2.5"/>`
      : `<path d="M92 147 L92 157 Q96 159 100 157 L100 147 M100 147 L100 157 Q104 159 108 157 L108 147" fill="#fff" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
         <path d="M86 146 Q100 152 114 146" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linecap="round"/>`}
    <g transform="rotate(-3 100 196)">
      <rect x="36" y="178" width="128" height="34" rx="6" fill="#fffdf4" stroke="${OL}" stroke-width="3"/>
      <text x="100" y="201.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="17" fill="#c62828">TAXPAYER</text>
    </g>
    <ellipse cx="36" cy="199" rx="10" ry="8" fill="#f2b3a1" stroke="${OL}" stroke-width="2.5"/>
    <ellipse cx="164" cy="193" rx="10" ry="8" fill="#f2b3a1" stroke="${OL}" stroke-width="2.5"/>
  `);
}

/* ---------- props ---------- */

// Mole paw with claws, resting on the rim of the hole. 48 x 34.
export const pawSVG = svg(`
  <ellipse cx="24" cy="13" rx="19" ry="11" fill="#f0b19e" stroke="${OL}" stroke-width="3"/>
  <path d="M12 20 L9 32 L17 22 Z M21 22 L21 34 L27 22 Z M31 22 L35 32 L36 20 Z" fill="#fff6e6" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M15 9 Q24 4 33 9" fill="none" stroke="#f9d2c6" stroke-width="3" stroke-linecap="round"/>
`, 48, 36);

// Cartoon mallet. Strike point = (40, 94); hand pivot = (146, 50).
export const HAMMER = { w: 152, h: 100, strikeX: 40, strikeY: 94, pivotX: 146, pivotY: 50, headW: 52 };
export const hammerSVG = svg(`
  <path d="M60 44 L144 44 Q150 50 144 56 L60 56 Z" fill="#c98a4b" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M70 47 L130 47" stroke="#e0ab73" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="116" y="41" width="32" height="18" rx="6" fill="#7b4a2a" stroke="${OL}" stroke-width="3"/>
  <rect x="14" y="6" width="52" height="88" rx="14" fill="#de3b3b" stroke="${OL}" stroke-width="3.5"/>
  <path d="M25 28 L25 72" stroke="#ff8a8a" stroke-width="6" stroke-linecap="round"/>
  <rect x="12" y="4" width="56" height="18" rx="8" fill="#f4c84b" stroke="${OL}" stroke-width="3"/>
  <rect x="12" y="78" width="56" height="18" rx="8" fill="#f4c84b" stroke="${OL}" stroke-width="3"/>
`, 152, 100);

const BUILDERS = { casseur, taxpayer };

// Characters drawn from a picture instead of SVG (400 x 480 WebP, same frame),
// built from painted caricatures by tools/portraits/build.py.
// Macron: caricature by DonkeyHotey (2018), Creative Commons.
// De Funès: Louis de Funès as Rabbi Jacob, from an illustrated book on the film.
export const IMAGE_CHARACTERS = {
  macron: { idle: 'img/macron.webp', hit: 'img/macron-hit.webp' },
  obama: { idle: 'img/obama.webp', hit: 'img/obama-hit.webp' },
  defunes: { idle: 'img/defunes.webp', hit: 'img/defunes-hit.webp' },
};

export function characterSVG(id, expr = 'idle') {
  return BUILDERS[id](expr);
}

/** URL of a character's picture: an image file or an SVG data URL. */
export function characterSrc(id, expr = 'idle') {
  const img = IMAGE_CHARACTERS[id];
  if (img) return img[expr] || img.idle;
  return svgToDataURL(characterSVG(id, expr));
}

export const svgToDataURL = (s) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s).replace(/'/g, '%27');

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
