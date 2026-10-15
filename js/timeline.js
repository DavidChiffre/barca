import { getSteps, getDays, getPlace, getTrip } from './data.js';
import { t, localized, getLang } from './i18n.js';
import { stepDepart, stepArrive, stepStatus, fmtTime, fmtDate, duration } from './time.js';

const MODE = { plane: '✈️', coach: '🚌', train: '🚂', walk: '🚶', hotel: '🏨', mountain: '⛰️', shop: '🛒' };

export function initTimeline(el) { render(el); }

function render(el) {
  const days = getDays(), steps = getSteps(), tz = getTrip().defaultTimezone, lang = getLang();
  let html = '';
  for (const day of days) {
    const daySteps = steps.filter(s => s.day === day.date);
    html += `<div class="tl-day"><h3 class="tl-date">${fmtDate(day.date, lang)} &mdash; ${localized(day.label)}</h3>`;
    if (daySteps.length === 0) {
      html += `<div class="tl-empty">${day.rest ? localized(day.label) : ''}</div>`;
    }
    for (const step of daySteps) {
      const st = stepStatus(step, tz);
      const dep = stepDepart(step, tz), arr = stepArrive(step, tz);
      const from = getPlace(step.from), to = getPlace(step.to);
      const dur = duration(dep, arr);
      const timeStr = dep ? fmtTime(dep, step.departTz || tz) : arr ? fmtTime(arr, step.arriveTz || tz) : '';
      html += `
        <button class="tl-step ${st}" data-id="${step.id}">
          <span class="tl-mode">${MODE[step.mode] || ''}</span>
          <div class="tl-body">
            <div class="tl-title">${localized(step.title)}</div>
            <div class="tl-meta">
              ${timeStr ? `<span>${timeStr}${step.approximate ? ' ~' : ''}</span>` : ''}
              ${from && to && from.id !== to.id ? `<span>${localized(from.name)} → ${localized(to.name)}</span>` : from ? `<span>${localized(from.name)}</span>` : ''}
              ${dur ? `<span>${dur}</span>` : ''}
            </div>
          </div>
          <span class="tl-chevron">›</span>
        </button>`;
    }
    html += '</div>';
  }
  el.innerHTML = html;
  el.addEventListener('click', e => {
    const btn = e.target.closest('.tl-step');
    if (btn) showDetail(btn.dataset.id);
  });
}

function showDetail(id) {
  const steps = getSteps(), step = steps.find(s => s.id === id);
  if (!step) return;
  const tz = getTrip().defaultTimezone;
  const from = getPlace(step.from), to = getPlace(step.to);
  const dep = stepDepart(step, tz), arr = stepArrive(step, tz);
  const dur = duration(dep, arr);
  const overlay = document.getElementById('detail-overlay');

  overlay.innerHTML = `
    <div class="detail-sheet">
      <button class="detail-close">✕</button>
      <div class="detail-mode">${MODE[step.mode] || ''}</div>
      <h2>${localized(step.title)}</h2>
      ${dep ? `<div class="detail-row"><strong>Depart</strong> ${fmtTime(dep, step.departTz || tz)}${step.approximate ? ' ~' : ''}</div>` : ''}
      ${arr ? `<div class="detail-row"><strong>Arrive</strong> ${fmtTime(arr, step.arriveTz || tz)}${step.approximate ? ' ~' : ''}</div>` : ''}
      ${dur ? `<div class="detail-row"><strong>Duration</strong> ${dur}</div>` : ''}
      ${from ? `<div class="detail-row"><strong>From</strong> ${localized(from.name)}</div>` : ''}
      ${to ? `<div class="detail-row"><strong>To</strong> ${localized(to.name)}</div>` : ''}
      ${step.notes ? `<div class="detail-notes">${localized(step.notes)}</div>` : ''}
      ${step.planB ? `<div class="detail-planb"><strong>⚠️ ${t('now.planB')}</strong><p>${localized(step.planB)}</p></div>` : ''}
      <div class="detail-actions">
        ${step.ticket ? `<button class="btn" data-action="ticket" data-id="${step.ticket}">🎫 ${t('now.openTicket')}</button>` : ''}
        ${step.bookingUrl ? `<a href="${step.bookingUrl}" target="_blank" rel="noopener" class="btn">${t('now.bookThis')}</a>` : ''}
        ${from ? `<button class="btn" data-action="map" data-place="${step.from}">📍 ${t('now.showOnMap')}</button>` : ''}
      </div>
    </div>`;

  overlay.classList.remove('hidden');
  overlay.querySelector('.detail-close').addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.querySelector('[data-action="map"]')?.addEventListener('click', e => {
    overlay.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('barca-nav', { detail: { tab: 'map', place: e.target.dataset.place } }));
  });
  overlay.querySelector('[data-action="ticket"]')?.addEventListener('click', e => {
    overlay.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('barca-nav', { detail: { tab: 'wallet', ticket: e.target.dataset.id } }));
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
}
