const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// Use a normal desktop Chrome UA so x.com serves the full web app.
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 950,
    title: 'XDeck DIY',
    backgroundColor: '#15202b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,           // allow <webview> columns
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
  // Uncomment to debug: win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  // Force a real Chrome UA on the shared X session so login + full UI work.
  const xSession = session.fromPartition('persist:x');
  xSession.setUserAgent(CHROME_UA);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
