// preload.js
const { contextBridge, ipcRenderer } = require("electron");

// Exponemos métodos para persistencia usando el main process
contextBridge.exposeInMainWorld("webrtcCfg", {
  get: (key, defVal = null) => ipcRenderer.invoke("config-get", key, defVal),
  set: (key, val) => ipcRenderer.invoke("config-set", key, val),
});

// API para funcionalidades de Electron
contextBridge.exposeInMainWorld("electronAPI", {
  setAutostart: (enabled) => ipcRenderer.invoke("set-autostart", enabled),
});
