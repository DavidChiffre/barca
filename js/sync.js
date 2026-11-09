const SYNC_KEYS = ['barca-photo-pins', 'barca-checklist', 'barca-edits', 'barca-day-order'];
const META_KEY = 'barca-sync-meta';
const DEVICE_KEY = 'barca-device-id';
const POLL_MS = 15000;

const origSetItem = Storage.prototype.setItem;
let cfg = null;
let deviceId = null;
let meta = {};
const pending = new Set();
let pushTimer = null;

function getDeviceId() {
  if (deviceId) return deviceId;
  let id = null;
  try { id = localStorage.getItem(DEVICE_KEY); } catch {}
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : 'dev-' + Math.random().toString(36).slice(2));
    try { localStorage.setItem(DEVICE_KEY, id); } catch {}
  }
  deviceId = id;
  return id;
}

function loadMeta() {
  try { meta = JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { meta = {}; }
}

function saveMeta() {
  try { origSetItem.call(localStorage, META_KEY, JSON.stringify(meta)); } catch {}
}

Storage.prototype.setItem = function (key, value) {
  origSetItem.call(this, key, value);
  if (this === localStorage && SYNC_KEYS.includes(key)) {
    meta[key] = { ts: Date.now(), by: getDeviceId() };
    saveMeta();
    schedulePush(key);
  }
};

function schedulePush(key) {
  pending.add(key);
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushPending, 800);
}

function headers(extra) {
  return Object.assign({
    apikey: cfg.anonKey,
    Authorization: `Bearer ${cfg.anonKey}`
  }, extra);
}

async function pushPending() {
  if (!cfg) { pending.clear(); return; }
  const keys = [...pending];
  pending.clear();
  for (const key of keys) {
    let raw;
    try { raw = localStorage.getItem(key); } catch { continue; }
    if (raw == null) continue;
    try {
      await fetch(`${cfg.url}/rest/v1/${cfg.table}`, {
        method: 'POST',
        headers: headers({
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        }),
        body: JSON.stringify([{
          key,
          value: JSON.parse(raw),
          updated_at: new Date(meta[key] ? meta[key].ts : Date.now()).toISOString(),
          updated_by: getDeviceId()
        }])
      });
    } catch {}
  }
}

async function pull() {
  if (!cfg) return;
  for (const key of SYNC_KEYS) {
    try {
      const resp = await fetch(
        `${cfg.url}/rest/v1/${cfg.table}?key=eq.${encodeURIComponent(key)}&select=*`,
        { headers: headers({ Accept: 'application/json' }) }
      );
      if (!resp.ok) continue;
      const rows = await resp.json();
      const row = rows[0];
      const local = meta[key];
      if (!row) {
        if (!local && localStorage.getItem(key) != null) schedulePush(key);
        continue;
      }
      const rowTs = Date.parse(row.updated_at);
      if (local && rowTs <= local.ts) continue;
      origSetItem.call(localStorage, key, JSON.stringify(row.value));
      meta[key] = { ts: rowTs, by: row.updated_by || null };
      saveMeta();
      window.dispatchEvent(new CustomEvent('barca:remote', { detail: { key } }));
    } catch {}
  }
}

export function initSync() {
  cfg = window.BARCA_CONFIG || null;
  if (!cfg || !cfg.url || !cfg.anonKey || cfg.url.includes('YOUR-PROJECT') || cfg.anonKey.includes('YOUR-ANON-KEY')) return;
  getDeviceId();
  loadMeta();
  pull();
  setInterval(pull, POLL_MS);
  window.addEventListener('focus', pull);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pull();
  });
}
