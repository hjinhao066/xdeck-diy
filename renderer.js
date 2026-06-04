// Platform class (mac gets inset traffic lights over the rail)
if (/Mac/.test(navigator.userAgent)) document.body.classList.add('is-mac');

// ---- Lucide-style inline SVG icons ----
const S = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICONS = {
  left:    S('<polyline points="15 18 9 12 15 6"/>'),
  right:   S('<polyline points="9 18 15 12 9 6"/>'),
  back:    S('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
  forward: S('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'),
  reload:  S('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'),
  edit:    S('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  close:   S('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  nav:     S('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>'),
  plus:    S('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  list:    S('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>'),
  compose: S('<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>'),
  sun:     S('<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>'),
  moon:    S('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
  reset:   S('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>'),
};

// CSS injected into every X column: hide X's right "who to follow" sidebar,
// and (optionally) the left nav rail — we provide our own global rail.
function columnCSS(hideNav) {
  let css = 'div[data-testid="sidebarColumn"]{display:none!important;}';
  if (hideNav) {
    css += 'header[role="banner"]{display:none!important;}'
         + '[data-testid="primaryColumn"]{border-left:none!important;}';
  }
  return css;
}
function navHiddenFor(col) {
  return col.hideNav === undefined ? true : col.hideNav; // hidden by default
}

// ---- Persistence ----
const STORE_KEY = 'xdeck.columns.v1';
const THEME_KEY = 'xdeck.theme.v1';
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 240;
const MAX_WIDTH = 900;

const DEFAULT_COLUMNS = [
  { title: '主页', url: 'https://x.com/home' },
  { title: '美股', url: 'https://x.com/i/lists/2059566674173743297' },
  { title: 'AI', url: 'https://x.com/i/lists/2062302318897611056' },
  { title: '书签', url: 'https://x.com/i/bookmarks' },
];

let appConfig = {
  theme: 'dark',
  columns: DEFAULT_COLUMNS.map(c => ({ width: DEFAULT_WIDTH, ...c }))
};

const isElectron = typeof window !== 'undefined' && window.electronAPI;

function loadConfig() {
  if (isElectron) {
    try {
      const saved = window.electronAPI.loadConfig();
      if (saved) {
        if (saved.columns) appConfig.columns = saved.columns.map(c => ({ width: DEFAULT_WIDTH, ...c }));
        if (saved.theme) appConfig.theme = saved.theme;
        return;
      }
    } catch (e) {
      console.error('Failed to load config via IPC:', e);
    }
  }
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) appConfig.columns = JSON.parse(raw).map(c => ({ width: DEFAULT_WIDTH, ...c }));
    const rawTheme = localStorage.getItem(THEME_KEY);
    if (rawTheme) appConfig.theme = rawTheme;
  } catch (_) {}
}

loadConfig();
let columns = appConfig.columns;

function saveColumns() {
  if (isElectron) {
    try {
      window.electronAPI.saveConfig({
        columns: columns,
        theme: appConfig.theme
      });
    } catch (e) {
      console.error('Failed to save config via IPC:', e);
    }
  }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(columns));
    localStorage.setItem(THEME_KEY, appConfig.theme);
  } catch (_) {}
}

// ---- Theme ----
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeBtn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
    btn.title = theme === 'dark' ? '切换浅色' : '切换深色';
  }
  appConfig.theme = theme;
  saveColumns();
}

// ---- Left rail ----
function buildRail() {
  const rail = document.getElementById('rail');
  rail.innerHTML = '';

  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.textContent = 'X';
  rail.appendChild(logo);

  rail.appendChild(railBtn(ICONS.plus, '添加列', openDialog, true));
  rail.appendChild(railBtn(ICONS.list, '添加 X 列表', openListDialog));
  rail.appendChild(railBtn(ICONS.compose, '写推文', () =>
    window.open('https://x.com/compose/post', '_blank')));
  rail.appendChild(railBtn(ICONS.reload, '全部刷新', () =>
    document.querySelectorAll('webview').forEach(wv => wv.reload())));

  const spacer = document.createElement('div');
  spacer.className = 'rail-spacer';
  rail.appendChild(spacer);

  const themeBtn = railBtn(ICONS.moon, '切换主题', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
  themeBtn.id = 'themeBtn';
  rail.appendChild(themeBtn);

  rail.appendChild(railBtn(ICONS.reset, '恢复默认布局', () => {
    if (confirm('恢复默认列布局？（自定义的列会清空）')) {
      columns = DEFAULT_COLUMNS.map(c => ({ width: DEFAULT_WIDTH, ...c }));
      saveColumns();
      render();
    }
  }));

  applyTheme(appConfig.theme);
}

function railBtn(svg, tip, onClick, accent) {
  const b = document.createElement('button');
  b.className = 'rail-btn' + (accent ? ' accent' : '');
  b.innerHTML = svg;
  b.title = tip;
  b.onclick = onClick;
  return b;
}

// ---- Render columns ----
const deck = document.getElementById('deck');

function render() {
  deck.innerHTML = '';
  columns.forEach((col) => deck.appendChild(buildColumn(col)));
  // Stagger the initial loads. Firing every column at x.com simultaneously
  // on the same session makes X's anti-bot throttle the boot, leaving every
  // column stuck on the splash screen. Load them one-by-one instead.
  deck.querySelectorAll('webview').forEach((wv, i) => {
    setTimeout(() => wv.setAttribute('src', wv.dataset.url), i * 600);
  });
}

function buildColumn(col) {
  const wrap = document.createElement('div');
  wrap.className = 'column';
  wrap.style.width = (col.width || DEFAULT_WIDTH) + 'px';

  const head = document.createElement('div');
  head.className = 'col-head';

  const dot = document.createElement('span');
  dot.className = 'dot';

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = col.title || col.url;

  const wv = document.createElement('webview');
  wv.dataset.url = col.url; // src is set later, staggered, in render()
  wv.setAttribute('partition', 'persist:x'); // shared login across all columns
  wv.setAttribute('allowpopups', 'true');
  wv.addEventListener('dom-ready', () => wv.insertCSS(columnCSS(navHiddenFor(col))));

  // Keep the column following the FEED it's on (home / list / search /
  // bookmarks / profile), persisting that so it restores next launch. We
  // deliberately ignore transient drill-downs — opening a single tweet, a
  // photo/video lightbox, compose, etc. — so a column never gets saved as a
  // near-black photo overlay and the header keeps showing the feed name.
  const TRANSIENT = /\/status\/|\/photo\/|\/video\/|\/compose\/|\/intent\/|\/i\/lists\/\d+\/[a-z]/i;
  const syncState = () => {
    const url = wv.getURL();
    if (!url || !/^https?:/.test(url) || TRANSIENT.test(url)) return;
    if (url !== col.url) col.url = url;
    const t = (wv.getTitle() || '')
      .replace(/^\(\d+\+?\)\s*/, '')   // drop unread-count prefix like "(3) "
      .replace(/\s*[\/|]\s*X\s*$/i, '') // drop trailing " / X"
      .trim();
    if (t) { col.title = t; title.textContent = t; }
    saveColumns();
  };
  wv.addEventListener('did-navigate', syncState);
  wv.addEventListener('did-navigate-in-page', syncState);
  wv.addEventListener('page-title-updated', syncState);

  // Secondary controls (revealed on hover)
  const secondary = document.createElement('span');
  secondary.className = 'secondary';

  const backBtn = mkBtn(ICONS.back, '后退', () => {
    if (wv.canGoBack()) wv.goBack();
  });
  const fwdBtn = mkBtn(ICONS.forward, '前进', () => {
    if (wv.canGoForward()) wv.goForward();
  });

  const updateNavButtons = () => {
    backBtn.disabled = !wv.canGoBack();
    fwdBtn.disabled = !wv.canGoForward();
  };

  wv.addEventListener('did-navigate', updateNavButtons);
  wv.addEventListener('did-navigate-in-page', updateNavButtons);
  wv.addEventListener('dom-ready', updateNavButtons);
  updateNavButtons(); // initial call

  const navBtn = mkBtn(ICONS.nav, '显示/隐藏 X 导航栏', () => {
    col.hideNav = !navHiddenFor(col);
    navBtn.classList.toggle('on', !col.hideNav);
    saveColumns();
    wv.reload();
  });
  if (!navHiddenFor(col)) navBtn.classList.add('on');

  secondary.append(
    backBtn,
    fwdBtn,
    navBtn,
    mkBtn(ICONS.left, '左移', () => move(col, -1)),
    mkBtn(ICONS.right, '右移', () => move(col, 1)),
    mkBtn(ICONS.edit, '编辑', () => openDialog(columns.indexOf(col))),
    mkBtn(ICONS.close, '删除', () => removeCol(col)),
  );

  head.append(dot, title, secondary, mkBtn(ICONS.reload, '刷新', () => wv.reload()));

  const resizer = document.createElement('div');
  resizer.className = 'resizer';
  attachResize(resizer, wrap, col);

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

// ---- Drag to resize ----
function attachResize(handle, wrap, col) {
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = wrap.getBoundingClientRect().width;
    document.body.classList.add('resizing');
    const onMove = (ev) => {
      let w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + (ev.clientX - startX)));
      wrap.style.width = w + 'px';
    };
    const onUp = () => {
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      col.width = Math.round(wrap.getBoundingClientRect().width);
      saveColumns();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ---- Reorder / remove / add ----
function move(col, dir) {
  const idx = columns.indexOf(col);
  const j = idx + dir;
  if (j < 0 || j >= columns.length) return;
  [columns[idx], columns[j]] = [columns[j], columns[idx]];
  saveColumns();
  // Reorder the DOM nodes only — keep the live webviews so the column
  // doesn't reload (which previously reset it back to its home URL).
  const nodes = deck.children;
  if (dir === 1) deck.insertBefore(nodes[j], nodes[idx]);
  else deck.insertBefore(nodes[idx], nodes[j]);
}
function removeCol(col) { columns.splice(columns.indexOf(col), 1); saveColumns(); render(); }
function addColumn(col) { columns.push({ width: DEFAULT_WIDTH, ...col }); saveColumns(); render(); }

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
function openListDialog() { listInput.value = ''; listTitleInput.value = ''; listDlg.showModal(); }
document.getElementById('listCancel').onclick = () => listDlg.close();
document.getElementById('openListsBtn').onclick = () => {
  addColumn({ title: '我的列表', url: 'https://x.com/i/lists' });
  listDlg.close();
};
document.getElementById('listSave').onclick = () => {
  let v = listInput.value.trim();
  if (!v) return;
  let url;
  const m = v.match(/lists\/(\d+)/);
  if (m) url = `https://x.com/i/lists/${m[1]}`;
  else if (/^\d+$/.test(v)) url = `https://x.com/i/lists/${v}`;
  else if (/^https?:\/\//.test(v)) url = v;
  else url = 'https://x.com/i/lists/' + v;
  addColumn({ title: listTitleInput.value.trim() || 'X 列表', url });
  listDlg.close();
};

// ---- Boot ----
buildRail();
render();

// Global support for mouse side back/forward buttons in the main window
window.addEventListener('mousedown', (e) => {
  if (e.button === 3) {
    const hoveredWebview = document.querySelector('webview:hover');
    if (hoveredWebview && hoveredWebview.canGoBack()) {
      e.preventDefault();
      hoveredWebview.goBack();
    }
  } else if (e.button === 4) {
    const hoveredWebview = document.querySelector('webview:hover');
    if (hoveredWebview && hoveredWebview.canGoForward()) {
      e.preventDefault();
      hoveredWebview.goForward();
    }
  }
});
