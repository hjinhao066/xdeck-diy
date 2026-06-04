const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.sendSync('load-config-sync'),
  saveAccount: (payload) => ipcRenderer.sendSync('save-account-sync', payload),
  deleteAccount: (id) => ipcRenderer.send('delete-account-async', id),
  openAccountWindow: (id) => ipcRenderer.send('open-account-window', id),
  setActivePartition: (partition) => ipcRenderer.send('set-active-partition', partition),
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor()
});
