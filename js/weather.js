import { getTrip } from './data.js';
import { t, localized } from './i18n.js';

const CACHE_KEY = 'barca-weather-cache';
const CACHE_TTL = 30 * 60 * 1000;

const LOCATIONS = [
  { id: 'les-houches', lat: 45.891, lng: 6.799, tz: 'Europe/Paris' },
  { id: 'milan', lat: 45.485, lng: 9.205, tz: 'Europe/Rome' }
];

const WMO_CODES = {
  0: { en: 'Clear sky', ro: 'Cer senin', icon: '☀️' },
  1: { en: 'Mainly clear', ro: 'Predominant senin', icon: '🌤️' },
  2: { en: 'Partly cloudy', ro: 'Parțial noros', icon: '⛅' },
  3: { en: 'Overcast', ro: 'Înnorat', icon: '☁️' },
  45: { en: 'Fog', ro: 'Ceață', icon: '🌫️' },
  48: { en: 'Rime fog', ro: 'Ceață cu chiciură', icon: '🌫️' },
  51: { en: 'Light drizzle', ro: 'Burniță ușoară', icon: '🌦️' },
  53: { en: 'Drizzle', ro: 'Burniță', icon: '🌦️' },
  55: { en: 'Dense drizzle', ro: 'Burniță densă', icon: '🌦️' },
  56: { en: 'Freezing drizzle', ro: 'Burniță înghețată', icon: '🌧️' },
  57: { en: 'Heavy freezing drizzle', ro: 'Burniță înghețată puternică', icon: '🌧️' },
  61: { en: 'Light rain', ro: 'Ploaie ușoară', icon: '🌧️' },
  63: { en: 'Rain', ro: 'Ploaie', icon: '🌧️' },
  65: { en: 'Heavy rain', ro: 'Ploaie torențială', icon: '🌧️' },
  66: { en: 'Freezing rain', ro: 'Ploaie înghețată', icon: '🌧️' },
  67: { en: 'Heavy freezing rain', ro: 'Ploaie înghețată puternică', icon: '🌧️' },
  71: { en: 'Light snow', ro: 'Ninsoare ușoară', icon: '🌨️' },
  73: { en: 'Snow', ro: 'Ninsoare', icon: '🌨️' },
  75: { en: 'Heavy snow', ro: 'Ninsoare puternică', icon: '❄️' },
  77: { en: 'Snow grains', ro: 'Granule de zăpadă', icon: '🌨️' },
  80: { en: 'Light showers', ro: 'Averse ușoare', icon: '🌦️' },
  81: { en: 'Showers', ro: 'Averse', icon: '🌧️' },
  82: { en: 'Heavy showers', ro: 'Averse puternice', icon: '🌧️' },
  85: { en: 'Light snow showers', ro: 'Averse de zăpadă ușoare', icon: '🌨️' },
  86: { en: 'Heavy snow showers', ro: 'Averse de zăpadă puternice', icon: '❄️' },
  95: { en: 'Thunderstorm', ro: 'Furtună', icon: '⛈️' },
  96: { en: 'Thunderstorm with hail', ro: 'Furtună cu grindină', icon: '⛈️' },
  99: { en: 'Heavy thunderstorm', ro: 'Furtună puternică', icon: '⛈️' }
};

function todayISO() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function temp(v) {
  const rounded = Math.round(v);
  return `${rounded < 0 ? '−' + Math.abs(rounded) : rounded}°`;
}

function wmoDesc(code, lang) {
  const w = WMO_CODES[code] || WMO_CODES[3];
  return { text: w[lang] || w.en, icon: w.icon };
}

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }));
  } catch {}
}

async function fetchLiveWeather() {
  const cached = getCached();
  if (cached) return cached;

  const results = {};
  const fetches = LOCATIONS.map(async loc => {
    const params = new URLSearchParams({
      latitude: loc.lat,
      longitude: loc.lng,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
      timezone: loc.tz,
      forecast_days: '10'
    });
    try {
      const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!resp.ok) return;
      results[loc.id] = await resp.json();
    } catch {}
  });

  await Promise.all(fetches);
  if (Object.keys(results).length === 0) return null;

  const data = { locations: results };
  setCache(data);
  return data;
}

export async function initWeather(el) {
  const w = getTrip()?.weather;
  if (!w) { el.innerHTML = ''; return; }
  const today = todayISO();

  renderStatic(el, w, today);

  const live = await fetchLiveWeather();
  if (live) {
    renderWithLive(el, w, today, live);
  }
}

function renderWithLive(el, w, today, live) {
  const lang = (localStorage.getItem('barca-lang') || 'en');

  let html = '';

  html += `<h3 class="wx-section-title">${t('weather.liveNow')}</h3>`;

  for (const loc of LOCATIONS) {
    const data = live.locations[loc.id];
    if (!data?.current) continue;

    const c = data.current;
    const wmo = wmoDesc(c.weather_code, lang);
    const place = w.places.find(p => p.id === loc.id);
    const name = place ? localized(place.name) : loc.id;

    html += `
      <div class="wx-live-card">
        <div class="wx-live-header">
          <span class="wx-live-icon">${wmo.icon}</span>
          <div>
            <div class="wx-live-name">${name}</div>
            <div class="wx-live-desc">${wmo.text}</div>
          </div>
        </div>
        <div class="wx-live-temp">${temp(c.temperature_2m)}</div>
        <div class="wx-live-details">
          <span>${t('weather.feelsLike')} ${temp(c.apparent_temperature)}</span>
          <span>💧 ${c.relative_humidity_2m}%</span>
          <span>💨 ${Math.round(c.wind_speed_10m)} km/h</span>
          ${c.precipitation > 0 ? `<span>🌧️ ${c.precipitation} mm</span>` : ''}
        </div>
      </div>`;
  }

  const tripDates = w.places.flatMap(p => p.days || []);
  const uniqueDates = [...new Set(tripDates)].sort();

  html += `<h3 class="wx-section-title">${t('weather.tripForecast')}</h3>`;

  for (const loc of LOCATIONS) {
    const data = live.locations[loc.id];
    if (!data?.daily) continue;

    const place = w.places.find(p => p.id === loc.id);
    const name = place ? localized(place.name) : loc.id;
    const relevantDates = place ? (place.days || []) : uniqueDates;

    const daily = data.daily;
    const forecastDays = [];
    for (let i = 0; i < daily.time.length; i++) {
      if (relevantDates.includes(daily.time[i])) {
        forecastDays.push({
          date: daily.time[i],
          code: daily.weather_code[i],
          high: daily.temperature_2m_max[i],
          low: daily.temperature_2m_min[i],
          precip: daily.precipitation_sum[i],
          precipProb: daily.precipitation_probability_max[i],
          wind: daily.wind_speed_10m_max[i]
        });
      }
    }

    if (forecastDays.length === 0) continue;

    html += `<div class="wx-forecast-block"><div class="wx-forecast-name">${name}</div>`;
    html += `<div class="wx-forecast-grid">`;
    for (const day of forecastDays) {
      const wmo = wmoDesc(day.code, lang);
      const d = new Date(day.date + 'T12:00:00Z');
      const dayLabel = d.toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-GB', { weekday: 'short', day: 'numeric' });
      const isToday = day.date === today;

      html += `
        <div class="wx-forecast-day${isToday ? ' today' : ''}">
          <div class="wx-fc-date">${dayLabel}</div>
          <div class="wx-fc-icon">${wmo.icon}</div>
          <div class="wx-fc-temps">
            <span class="hi">${temp(day.high)}</span>
            <span class="lo">${temp(day.low)}</span>
          </div>
          ${day.precipProb > 20 ? `<div class="wx-fc-precip">💧 ${day.precipProb}%</div>` : ''}
        </div>`;
    }
    html += `</div></div>`;
  }

  const lastUpdated = new Date();
  html += `<div class="wx-updated">${t('weather.lastUpdated')} ${lastUpdated.toLocaleTimeString(lang === 'ro' ? 'ro-RO' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</div>`;

  html += `<h3 class="wx-section-title">${t('weather.averages')}</h3>`;
  html += renderStaticContent(w, today);

  el.innerHTML = html;
}

function renderStatic(el, w, today) {
  let html = `<p class="wx-note">${localized(w.note)}</p>`;
  html += renderStaticContent(w, today);
  el.innerHTML = html;
}

function renderStaticContent(w, today) {
  let html = '';

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

  return html;
}
