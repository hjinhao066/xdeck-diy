// Platform class (mac gets vibrancy + inset traffic lights)
if (/Mac/.test(navigator.userAgent)) document.body.classList.add('is-mac');

// ---- Lucide-style inline SVG icons ----
const ICONS = {
  left:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  reload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  edit:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};

// ---- Persistence ----
const STORE_KEY = 'xdeck.columns.v1';
const THEME_KEY = 'xdeck.theme.v1';
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 240;
const MAX_WIDTH = 900;

const DEFAULT_COLUMNS = [
  { title: '主页', url: 'https://x.com/home', width: DEFAULT_WIDTH },
  { title: '通知', url: 'https://x.com/notifications', width: DEFAULT_WIDTH },
  { title: 'AVGO / Broadcom', url: 'https://x.com/search?q=AVGO%20OR%20Broadcom&f=live', width: DEFAULT_WIDTH },
  { title: 'NVDA', url: 'https://x.com/search?q=NVDA%20OR%20Nvidia&f=live', width: DEFAULT_WIDTH },
  { title: '书签', url: 'https://x.com/i/bookmarks', width: DEFAULT_WIDTH },
];

function loadColumns() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const cols = JSON.parse(raw);
      // backfill width for older saved configs
      return cols.map(c => ({ width: DEFAULT_WIDTH, ...c }));
    }
  } catch (_) {}
  return DEFAULT_COLUMNS.map(c => ({ ...c }));
}

function saveColumns() { localStorage.setItem(STORE_KEY, JSON.stringify(columns)); }

let columns = loadColumns();

// ---- Theme ----
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeBtn');
  btn.textContent = theme === 'dark' ? '浅色' : '深色'; // shows what you'll switch TO
  localStorage.setItem(THEME_KEY, theme);
}
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
document.getElementById('themeBtn').onclick = () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
};

// ---- Render ----
const deck = document.getElementById('deck');

function render() {
  deck.innerHTML = '';
  columns.forEach((col, idx) => deck.appendChild(buildColumn(col, idx)));
}

function buildColumn(col, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'column';
  wrap.style.width = (col.width || DEFAULT_WIDTH) + 'px';

  const head = document.createElement('div');
  head.className = 'col-head';

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = col.title || col.url;

  const wv = document.createElement('webview');
  wv.setAttribute('src', col.url);
  wv.setAttribute('partition', 'persist:x'); // shared login across all columns
  wv.setAttribute('allowpopups', 'true');

  head.append(
    title,
    mkBtn(ICONS.left, '左移', () => move(idx, -1)),
    mkBtn(ICONS.right, '右移', () => move(idx, 1)),
    mkBtn(ICONS.reload, '刷新', () => wv.reload()),
    mkBtn(ICONS.edit, '编辑', () => openDialog(idx)),
    mkBtn(ICONS.close, '删除', () => removeCol(idx)),
  );

  const resizer = document.createElement('div');
  resizer.className = 'resizer';
  attachResize(resizer, wrap, idx);

  wrap.append(head, wv, resizer);
  return wrap;
}

function mkBtn(svg, tip, onClick) {
  const b = document.createElement('button');
  b.className = 'icon-btn';
  b.innerHTML = svg;
  b.title = tip;
  b.onclick = onClick;
  return b;
}

// ---- Drag to resize column width ----
function attachResize(handle, wrap, idx) {
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = wrap.getBoundingClientRect().width;
    document.body.classList.add('resizing');

    const onMove = (ev) => {
      let w = startW + (ev.clientX - startX);
      w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w));
      wrap.style.width = w + 'px';
    };
    const onUp = () => {
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      columns[idx].width = Math.round(wrap.getBoundingClientRect().width);
      saveColumns();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ---- Reorder / remove ----
function move(idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= columns.length) return;
  [columns[idx], columns[j]] = [columns[j], columns[idx]];
  saveColumns();
  render();
}
function removeCol(idx) {
  columns.splice(idx, 1);
  saveColumns();
  render();
}
function addColumn(col) {
  columns.push({ width: DEFAULT_WIDTH, ...col });
  saveColumns();
  render();
}

// ---- Add / edit dialog ----
const dlg = document.getElementById('colDialog');
const presetSel = document.getElementById('presetSel');
const titleInput = document.getElementById('titleInput');
const urlInput = document.getElementById('urlInput');
const dlgTitle = document.getElementById('dlgTitle');
let editIndex = null;

presetSel.onchange = () => {
  if (presetSel.value) {
    urlInput.value = presetSel.value;
    if (!titleInput.value) titleInput.value = presetSel.options[presetSel.selectedIndex].text;
  }
};

function openDialog(idx) {
  editIndex = (typeof idx === 'number') ? idx : null;
  dlgTitle.textContent = editIndex === null ? '添加列' : '编辑列';
  presetSel.value = '';
  titleInput.value = editIndex === null ? '' : (columns[editIndex].title || '');
  urlInput.value = editIndex === null ? '' : (columns[editIndex].url || '');
  dlg.showModal();
}

document.getElementById('addBtn').onclick = () => openDialog();
document.getElementById('dlgCancel').onclick = () => dlg.close();
document.getElementById('dlgSave').onclick = () => {
  let url = urlInput.value.trim();
  if (!url) return;
  if (!/^https?:\/\//.test(url)) url = 'https://' + url;
  const title = titleInput.value.trim() || url;
  if (editIndex === null) addColumn({ title, url });
  else { columns[editIndex] = { ...columns[editIndex], title, url }; saveColumns(); render(); }
  dlg.close();
};

// ---- Add X List dialog ----
const listDlg = document.getElementById('listDialog');
const listInput = document.getElementById('listInput');
const listTitleInput = document.getElementById('listTitleInput');

document.getElementById('addListBtn').onclick = () => {
  listInput.value = '';
  listTitleInput.value = '';
  listDlg.showModal();
};
document.getElementById('listCancel').onclick = () => listDlg.close();
document.getElementById('openListsBtn').onclick = () => {
  addColumn({ title: '我的列表', url: 'https://x.com/i/lists' });
  listDlg.close();
};
document.getElementById('listSave').onclick = () => {
  let v = listInput.value.trim();
  if (!v) return;
  // Accept full URL, or bare numeric ID
  let url;
  const m = v.match(/lists\/(\d+)/);
  if (m) url = `https://x.com/i/lists/${m[1]}`;
  else if (/^\d+$/.test(v)) url = `https://x.com/i/lists/${v}`;
  else if (/^https?:\/\//.test(v)) url = v;
  else { url = 'https://x.com/i/lists/' + v; }
  addColumn({ title: listTitleInput.value.trim() || 'X 列表', url });
  listDlg.close();
};

// ---- Toolbar misc ----
document.getElementById('reloadAllBtn').onclick = () =>
  document.querySelectorAll('webview').forEach(wv => wv.reload());
document.getElementById('resetBtn').onclick = () => {
  if (confirm('恢复默认列布局？（自定义的列会清空）')) {
    columns = DEFAULT_COLUMNS.map(c => ({ ...c }));
    saveColumns();
    render();
  }
};

render();
