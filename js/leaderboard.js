// Shared Top 10 leaderboard.
//
// Online mode: a Firebase Realtime Database used through its plain REST API
// (no SDK, no API key). Set the database URL in js/config.js.
// Without a URL the game falls back to a leaderboard stored on this device.
// Scores that cannot be sent (no network) are queued and sent later.

const TOP_N = 10;
const LS_LOCAL = 'smash.local.v1';
const LS_CACHE = 'smash.cache.v1';
const LS_PENDING = 'smash.pending.v1';

const cfg = (window.SMASH_CONFIG && window.SMASH_CONFIG.firebaseUrl) || '';
const BASE = cfg.trim().replace(/\/+$/, '').replace(/\.json$/, '');
export const ONLINE = /^https?:\/\//.test(BASE);

function readLS(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or disabled */ }
}

export function cleanName(raw) {
  return String(raw || '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12);
}

function sortTop(list) {
  return list
    .filter((e) => e && typeof e.score === 'number' && typeof e.name === 'string')
    .sort((a, b) => b.score - a.score || (a.ts || 0) - (b.ts || 0))
    .slice(0, TOP_N);
}

function fromFirebase(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.keys(data).map((id) => ({
    id,
    name: cleanName(data[id] && data[id].name) || '???',
    score: Number(data[id] && data[id].score) || 0,
    ts: Number(data[id] && data[id].ts) || 0,
  }));
}

async function request(url, options = {}, timeout = 8000) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : 0;
  try {
    const res = await fetch(url, { ...options, cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function withPending(list) {
  const pending = readLS(LS_PENDING, []).map((p) => ({ ...p, pending: true }));
  return sortTop([...list, ...pending]);
}

/** Returns { list, source } where source is 'online' | 'offline' | 'local'. */
export async function getTop() {
  if (!ONLINE) return { list: sortTop(readLS(LS_LOCAL, [])), source: 'local' };
  try {
    const data = await request(`${BASE}/scores.json?orderBy=%22score%22&limitToLast=${TOP_N}`);
    const list = sortTop(fromFirebase(data));
    writeLS(LS_CACHE, list);
    return { list: withPending(list), source: 'online' };
  } catch {
    return { list: withPending(readLS(LS_CACHE, [])), source: 'offline' };
  }
}

export function qualifies(list, score) {
  if (score <= 0) return false;
  if (list.length < TOP_N) return true;
  return score > list[list.length - 1].score;
}

/** Saves a score. Returns { id, source } where source is 'online' | 'pending' | 'local'. */
export async function submitScore(name, score) {
  const entry = { name: cleanName(name) || 'Anonymous', score: Math.round(score), ts: Date.now() };
  if (!ONLINE) {
    const id = `local-${entry.ts}`;
    writeLS(LS_LOCAL, sortTop([...readLS(LS_LOCAL, []), { ...entry, id }]));
    return { id, source: 'local' };
  }
  try {
    const res = await post(entry);
    return { id: res && res.name, source: 'online' };
  } catch (e) {
    if (e && e.status && e.status >= 400 && e.status < 500) throw e; // rejected by the rules: do not retry
    const id = `pending-${entry.ts}`;
    writeLS(LS_PENDING, [...readLS(LS_PENDING, []), { ...entry, id }]);
    return { id, source: 'pending' };
  }
}

function post(entry) {
  // No Content-Type header on purpose: keeps it a "simple" CORS request.
  return request(`${BASE}/scores.json`, {
    method: 'POST',
    body: JSON.stringify({ name: entry.name, score: entry.score, ts: { '.sv': 'timestamp' } }),
  });
}

/** Sends the scores saved while offline. */
export async function flushPending() {
  if (!ONLINE) return 0;
  let queue = readLS(LS_PENDING, []);
  let sent = 0;
  while (queue.length) {
    try {
      await post(queue[0]);
      sent++;
    } catch (e) {
      if (!(e && e.status && e.status >= 400 && e.status < 500)) break; // still offline: try later
    }
    queue = queue.slice(1);
    writeLS(LS_PENDING, queue);
  }
  return sent;
}
