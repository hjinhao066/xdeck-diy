const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.sendSync('load-config-sync'),
  saveConfig: (config) => ipcRenderer.send('save-config-async', config)
});
