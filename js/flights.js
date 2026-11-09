import { getSteps, getFlights, getPlace, getTrip } from './data.js';
import { t, localized } from './i18n.js';
import { stepDepart, stepArrive, formatCountdown, fmtTime, fmtDate } from './time.js';
import { editableField } from './edits.js';

let timer = null;

export function initFlights(el) {
  render(el);
  if (timer) clearInterval(timer);
  timer = setInterval(() => updateCountdowns(el), 1000);
}

function render(el) {
  const steps = getSteps().filter(s => s.mode === 'plane');
  const flights = getFlights();
  const tz = getTrip().defaultTimezone;

  let html = '';

  for (const step of steps) {
    const fl = flights[step.id] || {};
    const dep = stepDepart(step, tz);
    const arr = stepArrive(step, tz);
    const now = Date.now();
    const depMs = dep ? dep.getTime() : null;
    const arrMs = arr ? arr.getTime() : null;

    let status = 'upcoming';
    if (depMs && depMs <= now && arrMs && arrMs > now) status = 'in-flight';
    else if (arrMs && arrMs <= now) status = 'landed';
    else if (depMs && depMs <= now) status = 'in-flight';

    const statusClass = status === 'in-flight' ? 'fl-status-live' : status === 'landed' ? 'fl-status-landed' : '';
    const statusLabel = status === 'in-flight' ? t('flights.inFlight') : status === 'landed' ? t('flights.landed') : t('flights.upcoming');

    const depTime = dep ? fmtTime(dep, step.departTz || tz) : '—';
    const arrTime = arr ? fmtTime(arr, step.arriveTz || tz) : '—';
    const depTzLabel = step.departTz === 'Europe/Bucharest' ? 'EET' : 'CET';
    const arrTzLabel = 'CET';

    let countdown = '';
    if (dep && dep.getTime() > now) {
      const cd = formatCountdown(dep.getTime() - now);
      countdown = `<div class="fl-countdown${cd.urgent ? ' urgent' : ''}" data-ref="${dep.getTime()}">${t('time.in').replace('{time}', cd.text)}</div>`;
    } else if (status === 'in-flight' && arr) {
      const cd = formatCountdown(arr.getTime() - now);
      countdown = `<div class="fl-countdown fl-landing" data-ref="${arr.getTime()}">${t('flights.landing').replace('{time}', cd.text)}</div>`;
    }

    html += `
      <div class="fl-card${status === 'in-flight' ? ' fl-live' : ''}" data-step="${step.id}">
        <div class="fl-header">
          <div class="fl-airline" data-flight-edit="airline" data-step="${step.id}"></div>
          <span class="fl-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div class="fl-number" data-flight-edit="flightNumber" data-step="${step.id}"></div>
        <div class="fl-passenger" data-flight-edit="passenger" data-step="${step.id}"></div>

        <div class="fl-route">
          <div class="fl-airport">
            <span class="fl-code" data-flight-edit="fromCode" data-step="${step.id}"></span>
            <span class="fl-city" data-flight-edit="fromCity" data-step="${step.id}"></span>
            <span class="fl-time">${depTime}${step.departTz !== tz ? ` <small>${depTzLabel}</small>` : ''}</span>
          </div>
          <div class="fl-arrow">
            <span class="fl-line"></span>
            <span class="fl-plane-icon">✈</span>
            <span class="fl-line"></span>
          </div>
          <div class="fl-airport">
            <span class="fl-code" data-flight-edit="toCode" data-step="${step.id}"></span>
            <span class="fl-city" data-flight-edit="toCity" data-step="${step.id}"></span>
            <span class="fl-time">${arrTime} <small>${arrTzLabel}</small></span>
          </div>
        </div>

        <div class="fl-date">${fmtDate(step.day)}</div>

        <div class="fl-meta">
          <span data-flight-edit="aircraft" data-step="${step.id}"></span>
          <span data-flight-edit="duration" data-step="${step.id}"></span>
        </div>

        ${countdown}

        <div class="fl-actions">
          ${fl.tracking?.fr24 ? `<a href="${fl.tracking.fr24}" target="_blank" rel="noopener" class="btn fl-track">FlightRadar24</a>` : ''}
          ${fl.tracking?.flightaware ? `<a href="${fl.tracking.flightaware}" target="_blank" rel="noopener" class="btn fl-track">FlightAware</a>` : ''}
          ${fl.tracking?.ryanair ? `<a href="${fl.tracking.ryanair}" target="_blank" rel="noopener" class="btn fl-track">${t('flights.searchFlights')}</a>` : ''}
        </div>

        ${step.notes ? `<div class="fl-notes">${localized(step.notes)}</div>` : ''}
        ${step.planB ? `<details class="planb"><summary>⚠️ ${t('now.planB')}</summary><p>${localized(step.planB)}</p></details>` : ''}
      </div>`;
  }

  if (!html) {
    html = `<p class="fl-empty">${t('flights.noFlights')}</p>`;
  }

  el.innerHTML = html;

  el.querySelectorAll('[data-flight-edit]').forEach(ph => {
    const field = ph.dataset.flightEdit;
    const sid = ph.dataset.step;
    const step = steps.find(s => s.id === sid);
    const src = flightFieldSource(flights[sid] || {}, step, field);
    const original = typeof src === 'string' ? src : localized(src);
    ph.replaceWith(editableField(`flight.${sid}.${field}`, original, {
      tag: ph.tagName.toLowerCase(),
      cls: ph.className
    }));
  });
}

function flightFieldSource(fl, step, field) {
  switch (field) {
    case 'airline': return fl.airline || localized(step?.title);
    case 'flightNumber': return fl.flightNumber || '';
    case 'passenger': return fl.passenger || '';
    case 'fromCode': return fl.from?.code || '';
    case 'fromCity': return fl.from?.city || '';
    case 'toCode': return fl.to?.code || '';
    case 'toCity': return fl.to?.city || '';
    case 'aircraft': return fl.aircraft || '';
    case 'duration': return fl.duration || '';
    default: return '';
  }
}

function updateCountdowns(el) {
  const countdowns = el.querySelectorAll('.fl-countdown[data-ref]');
  const now = Date.now();
  for (const cd of countdowns) {
    const ref = parseInt(cd.dataset.ref);
    const diff = ref - now;
    if (diff > 0) {
      const c = formatCountdown(diff);
      const isLanding = cd.classList.contains('fl-landing');
      cd.textContent = isLanding
        ? t('flights.landing').replace('{time}', c.text)
        : t('time.in').replace('{time}', c.text);
      cd.classList.toggle('urgent', c.urgent);
    } else {
      cd.remove();
    }
  }
}
