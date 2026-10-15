export function parseLocalTime(dateStr, timeStr, tz = 'Europe/Rome') {
  if (!timeStr) return null;
  const asUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const utcParts = dateParts(asUtc, 'UTC');
  const tzParts = dateParts(asUtc, tz);
  const utcMin = utcParts.d * 1440 + utcParts.h * 60 + utcParts.m;
  const tzMin = tzParts.d * 1440 + tzParts.h * 60 + tzParts.m;
  return new Date(asUtc.getTime() - (tzMin - utcMin) * 60000);
}

function dateParts(date, tz) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  });
  const p = {};
  for (const { type, value } of f.formatToParts(date)) p[type[0]] = parseInt(value);
  return p;
}

export function stepDepart(step, tz) {
  return step.depart ? parseLocalTime(step.day, step.depart, step.departTz || tz) : null;
}

export function stepArrive(step, tz) {
  return step.arrive ? parseLocalTime(step.day, step.arrive, step.arriveTz || tz) : null;
}

export function stepRefTime(step, tz) {
  return stepDepart(step, tz) || stepArrive(step, tz);
}

export function findCurrentIndex(steps, tz) {
  const now = Date.now();
  for (let i = 0; i < steps.length; i++) {
    const arrive = stepArrive(steps[i], tz);
    const depart = stepDepart(steps[i], tz);
    if (arrive && arrive.getTime() > now) return i;
    if (!arrive && depart && depart.getTime() > now) return i;
    if (!arrive && !depart) {
      const today = todayStr(tz);
      if (steps[i].day >= today) return i;
    }
  }
  return steps.length - 1;
}

export function stepStatus(step, tz) {
  const now = Date.now();
  const d = stepDepart(step, tz);
  const a = stepArrive(step, tz);
  if (d && d.getTime() > now) return 'upcoming';
  if (a && a.getTime() > now) return 'in-progress';
  if (d && !a && d.getTime() <= now) return 'in-progress';
  if (!d && !a) {
    const today = todayStr(tz);
    if (step.day > today) return 'upcoming';
    if (step.day === today) return 'today';
  }
  return 'past';
}

function todayStr(tz) {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

export function formatCountdown(ms) {
  if (ms <= 0) return { text: 'now', urgent: true };
  const min = Math.floor(ms / 60000);
  if (min < 1) return { text: '< 1 min', urgent: true };
  if (min < 60) return { text: `${min} min`, urgent: min < 5 };
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return { text: `${h}h ${m}m`, urgent: false };
  const d = Math.floor(h / 24), rh = h % 24;
  return { text: `${d}d ${rh}h`, urgent: false };
}

export function fmtTime(date, tz = 'Europe/Rome') {
  return date.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
}

export function fmtDate(dateStr, lang = 'en') {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function duration(dep, arr) {
  if (!dep || !arr) return '';
  const min = Math.round((arr - dep) / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
