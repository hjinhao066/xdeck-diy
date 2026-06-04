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

function createWindow() {
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

  win.loadFile('index.html');

  // Compose / external popups open as a small logged-in window (shared session)
  win.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      width: 620,
      height: 700,
      webPreferences: { partition: 'persist:x' },
    },
  }));
  // win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  const configPath = path.join(app.getPath('userData'), 'config.json');

  ipcMain.on('load-config-sync', (event) => {
    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8');
        event.returnValue = JSON.parse(data);
        return;
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
    event.returnValue = null;
  });

  ipcMain.on('save-config-async', (event, config) => {
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving config:', err);
    }
  });

  const xSession = session.fromPartition('persist:x');
  xSession.setUserAgent(CHROME_UA);

  // Per-column webview behaviors: right-click menu + swipe navigation.
  app.on('web-contents-created', (_e, contents) => {
    if (contents.getType() !== 'webview') return;
    contents.on('context-menu', (_ev, params) => popupContextMenu(contents, params));
    contents.on('swipe', (_ev, dir) => {            // 3-finger trackpad swipe
      if (dir === 'right') goBack(contents);
      else if (dir === 'left') goFwd(contents);
    });
    contents.on('dom-ready', () => contents.executeJavaScript(SWIPE_JS).catch(() => {}));
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
