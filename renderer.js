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
  fit:     S('<polyline points="4 7 4 4 7 4"/><polyline points="20 7 20 4 17 4"/><polyline points="4 17 4 20 7 20"/><polyline points="20 17 20 20 17 20"/>'),
  user:    S('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  grip:    S('<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>'),
  sliders: S('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),
};

// CSS injected into every X column: hide X's right "who to follow" sidebar,
// and (optionally) the left nav rail — we provide our own global rail.
function columnCSS(hideNav) {
  let css = 'div[data-testid="sidebarColumn"]{display:none!important;}';
  if (hideNav) {
    // Also stretch the feed to the full column width: at small text scales the
    // page viewport exceeds X's ~500px desktop breakpoint, where the feed
    // would otherwise cap at 600px and center itself with dead whitespace.
    css += 'header[role="banner"]{display:none!important;}'
         + '[data-testid="primaryColumn"]{border-left:none!important;'
         + 'max-width:none!important;width:100%!important;}';
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
const FIT_VISIBLE_COLUMNS = window.XDeckLayout.DEFAULT_VISIBLE_COLUMNS;
const FIT_MIN_WIDTH = window.XDeckLayout.MIN_FITTED_COLUMN_WIDTH;
const FIT_COLS_CHOICES = [3, 4, 5, 6]; // user-pickable equal-column counts (fit button hover menu)
const ZOOM_BASE_WIDTH = window.XDeckLayout.ZOOM_BASE_COLUMN_WIDTH;
// Left panel (actions toolbar + column list): draggable width + collapse.
const NAV_DEFAULT_W = 200, NAV_MIN_W = 140, NAV_MAX_W = 380, NAV_COLLAPSED_W = 56;
// Persisted in localStorage (UI prefs, not part of the account config).
let navWidth = parseInt(localStorage.getItem('xdeck.navWidth'), 10) || NAV_DEFAULT_W;
let navCollapsed = localStorage.getItem('xdeck.navCollapsed') === 'true';
function saveNavPrefs() {
  try { localStorage.setItem('xdeck.navWidth', String(navWidth)); localStorage.setItem('xdeck.navCollapsed', String(navCollapsed)); } catch (_) {}
}

const DEFAULT_COLUMNS = [
  { title: '主页', url: 'https://x.com/home', manualTitle: true },
  { title: 'AI', url: 'https://x.com/i/lists/2062302318897611056', manualTitle: true },
  { title: '美股', url: 'https://x.com/i/lists/2059566674173743297', manualTitle: true },
  { title: '收藏', url: 'https://x.com/i/bookmarks', manualTitle: true },
];

function defaultCols(account) {
  const acc = account || (typeof getAccount === 'function' ? getAccount() : null);
  const list = (acc && Array.isArray(acc.defaultColumns) && acc.defaultColumns.length)
    ? acc.defaultColumns
    : DEFAULT_COLUMNS;
  return list.map(c => ({ width: DEFAULT_WIDTH, ...c }));
}

// theme/fitWindow are global; columns are PER ACCOUNT. Each account has its own
// independent login session (partition) and its own deck layout.
let appConfig = {
  theme: 'dark',
  fitWindow: false,
  fitCols: window.XDeckLayout.DEFAULT_VISIBLE_COLUMNS, // how many equal columns "fit" splits into
  accounts: [{ id: 'default', name: '账号 1', columns: defaultCols() }],
};

// This window is bound to one account, passed by the main process via the URL.
let activeAccountId = new URLSearchParams(location.search).get('account') || 'default';

const isElectron = typeof window !== 'undefined' && window.electronAPI;

function normalizeConfig(saved) {
  if (!saved) return;
  if (saved.theme) appConfig.theme = saved.theme;
  if (saved.fitWindow !== undefined) appConfig.fitWindow = saved.fitWindow;
  if (FIT_COLS_CHOICES.includes(saved.fitCols)) appConfig.fitCols = saved.fitCols;
  if (Array.isArray(saved.accounts) && saved.accounts.length) {
    appConfig.accounts = saved.accounts.map(a => ({
      id: a.id,
      name: a.name || '账号',
      columns: (a.columns || []).map(c => ({ width: DEFAULT_WIDTH, ...c })),
      defaultColumns: Array.isArray(a.defaultColumns) && a.defaultColumns.length
        ? a.defaultColumns.map(c => ({ width: DEFAULT_WIDTH, ...c }))
        : undefined,
    }));
  } else if (Array.isArray(saved.columns)) {
    // migrate the old single-account config into the accounts model
    appConfig.accounts = [{
      id: 'default',
      name: '账号 1',
      columns: saved.columns.map(c => ({ width: DEFAULT_WIDTH, ...c })),
      defaultColumns: Array.isArray(saved.defaultColumns)
        ? saved.defaultColumns.map(c => ({ width: DEFAULT_WIDTH, ...c }))
        : undefined,
    }];
  }
}

function loadConfig() {
  if (isElectron) {
    try { normalizeConfig(window.electronAPI.loadConfig()); }
    catch (e) { console.error('Failed to load config via IPC:', e); }
  } else {
    try {
      const saved = {};
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) saved.columns = JSON.parse(raw);
      const rawTheme = localStorage.getItem(THEME_KEY);
      if (rawTheme) saved.theme = rawTheme;
      const rawFit = localStorage.getItem('xdeck.fit.v1');
      if (rawFit !== null) saved.fitWindow = rawFit === 'true';
      normalizeConfig(saved);
    } catch (_) {}
  }
  // fitCols is a UI pref kept in localStorage in both modes (not in the IPC config).
  try {
    const rawFitCols = parseInt(localStorage.getItem('xdeck.fitcols.v1'), 10);
    if (FIT_COLS_CHOICES.includes(rawFitCols)) appConfig.fitCols = rawFitCols;
  } catch (_) {}
}

loadConfig();

// Earlier builds zoomed the whole app UI via webFrame (which shrank the
// columns and broke the fit); a non-1 factor can persist per-origin. Pin the
// app chrome back to 1 — text size is handled per-column via textScale.
if (isElectron && typeof window.electronAPI.setZoomFactor === 'function') {
  try { window.electronAPI.setZoomFactor(1); } catch (_) {}
}

function partitionFor(id) { return (!id || id === 'default') ? 'persist:x' : 'persist:x-' + id; }
function getAccount() { return appConfig.accounts.find(a => a.id === activeAccountId) || appConfig.accounts[0]; }

// Make sure this window's account exists (e.g. first run, or a freshly created one).
if (!appConfig.accounts.find(a => a.id === activeAccountId)) {
  appConfig.accounts.push({ id: activeAccountId, name: activeAccountId === 'default' ? '账号 1' : activeAccountId, columns: defaultCols() });
}
let columns = getAccount().columns;

if (isElectron && window.electronAPI.setActivePartition) {
  window.electronAPI.setActivePartition(partitionFor(activeAccountId));
}

function showToast(msg) {
  let toast = document.getElementById('deckToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'deckToast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast.__timer);
  toast.__timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function setCurAsDefaultAndNotify() {
  const acc = getAccount();
  acc.defaultColumns = columns.map(c => ({
    title: c.title || '列',
    url: c.url,
    manualTitle: true,
    hideNav: navHiddenFor(c),
    width: c.width || DEFAULT_WIDTH,
  }));
  saveColumns();
  showToast(`已将当前 ${columns.length} 列保存为每次默认打开项！`);
}

function saveColumns() {
  const acc = getAccount();
  acc.columns = columns; // columns is a live ref to the active account's array
  if (isElectron && window.electronAPI.saveAccount) {
    try {
      window.electronAPI.saveAccount({
        account: acc,
        theme: appConfig.theme,
        fitWindow: appConfig.fitWindow,
        lastActiveAccount: activeAccountId,
      });
    } catch (e) { console.error('Failed to save account via IPC:', e); }
  }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(columns));
    localStorage.setItem(THEME_KEY, appConfig.theme);
    localStorage.setItem('xdeck.fit.v1', appConfig.fitWindow ? 'true' : 'false');
    localStorage.setItem('xdeck.fitcols.v1', String(appConfig.fitCols || FIT_VISIBLE_COLUMNS));
  } catch (_) {}
}

// ---- Accounts ----
// Electron doesn't support window.prompt(), so use our own <dialog> input.
function promptDialog(message, defaultValue = '') {
  return new Promise((resolve) => {
    let dlg = document.getElementById('promptDlg');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'promptDlg';
      dlg.innerHTML =
        '<h3 id="promptMsg"></h3>' +
        '<input id="promptInput" type="text" autocomplete="off" spellcheck="false" />' +
        '<div class="row">' +
        '<button class="btn" id="promptCancel">取消</button>' +
        '<button class="btn primary" id="promptOk">确定</button>' +
        '</div>';
      document.body.appendChild(dlg);
    }
    const input = dlg.querySelector('#promptInput');
    dlg.querySelector('#promptMsg').textContent = message;
    input.value = defaultValue;
    const done = (val) => { dlg.close(); resolve(val); };
    dlg.querySelector('#promptOk').onclick = () => done(input.value.trim());
    dlg.querySelector('#promptCancel').onclick = () => done(null);
    input.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); done(input.value.trim()); }
      else if (e.key === 'Escape') { e.preventDefault(); done(null); }
    };
    dlg.showModal();
    setTimeout(() => { input.focus(); input.select(); }, 50);
  });
}

function switchAccount(id) {
  if (id === activeAccountId) return;
  activeAccountId = id;
  columns = getAccount().columns;
  if (isElectron && window.electronAPI.setActivePartition) window.electronAPI.setActivePartition(partitionFor(id));
  saveColumns();
  render();
  buildAccountMenu();
}
async function addAccountAndOpen() {
  const name = await promptDialog('新账号名称（会在新窗口打开，空白会话需登录一次）：', '账号 ' + (appConfig.accounts.length + 1));
  if (!name) return;
  const id = 'a' + Date.now();
  const acc = { id, name, columns: defaultCols() };
  appConfig.accounts.push(acc);
  if (isElectron && window.electronAPI.saveAccount) {
    window.electronAPI.saveAccount({ account: acc, theme: appConfig.theme, fitWindow: appConfig.fitWindow });
  }
  if (isElectron && window.electronAPI.openAccountWindow) window.electronAPI.openAccountWindow(id);
  else switchAccount(id);
  buildAccountMenu();
}
function openCurrentInNewWindow() {
  if (isElectron && window.electronAPI.openAccountWindow) window.electronAPI.openAccountWindow(activeAccountId);
}
async function renameAccount() {
  const acc = getAccount();
  const name = await promptDialog('重命名当前账号：', acc.name);
  if (!name) return;
  acc.name = name; saveColumns(); buildAccountMenu();
}
function deleteAccount() {
  if (appConfig.accounts.length <= 1) { alert('至少保留一个账号'); return; }
  const acc = getAccount();
  if (!confirm(`删除账号「${acc.name}」？（该账号的列布局会清空，登录态仍保留在本地）`)) return;
  const id = acc.id;
  appConfig.accounts = appConfig.accounts.filter(a => a.id !== id);
  if (isElectron && window.electronAPI.deleteAccount) window.electronAPI.deleteAccount(id);
  activeAccountId = appConfig.accounts[0].id;
  columns = getAccount().columns;
  if (isElectron && window.electronAPI.setActivePartition) window.electronAPI.setActivePartition(partitionFor(activeAccountId));
  saveColumns(); render(); buildAccountMenu();
}

function buildAccountMenu() {
  let menu = document.getElementById('acctMenu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'acctMenu';
    document.body.appendChild(menu);
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !e.target.closest('#acctBtn')) menu.classList.remove('open');
    });
  }
  menu.innerHTML = '';
  const head = document.createElement('div'); head.className = 'acct-head'; head.textContent = '账号 / 多窗口';
  menu.appendChild(head);
  appConfig.accounts.forEach(a => {
    const row = document.createElement('button');
    row.className = 'acct-row' + (a.id === activeAccountId ? ' active' : '');
    row.textContent = (a.id === activeAccountId ? '● ' : '○ ') + a.name;
    row.onclick = () => { menu.classList.remove('open'); switchAccount(a.id); };
    menu.appendChild(row);
  });
  const sep = document.createElement('div'); sep.className = 'acct-sep'; menu.appendChild(sep);
  const item = (label, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'acct-row' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.onclick = () => { menu.classList.remove('open'); fn(); };
    menu.appendChild(b);
  };
  item('⚙️ 默认打开设置（编辑默认列）', '', openDefaultColsDialog);
  item('📌 将当前列保存为默认打开', '', setCurAsDefaultAndNotify);
  const sep2 = document.createElement('div'); sep2.className = 'acct-sep'; menu.appendChild(sep2);
  item('➕ 新账号（开新窗口）', '', addAccountAndOpen);
  item('🪟 当前账号开新窗口', '', openCurrentInNewWindow);
  item('✏️ 重命名当前账号', '', renameAccount);
  item('🗑️ 删除当前账号', 'danger', deleteAccount);
}
function toggleAccountMenu(btn) {
  buildAccountMenu();
  const menu = document.getElementById('acctMenu');
  const r = btn.getBoundingClientRect();
  menu.style.top = r.top + 'px';
  menu.style.left = (r.right + 8) + 'px';
  menu.classList.toggle('open');
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

// ---- Left panel toolbar (actions) ----
function buildRail() {
  const top = document.getElementById('navTop');
  const bottom = document.getElementById('navBottom');
  top.innerHTML = ''; bottom.innerHTML = '';

  // Top row = primary actions: collapse, add column, add list, refresh all.
  const collapseBtn = railBtn(ICONS.left, '折叠侧栏', () => setNavCollapsed(!navCollapsed));
  collapseBtn.id = 'navCollapseBtn';
  top.appendChild(collapseBtn);
  top.appendChild(railBtn(ICONS.plus, '添加列', openDialog, true));
  top.appendChild(railBtn(ICONS.list, '添加 X 列表', openListDialog));
  top.appendChild(railBtn(ICONS.reload, '全部刷新', () =>
    document.querySelectorAll('webview').forEach(wv => wv.reload())));

  // Bottom row = utilities: account, fit, theme, reset.
  const acctBtn = railBtn(ICONS.user, '账号 / 多窗口', () => toggleAccountMenu(acctBtn));
  acctBtn.id = 'acctBtn';
  bottom.appendChild(acctBtn);

  // Fit button: CLICK makes every column equal-width for the current count;
  // HOVER reveals a menu to pick how many columns (2–5) fill the window. The
  // deck area (window minus sidebar) splits into that many equal columns;
  // overflow columns keep the same width and scroll.
  const fitWrap = document.createElement('div');
  fitWrap.className = 'fit-wrap';
  const fitBtn = railBtn(ICONS.fit, '按窗口等宽（悬停选列数）', () => applyFitCols(appConfig.fitCols || FIT_VISIBLE_COLUMNS));
  fitBtn.id = 'fitBtn';
  const fitMenu = document.createElement('div');
  fitMenu.className = 'fit-menu';
  fitMenu.id = 'fitMenu';
  FIT_COLS_CHOICES.forEach((n) => {
    const item = document.createElement('button');
    item.className = 'fit-menu-item';
    item.textContent = String(n);
    item.title = n + ' 列等宽';
    item.dataset.cols = String(n);
    item.onclick = (e) => { e.stopPropagation(); applyFitCols(n); };
    fitMenu.appendChild(item);
  });
  fitWrap.appendChild(fitBtn);
  fitWrap.appendChild(fitMenu);
  bottom.appendChild(fitWrap);

  const defaultColsBtn = railBtn(ICONS.sliders, '默认打开设置（编辑每次默认打开的列）', openDefaultColsDialog);
  defaultColsBtn.id = 'defaultColsBtn';
  bottom.appendChild(defaultColsBtn);

  const themeBtn = railBtn(ICONS.moon, '切换主题', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
  themeBtn.id = 'themeBtn';
  bottom.appendChild(themeBtn);

  bottom.appendChild(railBtn(ICONS.reset, '恢复默认布局', () => {
    if (confirm('恢复默认列布局？（将按默认设置打开主页、AI、美股、收藏等列）')) {
      columns = defaultCols();
      saveColumns();
      render();
      showToast('已恢复默认列布局');
    }
  }));

  applyTheme(appConfig.theme);
}

// ---- Left panel width + collapse ----
const colNavEl = document.getElementById('colNav');
function applyNavWidth() {
  const w = navCollapsed ? NAV_COLLAPSED_W : navWidth;
  colNavEl.style.flex = '0 0 ' + w + 'px';
  colNavEl.style.width = w + 'px';
}
function setNavCollapsed(v) {
  navCollapsed = v;
  colNavEl.classList.toggle('collapsed', v);
  const btn = document.getElementById('navCollapseBtn');
  if (btn) { btn.innerHTML = v ? ICONS.right : ICONS.left; btn.title = v ? '展开侧栏' : '折叠侧栏'; }
  applyNavWidth();
  saveNavPrefs();
}
function attachNavResize(handle) {
  handle.addEventListener('mousedown', (e) => {
    if (navCollapsed) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = colNavEl.getBoundingClientRect().width;
    document.body.classList.add('resizing');
    const onMove = (ev) => {
      const w = Math.max(NAV_MIN_W, Math.min(NAV_MAX_W, startW + (ev.clientX - startX)));
      colNavEl.style.flex = '0 0 ' + w + 'px';
      colNavEl.style.width = w + 'px';
    };
    const onUp = () => {
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      navWidth = Math.round(colNavEl.getBoundingClientRect().width);
      saveNavPrefs();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function railBtn(svg, tip, onClick, accent) {
  const b = document.createElement('button');
  b.className = 'rail-btn' + (accent ? ' accent' : '');
  b.innerHTML = svg;
  b.title = tip;
  b.onclick = onClick;
  return b;
}

function fitColumnsToViewport(cols) {
  const n = FIT_COLS_CHOICES.includes(cols) ? cols : (appConfig.fitCols || FIT_VISIBLE_COLUMNS);
  const width = window.XDeckLayout.computeFittedColumnWidth(
    deck.getBoundingClientRect().width,
    n,
    FIT_MIN_WIDTH,
  );
  appConfig.fitCols = n;
  columns.forEach((col) => { col.width = width; });
  appConfig.fitWindow = false;
  deck.style.overflowX = 'auto';
  saveColumns();
  updateColumnStyles();
}

// Highlight the menu item matching the active column count.
function refreshFitMenu() {
  const cur = appConfig.fitCols || FIT_VISIBLE_COLUMNS;
  document.querySelectorAll('#fitMenu .fit-menu-item').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.cols) === cur);
  });
}

// Apply an equal-width split for n columns, with a brief accent flash.
function applyFitCols(n) {
  fitColumnsToViewport(n);
  const btn = document.getElementById('fitBtn');
  if (btn) { btn.classList.add('accent'); setTimeout(() => btn.classList.remove('accent'), 180); }
  refreshFitMenu();
}

// The fit button + menu are wired in buildRail(); just set the initial state.
function installFitColumnsAction() {
  appConfig.fitWindow = false;
  refreshFitMenu();
}

// ---- Proportional column zoom ----
// Ctrl+/- adjusts textScale: a pure in-column text-size multiplier. It never
// touches the app UI zoom (that used to shrink the columns themselves and
// break the 3/4-col fit). Below ~0.76 the page viewport passes X's ~500px
// desktop breakpoint; columnCSS stretches the feed to full width so the
// column stays single-column with no dead whitespace down to the floor.
const TEXT_SCALE_KEY = 'xdeck.textscale.v1';
const TEXT_SCALE_MIN = 0.5, TEXT_SCALE_MAX = 3.0;
let textScale = parseFloat(localStorage.getItem(TEXT_SCALE_KEY));
if (!Number.isFinite(textScale)) textScale = 1;
textScale = Math.max(TEXT_SCALE_MIN, Math.min(TEXT_SCALE_MAX, textScale));
function saveTextScale() {
  try { localStorage.setItem(TEXT_SCALE_KEY, String(textScale)); } catch (_) {}
}

// A column's page always lays out as a ZOOM_BASE_WIDTH viewport, then scales
// to fill the actual column width. This keeps X in its compact single-column
// layout at every fit level (3–6 cols) instead of jumping to the desktop
// layout (nav rail + fixed-width feed + whitespace) once a column gets wide.
function applyColumnZoom(wv, widthPx) {
  try {
    if (!wv || typeof wv.setZoomFactor !== 'function') return;
    wv.setZoomFactor(window.XDeckLayout.computeColumnZoom(widthPx, textScale, ZOOM_BASE_WIDTH));
  } catch (err) {
    console.error('Error applying zoom to webview:', err);
  }
}

function applyAllColumnZooms() {
  document.querySelectorAll('.column').forEach(wrap => {
    const col = wrap.__col;
    applyColumnZoom(wrap.querySelector('webview'), (col && col.width) || DEFAULT_WIDTH);
  });
}

// ---- Render columns ----
const deck = document.getElementById('deck');

function render() {
  deck.innerHTML = '';
  deck.style.overflowX = 'auto';
  columns.forEach((col) => deck.appendChild(buildColumn(col)));
  // Stagger the initial loads. Firing every column at x.com simultaneously
  // on the same session makes X's anti-bot throttle the boot, leaving every
  // column stuck on the splash screen. Load them one-by-one instead.
  deck.querySelectorAll('webview').forEach((wv, i) => {
    setTimeout(() => wv.setAttribute('src', wv.dataset.url), i * 600);
  });
  renderColNav();
}

function updateColumnStyles() {
  deck.style.overflowX = 'auto';
  
  const cols = deck.querySelectorAll('.column');
  cols.forEach((wrap, i) => {
    const col = columns[i];
    if (!col) return;
    wrap.style.flex = '0 0 auto';
    wrap.style.width = `${col.width || DEFAULT_WIDTH}px`;
    applyColumnZoom(wrap.querySelector('webview'), col.width || DEFAULT_WIDTH);
  });
}

function buildColumn(col) {
  const wrap = document.createElement('div');
  wrap.className = 'column';
  wrap.__col = col; // lets the sidebar map a column object back to its DOM node
  wrap.addEventListener('mousedown', () => setActiveCol(col), true);

  wrap.style.flex = '0 0 auto';
  wrap.style.width = (col.width || DEFAULT_WIDTH) + 'px';

  const head = document.createElement('div');
  head.className = 'col-head';

  const dot = document.createElement('span');
  dot.className = 'dot';

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = col.title || col.url;
  title.title = '双击重命名';
  attachHeadRename(title, col); // double-click to rename (synced with the sidebar)

  const wv = document.createElement('webview');
  wv.dataset.url = col.url; // src is set later, staggered, in render()
  wv.setAttribute('partition', partitionFor(activeAccountId)); // this window's account session
  wv.setAttribute('allowpopups', 'true');
  // Intercept tweet-photo clicks inside the page → window-wide lightbox.
  wv.setAttribute('preload', new URL('webview-preload.js', location.href).toString());
  wv.addEventListener('ipc-message', (e) => {
    if (e.channel === 'open-image' && e.args[0]) openLightbox(e.args[0]);
  });
  wv.addEventListener('dom-ready', () => {
    wv.insertCSS(columnCSS(navHiddenFor(col)));
    applyColumnZoom(wv, col.width || DEFAULT_WIDTH);
  });

  // In-column navigation (clicking tweets, profiles, lists, etc.) is browsing
  // and must NOT overwrite the column's defined URL.
  const syncState = () => {
    const url = wv.getURL();
    if (!url || !/^https?:/.test(url)) return;
    // Auto-name only if title was not manually set or empty
    if (!col.manualTitle && !col.title) {
      const t = (wv.getTitle() || '')
        .replace(/^\(\d+\+?\)\s*/, '')   // drop unread-count prefix like "(3) "
        .replace(/\s*[\/|]\s*X\s*$/i, '') // drop trailing " / X"
        .trim();
      if (t && t !== col.title) {
        col.title = t; title.textContent = t;
        const nav = navItems.get(col); if (nav) nav.label.textContent = t;
        saveColumns();
      }
    }
  };
  wv.addEventListener('did-navigate', syncState);
  wv.addEventListener('did-navigate-in-page', syncState);
  wv.addEventListener('page-title-updated', syncState);

  // Secondary controls (revealed on hover)
  const secondary = document.createElement('span');
  secondary.className = 'secondary';

  const backBtn = mkBtn(ICONS.back, '后退', () => {
    if (typeof wv.canGoBack === 'function' && wv.canGoBack()) wv.goBack();
  });
  const fwdBtn = mkBtn(ICONS.forward, '前进', () => {
    if (typeof wv.canGoForward === 'function' && wv.canGoForward()) wv.goForward();
  });

  const updateNavButtons = () => {
    // canGoBack/canGoForward throw if the webview isn't attached/dom-ready yet.
    // Guard so a re-render (account switch, add/remove col) never aborts mid-build.
    try { backBtn.disabled = (typeof wv.canGoBack === 'function') ? !wv.canGoBack() : true; }
    catch (_) { backBtn.disabled = true; }
    try { fwdBtn.disabled = (typeof wv.canGoForward === 'function') ? !wv.canGoForward() : true; }
    catch (_) { fwdBtn.disabled = true; }
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

    const wv = wrap.querySelector('webview');
    const onMove = (ev) => {
      let w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + (ev.clientX - startX)));
      wrap.style.width = w + 'px';
      applyColumnZoom(wv, w);
    };
    const onUp = () => {
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      col.width = Math.round(wrap.getBoundingClientRect().width);
      applyColumnZoom(wv, col.width);
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
  renderColNav();
}
function removeCol(col) { columns.splice(columns.indexOf(col), 1); saveColumns(); render(); }
function addColumn(col) { columns.push({ width: DEFAULT_WIDTH, ...col }); saveColumns(); render(); }

// ---- Column sidebar (list: click to jump, double-click rename, drag reorder) ----
const navListEl = document.getElementById('navList');
const navItems = new Map(); // col(object) -> { el, dot, label }
let activeCol = null;

// Map a column object to its live .column wrapper. Tagged in buildColumn so the
// mapping survives reordering (columns have no stable id).
function wrapForCol(col) {
  for (const child of deck.children) if (child.__col === col) return child;
  return null;
}

// One source of truth for a column's name so the header and the sidebar never
// drift. `manual=true` locks it so auto-naming (syncState) won't overwrite it.
function setColumnTitle(col, title, manual) {
  col.title = title;
  if (manual) col.manualTitle = true;
  const wrap = wrapForCol(col);
  if (wrap) { const t = wrap.querySelector('.col-head .title'); if (t && t.textContent !== title) t.textContent = title; }
  const nav = navItems.get(col);
  if (nav && nav.label.textContent !== title) nav.label.textContent = title;
  saveColumns();
}

function renderColNav() {
  if (!navListEl) return;
  if (activeCol && !columns.includes(activeCol)) activeCol = null;
  navItems.clear();
  navListEl.innerHTML = '';
  columns.forEach((col, i) => {
    const item = document.createElement('div');
    item.className = 'colnav-item';
    const grip = document.createElement('span');
    grip.className = 'cn-grip';
    grip.innerHTML = ICONS.grip;
    grip.title = '拖动排序';
    const dot = document.createElement('span'); dot.className = 'cn-dot';
    const label = document.createElement('span'); label.className = 'cn-label';
    label.textContent = col.title || col.url; label.title = '双击重命名';
    const right = document.createElement('span'); right.className = 'cn-right';
    const idx = document.createElement('span'); idx.className = 'cn-index';
    idx.textContent = i < 9 ? String(i + 1) : '';
    const del = document.createElement('button');
    del.className = 'cn-del'; del.innerHTML = ICONS.close; del.title = '删除该列';
    del.addEventListener('mousedown', (e) => e.stopPropagation());
    del.addEventListener('click', (e) => { e.stopPropagation(); removeCol(col); });
    right.append(idx, del);
    item.append(grip, dot, label, right);
    attachNavReorder(item, col);
    attachNavRename(label, col);
    navListEl.appendChild(item);
    navItems.set(col, { el: item, dot, label });
  });
  const countEl = document.getElementById('navCount');
  if (countEl) countEl.textContent = String(columns.length);
  syncNav();
}

function syncNav() {
  navItems.forEach((nav, col) => nav.el.classList.toggle('active', col === activeCol));
}
function setActiveCol(col) { activeCol = col; syncNav(); }

function jumpToColumn(col) {
  const wrap = wrapForCol(col);
  if (!wrap) return;
  setActiveCol(col);
  wrap.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  const wv = wrap.querySelector('webview');
  if (wv) { try { wv.focus(); } catch (_) {} }
}

// Shared inline-rename used by both the header title and the sidebar label.
function startInlineRename(el, col, restoreText) {
  el.contentEditable = 'true'; el.spellcheck = false; el.focus();
  const range = document.createRange(); range.selectNodeContents(el);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  let cancelled = false;
  const onKey = (ev) => {
    ev.stopPropagation();
    if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); cancelled = true; el.blur(); }
  };
  el.addEventListener('keydown', onKey);
  el.addEventListener('blur', () => {
    el.removeEventListener('keydown', onKey);
    el.contentEditable = 'false';
    window.getSelection().removeAllRanges();
    const v = el.textContent.trim();
    if (!cancelled && v) setColumnTitle(col, v, true); // manual rename → locks auto-naming
    else el.textContent = restoreText();
  }, { once: true });
}
function attachNavRename(labelEl, col) {
  labelEl.addEventListener('dblclick', (e) => {
    e.preventDefault(); e.stopPropagation();
    startInlineRename(labelEl, col, () => col.title || col.url);
  });
}
function attachHeadRename(titleEl, col) {
  titleEl.addEventListener('dblclick', (e) => {
    e.preventDefault(); e.stopPropagation();
    startInlineRename(titleEl, col, () => col.title || col.url);
  });
}

// Drag a sidebar entry to reorder; the deck columns reflow to match live (no
// reload). Below the move threshold it's a plain click → jump to that column.
function attachNavReorder(item, col) {
  item.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const label = item.querySelector('.cn-label');
    if (label && label.isContentEditable) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    let dragging = false;
    const onMove = (ev) => {
      if (!dragging) {
        if (Math.abs(ev.clientX - startX) < 4 && Math.abs(ev.clientY - startY) < 4) return;
        dragging = true; document.body.classList.add('reordering');
      }
      const overEl = document.elementFromPoint(ev.clientX, ev.clientY);
      const overItem = overEl && overEl.closest('.colnav-item');
      if (!overItem) return;
      let overCol = null;
      navItems.forEach((n, c) => { if (n.el === overItem) overCol = c; });
      if (!overCol || overCol === col) return;
      const from = columns.indexOf(col), to = columns.indexOf(overCol);
      if (from < 0 || to < 0 || from === to) return;
      columns.splice(from, 1); columns.splice(to, 0, col);
      // Reflow the deck to match the array — appendChild moves live webviews.
      columns.forEach((c) => { const w = wrapForCol(c); if (w) deck.appendChild(w); });
      renderColNav();
      const fresh = navItems.get(col);
      if (fresh) fresh.el.classList.add('cn-dragging');
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('reordering');
      if (dragging) { const fresh = navItems.get(col); if (fresh) fresh.el.classList.remove('cn-dragging'); saveColumns(); }
      else jumpToColumn(col); // it was a click, not a drag
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ---- Fullscreen image lightbox (escapes the column width) ----
// Tweet photos arrive as name=small/medium thumbnails; ask for the original.
function hiResImageURL(src) {
  try {
    const u = new URL(src);
    if (u.hostname === 'pbs.twimg.com') u.searchParams.set('name', 'orig');
    return u.toString();
  } catch (_) { return src; }
}

let lightboxEl = null;
function ensureLightbox() {
  if (lightboxEl) return lightboxEl;
  lightboxEl = document.createElement('div');
  lightboxEl.id = 'lightbox';
  lightboxEl.tabIndex = -1; // focusable, so Esc works even after clicking in a webview
  lightboxEl.innerHTML = '<img alt="" /><button class="lb-close" title="关闭 (Esc)">' + ICONS.close + '</button>';
  document.body.appendChild(lightboxEl);
  const img = lightboxEl.querySelector('img');
  lightboxEl.addEventListener('click', (e) => {
    if (e.target === img) lightboxEl.classList.toggle('zoomed'); // 点图片放大到原始尺寸
    else closeLightbox();
  });
  lightboxEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
  });
  return lightboxEl;
}
function openLightbox(src) {
  const lb = ensureLightbox();
  lb.querySelector('img').src = hiResImageURL(src);
  lb.classList.add('open');
  lb.classList.remove('zoomed');
  lb.focus();
}
function closeLightbox() {
  if (!lightboxEl) return;
  lightboxEl.classList.remove('open', 'zoomed');
  lightboxEl.querySelector('img').removeAttribute('src');
}
// Right-click "全屏查看图片" in any column lands here via the main process.
if (isElectron && window.electronAPI.onOpenImage) {
  window.electronAPI.onOpenImage(openLightbox);
}

// ---- Add / edit dialog ----
const dlg = document.getElementById('colDialog');
const presetSel = document.getElementById('presetSel');
const titleInput = document.getElementById('titleInput');
const urlInput = document.getElementById('urlInput');
const dlgTitle = document.getElementById('dlgTitle');
const useCurrentUrlBtn = document.getElementById('useCurrentUrlBtn');
let editIndex = null;

presetSel.onchange = () => {
  if (presetSel.value) {
    urlInput.value = presetSel.value;
    const text = presetSel.options[presetSel.selectedIndex].text;
    titleInput.value = text.split(/[\s\/]/)[0];
  }
};
function openDialog(idx) {
  editIndex = (typeof idx === 'number') ? idx : null;
  dlgTitle.textContent = editIndex === null ? '添加列' : '编辑列';
  presetSel.value = '';
  titleInput.value = editIndex === null ? '' : (columns[editIndex].title || '');
  urlInput.value = editIndex === null ? '' : (columns[editIndex].url || '');

  if (useCurrentUrlBtn) {
    if (editIndex !== null) {
      const wrap = wrapForCol(columns[editIndex]);
      const wv = wrap ? wrap.querySelector('webview') : null;
      const curUrl = wv ? wv.getURL() : null;
      if (curUrl && /^https?:/.test(curUrl) && curUrl !== columns[editIndex].url) {
        useCurrentUrlBtn.style.display = 'inline-flex';
        useCurrentUrlBtn.onclick = () => {
          urlInput.value = curUrl;
          const curTitle = (wv.getTitle() || '').replace(/^\(\d+\+?\)\s*/, '').replace(/\s*[\/|]\s*X\s*$/i, '').trim();
          if (curTitle && !titleInput.value) titleInput.value = curTitle;
        };
      } else {
        useCurrentUrlBtn.style.display = 'none';
      }
    } else {
      useCurrentUrlBtn.style.display = 'none';
    }
  }
  dlg.showModal();
}
document.getElementById('dlgCancel').onclick = () => dlg.close();
document.getElementById('dlgSave').onclick = () => {
  let url = urlInput.value.trim();
  if (!url) return;
  if (!/^https?:\/\//.test(url)) url = 'https://' + url;
  const title = titleInput.value.trim() || url;
  if (editIndex === null) addColumn({ title, url, manualTitle: true });
  else {
    columns[editIndex] = { ...columns[editIndex], title, url, manualTitle: true };
    saveColumns();
    render();
  }
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

// ---- Default Columns Management (每次默认打开的列设置) ----
const defaultColsDlg = document.getElementById('defaultColsDialog');
const defaultColsListEl = document.getElementById('defaultColsList');

const DEFAULT_PRESETS = [
  { text: '— 快速填入预设 —', url: '', title: '' },
  { text: '主页 Home', url: 'https://x.com/home', title: '主页' },
  { text: 'AI 关注列表', url: 'https://x.com/i/lists/2062302318897611056', title: 'AI' },
  { text: '美股关注列表', url: 'https://x.com/i/lists/2059566674173743297', title: '美股' },
  { text: '收藏 / 书签 Bookmarks', url: 'https://x.com/i/bookmarks', title: '收藏' },
  { text: '通知 Notifications', url: 'https://x.com/notifications', title: '通知' },
  { text: '私信 Messages', url: 'https://x.com/messages', title: '私信' },
  { text: '我的列表 Lists', url: 'https://x.com/i/lists', title: '我的列表' },
  { text: '搜索: NVDA', url: 'https://x.com/search?q=NVDA%20OR%20Nvidia&f=live', title: 'NVDA' },
  { text: '搜索: $SPY/$QQQ', url: 'https://x.com/search?q=%24SPY%20OR%20%24QQQ&f=live', title: '$SPY/$QQQ' },
  { text: '新闻 News', url: 'https://x.com/explore/tabs/news', title: '新闻' },
];

function renderDefaultColsRows(items) {
  if (!defaultColsListEl) return;
  defaultColsListEl.innerHTML = '';
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'default-col-row';

    const num = document.createElement('span');
    num.className = 'default-col-num';
    num.textContent = String(idx + 1);

    const fields = document.createElement('div');
    fields.className = 'default-col-fields';

    const inputs = document.createElement('div');
    inputs.className = 'default-col-inputs';

    const titleInp = document.createElement('input');
    titleInp.type = 'text';
    titleInp.className = 'default-col-title';
    titleInp.placeholder = '标题（如：AI）';
    titleInp.value = item.title || '';

    const urlInp = document.createElement('input');
    urlInp.type = 'text';
    urlInp.className = 'default-col-url';
    urlInp.placeholder = 'URL 链接（https://x.com/...）';
    urlInp.value = item.url || '';

    inputs.append(titleInp, urlInp);

    const sel = document.createElement('select');
    sel.className = 'default-col-preset';
    DEFAULT_PRESETS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.url;
      opt.dataset.title = p.title;
      opt.textContent = p.text;
      sel.appendChild(opt);
    });
    sel.onchange = () => {
      if (sel.value) {
        urlInp.value = sel.value;
        const opt = sel.options[sel.selectedIndex];
        titleInp.value = opt.dataset.title || '';
      }
    };

    fields.append(inputs, sel);

    const btns = document.createElement('div');
    btns.className = 'default-col-btns';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'icon-btn';
    upBtn.textContent = '▲';
    upBtn.title = '上移';
    upBtn.disabled = (idx === 0);
    upBtn.onclick = () => {
      const cur = collectDefaultColsFromUI();
      if (idx > 0) {
        [cur[idx - 1], cur[idx]] = [cur[idx], cur[idx - 1]];
        renderDefaultColsRows(cur);
      }
    };

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'icon-btn';
    downBtn.textContent = '▼';
    downBtn.title = '下移';
    downBtn.disabled = (idx === items.length - 1);
    downBtn.onclick = () => {
      const cur = collectDefaultColsFromUI();
      if (idx < cur.length - 1) {
        [cur[idx], cur[idx + 1]] = [cur[idx + 1], cur[idx]];
        renderDefaultColsRows(cur);
      }
    };

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn danger';
    delBtn.textContent = '✕';
    delBtn.title = '删除';
    delBtn.onclick = () => {
      const cur = collectDefaultColsFromUI();
      if (cur.length <= 1) {
        alert('至少保留一列');
        return;
      }
      cur.splice(idx, 1);
      renderDefaultColsRows(cur);
    };

    btns.append(upBtn, downBtn, delBtn);
    row.append(num, fields, btns);
    defaultColsListEl.appendChild(row);
  });
}

function collectDefaultColsFromUI() {
  if (!defaultColsListEl) return [];
  const rows = defaultColsListEl.querySelectorAll('.default-col-row');
  const items = [];
  rows.forEach(r => {
    const t = r.querySelector('.default-col-title').value.trim();
    let u = r.querySelector('.default-col-url').value.trim();
    if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
    items.push({ title: t || u, url: u, manualTitle: true });
  });
  return items;
}

function openDefaultColsDialog() {
  if (!defaultColsDlg) return;
  const acc = getAccount();
  const list = defaultCols(acc);
  renderDefaultColsRows(list);
  defaultColsDlg.showModal();
}

const defaultColsCancelBtn = document.getElementById('defaultColsCancel');
if (defaultColsCancelBtn) defaultColsCancelBtn.onclick = () => defaultColsDlg.close();

const addDefaultColBtn = document.getElementById('addDefaultColBtn');
if (addDefaultColBtn) {
  addDefaultColBtn.onclick = () => {
    const cur = collectDefaultColsFromUI();
    cur.push({ title: '新列表', url: 'https://x.com/home', manualTitle: true });
    renderDefaultColsRows(cur);
  };
}

const setCurAsDefaultBtn = document.getElementById('setCurAsDefaultBtn');
if (setCurAsDefaultBtn) {
  setCurAsDefaultBtn.onclick = () => {
    const cur = columns.map(c => ({
      title: c.title || '列',
      url: c.url,
      manualTitle: true,
    }));
    renderDefaultColsRows(cur);
    showToast('已载入当前窗口列，请确认后点击「保存并应用」');
  };
}

const resetSystemDefaultBtn = document.getElementById('resetSystemDefaultBtn');
if (resetSystemDefaultBtn) {
  resetSystemDefaultBtn.onclick = () => {
    renderDefaultColsRows(DEFAULT_COLUMNS.map(c => ({ ...c })));
    showToast('已载入系统推荐预设（主页 / AI / 美股 / 收藏）');
  };
}

const defaultColsSaveBtn = document.getElementById('defaultColsSave');
if (defaultColsSaveBtn) {
  defaultColsSaveBtn.onclick = () => {
    const items = collectDefaultColsFromUI().filter(c => !!c.url);
    if (!items.length) {
      alert('请至少输入一个有效网址');
      return;
    }
    const acc = getAccount();
    acc.defaultColumns = items.map(c => ({
      width: DEFAULT_WIDTH,
      ...c,
    }));
    // Apply immediately to current columns
    columns = acc.defaultColumns.map(c => ({ ...c }));
    acc.columns = columns;
    saveColumns();
    render();
    defaultColsDlg.close();
    showToast('默认打开的列已更新并立即生效！');
  };
}

// ---- Boot ----
buildRail();
installFitColumnsAction();
setNavCollapsed(navCollapsed); // sets class + width + collapse-button icon
attachNavResize(document.getElementById('navResizer'));
render();

// Global support for mouse side back/forward buttons in the main window
window.addEventListener('mousedown', (e) => {
  if (e.button === 3) {
    const hoveredWebview = document.querySelector('webview:hover');
    if (hoveredWebview && typeof hoveredWebview.canGoBack === 'function' && hoveredWebview.canGoBack()) {
      e.preventDefault();
      hoveredWebview.goBack();
    }
  } else if (e.button === 4) {
    const hoveredWebview = document.querySelector('webview:hover');
    if (hoveredWebview && typeof hoveredWebview.canGoForward === 'function' && hoveredWebview.canGoForward()) {
      e.preventDefault();
      hoveredWebview.goForward();
    }
  }
});

// Ctrl+Plus / Ctrl+Minus / Ctrl+Zero: in-column text size only. Column count
// and widths never move; each webview just re-applies width-zoom × textScale.
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '0')) {
    e.preventDefault();
    if (e.key === '=' || e.key === '+') {
      textScale = Math.min(TEXT_SCALE_MAX, Math.round((textScale + 0.1) * 10) / 10);
    } else if (e.key === '-') {
      textScale = Math.max(TEXT_SCALE_MIN, Math.round((textScale - 0.1) * 10) / 10);
    } else {
      textScale = 1.0;
    }
    saveTextScale();
    applyAllColumnZooms();
  }
});
