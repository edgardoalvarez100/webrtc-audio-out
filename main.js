const {
  app,
  BrowserWindow,
  nativeTheme,
  session,
  ipcMain,
} = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const ConfigManager = require("./config");

// === 🧱 FLAGS PARA EVITAR ERRORES DE GPU CACHE ===
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

// =================================================

// Configurar auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Usar configuración local (en la carpeta de la aplicación)
// Esto permite múltiples instancias con configuraciones independientes
const configManager = new ConfigManager(path.join(__dirname, "config.json"));

console.log("📁 Archivo de configuración:", configManager.getConfigPath());

// IPC handlers para get/set de configuración
ipcMain.handle("config-get", (event, key, defVal = null) => {
  return configManager.get(key, defVal);
});

ipcMain.handle("config-set", (event, key, val) => {
  return configManager.set(key, val);
});

// IPC handler para configurar autostart
ipcMain.handle("set-autostart", (event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      name: "WebRTC Audio Receiver",
    });
    console.log(`Autostart ${enabled ? "activado" : "desactivado"}`);
    return true;
  } catch (e) {
    console.error("Error al configurar autostart:", e);
    throw e;
  }
});

// IPC handler para obtener el estado actual del autostart
ipcMain.handle("get-autostart", () => {
  try {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch (e) {
    console.error("Error al obtener autostart:", e);
    return false;
  }
});

// Crear la ventana principal
function createWindow() {
  const win = new BrowserWindow({
    width: 1080,
    height: 700,
    minWidth: 700,
    minHeight: 600,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Política CSP para más seguridad
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; connect-src * blob: data:; media-src * blob: data:; script-src 'self'; style-src 'self' 'unsafe-inline'",
        ],
      },
    });
  });

  // Cargar interfaz
  win.loadFile("index.html");

  // DevTools para debugging (comentar en producción)
  // win.webContents.openDevTools({ mode: 'detach' });

  // Mensaje en consola cuando la app esté lista
  win.webContents.once("did-finish-load", () => {
    console.log("✅ WebRTC Audio Out iniciado correctamente");
    console.log("⚙️  Esperando conexión al stream WHEP...");
    console.log("📁 Config local guardado en:", configManager.getConfigPath());
  });
}

// Crear ventana cuando Electron esté listo
app.whenReady().then(() => {
  nativeTheme.themeSource = "dark";
  createWindow();

  // Verificar actualizaciones después de 3 segundos
  setTimeout(() => {
    checkForUpdates();
  }, 3000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// === AUTO-UPDATER ===
function checkForUpdates() {
  console.log("🔍 Verificando actualizaciones...");
  autoUpdater.checkForUpdatesAndNotify();
}

// Eventos del auto-updater
autoUpdater.on("checking-for-update", () => {
  console.log("🔍 Buscando actualizaciones...");
});

autoUpdater.on("update-available", (info) => {
  console.log("✅ Actualización disponible:", info.version);
  console.log("📦 Descargando actualización...");
});

autoUpdater.on("update-not-available", (info) => {
  console.log("✅ La aplicación está actualizada (v" + info.version + ")");
});

autoUpdater.on("error", (err) => {
  console.log("❌ Error en auto-updater:", err);
});

autoUpdater.on("download-progress", (progressObj) => {
  let log_message = "📥 Descargando: " + progressObj.percent.toFixed(2) + "%";
  log_message +=
    " (" + (progressObj.transferred / 1024 / 1024).toFixed(2) + "MB";
  log_message += " / " + (progressObj.total / 1024 / 1024).toFixed(2) + "MB)";
  console.log(log_message);
});

autoUpdater.on("update-downloaded", (info) => {
  console.log("✅ Actualización descargada");
  console.log("🔄 La actualización se instalará al cerrar la aplicación");

  // Notificar al usuario
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.send("update-downloaded", info.version);
  }
});

// Salir en Windows/Linux al cerrar todas las ventanas
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
