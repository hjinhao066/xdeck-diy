const { app, BrowserWindow, session } = require('electron');
const path = require('path');

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
  const xSession = session.fromPartition('persist:x');
  xSession.setUserAgent(CHROME_UA);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
