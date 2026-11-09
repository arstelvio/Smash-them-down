// Character artwork.
// Most characters are cartoon caricatures drawn as inline SVG strings; Macron
// uses a painted caricature (img/, see IMAGE_CHARACTERS).
// Every character uses the same 200 x 240 frame: the head sits in the upper
// part and the shoulders at the bottom are what disappears into the hole.
// Expressions: 'idle', 'hit' and (Modi only) 'hurt'.

const OL = '#2e1c10'; // outline colour
const SW = 3.5; // outline width

const svg = (inner, w = 200, h = 240) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;

/* ---------- shared face parts ---------- */

function ears(skin, shade, lx, rx, cy, w, h) {
  const one = (cx, dir) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}" fill="${skin}" stroke="${OL}" stroke-width="${SW}"/>` +
    `<path d="M${cx + dir * 3} ${cy - h * 0.5} Q${cx - dir * w * 0.45} ${cy} ${cx + dir * 3} ${cy + h * 0.5}" fill="none" stroke="${shade}" stroke-width="3" stroke-linecap="round"/>`;
  return one(lx, 1) + one(rx, -1);
}

function eyesIdle(iris, y = 102, lx = 78, rx = 122) {
  return `
  <ellipse cx="${lx}" cy="${y}" rx="11" ry="9.5" fill="#fff" stroke="${OL}" stroke-width="2.5"/>
  <ellipse cx="${rx}" cy="${y}" rx="11" ry="9.5" fill="#fff" stroke="${OL}" stroke-width="2.5"/>
  <circle cx="${lx + 1.5}" cy="${y + 1}" r="5.8" fill="${iris}"/>
  <circle cx="${rx - 1.5}" cy="${y + 1}" r="5.8" fill="${iris}"/>
  <circle cx="${lx + 1.5}" cy="${y + 1}" r="2.8" fill="#0d0d0d"/>
  <circle cx="${rx - 1.5}" cy="${y + 1}" r="2.8" fill="#0d0d0d"/>
  <circle cx="${lx + 3.5}" cy="${y - 1.5}" r="1.8" fill="#fff"/>
  <circle cx="${rx + 0.5}" cy="${y - 1.5}" r="1.8" fill="#fff"/>`;
}

function eyesHit(y = 102, lx = 78, rx = 122) {
  const x = (cx) => `<path d="M${cx - 8} ${y - 7} L${cx + 8} ${y + 7} M${cx + 8} ${y - 7} L${cx - 8} ${y + 7}"/>`;
  return `<g stroke="${OL}" stroke-width="5" stroke-linecap="round" fill="none">${x(lx)}${x(rx)}</g>`;
}

function mouthHit(y = 146, w = 1) {
  return `<ellipse cx="100" cy="${y}" rx="${11 * w}" ry="12" fill="#6b1d1d" stroke="${OL}" stroke-width="3"/>
  <ellipse cx="100" cy="${y + 5}" rx="${6 * w}" ry="4" fill="#e0666b"/>`;
}

const browsWorried = (color, y = 84, w = 5.5) =>
  `<path d="M64 ${y + 4} Q76 ${y - 2} 90 ${y - 6} M110 ${y - 6} Q124 ${y - 2} 136 ${y + 4}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;

const browsAngry = (color, y = 84, w = 6) =>
  `<path d="M63 ${y - 5} L91 ${y + 4} M109 ${y + 4} L137 ${y - 5}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;

const cheeks = (op = 0.28) =>
  `<ellipse cx="68" cy="126" rx="8" ry="5" fill="#f0786a" opacity="${op}"/>
   <ellipse cx="132" cy="126" rx="8" ry="5" fill="#f0786a" opacity="${op}"/>`;

const neck = (shade) =>
  `<path d="M83 144 L83 188 L117 188 L117 144 Z" fill="${shade}" stroke="${OL}" stroke-width="${SW}"/>`;

function suit(suitCol, lapel, tie, pin = '') {
  return `
  <path d="M10 242 C12 205 36 186 70 180 L130 180 C164 186 188 205 190 242 Z" fill="${suitCol}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
  <path d="M74 180 L100 226 L126 180 Z" fill="#fbfbfb" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M94 190 L106 190 L104 199 L109.5 230 L100 240 L90.5 230 L96 199 Z" fill="${tie}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M93 188 L107 188 L104.5 199 L95.5 199 Z" fill="${tie}" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M68 180 L76 180 L100 228 L92 242 L80 242 L60 196 Z" fill="${lapel}" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M132 180 L124 180 L100 228 L108 242 L120 242 L140 196 Z" fill="${lapel}" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M84 182 L76 179 L86 197 Z M116 182 L124 179 L114 197 Z" fill="#fff" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
  ${pin}`;
}

const flagUS = (x, y) => `<g transform="translate(${x} ${y})">
  <rect width="16" height="10" fill="#fff"/>
  <rect y="0" width="16" height="1.6" fill="#d22f3c"/><rect y="3.2" width="16" height="1.6" fill="#d22f3c"/>
  <rect y="6.4" width="16" height="1.6" fill="#d22f3c"/><rect y="8.6" width="16" height="1.4" fill="#d22f3c"/>
  <rect width="7" height="5.4" fill="#27407f"/>
  <rect width="16" height="10" fill="none" stroke="${OL}" stroke-width="1.2"/></g>`;

/* ---------- Obama ---------- */

function obama(expr) {
  const skin = '#8f5c3d', shade = '#6f4529', hair = '#4a4745', hairHi = '#a19d97';
  const hit = expr === 'hit';
  const speckles = [
    [70, 46], [84, 40], [98, 38], [112, 39], [126, 43], [138, 50], [62, 56], [76, 50], [92, 45],
    [106, 44], [120, 47], [134, 56], [146, 66], [56, 68], [144, 78], [54, 80],
  ].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="${hairHi}"/>`).join('');
  return svg(`
    ${neck(shade)}
    ${suit('#2a2e36', '#20232a', '#3f74c9', flagUS(124, 199))}
    ${ears(skin, shade, 42, 158, 104, 14, 21)}
    <ellipse cx="100" cy="101" rx="55" ry="66" fill="${skin}" stroke="${OL}" stroke-width="${SW}"/>
    <path d="M46 92 C44 58 66 34 100 34 C134 34 156 58 154 92 C150 78 144 68 133 62 C118 56 82 56 67 62 C56 68 50 78 46 92 Z"
      fill="${hair}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    ${speckles}
    ${hit ? browsWorried('#231f1d', 86) : `<path d="M63 88 Q77 80 91 86 M109 86 Q123 80 137 88" stroke="#231f1d" stroke-width="5.5" fill="none" stroke-linecap="round"/>`}
    ${hit ? eyesHit(103) : eyesIdle('#3a2415', 103)}
    <path d="M99 108 Q95 120 93 124" fill="none" stroke="${OL}" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M89 125 Q93 131 100 128 Q107 131 111 125" fill="none" stroke="${OL}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M73 122 Q68 134 75 143 M127 122 Q132 134 125 143" fill="none" stroke="${shade}" stroke-width="2.6" stroke-linecap="round"/>
    ${hit ? mouthHit(148, 1.1) : `
      <path d="M75 135 Q100 164 125 135 Q100 145 75 135 Z" fill="#fff" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M80 138.5 Q100 150 120 138.5" fill="none" stroke="#cfcfcf" stroke-width="1.6"/>
      <path d="M88 141 L88 148 M100 143 L100 151 M112 141 L112 148" stroke="#d6d6d6" stroke-width="1.4"/>`}
    <path d="M94 160 Q100 164 106 160" fill="none" stroke="${shade}" stroke-width="2.5" stroke-linecap="round"/>
  `);
}

/* ---------- Narendra Modi ---------- */

function modi(expr) {
  const skin = '#c98e66', shade = '#ab7350', white = '#f3f2ee', grey = '#c9c7c0';
  const hit = expr === 'hit', hurt = expr === 'hurt';
  const glasses = `
    <g fill="rgba(255,255,255,0.22)" stroke="#b08a34" stroke-width="2.6">
      <rect x="61" y="90" width="34" height="23" rx="8"/>
      <rect x="105" y="90" width="34" height="23" rx="8"/>
    </g>
    <path d="M95 99 Q100 95.5 105 99 M61 98 L48 95 M139 98 L152 95" stroke="#b08a34" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const bandAid = `<g transform="rotate(-24 128 66)">
      <rect x="110" y="60" width="36" height="13" rx="6" fill="#f2c38f" stroke="${OL}" stroke-width="2"/>
      <rect x="122" y="60" width="12" height="13" fill="#e7ad73"/>
      <circle cx="115" cy="66.5" r="1" fill="#b98455"/><circle cx="141" cy="66.5" r="1" fill="#b98455"/></g>`;
  let brows, eyes, mouth;
  if (hit) {
    brows = browsWorried(grey, 84);
    eyes = eyesHit(101);
    mouth = mouthHit(150, 0.9);
  } else if (hurt) {
    brows = browsAngry('#bdbab2', 85);
    eyes = eyesIdle('#2e1d12', 101);
    mouth = `<path d="M90 150 Q100 146 110 150" fill="none" stroke="#6a4434" stroke-width="3.2" stroke-linecap="round"/>`;
  } else {
    brows = `<path d="M64 86 Q77 80 90 85 M110 85 Q123 80 136 86" stroke="#d4d2cb" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    eyes = eyesIdle('#2e1d12', 101);
    mouth = `<path d="M88 148 Q100 155 112 148" fill="none" stroke="#6a4434" stroke-width="3.2" stroke-linecap="round"/>`;
  }
  return svg(`
    <path d="M10 242 C12 205 36 186 70 180 L130 180 C164 186 188 205 190 242 Z" fill="#efe5d0" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
    ${neck(shade)}
    <path d="M30 242 C33 208 50 191 76 184 L124 184 C150 191 167 208 170 242 Z" fill="#e47a2a" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M100 194 L100 242" stroke="#b85e1b" stroke-width="2.5"/>
    <circle cx="100" cy="208" r="3" fill="#f4d27a" stroke="${OL}" stroke-width="1.5"/>
    <circle cx="100" cy="226" r="3" fill="#f4d27a" stroke="${OL}" stroke-width="1.5"/>
    <path d="M60 214 L78 212" stroke="#b85e1b" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M77 176 L123 176 L125 192 Q100 199 75 192 Z" fill="#e47a2a" stroke="${OL}" stroke-width="2.8" stroke-linejoin="round"/>
    ${ears(skin, shade, 44, 156, 106, 10, 16)}
    <ellipse cx="100" cy="102" rx="57" ry="63" fill="${skin}" stroke="${OL}" stroke-width="${SW}"/>
    <path d="M50 92 C46 60 66 36 100 35 C134 36 154 60 150 92 C146 77 140 66 130 59 C120 53 110 51 100 51 C90 51 80 53 70 59 C60 66 54 77 50 92 Z"
      fill="${white}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M78 44 Q90 40 100 41 M102 41 Q114 41 124 46 M66 56 Q74 49 84 46" fill="none" stroke="${grey}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M45 108 C45 150 68 180 100 182 C132 180 155 150 155 108 C151 126 143 137 132 141 C124 133 112 129 100 131 C88 129 76 133 68 141 C57 137 49 126 45 108 Z"
      fill="${white}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M60 140 Q64 152 72 160 M140 140 Q136 152 128 160 M88 168 Q100 172 112 168" fill="none" stroke="${grey}" stroke-width="2.2" stroke-linecap="round"/>
    ${mouth}
    <path d="M79 138 C87 131 95 132 100 135 C105 132 113 131 121 138 C113 143 105 141 100 139 C95 141 87 143 79 138 Z" fill="#fff" stroke="${grey}" stroke-width="1.8"/>
    ${brows}
    ${eyes}
    ${glasses}
    <path d="M100 106 Q92 122 95 127 Q101 131 108 127" fill="none" stroke="${OL}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${hurt ? bandAid : ''}
  `);
}

/* ---------- Sheikh Tamim bin Hamad Al Thani ---------- */

function tamim(expr) {
  const skin = '#d9a77d', shade = '#bf8b60', cloth = '#fbfbf8', fold = '#dcdcd4', beard = '#2a1f19';
  const gold = '#d9ad3c';
  const hit = expr === 'hit';
  return svg(`
    <path d="M4 242 C8 206 28 188 56 182 L144 182 C172 188 192 206 196 242 Z" fill="#2b1d14" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M62 184 L138 184 L144 242 L56 242 Z" fill="#f1f0ea" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M60 186 C62 206 60 226 56 242 M140 186 C138 206 140 226 144 242" fill="none" stroke="${gold}" stroke-width="6"/>
    <path d="M100 196 L100 242" stroke="${fold}" stroke-width="2.4"/>
    <path d="M100 8 C68 18 36 44 36 104 C36 140 34 176 30 214 C44 221 56 221 68 212 C72 196 78 181 86 168 L114 168 C122 181 128 196 132 212 C144 221 156 221 170 214 C166 176 164 140 164 104 C164 44 132 18 100 8 Z"
      fill="${cloth}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M44 120 C44 156 42 184 38 208 M156 120 C156 156 158 184 162 208 M54 150 C54 170 52 190 50 214 M146 150 C146 170 148 190 150 214" fill="none" stroke="${fold}" stroke-width="3" stroke-linecap="round"/>
    ${neck(shade)}
    <path d="M83 182 Q100 192 117 182 L117 190 Q100 198 83 190 Z" fill="#f1f0ea" stroke="${OL}" stroke-width="2.2"/>
    <ellipse cx="100" cy="106" rx="50" ry="60" fill="${skin}" stroke="${OL}" stroke-width="${SW}"/>
    <path d="M51 112 C52 148 72 170 100 172 C128 170 148 148 149 112 C145 132 137 144 125 149 C117 141 109 139 100 140 C91 139 83 141 75 149 C63 144 55 132 51 112 Z" fill="${beard}"/>
    ${hit ? mouthHit(150, 0.9) : `<path d="M88 147 Q100 154 112 147 Q100 150 88 147 Z" fill="#b8695c" stroke="#8a4a3f" stroke-width="2" stroke-linejoin="round"/>`}
    <path d="M81 138 C89 131 96 133 100 136 C104 133 111 131 119 138 C111 142 104 140 100 139 C96 140 89 142 81 138 Z" fill="${beard}"/>
    ${hit ? browsWorried(beard, 88, 6) : `<path d="M65 91 Q78 83 92 89 M108 89 Q122 83 135 91" stroke="${beard}" stroke-width="6.5" fill="none" stroke-linecap="round"/>`}
    ${hit ? eyesHit(105, 79, 121) : eyesIdle('#3d2617', 105, 79, 121)}
    <path d="M100 109 Q93 125 96 129 Q101 132 107 128" fill="none" stroke="${OL}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M100 20 C66 30 44 58 48 116 C52 96 58 84 68 76 C78 70 90 67 100 67 C110 67 122 70 132 76 C142 84 148 96 152 116 C156 58 134 30 100 20 Z"
      fill="${cloth}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M64 70 C74 62 88 58 100 58 C112 58 126 62 136 70" fill="none" stroke="${fold}" stroke-width="3" stroke-linecap="round"/>
    <path d="M100 22 L100 52" stroke="${fold}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M56 46 Q100 26 144 46" fill="none" stroke="#141414" stroke-width="6" stroke-linecap="round"/>
    <path d="M50 54 Q100 74 150 54" fill="none" stroke="#141414" stroke-width="7" stroke-linecap="round"/>
    <path d="M52 45 Q100 64 148 45" fill="none" stroke="#141414" stroke-width="7" stroke-linecap="round"/>
    <path d="M60 52 Q100 68 140 52" fill="none" stroke="#3a3a3a" stroke-width="1.6" stroke-linecap="round"/>
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

const BUILDERS = { obama, modi, tamim, taxpayer };

// Characters drawn from a picture instead of SVG (400 x 480 WebP, same frame).
// Macron: caricature by DonkeyHotey (2018), Creative Commons, cut out and
// given "knocked out" eyes for the hit version (see tools/macron/).
export const IMAGE_CHARACTERS = {
  macron: { idle: 'img/macron.webp', hit: 'img/macron-hit.webp' },
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
