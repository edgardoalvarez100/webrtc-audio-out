// config.js - Gestión de configuración local
const fs = require("fs");
const path = require("path");

class ConfigManager {
  constructor(configPath = null) {
    // Si no se especifica, usar la carpeta actual de la aplicación
    this.configPath = configPath || path.join(__dirname, "config.json");
    this.config = this.loadConfig();
  }

  // Cargar configuración desde disco
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf8");
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Error al cargar config:", e);
    }
    return {};
  }

  // Guardar configuración en disco
  saveConfig() {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        "utf8"
      );
      return true;
    } catch (e) {
      console.error("Error al guardar config:", e);
      return false;
    }
  }

  // Obtener valor de configuración
  get(key, defaultValue = null) {
    return this.config.hasOwnProperty(key) ? this.config[key] : defaultValue;
  }

  // Establecer valor de configuración
  set(key, value) {
    this.config[key] = value;
    return this.saveConfig();
  }

  // Obtener toda la configuración
  getAll() {
    return { ...this.config };
  }

  // Limpiar toda la configuración
  clear() {
    this.config = {};
    return this.saveConfig();
  }

  // Verificar si existe una clave
  has(key) {
    return this.config.hasOwnProperty(key);
  }

  // Eliminar una clave específica
  delete(key) {
    if (this.config.hasOwnProperty(key)) {
      delete this.config[key];
      return this.saveConfig();
    }
    return false;
  }

  // Obtener la ruta del archivo de configuración
  getConfigPath() {
    return this.configPath;
  }
}

module.exports = ConfigManager;
