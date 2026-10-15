import { getSteps, getPlace, getTrip, getDays } from './data.js';
import { t, localized, getLang } from './i18n.js';
import { stepDepart, stepArrive, stepStatus, formatCountdown, fmtTime, fmtDate, findCurrentIndex } from './time.js';
import { editableField, edited } from './edits.js';

const MODE = { plane: '✈️', coach: '🚌', train: '🚂', walk: '🚶', hotel: '🏨', mountain: '⛰️', shop: '🛒' };
let idx = 0, timer = null, touchX = 0;

export function initNow(el) {
  const steps = getSteps(), tz = getTrip().defaultTimezone;
  idx = findCurrentIndex(steps, tz);
  render(el);
  if (timer) clearInterval(timer);
  timer = setInterval(() => tick(el), 1000);
  el.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) { idx = Math.max(0, Math.min(getSteps().length - 1, idx + (dx < 0 ? 1 : -1))); render(el); }
  }, { passive: true });
}

export function goToStep(i) {
  idx = i;
  const el = document.getElementById('tab-now');
  if (el) render(el);
}

function render(el) {
  const steps = getSteps(), step = steps[idx], trip = getTrip(), tz = trip.defaultTimezone;
  const lang = getLang();
  const dep = stepDepart(step, tz), arr = stepArrive(step, tz);
  const from = getPlace(step.from), to = getPlace(step.to);
  const status = stepStatus(step, tz);
  const now = Date.now();
  const sid = step.id;

  let dualClock = '';
  if (step.departTz === 'Europe/Bucharest' && dep) {
    dualClock = `<div class="dual-clock">${fmtTime(dep, tz)} Italy · ${fmtTime(dep, 'Europe/Bucharest')} Timișoara</div>`;
  }

  let countdown = '';
  const ref = dep || arr;
  if (ref && ref.getTime() > now) {
    const cd = formatCountdown(ref.getTime() - now);
    countdown = `<div class="countdown${cd.urgent ? ' urgent' : ''}">${t('time.in').replace('{time}', cd.text)}</div>`;
  } else if (status === 'in-progress') {
    countdown = `<div class="countdown active">${t('now.inProgress')}</div>`;
  } else if (status === 'today') {
    const dayInfo = getDays().find(d => d.date === step.day);
    countdown = `<div class="countdown rest">${localized(dayInfo?.label) || localized(step.title)}</div>`;
  }

  const statusLabel = status === 'in-progress' ? t('now.inProgress') : status === 'past' ? t('now.departed') : status === 'today' ? '' : t('now.next');
  const timeStr = dep ? fmtTime(dep, step.departTz || tz) : arr ? fmtTime(arr, step.arriveTz || tz) : '';

  el.innerHTML = `
    <div class="now-card">
      ${dualClock}
      <div class="now-mode">${MODE[step.mode] || '📍'}</div>
      ${statusLabel ? `<div class="now-status">${statusLabel}</div>` : ''}
      <h2 class="now-title" data-editable="step.${sid}.title"></h2>
      ${timeStr ? `<div class="now-time">${timeStr}${step.approximate ? ' ~' : ''}</div>` : ''}
      ${countdown}
      ${from ? `<div class="now-place"><span class="pin">📍</span> <span data-editable="place.${step.from}.name"></span>${from.note ? `<small data-editable="place.${step.from}.note"></small>` : ''}<button class="btn-sm" data-action="map" data-place="${step.from}">${t('now.showOnMap')}</button></div>` : ''}
      ${step.notes ? `<div class="now-notes" data-editable="step.${sid}.notes"></div>` : ''}
      ${step.ticket ? `<button class="btn-ticket" data-action="ticket" data-id="${step.ticket}">🎫 ${t('now.openTicket')}</button>` : ''}
      ${step.bookingUrl && !step.ticket ? `<a href="${step.bookingUrl}" target="_blank" rel="noopener" class="btn-book">${t('now.bookThis')}</a>` : ''}
      ${step.planB ? `<details class="planb"><summary>⚠️ ${t('now.planB')}</summary><p data-editable="step.${sid}.planB"></p></details>` : ''}
    </div>
    <div class="dots">${steps.map((_, i) => `<span class="dot${i === idx ? ' on' : ''}${i < idx ? ' past' : ''}"></span>`).join('')}</div>`;

  bindEditables(el, step, from, lang);

  el.querySelector('[data-action="map"]')?.addEventListener('click', e => {
    window.dispatchEvent(new CustomEvent('barca-nav', { detail: { tab: 'map', place: e.target.dataset.place } }));
  });
  el.querySelector('[data-action="ticket"]')?.addEventListener('click', e => {
    window.dispatchEvent(new CustomEvent('barca-nav', { detail: { tab: 'wallet', ticket: e.target.dataset.id } }));
  });
}

function bindEditables(el, step, from, lang) {
  el.querySelectorAll('[data-editable]').forEach(placeholder => {
    const path = placeholder.dataset.editable;
    let original = '';
    let multiline = false;

    if (path.startsWith('step.')) {
      const field = path.split('.')[2];
      if (field === 'title') original = localized(step.title);
      else if (field === 'notes') { original = localized(step.notes); multiline = true; }
      else if (field === 'planB') { original = localized(step.planB); multiline = true; }
    } else if (path.startsWith('place.')) {
      const field = path.split('.')[2];
      if (field === 'name') original = localized(from?.name);
      else if (field === 'note') original = localized(from?.note);
    }

    const edField = editableField(path, original, {
      tag: placeholder.tagName.toLowerCase(),
      cls: placeholder.className,
      multiline
    });
    placeholder.replaceWith(edField);
  });
}

function tick(el) {
  const cd = el.querySelector('.countdown');
  if (!cd) return;
  const steps = getSteps(), step = steps[idx], tz = getTrip().defaultTimezone;
  const ref = stepDepart(step, tz) || stepArrive(step, tz);
  if (!ref) return;
  const diff = ref.getTime() - Date.now();
  if (diff > 0) {
    const c = formatCountdown(diff);
    cd.textContent = t('time.in').replace('{time}', c.text);
    cd.classList.toggle('urgent', c.urgent);
  } else if (stepStatus(step, tz) === 'in-progress') {
    cd.textContent = t('now.inProgress');
    cd.className = 'countdown active';
  } else if (idx < steps.length - 1) {
    idx++; render(el);
  }
}
