import { getSteps, getTrip } from './data.js';
import { localized, getLang } from './i18n.js';
import { stepDepart, fmtTime } from './time.js';
import { edited } from './edits.js';

const KEY = 'barca-alerts';
const LEAD_MS = 30 * 60 * 1000;
let timers = [];

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

export function isAlertSet(stepId) { return !!load()[stepId]; }

export function toggleAlert(stepId) {
  const state = load();
  if (state[stepId]) {
    delete state[stepId];
    save(state);
    scheduleAll();
    return false;
  }
  state[stepId] = true;
  save(state);
  scheduleAll();
  return true;
}

export async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function scheduleAll() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
  const state = load();
  const steps = getSteps();
  const tz = getTrip().defaultTimezone;
  const lang = getLang();
  const now = Date.now();

  for (const step of steps) {
    if (!state[step.id]) continue;
    const dep = stepDepart(step, tz);
    if (!dep) continue;
    const alertTime = dep.getTime() - LEAD_MS;
    const delay = alertTime - now;
    if (delay < 0) continue;
    if (delay > 2147483647) continue;

    const title = edited(step.title, `step.${step.id}.title`, lang);
    const time = fmtTime(dep, step.departTz || tz);

    const tid = setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(`${title}`, {
          body: `Departing at ${time} — 30 minutes from now`,
          icon: './icons/icon-192.png',
          tag: `barca-${step.id}`,
          renotify: true,
        });
      }
    }, delay);
    timers.push(tid);
  }
}

export function getAlertCount() {
  return Object.keys(load()).length;
}
