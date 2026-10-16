const KEY = 'barca-edits';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(edits) { localStorage.setItem(KEY, JSON.stringify(edits)); }

export function getEdit(path) { return load()[path]; }

export function setEdit(path, value) {
  const edits = load();
  if (value === null || value === undefined || value === '') delete edits[path];
  else edits[path] = value;
  save(edits);
}

export function clearEdit(path) {
  const edits = load();
  delete edits[path];
  save(edits);
}

export function editableField(path, original, { tag = 'span', cls = '', multiline = false } = {}) {
  const edited = getEdit(path);
  const value = edited ?? original;
  const el = document.createElement(tag);
  el.className = `editable ${cls}`.trim();
  el.textContent = value;
  el.dataset.path = path;
  el.dataset.original = original;
  if (edited != null) el.classList.add('edited');
  el.addEventListener('click', e => {
    e.stopPropagation();
    startEdit(el, multiline);
  });
  return el;
}

function startEdit(el, multiline) {
  if (el.classList.contains('editing')) return;
  el.classList.add('editing');
  const value = el.textContent;
  const input = multiline ? document.createElement('textarea') : document.createElement('input');
  input.className = 'edit-input';
  input.value = value;
  if (multiline) { input.rows = 3; input.style.resize = 'vertical'; }
  el.textContent = '';
  el.appendChild(input);
  input.focus();
  input.select();

  const finish = () => {
    const newVal = input.value.trim();
    el.classList.remove('editing');
    if (newVal && newVal !== el.dataset.original) {
      setEdit(el.dataset.path, newVal);
      el.textContent = newVal;
      el.classList.add('edited');
    } else {
      clearEdit(el.dataset.path);
      el.textContent = el.dataset.original;
      el.classList.remove('edited');
    }
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = el.dataset.original; input.blur(); }
  });
}

export function edited(obj, path, lang) {
  const override = getEdit(path);
  if (override != null) return override;
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || '';
}

const ORDER_KEY = 'barca-day-order';

export function getDayOrder() {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY)) || null; } catch { return null; }
}

export function setDayOrder(order) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}
