// preload.js
const { contextBridge, ipcRenderer } = require("electron");

// Exponemos métodos para persistencia usando el main process
contextBridge.exposeInMainWorld("webrtcCfg", {
  get: (key, defVal = null) => ipcRenderer.invoke("config-get", key, defVal),
  set: (key, val) => ipcRenderer.invoke("config-set", key, val),
  getInstanceInfo: () => ipcRenderer.invoke("get-instance-info"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
});

// API para funcionalidades de Electron
contextBridge.exposeInMainWorld("electronAPI", {
  setAutostart: (enabled) => ipcRenderer.invoke("set-autostart", enabled),
  getAutostart: () => ipcRenderer.invoke("get-autostart"),

  // Listener para actualizaciones
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on("update-downloaded", (event, version) => callback(version));
  },
});
