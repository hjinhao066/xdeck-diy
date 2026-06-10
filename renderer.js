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

function defaultCols() { return DEFAULT_COLUMNS.map(c => ({ width: DEFAULT_WIDTH, ...c })); }

// theme/fitWindow are global; columns are PER ACCOUNT. Each account has its own
// independent login session (partition) and its own deck layout.
let appConfig = {
  theme: 'dark',
  fitWindow: false,
  accounts: [{ id: 'default', name: '账号 1', columns: defaultCols() }],
};

// This window is bound to one account, passed by the main process via the URL.
let activeAccountId = new URLSearchParams(location.search).get('account') || 'default';

const isElectron = typeof window !== 'undefined' && window.electronAPI;

function normalizeConfig(saved) {
  if (!saved) return;
  if (saved.theme) appConfig.theme = saved.theme;
  if (saved.fitWindow !== undefined) appConfig.fitWindow = saved.fitWindow;
  if (Array.isArray(saved.accounts) && saved.accounts.length) {
    appConfig.accounts = saved.accounts.map(a => ({
      id: a.id,
      name: a.name || '账号',
      columns: (a.columns || []).map(c => ({ width: DEFAULT_WIDTH, ...c })),
    }));
  } else if (Array.isArray(saved.columns)) {
    // migrate the old single-account config into the accounts model
    appConfig.accounts = [{ id: 'default', name: '账号 1', columns: saved.columns.map(c => ({ width: DEFAULT_WIDTH, ...c })) }];
  }
}

function loadConfig() {
  if (isElectron) {
    try { normalizeConfig(window.electronAPI.loadConfig()); return; }
    catch (e) { console.error('Failed to load config via IPC:', e); }
  }
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

loadConfig();

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

function saveColumns() {
  getAccount().columns = columns; // columns is a live ref to the active account's array
  if (isElectron && window.electronAPI.saveAccount) {
    try {
      window.electronAPI.saveAccount({
        account: getAccount(),
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

// ---- Left rail ----
function buildRail() {
  const rail = document.getElementById('rail');
  rail.innerHTML = '';

  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.textContent = 'X';
  rail.appendChild(logo);

  const acctBtn = railBtn(ICONS.user, '账号 / 多窗口', () => toggleAccountMenu(acctBtn));
  acctBtn.id = 'acctBtn';
  rail.appendChild(acctBtn);

  rail.appendChild(railBtn(ICONS.plus, '添加列', openDialog, true));
  rail.appendChild(railBtn(ICONS.list, '添加 X 列表', openListDialog));
  rail.appendChild(railBtn(ICONS.reload, '全部刷新', () =>
    document.querySelectorAll('webview').forEach(wv => wv.reload())));

  const fitBtn = railBtn(ICONS.fit, '等比例适应窗口 / 滚动布局', () => {
    appConfig.fitWindow = !appConfig.fitWindow;
    fitBtn.classList.toggle('accent', appConfig.fitWindow);
    saveColumns();
    updateColumnStyles();
  });
  fitBtn.id = 'fitBtn';
  if (appConfig.fitWindow) fitBtn.classList.add('accent');
  rail.appendChild(fitBtn);

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
  deck.style.overflowX = appConfig.fitWindow ? 'hidden' : 'auto';
  columns.forEach((col) => deck.appendChild(buildColumn(col)));
  // Stagger the initial loads. Firing every column at x.com simultaneously
  // on the same session makes X's anti-bot throttle the boot, leaving every
  // column stuck on the splash screen. Load them one-by-one instead.
  deck.querySelectorAll('webview').forEach((wv, i) => {
    setTimeout(() => wv.setAttribute('src', wv.dataset.url), i * 600);
  });
}

function updateColumnStyles() {
  const isFit = appConfig.fitWindow;
  deck.style.overflowX = isFit ? 'hidden' : 'auto';
  
  const cols = deck.querySelectorAll('.column');
  cols.forEach((wrap, i) => {
    const col = columns[i];
    if (!col) return;
    if (isFit) {
      wrap.style.flex = `${col.width} ${col.width} 0%`;
      wrap.style.width = '';
    } else {
      wrap.style.flex = '0 0 auto';
      wrap.style.width = `${col.width}px`;
    }
  });
}

function buildColumn(col) {
  const wrap = document.createElement('div');
  wrap.className = 'column';
  
  const isFit = appConfig.fitWindow;
  if (isFit) {
    wrap.style.flex = `${col.width} ${col.width} 0%`;
  } else {
    wrap.style.flex = '0 0 auto';
    wrap.style.width = (col.width || DEFAULT_WIDTH) + 'px';
  }

  const head = document.createElement('div');
  head.className = 'col-head';

  const dot = document.createElement('span');
  dot.className = 'dot';

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = col.title || col.url;

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
    try {
      if (window.electronAPI && typeof window.electronAPI.getZoomFactor === 'function') {
        const currentZoom = window.electronAPI.getZoomFactor();
        wv.setZoomFactor(currentZoom);
      }
    } catch (err) {
      console.error('Error applying zoom to webview:', err);
    }
  });

  // Keep the column following the FEED it's on (home / list / search /
  // bookmarks / profile), persisting that so it restores next launch. We
  // deliberately ignore transient drill-downs — opening a single tweet, a
  // photo/video lightbox, compose, etc. — so a column never gets saved as a
  // near-black photo overlay and the header keeps showing the feed name.
  const TRANSIENT = /\/status\/|\/photo\/|\/video\/|\/compose\/|\/intent\/|\/i\/lists\/\d+\/[a-z]/i;
  const syncState = () => {
    const url = wv.getURL();
    if (!url || !/^https?:/.test(url) || TRANSIENT.test(url)) return;
    let changed = false;
    if (url !== col.url) { col.url = url; changed = true; }
    const t = (wv.getTitle() || '')
      .replace(/^\(\d+\+?\)\s*/, '')   // drop unread-count prefix like "(3) "
      .replace(/\s*[\/|]\s*X\s*$/i, '') // drop trailing " / X"
      .trim();
    if (t && t !== col.title) { col.title = t; title.textContent = t; changed = true; }
    if (changed) saveColumns(); // title updates fire constantly; only persist real changes
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
    
    const isFit = appConfig.fitWindow;
    const cols = Array.from(deck.querySelectorAll('.column'));
    let initialWidths = [];
    if (isFit) {
      initialWidths = cols.map(c => c.getBoundingClientRect().width);
      cols.forEach((c, idx) => {
        c.style.flex = 'none';
        c.style.width = initialWidths[idx] + 'px';
      });
    }

    const onMove = (ev) => {
      let w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + (ev.clientX - startX)));
      wrap.style.width = w + 'px';
    };
    const onUp = () => {
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      
      if (isFit) {
        col.width = Math.round(wrap.getBoundingClientRect().width);
        cols.forEach((c, idx) => {
          columns[idx].width = Math.round(c.getBoundingClientRect().width);
        });
        saveColumns();
        updateColumnStyles();
      } else {
        col.width = Math.round(wrap.getBoundingClientRect().width);
        saveColumns();
      }
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

// Sync zoom level (Ctrl+Plus, Ctrl+Minus, Ctrl+Zero) to webviews
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '0')) {
    e.preventDefault();
    if (!window.electronAPI || typeof window.electronAPI.getZoomFactor !== 'function') return;
    
    let currentZoom = window.electronAPI.getZoomFactor();
    if (e.key === '=' || e.key === '+') {
      currentZoom = Math.min(3.0, Math.round((currentZoom + 0.1) * 10) / 10);
    } else if (e.key === '-') {
      currentZoom = Math.max(0.5, Math.round((currentZoom - 0.1) * 10) / 10);
    } else if (e.key === '0') {
      currentZoom = 1.0;
    }
    
    window.electronAPI.setZoomFactor(currentZoom);
    
    // Propagate zoom to all active webviews
    document.querySelectorAll('webview').forEach(wv => {
      try {
        if (typeof wv.setZoomFactor === 'function') {
          wv.setZoomFactor(currentZoom);
        }
      } catch (err) {
        console.error('Error scaling webview zoom:', err);
      }
    });
  }
});
