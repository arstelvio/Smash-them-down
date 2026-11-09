// Smash Them Down: the playfield (canvas) and game rules.

import { CHARACTERS, ALL_TYPES, pick } from './characters.js';
import { characterSrc, IMAGE_CHARACTERS, pawSVG, hammerSVG, HAMMER, svgToDataURL, loadImage } from './art.js';
import { sfx, vibrate } from './audio.js';

export const GAME_DURATION = 60; // seconds
export const MAX_SCORE = 50000; // sanity cap, mirrored in the database rules

const COLS = 3;
const ROWS = 4;
const RISE = 0.14;
const FALL = 0.16;
const HIT_HOLD = 0.26;
const HIT_FALL = 0.2;
const OL = '#2e1c10';
const FONT_TITLE = '"Lilita One", "Arial Black", Impact, sans-serif';
const FONT_TEXT = 'Nunito, "Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const easeInQuad = (t) => t * t;
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/* ---------- art loading ---------- */

let artPromise = null;
export function loadArt() {
  if (artPromise) return artPromise;
  artPromise = (async () => {
    const imgs = {};
    const jobs = [];
    for (const id of ALL_TYPES) {
      imgs[id] = {};
      const exprs = IMAGE_CHARACTERS[id] ? Object.keys(IMAGE_CHARACTERS[id]) : ['idle', 'hit', ...(id === 'modi' ? ['hurt'] : [])];
      for (const e of exprs) {
        jobs.push(loadImage(characterSrc(id, e)).then((img) => { imgs[id][e] = img; }));
      }
    }
    jobs.push(loadImage(svgToDataURL(pawSVG)).then((i) => { imgs.paw = i; }));
    jobs.push(loadImage(svgToDataURL(hammerSVG)).then((i) => { imgs.hammer = i; }));
    await Promise.all(jobs);
    return imgs;
  })();
  return artPromise;
}

function makeCanvas(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, g];
}

function raster(img, w, h, dpr) {
  const [c, g] = makeCanvas(w, h, dpr);
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, w, h);
  return c;
}

function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function starPath(g, x, y, r, rot) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

/* ---------- the game ---------- */

export class Game {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.state = 'idle'; // idle | running | paused | ending | over
    this.W = 0;
    this.H = 0;
    this.dpr = 1;
    this.holes = [];
    this._frame = this._frame.bind(this);
    this._raf = 0;
    this._last = 0;
    this.reset();
    canvas.addEventListener('pointerdown', (e) => this._onPointer(e), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  async init() {
    this.art = await loadArt();
    this.resize(true);
  }

  reset() {
    this.moles = [];
    this.particles = [];
    this.popups = [];
    this.says = [];
    this.hammers = [];
    this.twins = new Map();
    this.score = 0;
    this.combo = 0;
    this.elapsed = 0;
    this.timeLeft = GAME_DURATION;
    this.spawnT = 0.35;
    this.shakeT = 0;
    this.flashT = 0;
    this.endT = 0;
    this._lastTick = 99;
    this._mid = 0;
    this._twinId = 0;
    this.stats = {
      hits: { macron: 0, obama: 0, modi: 0, tamim: 0 },
      taxpayer: 0,
      whiffs: 0,
      escaped: 0,
      taps: 0,
      goodTaps: 0,
      bestCombo: 0,
      twins: 0,
    };
    for (const h of this.holes) h.mole = null;
  }

  get mult() {
    return Math.min(5, 1 + Math.floor(this.combo / 5));
  }

  get difficulty() {
    return clamp(this.elapsed / GAME_DURATION, 0, 1);
  }

  /* ----- layout & pre-rendering ----- */

  resize(force = false) {
    const r = this.canvas.getBoundingClientRect();
    const W = Math.round(r.width);
    const H = Math.round(r.height);
    if (!W || !H || !this.art) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (!force && W === this.W && H === this.H && dpr === this.dpr) return;
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);

    const cellW = W / COLS;
    const s = Math.max(18, Math.min(cellW * 0.39, (H - 30) / 9.6));
    const cw = s * 2.05;
    const ch = cw * 1.2;
    const top = ch * 0.8 + 12;
    const bottom = H - s * 0.62 - 12;
    const rowH = (bottom - top) / (ROWS - 1);
    this.s = s;
    this.cw = cw;
    this.ch = ch;

    const old = this.holes;
    this.holes = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = this.holes.length;
        const h = {
          i, row, col,
          cx: cellW * (col + 0.5),
          cy: top + row * rowH,
          rx: s,
          ry: s * 0.34,
          mole: old[i] ? old[i].mole : null,
          lastUsed: old[i] ? old[i].lastUsed : -10,
        };
        const sh = this.ctx.createLinearGradient(0, h.cy - h.ry, 0, h.cy + h.ry);
        sh.addColorStop(0, 'rgba(10,4,0,0)');
        sh.addColorStop(0.45, 'rgba(10,4,0,0.35)');
        sh.addColorStop(1, 'rgba(10,4,0,0.85)');
        h.shade = sh;
        this.holes.push(h);
      }
    }

    // sprites
    const a = this.art;
    this.sprites = {};
    for (const id of ALL_TYPES) {
      this.sprites[id] = {};
      for (const e of Object.keys(a[id])) this.sprites[id][e] = raster(a[id][e], cw, ch, dpr);
    }
    this.pawW = s * 0.44;
    this.pawH = (this.pawW * 36) / 48;
    this.paw = raster(a.paw, this.pawW, this.pawH, dpr);
    this.hk = (s * 0.78) / HAMMER.headW;
    this.hammerImg = raster(a.hammer, HAMMER.w * this.hk, HAMMER.h * this.hk, dpr);

    this._buildBackground();
    this._buildLip();
    this.render();
  }

  _buildBackground() {
    const { W, H, dpr, s } = this;
    const [c, g] = makeCanvas(W, H, dpr);
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#7fce55');
    grd.addColorStop(1, '#4b9b35');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);

    // mowed-lawn stripes
    const band = s * 1.15;
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (let y = 0, i = 0; y < H; y += band, i++) if (i % 2) g.fillRect(0, y, W, band);

    let seed = 1234567;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.strokeStyle = 'rgba(28,92,28,0.45)';
    g.lineWidth = 1.8;
    g.lineCap = 'round';
    const tufts = Math.round((W * H) / 1500);
    for (let i = 0; i < tufts; i++) {
      const x = rnd() * W, y = rnd() * H, k = 3 + rnd() * 4;
      g.beginPath();
      g.moveTo(x - k * 0.7, y - k);
      g.lineTo(x, y);
      g.lineTo(x + k * 0.7, y - k);
      g.moveTo(x, y);
      g.lineTo(x + k * 0.1, y - k * 1.3);
      g.stroke();
    }
    const flowers = Math.round((W * H) / 9000);
    for (let i = 0; i < flowers; i++) {
      const x = rnd() * W, y = rnd() * H, r = 2 + rnd() * 1.6;
      g.fillStyle = rnd() < 0.5 ? '#fffdf2' : '#ffe066';
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#f2a541';
      g.beginPath();
      g.arc(x, y, r * 0.6, 0, Math.PI * 2);
      g.fill();
    }

    this._drawBunting(g, W);

    for (const h of this.holes) {
      const { cx, cy, rx, ry } = h;
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.beginPath();
      g.ellipse(cx, cy + ry * 1.1, rx * 1.32, ry * 1.6, 0, 0, Math.PI * 2);
      g.fill();
      const mg = g.createLinearGradient(0, cy - ry * 1.5, 0, cy + ry * 1.8);
      mg.addColorStop(0, '#c08550');
      mg.addColorStop(1, '#7a4a24');
      g.fillStyle = mg;
      g.strokeStyle = OL;
      g.lineWidth = 2.5;
      g.beginPath();
      g.ellipse(cx, cy + ry * 0.18, rx * 1.24, ry * 1.62, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      const hg = g.createRadialGradient(cx, cy + ry * 0.4, 1, cx, cy, rx);
      hg.addColorStop(0, '#0b0502');
      hg.addColorStop(1, '#3d2311');
      g.fillStyle = hg;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 2;
      g.stroke();
    }
    this.bg = c;
  }

  _drawBunting(g, W) {
    const colors = ['#1f4fbf', '#ffffff', '#e8343d', '#ff9933', '#ffffff', '#138808', '#8a1538', '#ffffff', '#b22234', '#3c3b6e'];
    const y0 = 4, sag = 10, tw = 22, th = 17;
    g.strokeStyle = '#3b2a1a';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, y0);
    g.quadraticCurveTo(W / 2, y0 + sag * 2, W, y0);
    g.stroke();
    const n = Math.ceil(W / (tw + 4));
    for (let i = 0; i < n; i++) {
      const x = i * (tw + 4) + 2;
      const t = (x + tw / 2) / W;
      const y = y0 + 2 * sag * 2 * t * (1 - t); // point on the quadratic curve
      g.fillStyle = colors[i % colors.length];
      g.strokeStyle = 'rgba(46,28,16,0.6)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + tw, y);
      g.lineTo(x + tw / 2, y + th);
      g.closePath();
      g.fill();
      g.stroke();
    }
  }

  _buildLip() {
    const { s, dpr } = this;
    const rx = s, ry = s * 0.34;
    const w = rx * 2.6, h = ry * 3.2;
    const ox = w / 2, oy = ry * 1.1;
    const [c, g] = makeCanvas(w, h, dpr);
    const orx = rx * 1.24, ory = ry * 1.62, ocy = oy + ry * 0.18;
    g.beginPath();
    g.ellipse(ox, ocy, orx, ory, 0, 0, Math.PI, false);
    g.ellipse(ox, oy, rx, ry, 0, Math.PI, 0, true);
    g.closePath();
    const lg = g.createLinearGradient(0, oy, 0, ocy + ory);
    lg.addColorStop(0, '#b77b44');
    lg.addColorStop(1, '#6f4220');
    g.fillStyle = lg;
    g.fill();
    g.strokeStyle = OL;
    g.lineWidth = 2.5;
    g.beginPath();
    g.ellipse(ox, ocy, orx, ory, 0, 0.05, Math.PI - 0.05, false);
    g.stroke();
    g.strokeStyle = '#d29a62';
    g.lineWidth = 2.2;
    g.beginPath();
    g.ellipse(ox, oy + 1.5, rx, ry, 0, Math.PI * 0.12, Math.PI * 0.88, false);
    g.stroke();
    // a few pebbles
    g.fillStyle = '#5e3818';
    [[-0.6, 1.25], [0.15, 1.55], [0.7, 1.2]].forEach(([dx, dy]) => {
      g.beginPath();
      g.ellipse(ox + dx * rx, oy + dy * ry, s * 0.05, s * 0.035, 0, 0, Math.PI * 2);
      g.fill();
    });
    this.lip = c;
    this.lipW = w;
    this.lipH = h;
    this.lipOX = ox;
    this.lipOY = oy;
  }

  /* ----- lifecycle ----- */

  start() {
    this.reset();
    this.state = 'running';
    this._hud();
    this._last = 0;
    this._loop();
  }

  pause() {
    if (this.state !== 'running') return false;
    this.state = 'paused';
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    return true;
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this._last = 0;
    this._loop();
  }

  stop() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.state = 'idle';
    this.reset();
    this.render();
  }

  _loop() {
    if (!this._raf) this._raf = requestAnimationFrame(this._frame);
  }

  _frame(ts) {
    this._raf = 0;
    if (this.state !== 'running' && this.state !== 'ending') return;
    const dt = this._last ? Math.min(0.05, (ts - this._last) / 1000) : 1 / 60;
    this._last = ts;
    this.update(dt);
    this.render();
    if (this.state === 'running' || this.state === 'ending') this._loop();
  }

  results() {
    const st = this.stats;
    const hits = Object.values(st.hits).reduce((a, b) => a + b, 0);
    return {
      score: Math.min(MAX_SCORE, Math.round(this.score)),
      hits,
      perType: { ...st.hits },
      taxpayer: st.taxpayer,
      accuracy: st.taps ? Math.round((st.goodTaps / st.taps) * 100) : 0,
      bestCombo: st.bestCombo,
      escaped: st.escaped,
      twins: st.twins,
    };
  }

  _hud() {
    if (this.hooks.onHud) {
      this.hooks.onHud({ score: this.score, combo: this.combo, mult: this.mult, timeLeft: this.timeLeft });
    }
  }

  /* ----- update ----- */

  update(dt) {
    if (this.state === 'running') {
      this.elapsed += dt;
      this.timeLeft = Math.max(0, GAME_DURATION - this.elapsed);
      const secs = Math.ceil(this.timeLeft);
      if (secs <= 5 && secs >= 1 && secs !== this._lastTick) {
        this._lastTick = secs;
        sfx.tick();
      }
      if (this.timeLeft <= 0) {
        this.state = 'ending';
        this.endT = 0;
        for (const m of this.moles) {
          if (m.state === 'rise' || m.state === 'up') {
            m.state = 'fall';
            m.t = 0;
            m.bubble = null;
          }
        }
        sfx.end();
        this._popup(this.W / 2, this.H * 0.42, "TIME'S UP!", '#ffd23f', 1.9, true, 1.4);
      } else {
        this._spawnTick(dt);
      }
      this._hud();
    } else if (this.state === 'ending') {
      this.endT += dt;
      if (this.endT > 1.4) {
        this.state = 'over';
        if (this.hooks.onEnd) this.hooks.onEnd(this.results());
      }
    }

    for (const m of this.moles) this._updateMole(m, dt);
    for (let i = this.moles.length - 1; i >= 0; i--) {
      const m = this.moles[i];
      if (m.state === 'done') {
        const h = this.holes[m.hole];
        if (h && h.mole === m) h.mole = null;
        this.moles.splice(i, 1);
      }
    }

    for (const p of this.particles) {
      p.t += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.t < p.life);
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < p.life);
    for (const p of this.says) p.t += dt;
    this.says = this.says.filter((p) => p.t < p.life);
    for (const p of this.hammers) p.t += dt;
    this.hammers = this.hammers.filter((p) => p.t < 0.3);
    if (this.shakeT > 0) this.shakeT -= dt;
    if (this.flashT > 0) this.flashT -= dt;
  }

  _spawnTick(dt) {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    const d = this.difficulty;
    const maxActive = d < 0.18 ? 2 : d < 0.5 ? 3 : 4;
    const active = this.moles.filter((m) => m.state === 'rise' || m.state === 'up').length;
    if (active >= maxActive) {
      this.spawnT = 0.06;
      return;
    }
    const free = this.holes.filter((h) => !h.mole && this.elapsed - h.lastUsed > 0.45);
    if (!free.length) {
      this.spawnT = 0.06;
      return;
    }
    const type = this._pickType();
    if (type === 'macron' && d > 0.1 && free.length >= 2 && active + 2 <= maxActive + 1 && Math.random() < 0.3) {
      // "At the same time!": Macron pops up in two holes at once
      const a = pick(free);
      const others = free.filter((h) => h !== a && (h.row !== a.row || Math.abs(h.col - a.col) > 1));
      const b = pick(others.length ? others : free.filter((h) => h !== a));
      const twin = ++this._twinId;
      this.twins.set(twin, { left: 2, failed: false });
      this._spawn('macron', a.i, { twin, bubble: 'At the same time!' });
      this._spawn('macron', b.i, { twin, bubble: '…at the same time!' });
    } else {
      this._spawn(type, pick(free).i);
    }
    this.spawnT = lerp(0.9, 0.36, d) * rand(0.7, 1.3);
  }

  _pickType() {
    const d = this.difficulty;
    const w = {
      macron: CHARACTERS.macron.weight,
      obama: CHARACTERS.obama.weight,
      modi: CHARACTERS.modi.weight,
      tamim: CHARACTERS.tamim.weight + 5 * d,
      taxpayer: this.elapsed < 4 ? 0 : CHARACTERS.taxpayer.weight + 10 * d,
    };
    let total = 0;
    for (const k in w) total += w[k];
    let r = Math.random() * total;
    for (const k in w) {
      r -= w[k];
      if (r <= 0) return k;
    }
    return 'macron';
  }

  _spawn(type, holeIdx, opts = {}) {
    const def = CHARACTERS[type];
    const d = this.difficulty;
    const up = lerp(1.35, 0.72, d) * def.speed * (opts.twin ? 1.35 : 1);
    const m = {
      id: ++this._mid,
      type,
      hole: holeIdx,
      state: 'rise',
      t: 0,
      pos: 0,
      up,
      hp: def.hp || 1,
      expr: 'idle',
      twin: opts.twin || 0,
      bubble: null,
      flinch: 0,
    };
    if (opts.bubble) m.bubble = opts.bubble;
    else if (Math.random() < 0.38 && this._bubbleCount() < 2) m.bubble = pick(def.lines);
    const h = this.holes[holeIdx];
    h.mole = m;
    h.lastUsed = this.elapsed;
    this.moles.push(m);
    sfx.pop();
  }

  _bubbleCount() {
    let n = this.says.length;
    for (const m of this.moles) if (m.bubble) n++;
    return n;
  }

  _updateMole(m, dt) {
    m.t += dt;
    if (m.flinch > 0) m.flinch -= dt;
    switch (m.state) {
      case 'rise':
        m.pos = easeOutBack(Math.min(1, m.t / RISE));
        if (m.t >= RISE) {
          m.state = 'up';
          m.t = 0;
          m.pos = 1;
        }
        break;
      case 'up':
        m.pos = 1;
        if (m.t >= m.up) {
          m.state = 'fall';
          m.t = 0;
          this._onEscape(m);
        }
        break;
      case 'hit':
        if (m.t < HIT_HOLD) m.pos = 1;
        else {
          const k = (m.t - HIT_HOLD) / HIT_FALL;
          m.pos = 1 - easeInQuad(Math.min(1, k));
          if (k >= 1) m.state = 'done';
        }
        break;
      case 'fall': {
        const k = m.t / FALL;
        m.pos = 1 - easeInQuad(Math.min(1, k));
        if (k >= 1) m.state = 'done';
        break;
      }
      default:
        break;
    }
  }

  _moleTop(h, pos) {
    const upTop = h.cy - this.ch * 0.8;
    const downTop = h.cy + h.ry + 2;
    return downTop + (upTop - downTop) * pos;
  }

  /* ----- input ----- */

  _onPointer(e) {
    e.preventDefault();
    if (this.state !== 'running') return;
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    this.hammers.push({ x, y, t: 0, flip: x > this.W * 0.62 });
    const m = this._hitTest(x, y);
    if (m) {
      this.stats.taps++;
      this._hitMole(m, x, y);
    } else if (!this._hitTest(x, y, ['hit'])) {
      // a second tap on a leader who is already down is forgiven
      this.stats.taps++;
      this._whiff(x, y);
    }
  }

  _hitTest(x, y, states = ['rise', 'up']) {
    let best = null;
    let bestD = Infinity;
    for (const m of this.moles) {
      if (!states.includes(m.state) || m.pos < 0.3) continue;
      const h = this.holes[m.hole];
      const top = this._moleTop(h, Math.min(1, m.pos));
      const x0 = h.cx - this.cw * 0.54;
      const x1 = h.cx + this.cw * 0.54;
      const y0 = top - this.ch * 0.06;
      const y1 = h.cy + h.ry * 1.4;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
        const dd = Math.hypot(x - h.cx, y - (top + this.ch * 0.38));
        if (dd < bestD) {
          bestD = dd;
          best = m;
        }
      }
    }
    return best;
  }

  _hitMole(m, x, y) {
    const def = CHARACTERS[m.type];
    const h = this.holes[m.hole];
    const top = this._moleTop(h, 1);
    const headY = top + this.ch * 0.32;

    if (def.decoy) {
      m.state = 'hit';
      m.t = 0;
      m.expr = 'hit';
      m.bubble = null;
      this.score = Math.max(0, this.score + def.points);
      this.stats.taxpayer++;
      this._breakCombo();
      this._popup(h.cx, headY - this.s * 0.2, `${def.points}`, '#ff5a5a', 1.35);
      this._say(h.cx, top, pick(def.ouch));
      this.shakeT = 0.35;
      this.flashT = 0.25;
      this._stars(x, y, 6, ['#ff6b6b', '#ffd166']);
      sfx.buzz();
      vibrate([40, 40, 60]);
      this._hud();
      return;
    }

    this.stats.goodTaps++;

    if (m.hp > 1) {
      // Modi: the first hit only annoys him
      m.hp--;
      m.expr = 'hurt';
      m.flinch = 0.14;
      m.bubble = null;
      if (m.state === 'rise') {
        m.state = 'up';
        m.pos = 1;
        m.t = 0;
        m.up = 0.85;
      } else {
        m.up = Math.max(m.up, m.t + 0.8);
      }
      this._say(h.cx, top, pick(def.tough));
      this._popup(h.cx, headY, 'TOUGH!', '#ffd166', 0.9, false, 0.85, m.id);
      this._stars(x, y, 5);
      sfx.tough();
      vibrate(12);
      return;
    }

    const mult = this.mult;
    const pts = def.points * mult;
    this.score += pts;
    this.combo++;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
    this.stats.hits[m.type]++;
    m.state = 'hit';
    m.t = 0;
    m.expr = 'hit';
    m.bubble = null;

    this._popup(h.cx, headY - this.s * 0.1, `+${pts}`, mult > 1 ? '#ffd23f' : '#ffffff', 1 + 0.08 * mult, false, 0.85, m.id);
    if (Math.random() < 0.5) this._say(h.cx, top, pick(def.ouch));
    this._stars(x, y, 8);
    sfx.bonk();
    vibrate(16);

    if (m.type === 'tamim') {
      this._coins(h.cx, headY, 16);
      this._popup(h.cx, top - this.s * 0.1, 'PETRODOLLARS!', '#ffd700', 0.75, false, 1.1);
      sfx.coins();
    }

    const newMult = this.mult;
    if (newMult > mult) {
      this._popup(this.W / 2, this.H * 0.46, `COMBO x${newMult}!`, '#ffd23f', 1.7, true);
      sfx.combo(newMult);
    }

    if (m.twin) {
      const tw = this.twins.get(m.twin);
      if (tw && !tw.failed) {
        tw.left--;
        if (tw.left === 0) {
          const bonus = 25 * this.mult;
          this.score += bonus;
          this.stats.twins++;
          this._popup(this.W / 2, this.H * 0.36, 'AT THE SAME TIME!', '#7fd8ff', 1.25, true, 1.2);
          this._popup(this.W / 2, this.H * 0.36 + this.s * 0.75, `BONUS +${bonus}`, '#7fd8ff', 1.1, true, 1.2);
          sfx.bonus();
        }
      }
    }
    this._hud();
  }

  _whiff(x, y) {
    this.stats.whiffs++;
    this._dust(x, y);
    this._breakCombo();
    sfx.whiff();
    this._hud();
  }

  _onEscape(m) {
    const def = CHARACTERS[m.type];
    m.bubble = null;
    if (def.decoy) return;
    this.stats.escaped++;
    if (m.twin) {
      const tw = this.twins.get(m.twin);
      if (tw) tw.failed = true;
    }
    if (def.escape && Math.random() < 0.6) {
      const h = this.holes[m.hole];
      this._say(h.cx, this._moleTop(h, 1), pick(def.escape));
    }
    this._breakCombo();
    this._hud();
  }

  _breakCombo() {
    if (this.combo >= 5) this._popup(this.W / 2, this.H * 0.52, 'COMBO LOST', '#ff9c9c', 1.0, true, 0.9);
    this.combo = 0;
  }

  /* ----- effects ----- */

  _popup(x, y, text, color, scale = 1, big = false, life = 0.85, tag = 0) {
    if (tag) this.popups = this.popups.filter((p) => p.tag !== tag);
    this.popups.push({ x, y, text, color, scale, big, t: 0, life, tag });
  }

  _say(x, yTop, text) {
    this.says = this.says.filter((s) => Math.abs(s.x - x) > 4 || Math.abs(s.y - yTop) > 4);
    this.says.push({ x, y: yTop, text, t: 0, life: 1.0 });
  }

  _stars(x, y, n, colors = ['#ffe14d', '#fff7b3', '#ffb703']) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(120, 300);
      this.particles.push({
        kind: 'star', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, g: 600,
        rot: rand(0, 6), vr: rand(-8, 8),
        size: rand(0.09, 0.15) * this.s,
        color: pick(colors), t: 0, life: rand(0.35, 0.6),
      });
    }
  }

  _coins(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const sp = rand(160, 380);
      this.particles.push({
        kind: 'coin', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 900,
        rot: rand(0, 6), vr: rand(8, 16),
        size: rand(0.11, 0.15) * this.s,
        t: 0, life: rand(0.7, 1.0),
      });
    }
  }

  _dust(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = rand(Math.PI, Math.PI * 2);
      const sp = rand(30, 90);
      this.particles.push({
        kind: 'dust', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, g: 0,
        rot: 0, vr: 0,
        size: rand(0.08, 0.14) * this.s,
        t: 0, life: rand(0.3, 0.45),
      });
    }
  }

  /* ----- rendering ----- */

  render() {
    const g = this.ctx;
    const { W, H, dpr } = this;
    if (!this.bg) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#4b9b35';
    g.fillRect(0, 0, W, H);
    if (this.shakeT > 0) {
      const a = 8 * (this.shakeT / 0.35);
      g.translate(rand(-a, a), rand(-a, a));
    }
    g.drawImage(this.bg, 0, 0, W, H);

    for (const h of this.holes) {
      const m = h.mole;
      if (m) this._drawMole(g, h, m);
      g.drawImage(this.lip, h.cx - this.lipOX, h.cy - this.lipOY, this.lipW, this.lipH);
      if (m) this._drawPaws(g, h, m);
    }

    for (const m of this.moles) {
      if (m.bubble && (m.state === 'up' || (m.state === 'rise' && m.pos > 0.8))) {
        const h = this.holes[m.hole];
        this._drawBubble(g, h.cx, this._moleTop(h, 1) + this.ch * 0.02, m.bubble, 1);
      }
    }
    for (const s of this.says) {
      const k = s.t / s.life;
      const alpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      this._drawBubble(g, s.x, s.y - k * this.s * 0.3, s.text, alpha);
    }

    this._drawParticles(g);
    this._drawPopups(g);
    for (const hm of this.hammers) this._drawHammer(g, hm);

    if (this.flashT > 0) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = `rgba(255,40,40,${0.28 * (this.flashT / 0.25)})`;
      g.fillRect(0, 0, W, H);
    }
  }

  _drawMole(g, h, m) {
    if (m.pos <= 0.001) return;
    const sp = this.sprites[m.type][m.expr] || this.sprites[m.type].idle;
    const top = this._moleTop(h, m.pos);
    g.save();
    g.beginPath();
    g.rect(h.cx - h.rx * 1.08, h.cy - this.ch * 1.6, h.rx * 2.16, this.ch * 1.6);
    g.ellipse(h.cx, h.cy, h.rx, h.ry, 0, 0, Math.PI * 2);
    g.clip();

    if (m.type === 'tamim' && m.state !== 'hit') {
      const gy = top + this.ch * 0.36;
      const r = h.rx * 1.04;
      const rg = g.createRadialGradient(h.cx, gy, r * 0.25, h.cx, gy, r);
      rg.addColorStop(0, 'rgba(255,224,100,0.85)');
      rg.addColorStop(1, 'rgba(255,224,100,0)');
      g.fillStyle = rg;
      g.fillRect(h.cx - r, gy - r, r * 2, r * 2);
    }

    let sx = 1, sy = 1, rot = 0;
    if (m.state === 'hit' && m.t < 0.14) {
      const k = 1 - m.t / 0.14;
      sx = 1 + 0.14 * k;
      sy = 1 - 0.17 * k;
    }
    if (m.state === 'hit') rot = Math.sin(m.t * 38) * 0.06 * Math.max(0, 1 - m.t / 0.35);
    if (m.flinch > 0) {
      const k = m.flinch / 0.14;
      sx = 1 + 0.08 * k;
      sy = 1 - 0.1 * k;
    }
    g.translate(h.cx, h.cy);
    g.scale(sx, sy);
    if (rot) g.rotate(rot);
    g.drawImage(sp, -this.cw / 2, top - h.cy, this.cw, this.ch);

    if (m.state === 'hit' && m.t < HIT_HOLD + 0.1 && !CHARACTERS[m.type].decoy) {
      // dizzy stars circling the head
      g.fillStyle = '#ffe14d';
      g.strokeStyle = OL;
      g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = m.t * 9 + (i * Math.PI * 2) / 3;
        const x = Math.cos(a) * this.cw * 0.3;
        const y = top - h.cy + this.ch * 0.1 + Math.sin(a) * this.ch * 0.04;
        starPath(g, x, y, this.s * 0.1, a);
        g.fill();
        g.stroke();
      }
    }
    g.restore();

    g.save();
    g.beginPath();
    g.ellipse(h.cx, h.cy, h.rx, h.ry, 0, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = h.shade;
    g.fillRect(h.cx - h.rx, h.cy - h.ry, h.rx * 2, h.ry * 2);
    g.restore();
  }

  _drawPaws(g, h, m) {
    const show = ((m.state === 'up' || m.state === 'rise') && m.pos > 0.85) || (m.state === 'hit' && m.t < HIT_HOLD);
    if (!show) return;
    const y = h.cy + h.ry * 0.95 - this.pawH * 0.45;
    g.drawImage(this.paw, h.cx - h.rx * 0.6 - this.pawW / 2, y, this.pawW, this.pawH);
    g.drawImage(this.paw, h.cx + h.rx * 0.6 - this.pawW / 2, y, this.pawW, this.pawH);
  }

  _drawBubble(g, x, yAnchor, text, alpha) {
    const { W } = this;
    let fs = Math.max(11, this.s * 0.25);
    g.font = `800 ${fs}px ${FONT_TEXT}`;
    let tw = g.measureText(text).width;
    const maxW = W - 16;
    const pad = () => fs * 0.6;
    if (tw + pad() * 2 > maxW) {
      fs *= maxW / (tw + pad() * 2);
      g.font = `800 ${fs}px ${FONT_TEXT}`;
      tw = g.measureText(text).width;
    }
    const padX = pad();
    const padY = fs * 0.4;
    const w = tw + padX * 2;
    const hgt = fs + padY * 2;
    const tail = fs * 0.55;
    const bx = clamp(x - w / 2, 6, W - 6 - w);
    const by = Math.max(4, yAnchor - hgt - tail);
    const tx = clamp(x, bx + 12, bx + w - 12);
    g.save();
    g.globalAlpha = alpha;
    roundRectPath(g, bx, by, w, hgt, Math.min(12, hgt / 2));
    g.fillStyle = '#fffdf5';
    g.fill();
    g.strokeStyle = OL;
    g.lineWidth = 2;
    g.stroke();
    g.beginPath();
    g.moveTo(tx - tail * 0.55, by + hgt - 1);
    g.lineTo(tx + tail * 0.1, by + hgt + tail);
    g.lineTo(tx + tail * 0.55, by + hgt - 1);
    g.fillStyle = '#fffdf5';
    g.fill();
    g.stroke();
    g.fillRect(tx - tail * 0.45, by + hgt - 3, tail * 0.9, 3);
    g.fillStyle = '#2a1a10';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, bx + w / 2, by + hgt / 2 + fs * 0.04);
    g.restore();
  }

  _drawParticles(g) {
    for (const p of this.particles) {
      const k = p.t / p.life;
      g.save();
      g.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      if (p.kind === 'star') {
        starPath(g, p.x, p.y, p.size, p.rot);
        g.fillStyle = p.color;
        g.fill();
        g.strokeStyle = OL;
        g.lineWidth = 1.3;
        g.stroke();
      } else if (p.kind === 'coin') {
        const sx = Math.max(0.15, Math.abs(Math.cos(p.rot)));
        g.translate(p.x, p.y);
        g.scale(sx, 1);
        g.beginPath();
        g.arc(0, 0, p.size, 0, Math.PI * 2);
        g.fillStyle = '#ffd23f';
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = '#a8740b';
        g.stroke();
        g.beginPath();
        g.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
        g.strokeStyle = '#e6a91a';
        g.lineWidth = 1.5;
        g.stroke();
      } else {
        g.globalAlpha *= 0.55;
        g.fillStyle = '#e9d8b8';
        g.beginPath();
        g.arc(p.x, p.y, p.size * (0.6 + k), 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
  }

  _drawPopups(g) {
    for (const p of this.popups) {
      const k = p.t / p.life;
      const appear = Math.min(1, p.t / 0.12);
      let size = (p.big ? this.s * 0.5 : this.s * 0.42) * p.scale * (0.6 + 0.4 * easeOutBack(appear));
      const y = p.big ? p.y - k * this.s * 0.25 : p.y - k * this.s * 0.8;
      g.save();
      g.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      g.font = `${size}px ${FONT_TITLE}`;
      const tw = g.measureText(p.text).width;
      if (tw > this.W * 0.92) {
        size *= (this.W * 0.92) / tw;
        g.font = `${size}px ${FONT_TITLE}`;
      }
      const x = p.big ? p.x : clamp(p.x, Math.min(tw, this.W) / 2 + 4, this.W - Math.min(tw, this.W) / 2 - 4);
      const yy = Math.max(size * 0.6 + 2, y);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = Math.max(3, size * 0.2);
      g.strokeStyle = OL;
      g.strokeText(p.text, x, yy);
      g.fillStyle = p.color;
      g.fillText(p.text, x, yy);
      g.restore();
    }
  }

  _drawHammer(g, hm) {
    const k = this.hk;
    const t = hm.t;
    let ang;
    let alpha = 1;
    if (t < 0.06) ang = lerp(0.9, -0.08, t / 0.06);
    else if (t < 0.12) ang = lerp(-0.08, 0.06, (t - 0.06) / 0.06);
    else {
      const q = (t - 0.12) / 0.18;
      ang = lerp(0.06, 0.55, q);
      alpha = 1 - q;
    }
    const dir = hm.flip ? -1 : 1;
    const px = hm.x + dir * (HAMMER.pivotX - HAMMER.strikeX) * k;
    const py = hm.y + (HAMMER.pivotY - HAMMER.strikeY) * k;
    g.save();
    g.globalAlpha = Math.max(0, alpha);
    g.translate(px, py);
    g.scale(dir, 1);
    g.rotate(ang);
    g.drawImage(this.hammerImg, -HAMMER.pivotX * k, -HAMMER.pivotY * k, HAMMER.w * k, HAMMER.h * k);
    g.restore();
  }
}
