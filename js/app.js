import { loadTrip } from './data.js';
import { initI18n, setLang, getLang, onLangChange, t } from './i18n.js';
import { initNow, goToStep } from './now.js';
import { initTimeline } from './timeline.js';
import { initMap, flyToPlace, downloadTiles } from './map.js';
import { initWallet, openTicket } from './wallet.js';
import { showChecklist } from './checklist.js';
import { scheduleAll } from './alerts.js';

let currentTab = 'now';

async function boot() {
  await Promise.all([loadTrip(), initI18n()]);
  setupTabs();
  setupMenu();
  setupLang();
  switchTab('now');
  updateLabels();
  onLangChange(() => { updateLabels(); switchTab(currentTab, true); });

  window.addEventListener('barca-nav', e => {
    const { tab, place, ticket } = e.detail;
    switchTab(tab);
    if (place) setTimeout(() => flyToPlace(place), 300);
    if (ticket) setTimeout(() => openTicket(ticket), 100);
  });

  scheduleAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
  }
}

function setupTabs() {
  document.querySelectorAll('#tab-bar button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

let mapInited = false;
function switchTab(tab, force = false) {
  if (tab === currentTab && !force) { refreshTab(tab); return; }
  currentTab = tab;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  document.querySelectorAll('#tab-bar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  refreshTab(tab);
}

function refreshTab(tab) {
  const el = document.getElementById(`tab-${tab}`);
  if (tab === 'now') initNow(el);
  if (tab === 'timeline') initTimeline(el);
  if (tab === 'map') { initMap(el); mapInited = true; }
  if (tab === 'wallet') initWallet(el);
}

function setupMenu() {
  const btn = document.getElementById('menu-btn');
  const drawer = document.getElementById('menu-drawer');
  btn.addEventListener('click', () => drawer.classList.toggle('hidden'));
  drawer.addEventListener('click', e => {
    if (e.target === drawer) drawer.classList.add('hidden');
    const action = e.target.closest('[data-menu]')?.dataset.menu;
    if (action === 'checklist') showChecklist();
    if (action === 'phrases') showPhrases();
    if (action === 'emergency') showEmergency();
    if (action === 'lang') toggleLang();
    if (action) drawer.classList.add('hidden');
  });
}

function setupLang() {}

function toggleLang() {
  setLang(getLang() === 'en' ? 'ro' : 'en');
}

function updateLabels() {
  document.querySelectorAll('#tab-bar button').forEach(btn => {
    btn.textContent = t(`tabs.${btn.dataset.tab}`);
  });
  document.querySelector('[data-menu="checklist"]').textContent = t('menu.checklist');
  document.querySelector('[data-menu="phrases"]').textContent = t('menu.phrases');
  document.querySelector('[data-menu="emergency"]').textContent = t('menu.emergency');
  document.querySelector('[data-menu="lang"]').textContent = t('menu.language');

  const dlBtn = document.querySelector('[data-menu="download"]');
  if (dlBtn) dlBtn.textContent = t('map.downloadTiles');
}

function showPhrases() {
  import('./data.js').then(({ getPhrases }) => {
    const phrases = getPhrases();
    const overlay = document.getElementById('detail-overlay');
    let html = `<div class="detail-sheet"><button class="detail-close">✕</button><h2>${t('phrases.title')}</h2>`;
    for (const group of phrases) {
      html += `<h3>${localized(group.label)}</h3>`;
      for (const p of group.items) {
        html += `<div class="phrase"><div class="phrase-foreign">${p.phrase}</div><div class="phrase-meaning">${localized(p)}</div></div>`;
      }
    }
    html += '</div>';
    overlay.innerHTML = html;
    overlay.classList.remove('hidden');
    overlay.querySelector('.detail-close').addEventListener('click', () => overlay.classList.add('hidden'));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
  });
}

function showEmergency() {
  import('./data.js').then(({ getEmergency }) => {
    const em = getEmergency();
    const overlay = document.getElementById('detail-overlay');
    overlay.innerHTML = `
      <div class="detail-sheet">
        <button class="detail-close">✕</button>
        <h2>${t('emergency.title')}</h2>
        <a href="tel:${em.number}" class="btn emergency-call">📞 ${t('emergency.call')}</a>
        <h3>${t('emergency.accommodation')}</h3>
        <p>${localized(em.accommodation?.name)}<br>${em.accommodation?.address || 'TBD'}<br>${em.accommodation?.phone || ''}</p>
        <h3>${t('emergency.contacts')}</h3>
        ${(em.contacts || []).map(c => `<p><strong>${c.name}</strong> ${c.phone !== 'TODO' ? `<a href="tel:${c.phone}">${c.phone}</a>` : 'TBD'}</p>`).join('')}
      </div>`;
    overlay.classList.remove('hidden');
    overlay.querySelector('.detail-close').addEventListener('click', () => overlay.classList.add('hidden'));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
  });
}

function localized(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[getLang()] || obj.en || '';
}

boot();
