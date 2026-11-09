// Smash Them Down: screens, HUD, leaderboard flow and install prompts.

import { Game, GAME_DURATION } from './game.js';
import { CHARACTERS, LEADERS, ALL_TYPES } from './characters.js';
import { characterSVG, svgToDataURL } from './art.js';
import { unlockAudio, sfx, isMuted, setMuted } from './audio.js';
import * as LB from './leaderboard.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, String(value)); } catch { /* ignore */ }
  },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/* ---------- screens ---------- */

const SCREENS = ['menu', 'howto', 'game', 'over', 'board'];
let current = 'menu';

function show(id) {
  for (const s of SCREENS) document.getElementById(s).classList.toggle('active', s === id);
  current = id;
  if (id === 'menu') refreshBest();
}

$$('[data-go]').forEach((b) => b.addEventListener('click', () => {
  sfx.pop();
  show(b.dataset.go);
}));

/* ---------- artwork in the DOM ---------- */

const faceURL = {};
for (const id of ALL_TYPES) faceURL[id] = svgToDataURL(characterSVG(id, 'idle'));

$('#lineup').innerHTML = LEADERS.map((id, i) =>
  `<div class="peek" style="--i:${i}"><div class="clip"><img src="${faceURL[id]}" alt="" draggable="false"></div></div>`).join('');

const avatar = (id, alt = '') =>
  `<span class="avatar"><img src="${faceURL[id]}" alt="${alt}" draggable="false"></span>`;

$('#cast').innerHTML = ALL_TYPES.map((id) => {
  const c = CHARACTERS[id];
  const pts = c.points > 0 ? `+${c.points}` : `${c.points}`.replace('-', '−');
  return `<li class="${c.decoy ? 'bad' : ''}">
    ${avatar(id)}
    <div>
      <div class="who">${c.name}<span class="pts">${pts}</span></div>
      <div class="nick">${c.nickname}</div>
      <div class="desc">${c.help}</div>
    </div></li>`;
}).join('');

/* ---------- sound buttons ---------- */

const ICON_ON = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 9h4l5-4v14l-5-4H4z" stroke-width="1" stroke-linejoin="round"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-width="2.2" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 9h4l5-4v14l-5-4H4z" stroke-width="1" stroke-linejoin="round"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke-width="2.2" stroke-linecap="round"/></svg>';

function renderSoundButtons() {
  $$('.sound-btn').forEach((b) => {
    b.innerHTML = isMuted() ? ICON_OFF : ICON_ON;
    b.setAttribute('aria-pressed', String(!isMuted()));
  });
}
$$('.sound-btn').forEach((b) => b.addEventListener('click', () => {
  unlockAudio();
  setMuted(!isMuted());
  renderSoundButtons();
  sfx.pop();
}));
renderSoundButtons();

// Unlock Web Audio on the first user gesture (required by iOS).
['touchend', 'click', 'keydown'].forEach((ev) =>
  document.addEventListener(ev, unlockAudio, { once: true, passive: true }));

/* ---------- best score ---------- */

function getBest() {
  return parseInt(store.get('smash.best', '0'), 10) || 0;
}
function refreshBest() {
  const b = getBest();
  $('#best').textContent = b > 0 ? `Your best: ${b}` : '';
}
refreshBest();

/* ---------- game ---------- */

const canvas = $('#field');
const hudScore = $('#hud-score');
const hudTime = $('#hud-time');
const hudTimeWrap = $('#hud-time-wrap');
const hudBar = $('#hud-bar');
const hudCombo = $('#hud-combo');
let hudState = { score: -1, secs: -1, mult: -1 };

const game = new Game(canvas, { onHud, onEnd });

const fontsReady = document.fonts
  ? Promise.all([
    document.fonts.load('40px "Lilita One"'),
    document.fonts.load('800 20px Nunito'),
  ]).catch(() => {})
  : Promise.resolve();
const ready = Promise.all([game.init(), fontsReady]);

if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => game.resize()).observe(canvas);
}
window.addEventListener('resize', () => game.resize());

function onHud({ score, mult, timeLeft }) {
  if (score !== hudState.score) {
    hudScore.textContent = String(score);
    hudScore.classList.remove('bump');
    void hudScore.offsetWidth;
    hudScore.classList.add('bump');
    hudState.score = score;
  }
  const secs = Math.ceil(timeLeft);
  if (secs !== hudState.secs) {
    hudTime.textContent = String(secs);
    hudTimeWrap.classList.toggle('hurry', secs <= 10);
    hudState.secs = secs;
  }
  hudBar.style.transform = `scaleX(${Math.max(0, timeLeft / GAME_DURATION)})`;
  if (mult !== hudState.mult) {
    hudCombo.textContent = `COMBO x${mult}`;
    hudCombo.classList.toggle('on', mult > 1);
    hudCombo.classList.remove('pop');
    void hudCombo.offsetWidth;
    if (mult > 1) hudCombo.classList.add('pop');
    hudState.mult = mult;
  }
}

let countdownToken = 0;
let phase = 'idle'; // idle | countdown | playing | paused | over

async function countdown(steps, stepMs) {
  const token = ++countdownToken;
  const box = $('#countdown');
  const txt = $('#count-text');
  box.hidden = false;
  for (const s of steps) {
    if (token !== countdownToken) return false;
    txt.textContent = s;
    txt.classList.toggle('go', s === 'SMASH!');
    txt.classList.remove('anim');
    void txt.offsetWidth;
    txt.classList.add('anim');
    if (s === 'SMASH!') sfx.go();
    else sfx.count();
    await wait(s === 'SMASH!' ? 420 : stepMs);
  }
  if (token !== countdownToken) return false;
  box.hidden = true;
  return true;
}

async function startGame() {
  unlockAudio();
  $('#paused').hidden = true;
  show('game');
  hudState = { score: -1, secs: -1, mult: -1 };
  onHud({ score: 0, mult: 1, timeLeft: GAME_DURATION });
  await ready;
  await nextFrame();
  game.stop();
  game.resize(true);
  phase = 'countdown';
  const ok = await countdown(['3', '2', '1', 'SMASH!'], 600);
  if (!ok || current !== 'game') return;
  phase = 'playing';
  game.start();
}

function pauseGame() {
  if (phase === 'playing' && game.pause()) {
    phase = 'paused';
  } else if (phase === 'countdown') {
    countdownToken++;
    $('#countdown').hidden = true;
    phase = 'paused-countdown';
  } else {
    return;
  }
  $('#paused').hidden = false;
}

async function resumeGame() {
  $('#paused').hidden = true;
  unlockAudio();
  if (phase === 'paused-countdown') {
    phase = 'countdown';
    const ok = await countdown(['3', '2', '1', 'SMASH!'], 600);
    if (!ok || current !== 'game') return;
    phase = 'playing';
    game.start();
  } else if (phase === 'paused') {
    phase = 'countdown';
    const ok = await countdown(['3', '2', '1'], 450);
    if (!ok || current !== 'game') return;
    phase = 'playing';
    game.resume();
  }
}

function quitGame() {
  countdownToken++;
  $('#countdown').hidden = true;
  $('#paused').hidden = true;
  game.stop();
  phase = 'idle';
  show('menu');
}

$('#btn-play').addEventListener('click', startGame);
$('#btn-again').addEventListener('click', startGame);
$('#btn-pause').addEventListener('click', () => { sfx.pop(); pauseGame(); });
$('#btn-resume').addEventListener('click', resumeGame);
$('#btn-restart').addEventListener('click', startGame);
$('#btn-quit').addEventListener('click', quitGame);
$('#btn-howto').addEventListener('click', () => { sfx.pop(); show('howto'); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && current === 'game') pauseGame();
});
window.addEventListener('pagehide', () => { if (current === 'game') pauseGame(); });

/* ---------- game over ---------- */

const RANKS = [
  [0, 'Abstainer'],
  [150, 'Grumpy Voter'],
  [400, 'Street Protester'],
  [800, 'Opposition Leader'],
  [1400, 'Summit Crasher'],
  [2200, 'Satire Legend'],
  [3200, 'Supreme Smasher'],
];
const rankFor = (score) => RANKS.filter(([min]) => score >= min).pop()[1];

let lastResult = null;

function animateCount(el, to, ms = 900) {
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function onEnd(res) {
  phase = 'over';
  lastResult = res;
  const isBest = res.score > getBest();
  if (isBest) store.set('smash.best', res.score);

  show('over');
  animateCount($('#final-score'), res.score);
  $('#final-rank').textContent = rankFor(res.score);

  const faces = LEADERS.map((id) =>
    `<span class="face">${avatar(id, CHARACTERS[id].name)}×${res.perType[id]}</span>`).join('') +
    (res.taxpayer ? `<span class="face bad">${avatar('taxpayer', 'Taxpayer')}×${res.taxpayer}</span>` : '');
  $('#final-stats').innerHTML = `
    <div class="faces">${faces}</div>
    <div class="line">Hits <b>${res.hits}</b> · Accuracy <b>${res.accuracy}%</b> · Best combo <b>${res.bestCombo}</b></div>
    ${res.twins ? `<div class="line">"At the same time" bonus ×${res.twins}</div>` : ''}
    ${isBest && res.score > 0 ? '<div class="line"><b>🎉 New personal best!</b></div>' : ''}`;

  const form = $('#name-form');
  form.hidden = true;
  $('#btn-save').disabled = false;
  setStatus('#over-status', 'Loading the Top 10…');
  renderBoard($('#over-board'), null);

  const { list, source } = await LB.getTop();
  if (current !== 'over' || lastResult !== res) return;
  renderBoard($('#over-board'), list);
  if (LB.qualifies(list, res.score)) {
    $('#name-input').value = store.get('smash.name', '');
    form.hidden = false;
    setStatus('#over-status', sourceLabel(source));
    sfx.fanfare();
  } else {
    const min = list.length ? list[list.length - 1].score : 0;
    setStatus('#over-status', res.score > 0 ? `The Top 10 starts at ${min} points. Try again!` : 'Tap the leaders to score!');
  }
}

$('#name-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = $('#name-form');
  const input = $('#name-input');
  const name = LB.cleanName(input.value);
  if (!name) {
    form.classList.remove('shake');
    void form.offsetWidth;
    form.classList.add('shake');
    input.focus();
    return;
  }
  input.blur();
  store.set('smash.name', name);
  const btn = $('#btn-save');
  btn.disabled = true;
  setStatus('#over-status', 'Saving…');
  const res = lastResult;
  try {
    const { id, source } = await LB.submitScore(name, res.score);
    form.hidden = true;
    const { list } = await LB.getTop();
    if (lastResult !== res) return;
    renderBoard($('#over-board'), list, id);
    setStatus('#over-status', {
      online: '✅ Saved to the shared Top 10!',
      pending: '📴 You are offline: your score will be sent automatically later.',
      local: '✅ Saved on this device.',
    }[source]);
    sfx.bonus();
  } catch {
    btn.disabled = false;
    setStatus('#over-status', '⚠️ The score could not be saved. Please try again.');
  }
});

$('#btn-share').addEventListener('click', async () => {
  const url = location.href.split('#')[0].split('?')[0];
  const score = lastResult ? lastResult.score : getBest();
  const text = `I scored ${score} points in Smash Them Down! Can you beat me?`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Smash Them Down', text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast('Link copied! Send it to your friends.');
  } catch { /* cancelled */ }
});

/* ---------- leaderboard ---------- */

function sourceLabel(source) {
  return {
    online: '🌍 Shared leaderboard: everyone plays for the same Top 10.',
    offline: '📴 Offline: showing the last known scores.',
    local: '📱 Scores are saved on this device only.',
  }[source];
}

function setStatus(sel, text) {
  $(sel).textContent = text || '';
}

const fmtDate = (ts) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

function renderBoard(ol, list, highlightId = null) {
  ol.textContent = '';
  if (!list) {
    const li = document.createElement('li');
    li.className = 'loading';
    li.textContent = 'Loading…';
    ol.appendChild(li);
    return;
  }
  for (let i = 0; i < 10; i++) {
    const e = list[i];
    const li = document.createElement('li');
    const rk = document.createElement('span');
    rk.className = 'rk';
    rk.textContent = String(i + 1);
    const nm = document.createElement('span');
    nm.className = 'nm';
    const sc = document.createElement('span');
    sc.className = 'sc';
    if (e) {
      nm.textContent = e.name + (e.pending ? ' ⏳' : '');
      const dt = document.createElement('span');
      dt.className = 'dt';
      dt.textContent = fmtDate(e.ts);
      nm.appendChild(dt);
      sc.textContent = String(e.score);
      if (highlightId && e.id === highlightId) li.className = 'me';
    } else {
      li.className = 'empty';
      nm.textContent = '—';
    }
    li.append(rk, nm, sc);
    ol.appendChild(li);
  }
}

async function openBoard() {
  sfx.pop();
  show('board');
  renderBoard($('#board-list'), null);
  setStatus('#board-status', '');
  const { list, source } = await LB.getTop();
  renderBoard($('#board-list'), list);
  setStatus('#board-status', sourceLabel(source));
}
$('#btn-board').addEventListener('click', openBoard);
$('#btn-refresh').addEventListener('click', openBoard);

LB.flushPending().catch(() => {});
window.addEventListener('online', () => LB.flushPending().catch(() => {}));

/* ---------- toast ---------- */

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- install (Add to Home Screen) ---------- */

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  window.navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installEvent = null;

const SHARE_ICON = '<svg class="share-ico" viewBox="0 0 16 20" aria-label="Share"><path d="M8 1v11M4.5 4.5L8 1l3.5 3.5" fill="none" stroke="#1a73e8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 8H2.5v10.5h11V8H11" fill="none" stroke="#1a73e8" stroke-width="1.8" stroke-linejoin="round"/></svg>';

function showInstallHint() {
  if (isStandalone() || store.get('smash.installDismissed') === '1') return;
  const box = $('#install');
  if (installEvent) {
    $('#install-text').textContent = 'Install the game on your home screen: full screen, no browser bar.';
    $('#btn-install').hidden = false;
    box.hidden = false;
  } else if (isIOS) {
    $('#install-text').innerHTML = `Install the game: tap ${SHARE_ICON} then <b>“Add to Home Screen”</b>.`;
    $('#btn-install').hidden = true;
    box.hidden = false;
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  showInstallHint();
});
window.addEventListener('appinstalled', () => { $('#install').hidden = true; });
$('#btn-install').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  try { await installEvent.userChoice; } catch { /* ignore */ }
  installEvent = null;
  $('#install').hidden = true;
});
$('#btn-install-close').addEventListener('click', () => {
  store.set('smash.installDismissed', '1');
  $('#install').hidden = true;
});
showInstallHint();

/* ---------- misc. mobile hygiene ---------- */

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName !== 'INPUT') e.preventDefault();
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Test hook (only with ?debug in the URL).
if (new URLSearchParams(location.search).has('debug')) window.__smash = { game, LB };
