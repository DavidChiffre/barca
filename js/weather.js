import { getTrip } from './data.js';
import { t, localized } from './i18n.js';

function todayISO() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function temp(v) {
  return `${v < 0 ? '\u2212' + Math.abs(v) : v}°`;
}

export function initWeather(el) {
  const w = getTrip()?.weather;
  if (!w) { el.innerHTML = ''; return; }
  const today = todayISO();

  let html = `<p class="wx-note">${localized(w.note)}</p>`;

  if (w.daylight) {
    html += `
      <div class="wx-daylight">
        <div class="wx-daylight-label">${localized(w.daylight.label)}</div>
        <div class="wx-daylight-times">
          <span>☀︎ ${t('weather.sunrise')} <strong>${w.daylight.sunrise}</strong></span>
          <span>☾ ${t('weather.sunset')} <strong>${w.daylight.sunset}</strong></span>
        </div>
      </div>`;
  }

  for (const p of w.places) {
    const isToday = (p.days || []).includes(today);
    html += `
      <div class="wx-card${isToday ? ' today' : ''}">
        <div class="wx-head">
          <div>
            <div class="wx-name">${localized(p.name)}</div>
            <div class="wx-meta">${localized(p.when)} · ${p.altitude.toLocaleString('en-GB')} m${isToday ? ` · <span class="wx-today">${t('weather.today')}</span>` : ''}</div>
          </div>
          ${p.estimate ? `<span class="wx-badge">${t('weather.estimate')}</span>` : ''}
        </div>
        <div class="wx-temps">
          <div class="wx-temp"><span class="wx-label">${t('weather.high')}</span><span class="wx-val hi">${p.estimate ? '≈' : ''}${temp(p.high)}</span></div>
          <div class="wx-temp"><span class="wx-label">${t('weather.low')}</span><span class="wx-val lo">${p.estimate ? '≈' : ''}${temp(p.low)}</span></div>
          ${p.mean !== undefined ? `<div class="wx-temp"><span class="wx-label">${t('weather.mean')}</span><span class="wx-val">${temp(p.mean)}</span></div>` : ''}
        </div>
        <p class="wx-notes">${localized(p.notes)}</p>
        ${p.estimate ? `<p class="wx-est">${localized(w.estimateNote)}</p>` : ''}
      </div>`;
  }

  if (w.forecastUrl) {
    html += `<a class="btn wx-forecast" href="${w.forecastUrl}" target="_blank" rel="noopener">${t('weather.forecast')} →</a>`;
  }

  if (w.sources?.length) {
    html += `<h3 class="wallet-section">${t('weather.sources')}</h3><ul class="wx-sources">`;
    for (const s of w.sources) {
      html += `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`;
    }
    html += '</ul>';
  }

  el.innerHTML = html;
}
