import { t, getLang } from './i18n.js';

const KEY = 'barca-checklist';

const DEFAULT_ITEMS = [
  { id: 'passports', cat: 'docs', en: 'Passports / ID cards', ro: 'Pasapoarte / carti de identitate' },
  { id: 'tickets-printed', cat: 'docs', en: 'Print / save all tickets', ro: 'Printeaza / salveaza toate biletele' },
  { id: 'hotel-confirmation', cat: 'docs', en: 'Hotel confirmation', ro: 'Confirmare hotel' },
  { id: 'travel-insurance', cat: 'docs', en: 'Travel insurance docs', ro: 'Documente asigurare calatorie' },
  { id: 'cash-eur', cat: 'money', en: 'Cash — euros', ro: 'Numerar — euro' },
  { id: 'cash-chf', cat: 'money', en: 'Cash — Swiss francs (for Brig–Martigny)', ro: 'Numerar — franci elvetieni (Brig–Martigny)' },
  { id: 'cards', cat: 'money', en: 'Bank cards', ro: 'Carduri bancare' },
  { id: 'phone-charger', cat: 'gear', en: 'Phone charger + cable', ro: 'Incarcator telefon + cablu' },
  { id: 'power-bank', cat: 'gear', en: 'Power bank (charged)', ro: 'Baterie externa (incarcata)' },
  { id: 'adapter', cat: 'gear', en: 'EU/CH plug adapter', ro: 'Adaptor priza EU/CH' },
  { id: 'warm-layers', cat: 'clothes', en: 'Warm layers — mountains are cold', ro: 'Straturi calde — la munte e frig' },
  { id: 'waterproof', cat: 'clothes', en: 'Waterproof jacket', ro: 'Geaca impermeabila' },
  { id: 'boots', cat: 'clothes', en: 'Walking boots / warm shoes', ro: 'Ghete de mers / pantofi caldurosi' },
  { id: 'gloves-hat', cat: 'clothes', en: 'Gloves, hat, scarf', ro: 'Manusi, caciula, fular' },
  { id: 'checkin-glen', cat: 'before', en: 'Glen: online check-in', ro: 'Glen: check-in online' },
  { id: 'checkin-anca', cat: 'before', en: 'Anca: online check-in (Wizz)', ro: 'Anca: check-in online (Wizz)' },
  { id: 'download-map', cat: 'before', en: 'Download offline map in Barca', ro: 'Descarca harta offline in Barca' },
  { id: 'snacks', cat: 'gear', en: 'Snacks for the train', ro: 'Gustari pentru tren' },
];

const CATS = {
  docs: { en: 'Documents', ro: 'Documente' },
  money: { en: 'Money', ro: 'Bani' },
  gear: { en: 'Gear & tech', ro: 'Echipament & tech' },
  clothes: { en: 'Clothes', ro: 'Imbracaminte' },
  before: { en: 'Before you leave', ro: 'Inainte de plecare' },
  custom: { en: 'Your items', ro: 'Articolele tale' },
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

function getItems() {
  const state = load();
  const custom = state._custom || [];
  return [...DEFAULT_ITEMS, ...custom.map(c => ({ ...c, cat: 'custom' }))];
}

function isChecked(id) { return !!load()[id]; }
function toggle(id) {
  const state = load();
  state[id] = !state[id];
  save(state);
}

function addCustom(text) {
  const state = load();
  const custom = state._custom || [];
  const id = 'custom-' + Date.now();
  custom.push({ id, en: text, ro: text });
  state._custom = custom;
  save(state);
  return id;
}

function removeCustom(id) {
  const state = load();
  const custom = state._custom || [];
  state._custom = custom.filter(c => c.id !== id);
  delete state[id];
  save(state);
}

export function showChecklist() {
  const overlay = document.getElementById('detail-overlay');
  const lang = getLang();
  const items = getItems();
  const checked = items.filter(i => isChecked(i.id)).length;

  const catOrder = ['docs', 'money', 'gear', 'clothes', 'before', 'custom'];
  let html = `<div class="detail-sheet checklist-sheet">
    <button class="detail-close">✕</button>
    <h2>${lang === 'ro' ? 'Lista de verificare' : 'Checklist'}</h2>
    <div class="checklist-progress">${checked}/${items.length}</div>`;

  for (const cat of catOrder) {
    const catItems = items.filter(i => i.cat === cat);
    if (catItems.length === 0 && cat !== 'custom') continue;
    html += `<h3 class="checklist-cat">${CATS[cat]?.[lang] || CATS[cat]?.en || cat}</h3>`;
    for (const item of catItems) {
      const done = isChecked(item.id);
      const isCustom = item.cat === 'custom';
      html += `
        <label class="checklist-item${done ? ' done' : ''}">
          <input type="checkbox" data-id="${item.id}" ${done ? 'checked' : ''}>
          <span>${item[lang] || item.en}</span>
          ${isCustom ? `<button class="checklist-remove" data-remove="${item.id}" aria-label="Remove">✕</button>` : ''}
        </label>`;
    }
    if (cat === 'custom' || (cat === catOrder[catOrder.length - 2] && items.filter(i => i.cat === 'custom').length === 0)) {
      html += `
        <div class="checklist-add">
          <input type="text" class="checklist-add-input" placeholder="${lang === 'ro' ? 'Adauga articol...' : 'Add item...'}">
          <button class="btn-sm checklist-add-btn">+</button>
        </div>`;
    }
  }

  html += '</div>';
  overlay.innerHTML = html;
  overlay.classList.remove('hidden');

  overlay.querySelector('.detail-close').addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });

  overlay.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      toggle(cb.dataset.id);
      cb.closest('.checklist-item').classList.toggle('done', cb.checked);
      const all = getItems();
      const cnt = all.filter(i => isChecked(i.id)).length;
      overlay.querySelector('.checklist-progress').textContent = `${cnt}/${all.length}`;
    });
  });

  overlay.querySelectorAll('.checklist-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      removeCustom(btn.dataset.remove);
      showChecklist();
    });
  });

  const addInput = overlay.querySelector('.checklist-add-input');
  const addBtn = overlay.querySelector('.checklist-add-btn');
  if (addInput && addBtn) {
    const doAdd = () => {
      const text = addInput.value.trim();
      if (text) { addCustom(text); showChecklist(); }
    };
    addBtn.addEventListener('click', doAdd);
    addInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
  }
}
