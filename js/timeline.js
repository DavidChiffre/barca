import { getSteps, getDays, getPlace, getTrip } from './data.js';
import { t, localized, getLang } from './i18n.js';
import { stepDepart, stepArrive, stepStatus, fmtTime, fmtDate, duration } from './time.js';
import { editableField, edited, getDayOrder, setDayOrder } from './edits.js';

const MODE = { plane: '✈️', coach: '🚌', train: '🚂', walk: '🚶', hotel: '🏨', mountain: '⛰️', shop: '🛒' };

export function initTimeline(el) { render(el); }

function getRestDays() { return getDays().filter(d => d.rest); }

function getOrderedRestSteps() {
  const restDays = getRestDays();
  const restDates = restDays.map(d => d.date);
  const steps = getSteps();
  const restSteps = steps.filter(s => restDates.includes(s.day));
  const saved = getDayOrder();
  if (saved && saved.length === restSteps.length) {
    const ordered = [];
    for (const id of saved) {
      const s = restSteps.find(rs => rs.id === id);
      if (s) ordered.push(s);
    }
    if (ordered.length === restSteps.length) return ordered;
  }
  restSteps.sort((a, b) => restDates.indexOf(a.day) - restDates.indexOf(b.day));
  return restSteps;
}

function render(el) {
  const days = getDays(), steps = getSteps(), tz = getTrip().defaultTimezone, lang = getLang();
  const restDays = getRestDays();
  const restDates = restDays.map(d => d.date);
  const orderedRest = getOrderedRestSteps();

  let html = '';
  for (const day of days) {
    if (restDates.includes(day.date)) {
      if (day.date !== restDates[0]) continue;
      html += renderRestBlock(restDays, orderedRest, tz, lang);
      continue;
    }
    const daySteps = steps.filter(s => s.day === day.date);
    html += `<div class="tl-day"><h3 class="tl-date">${fmtDate(day.date, lang)} &mdash; ${localized(day.label)}</h3>`;
    if (daySteps.length === 0) {
      html += `<div class="tl-empty">${day.rest ? localized(day.label) : ''}</div>`;
    }
    for (const step of daySteps) {
      html += renderStep(step, tz, lang);
    }
    html += '</div>';
  }
  el.innerHTML = html;

  el.querySelectorAll('.tl-step:not(.tl-drag-step)').forEach(btn => {
    btn.addEventListener('click', () => showDetail(btn.dataset.id));
  });

  initDrag(el, restDays, orderedRest, tz, lang);
}

function renderRestBlock(restDays, orderedRest, tz, lang) {
  let html = '<div class="tl-rest-block">';
  for (let i = 0; i < restDays.length; i++) {
    const day = restDays[i];
    const step = orderedRest[i];
    html += `<div class="tl-day tl-rest-day" data-day-index="${i}">`;
    html += `<h3 class="tl-date">${fmtDate(day.date, lang)} &mdash; ${localized(day.label)}</h3>`;
    if (step) {
      const title = edited(step.title, `step.${step.id}.title`, lang);
      html += `
        <div class="tl-step tl-drag-step" data-id="${step.id}" data-drag-index="${i}">
          <span class="tl-drag-handle" aria-label="Drag to reorder">⠿</span>
          <span class="tl-mode">${MODE[step.mode] || ''}</span>
          <div class="tl-body">
            <div class="tl-title">${title}</div>
            <div class="tl-meta">
              ${step.notes ? `<span>${edited(step.notes, 'step.' + step.id + '.notes', lang).slice(0, 60)}${localized(step.notes).length > 60 ? '…' : ''}</span>` : ''}
            </div>
          </div>
          <span class="tl-chevron">›</span>
        </div>`;
    } else {
      html += `<div class="tl-empty"></div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderStep(step, tz, lang) {
  const st = stepStatus(step, tz);
  const dep = stepDepart(step, tz), arr = stepArrive(step, tz);
  const from = getPlace(step.from), to = getPlace(step.to);
  const dur = duration(dep, arr);
  const timeStr = dep ? fmtTime(dep, step.departTz || tz) : arr ? fmtTime(arr, step.arriveTz || tz) : '';
  const title = edited(step.title, `step.${step.id}.title`, lang);
  return `
    <button class="tl-step ${st}" data-id="${step.id}">
      <span class="tl-mode">${MODE[step.mode] || ''}</span>
      <div class="tl-body">
        <div class="tl-title">${title}</div>
        <div class="tl-meta">
          ${timeStr ? `<span>${timeStr}${step.approximate ? ' ~' : ''}</span>` : ''}
          ${from && to && from.id !== to.id ? `<span>${localized(from.name)} → ${localized(to.name)}</span>` : from ? `<span>${localized(from.name)}</span>` : ''}
          ${dur ? `<span>${dur}</span>` : ''}
        </div>
      </div>
      <span class="tl-chevron">›</span>
    </button>`;
}

function initDrag(el, restDays, orderedRest, tz, lang) {
  const dragSteps = el.querySelectorAll('.tl-drag-step');
  const restBlock = el.querySelector('.tl-rest-block');
  if (!restBlock || dragSteps.length === 0) return;

  dragSteps.forEach(stepEl => {
    stepEl.addEventListener('click', e => {
      if (!e.target.closest('.tl-drag-handle')) showDetail(stepEl.dataset.id);
    });
  });

  let dragEl = null, ghostEl = null, startY = 0, startIndex = -1;
  const slots = () => Array.from(restBlock.querySelectorAll('.tl-rest-day'));

  function handleTouchStart(e) {
    const handle = e.target.closest('.tl-drag-handle');
    if (!handle) return;
    const step = handle.closest('.tl-drag-step');
    if (!step) return;
    e.preventDefault();
    dragEl = step;
    startIndex = parseInt(step.dataset.dragIndex);
    startY = e.touches[0].clientY;

    ghostEl = step.cloneNode(true);
    ghostEl.classList.add('tl-ghost');
    const rect = step.getBoundingClientRect();
    ghostEl.style.width = rect.width + 'px';
    ghostEl.style.left = rect.left + 'px';
    ghostEl.style.top = rect.top + 'px';
    document.body.appendChild(ghostEl);

    step.classList.add('tl-dragging');
  }

  function handleTouchMove(e) {
    if (!dragEl || !ghostEl) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const dy = y - startY;
    const origRect = dragEl.getBoundingClientRect();
    ghostEl.style.top = (origRect.top + dy) + 'px';

    const allSlots = slots();
    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i];
      const rect = slot.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      slot.classList.toggle('tl-drop-above', y < mid && y > rect.top - 20);
      slot.classList.toggle('tl-drop-below', y >= mid && y < rect.bottom + 20);
    }
  }

  function handleTouchEnd(e) {
    if (!dragEl || !ghostEl) return;
    const y = e.changedTouches[0].clientY;
    ghostEl.remove();
    ghostEl = null;
    dragEl.classList.remove('tl-dragging');

    const allSlots = slots();
    let dropIndex = startIndex;
    for (let i = 0; i < allSlots.length; i++) {
      const rect = allSlots[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (y >= rect.top - 20 && y <= rect.bottom + 20) {
        dropIndex = i;
        break;
      }
    }
    allSlots.forEach(s => { s.classList.remove('tl-drop-above', 'tl-drop-below'); });

    if (dropIndex !== startIndex) {
      const newOrder = orderedRest.map(s => s.id);
      const [moved] = newOrder.splice(startIndex, 1);
      newOrder.splice(dropIndex, 0, moved);
      setDayOrder(newOrder);
      render(el);
    }
    dragEl = null;
  }

  restBlock.addEventListener('touchstart', handleTouchStart, { passive: false });
  restBlock.addEventListener('touchmove', handleTouchMove, { passive: false });
  restBlock.addEventListener('touchend', handleTouchEnd);

  // Mouse fallback for desktop testing
  let mouseDown = false;
  restBlock.addEventListener('mousedown', e => {
    const handle = e.target.closest('.tl-drag-handle');
    if (!handle) return;
    const step = handle.closest('.tl-drag-step');
    if (!step) return;
    e.preventDefault();
    mouseDown = true;
    dragEl = step;
    startIndex = parseInt(step.dataset.dragIndex);
    startY = e.clientY;

    ghostEl = step.cloneNode(true);
    ghostEl.classList.add('tl-ghost');
    const rect = step.getBoundingClientRect();
    ghostEl.style.width = rect.width + 'px';
    ghostEl.style.left = rect.left + 'px';
    ghostEl.style.top = rect.top + 'px';
    document.body.appendChild(ghostEl);
    step.classList.add('tl-dragging');
  });

  document.addEventListener('mousemove', e => {
    if (!mouseDown || !dragEl || !ghostEl) return;
    e.preventDefault();
    const dy = e.clientY - startY;
    const origRect = dragEl.getBoundingClientRect();
    ghostEl.style.top = (origRect.top + dy) + 'px';
    const allSlots = slots();
    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i];
      const rect = slot.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      slot.classList.toggle('tl-drop-above', e.clientY < mid && e.clientY > rect.top - 20);
      slot.classList.toggle('tl-drop-below', e.clientY >= mid && e.clientY < rect.bottom + 20);
    }
  });

  document.addEventListener('mouseup', e => {
    if (!mouseDown || !dragEl) return;
    mouseDown = false;
    if (ghostEl) ghostEl.remove();
    ghostEl = null;
    dragEl.classList.remove('tl-dragging');

    const allSlots = slots();
    let dropIndex = startIndex;
    for (let i = 0; i < allSlots.length; i++) {
      const rect = allSlots[i].getBoundingClientRect();
      if (e.clientY >= rect.top - 20 && e.clientY <= rect.bottom + 20) {
        dropIndex = i;
        break;
      }
    }
    allSlots.forEach(s => { s.classList.remove('tl-drop-above', 'tl-drop-below'); });

    if (dropIndex !== startIndex) {
      const newOrder = orderedRest.map(s => s.id);
      const [moved] = newOrder.splice(startIndex, 1);
      newOrder.splice(dropIndex, 0, moved);
      setDayOrder(newOrder);
      render(el);
    }
    dragEl = null;
  });
}

function showDetail(id) {
  const steps = getSteps(), step = steps.find(s => s.id === id);
  if (!step) return;
  const tz = getTrip().defaultTimezone, lang = getLang();
  const from = getPlace(step.from), to = getPlace(step.to);
  const dep = stepDepart(step, tz), arr = stepArrive(step, tz);
  const dur = duration(dep, arr);
  const overlay = document.getElementById('detail-overlay');
  const sid = step.id;

  overlay.innerHTML = `
    <div class="detail-sheet">
      <button class="detail-close">✕</button>
      <div class="detail-mode">${MODE[step.mode] || ''}</div>
      <h2 data-editable="step.${sid}.title"></h2>
      ${dep ? `<div class="detail-row"><strong>Depart</strong> ${fmtTime(dep, step.departTz || tz)}${step.approximate ? ' ~' : ''}</div>` : ''}
      ${arr ? `<div class="detail-row"><strong>Arrive</strong> ${fmtTime(arr, step.arriveTz || tz)}${step.approximate ? ' ~' : ''}</div>` : ''}
      ${dur ? `<div class="detail-row"><strong>Duration</strong> ${dur}</div>` : ''}
      ${from ? `<div class="detail-row"><strong>From</strong> <span data-editable="place.${step.from}.name"></span></div>` : ''}
      ${to ? `<div class="detail-row"><strong>To</strong> <span data-editable="place.${step.to}.name"></span></div>` : ''}
      ${step.notes ? `<div class="detail-notes" data-editable="step.${sid}.notes"></div>` : ''}
      ${step.planB ? `<div class="detail-planb"><strong>⚠️ ${t('now.planB')}</strong><p data-editable="step.${sid}.planB"></p></div>` : ''}
      <div class="detail-actions">
        ${step.ticket ? `<button class="btn" data-action="ticket" data-id="${step.ticket}">🎫 ${t('now.openTicket')}</button>` : ''}
        ${step.bookingUrl ? `<a href="${step.bookingUrl}" target="_blank" rel="noopener" class="btn">${t('now.bookThis')}</a>` : ''}
        ${from ? `<button class="btn" data-action="map" data-place="${step.from}">📍 ${t('now.showOnMap')}</button>` : ''}
      </div>
    </div>`;

  const sheet = overlay.querySelector('.detail-sheet');
  sheet.querySelectorAll('[data-editable]').forEach(placeholder => {
    const path = placeholder.dataset.editable;
    let original = '', multiline = false;
    if (path.startsWith('step.')) {
      const field = path.split('.')[2];
      if (field === 'title') original = localized(step.title);
      else if (field === 'notes') { original = localized(step.notes); multiline = true; }
      else if (field === 'planB') { original = localized(step.planB); multiline = true; }
    } else if (path.startsWith('place.')) {
      const parts = path.split('.');
      const placeId = parts[1], field = parts[2];
      const place = getPlace(placeId);
      if (field === 'name') original = localized(place?.name);
      else if (field === 'note') original = localized(place?.note);
    }
    const edField = editableField(path, original, {
      tag: placeholder.tagName.toLowerCase(),
      cls: placeholder.className,
      multiline
    });
    placeholder.replaceWith(edField);
  });

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
