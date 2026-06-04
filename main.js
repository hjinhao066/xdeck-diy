const { app, BrowserWindow, session, Menu, clipboard, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// History helpers. Electron 30 still has webContents.canGoBack()/goBack();
// newer versions move them to webContents.navigationHistory. Feature-detect
// the METHOD (the navigationHistory object exists in 30 but without these).
const canBack = (c) => (typeof c.canGoBack === 'function' ? c.canGoBack() : c.navigationHistory.canGoBack());
const canFwd  = (c) => (typeof c.canGoForward === 'function' ? c.canGoForward() : c.navigationHistory.canGoForward());
const goBack  = (c) => (typeof c.goBack === 'function' ? c.goBack() : c.navigationHistory.goBack());
const goFwd   = (c) => (typeof c.goForward === 'function' ? c.goForward() : c.navigationHistory.goForward());

// Two-finger horizontal swipe → back/forward, injected into each column's page.
// (When macOS already does native swipe-nav the gesture never reaches JS as a
// wheel event, so this only kicks in when it would otherwise do nothing.)
const SWIPE_JS = `
(function(){
  if (window.__xdeckSwipe) return; window.__xdeckSwipe = true;
  var acc = 0, fired = false, idle;
  addEventListener('wheel', function(e){
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical -> ignore
    acc += e.deltaX;
    clearTimeout(idle);
    idle = setTimeout(function(){ acc = 0; fired = false; }, 180);
    if (!fired && Math.abs(acc) > 120) {
      fired = true;
      if (acc > 0) history.forward(); else history.back();
    }
  }, { passive: true });

  // Support mouse side buttons (back and forward)
  addEventListener('mousedown', function(e){
    if (e.button === 3) {
      e.preventDefault();
      history.back();
    } else if (e.button === 4) {
      e.preventDefault();
      history.forward();
    }
  });
})();
`;

function popupContextMenu(contents, params) {
  const tpl = [];
  if (params.mediaType === 'image') {
    tpl.push(
      { label: '复制图片', click: () => contents.copyImageAt(params.x, params.y) },
      { label: '复制图片地址', click: () => clipboard.writeText(params.srcURL) },
      { label: '保存图片…', click: () => contents.downloadURL(params.srcURL) },
      { label: '在浏览器中打开', click: () => shell.openExternal(params.srcURL) },
      { type: 'separator' },
    );
  }
  if (params.linkURL) {
    tpl.push({ label: '复制链接地址', click: () => clipboard.writeText(params.linkURL) }, { type: 'separator' });
  }
  if (params.isEditable) {
    tpl.push({ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' });
  } else if (params.selectionText) {
    tpl.push({ role: 'copy' }, { type: 'separator' });
  }
  tpl.push(
    { label: '返回', enabled: canBack(contents), click: () => goBack(contents) },
    { label: '前进', enabled: canFwd(contents), click: () => goFwd(contents) },
    { label: '重新加载', click: () => contents.reload() },
  );
  Menu.buildFromTemplate(tpl).popup();
}

// Use a normal desktop Chrome UA so x.com serves the full web app.
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const isMac = process.platform === 'darwin';

// Each account = its own persistent session partition (independent login/cookies).
// 'default' keeps the original partition so existing logins are preserved.
function partitionFor(accountId) {
  return (!accountId || accountId === 'default') ? 'persist:x' : 'persist:x-' + accountId;
}

// One deck window, bound to a single account. Open several for several accounts —
// they run independent sessions and don't interfere.
function createWindow(accountId = 'default') {
  const partition = partitionFor(accountId);
  session.fromPartition(partition).setUserAgent(CHROME_UA);

  const win = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 640,
    minHeight: 480,
    title: 'XDeck',
    backgroundColor: '#000000',
    // Clean chrome: hidden inset title bar puts traffic lights over the left rail
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 14, y: 16 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.__partition = partition; // updated when the window switches account
  win.loadFile('index.html', { query: { account: accountId } });

  // Compose / external popups open as a small window sharing THIS window's account.
  win.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      width: 620,
      height: 700,
      webPreferences: { partition: win.__partition },
    },
  }));
  // win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  const readConfig = () => {
    try {
      if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (err) { console.error('Error loading config:', err); }
    return null;
  };
  const writeConfig = (cfg) => {
    try { fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8'); }
    catch (err) { console.error('Error saving config:', err); }
  };

  ipcMain.on('load-config-sync', (event) => { event.returnValue = readConfig(); });

  // Merge-save: a window only writes ITS account's slice (+ global theme/fit),
  // so multiple windows editing different accounts never clobber each other.
  ipcMain.on('save-account-sync', (event, payload) => {
    const cfg = readConfig() || { accounts: [], theme: 'dark', fitWindow: false };
    if (!Array.isArray(cfg.accounts)) cfg.accounts = [];
    if (payload && payload.account) {
      const i = cfg.accounts.findIndex(a => a.id === payload.account.id);
      if (i >= 0) cfg.accounts[i] = payload.account; else cfg.accounts.push(payload.account);
    }
    if (payload && payload.theme !== undefined) cfg.theme = payload.theme;
    if (payload && payload.fitWindow !== undefined) cfg.fitWindow = payload.fitWindow;
    if (payload && payload.lastActiveAccount) cfg.lastActiveAccount = payload.lastActiveAccount;
    writeConfig(cfg);
    event.returnValue = true;
  });

  ipcMain.on('delete-account-async', (_e, id) => {
    const cfg = readConfig();
    if (!cfg || !Array.isArray(cfg.accounts)) return;
    cfg.accounts = cfg.accounts.filter(a => a.id !== id);
    writeConfig(cfg);
  });

  // A window tells us which account (partition) it's now showing, so its popups
  // (compose, external links) open in the right session.
  ipcMain.on('set-active-partition', (e, p) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w && p) w.__partition = p;
  });
  ipcMain.on('open-account-window', (_e, accountId) => createWindow(accountId || 'default'));

  // Per-column webview behaviors: desktop UA (for every account session),
  // right-click menu + swipe navigation.
  app.on('web-contents-created', (_e, contents) => {
    if (contents.getType() !== 'webview') return;
    try { contents.session.setUserAgent(CHROME_UA); } catch (_) {}
    contents.on('context-menu', (_ev, params) => popupContextMenu(contents, params));
    contents.on('swipe', (_ev, dir) => {            // 3-finger trackpad swipe
      if (dir === 'right') goBack(contents);
      else if (dir === 'left') goFwd(contents);
    });
    contents.on('dom-ready', () => contents.executeJavaScript(SWIPE_JS).catch(() => {}));
  });

  const startCfg = readConfig();
  createWindow(startCfg && startCfg.lastActiveAccount ? startCfg.lastActiveAccount : 'default');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
