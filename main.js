const {
  app,
  BrowserWindow,
  nativeTheme,
  session,
  ipcMain,
} = require("electron");
const path = require("path");
const ConfigManager = require("./config");

// === 🧱 FLAGS PARA EVITAR ERRORES DE GPU CACHE ===
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

// =================================================

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

  // Si quieres ver logs del renderizador, descomenta:
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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Salir en Windows/Linux al cerrar todas las ventanas
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
