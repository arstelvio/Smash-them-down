// Tiny synthesised sound effects (Web Audio API): no audio files to download.

const MUTE_KEY = 'smash.muted';
let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* private mode */ }

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* audio is optional */ }
}

export const isMuted = () => muted;

export function setMuted(m) {
  muted = !!m;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.02);
}

function ready() {
  return ctx && !muted && ctx.state === 'running';
}

function tone({ type = 'sine', f0 = 440, f1 = f0, dur = 0.1, vol = 0.3, delay = 0, attack = 0.005 }) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur = 0.1, vol = 0.3, filter = 'lowpass', f0 = 1200, f1 = f0, q = 1, delay = 0 }) {
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const fl = ctx.createBiquadFilter();
  fl.type = filter;
  fl.Q.value = q;
  fl.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(master);
  s.start(t);
  s.stop(t + dur + 0.02);
}

export const sfx = {
  pop() {
    if (!ready()) return;
    tone({ type: 'sine', f0: 320, f1: 720, dur: 0.09, vol: 0.12 });
  },
  bonk() {
    if (!ready()) return;
    noise({ dur: 0.07, vol: 0.5, filter: 'lowpass', f0: 2400, f1: 400 });
    tone({ type: 'sine', f0: 240, f1: 70, dur: 0.18, vol: 0.55 });
    tone({ type: 'triangle', f0: 1300, f1: 1900, dur: 0.07, vol: 0.12, delay: 0.02 }); // toy squeak
  },
  tough() {
    if (!ready()) return;
    tone({ type: 'square', f0: 620, f1: 560, dur: 0.12, vol: 0.12 });
    tone({ type: 'square', f0: 930, f1: 900, dur: 0.16, vol: 0.08, delay: 0.01 });
    noise({ dur: 0.05, vol: 0.3, filter: 'highpass', f0: 3000 });
  },
  whiff() {
    if (!ready()) return;
    noise({ dur: 0.13, vol: 0.18, filter: 'bandpass', f0: 600, f1: 2200, q: 2 });
  },
  buzz() {
    if (!ready()) return;
    tone({ type: 'sawtooth', f0: 200, f1: 90, dur: 0.35, vol: 0.22 });
    tone({ type: 'square', f0: 150, f1: 70, dur: 0.35, vol: 0.12 });
  },
  coins() {
    if (!ready()) return;
    [1320, 1760, 2093, 2637].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.12, vol: 0.14, delay: i * 0.05 }));
  },
  bonus() {
    if (!ready()) return;
    [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.1, vol: 0.07, delay: i * 0.06 }));
  },
  combo(level) {
    if (!ready()) return;
    const base = 520 + level * 90;
    tone({ type: 'triangle', f0: base, f1: base * 1.5, dur: 0.16, vol: 0.16 });
  },
  tick() {
    if (!ready()) return;
    tone({ type: 'square', f0: 1050, dur: 0.035, vol: 0.06 });
  },
  count() {
    if (!ready()) return;
    tone({ type: 'square', f0: 660, dur: 0.12, vol: 0.1 });
  },
  go() {
    if (!ready()) return;
    tone({ type: 'square', f0: 990, dur: 0.25, vol: 0.1 });
    tone({ type: 'square', f0: 1320, dur: 0.25, vol: 0.07 });
  },
  end() {
    if (!ready()) return;
    [988, 784, 659, 523].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.16, vol: 0.09, delay: i * 0.13 }));
  },
  fanfare() {
    if (!ready()) return;
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.14, vol: 0.08, delay: i * 0.1 }));
  },
};

export function vibrate(ms) {
  try { if (!muted && navigator.vibrate) navigator.vibrate(ms); } catch { /* ignore */ }
}
