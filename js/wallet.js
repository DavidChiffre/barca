import { getWalletItems, getStep } from './data.js';
import { t, localized } from './i18n.js';

const DB_NAME = 'barca-wallet', STORE = 'files';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getFile(id) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function saveFile(id, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(data, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteFile(id) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
  });
}

export async function initWallet(el) { await render(el); }

async function render(el) {
  const items = getWalletItems();
  let html = '<div class="wallet-list">';
  for (const item of items) {
    const file = await getFile(item.id);
    const step = getStep(item.stepId);
    html += `
      <div class="wallet-item" data-id="${item.id}">
        <div class="wallet-info">
          <div class="wallet-label">${localized(item.label)}</div>
          ${step ? `<div class="wallet-step">${localized(step.title)}</div>` : ''}
        </div>
        <div class="wallet-actions">
          ${file ? `<button class="btn-sm" data-action="view" data-id="${item.id}">View</button><button class="btn-sm danger" data-action="delete" data-id="${item.id}">✕</button>` : `<label class="btn-sm add-label"><input type="file" accept="image/*,application/pdf" data-action="import" data-id="${item.id}" hidden>+ Add</label>`}
        </div>
      </div>`;
  }
  html += '</div>';

  const refs = items.filter(i => {
    const step = getStep(i.stepId);
    return step?.bookingUrl;
  });
  if (refs.length) {
    html += '<h3 class="wallet-section">Booking links</h3><div class="wallet-links">';
    for (const item of refs) {
      const step = getStep(item.stepId);
      if (step?.bookingUrl) {
        html += `<a href="${step.bookingUrl}" target="_blank" rel="noopener" class="wallet-link">${localized(item.label)} →</a>`;
      }
    }
    html += '</div>';
  }

  el.innerHTML = html;
  el.addEventListener('click', handleClick);
  el.addEventListener('change', handleImport);
}

async function handleClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'view') showViewer(id);
  if (action === 'delete') { await deleteFile(id); await render(e.currentTarget); }
}

async function handleImport(e) {
  const input = e.target.closest('[data-action="import"]');
  if (!input?.files?.length) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = async () => {
    await saveFile(input.dataset.id, { name: file.name, type: file.type, data: reader.result });
    await render(e.currentTarget.closest('#tab-wallet'));
  };
  reader.readAsDataURL(file);
}

async function showViewer(id) {
  const file = await getFile(id);
  if (!file) return;
  const overlay = document.getElementById('detail-overlay');
  let content;
  if (file.type === 'application/pdf') {
    content = `<iframe src="${file.data}" class="viewer-frame"></iframe>`;
  } else {
    content = `<img src="${file.data}" class="viewer-img" alt="${file.name}">`;
  }
  overlay.innerHTML = `
    <div class="viewer">
      <div class="viewer-header">
        <button class="detail-close">✕</button>
        <button class="btn-sm" id="brighten-btn">☀️ ${t('wallet.brighten')}</button>
      </div>
      ${content}
    </div>`;
  overlay.classList.remove('hidden');
  overlay.querySelector('.detail-close').addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.querySelector('#brighten-btn')?.addEventListener('click', () => {
    overlay.querySelector('.viewer').classList.toggle('bright');
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
}

export async function openTicket(ticketId) {
  const file = await getFile(ticketId);
  if (file) showViewer(ticketId);
}
