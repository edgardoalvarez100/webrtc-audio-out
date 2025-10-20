// config.js - Gestión de configuración local con soporte multi-instancia
const fs = require("fs");
const path = require("path");

class ConfigManager {
  constructor(configPath = null, instanceKey = null) {
    // Si no se especifica, usar la carpeta actual de la aplicación
    this.configPath = configPath || path.join(__dirname, "config.json");
    this.instanceKey = instanceKey || "default"; // Clave única para esta instancia
    this.config = this.loadConfig();
  }

  // Asegurar que el directorio de configuración existe
  ensureDirectoryExists() {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log("📁 Directorio de configuración creado:", configDir);
      }
    } catch (e) {
      console.error("Error al crear directorio de configuración:", e);
    }
  }

  // Cargar configuración desde disco
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf8");
        const allConfigs = JSON.parse(data);

        // Si existe configuración para esta instancia, devolverla
        if (allConfigs && allConfigs[this.instanceKey]) {
          console.log(
            `✅ Configuración cargada para instancia: "${this.instanceKey}"`
          );
          return allConfigs[this.instanceKey];
        } else {
          console.log(`🆕 Nueva instancia detectada: "${this.instanceKey}"`);
          console.log(`📝 Creando configuración por defecto...`);
          // Crear configuración por defecto y guardarla inmediatamente
          const defaultConfig = this.getDefaultConfig();
          this.config = defaultConfig;
          this.saveConfig(); // Guardar la config por defecto
          return defaultConfig;
        }
      } else {
        // Archivo no existe, crear configuración por defecto
        console.log(
          `📄 Archivo de configuración no encontrado, creando nuevo...`
        );
        const defaultConfig = this.getDefaultConfig();
        this.config = defaultConfig;
        this.saveConfig();
        return defaultConfig;
      }
    } catch (e) {
      console.error("Error al cargar config:", e);
      // En caso de error, devolver configuración por defecto
      return this.getDefaultConfig();
    }
  }

  // Obtener configuración por defecto
  getDefaultConfig() {
    return {
      WHEP_URL: "",
      WHEP_FAILOVER_URL: "",
      FAILOVER_ENABLED: "false",
      DEVICE_ID: "default",
      DEVICE_LABEL: "Default (Sistema)",
      VOLUME: "100",
      DEBUG_MODE: "false",
      AUTO_CONNECT: "false",
      FONT_SIZE: "16",
      EQ_PRESET: "Flat",
      EQ_BANDS: "[0,0,0,0,0,0,0,0,0,0]",
      COMPRESSOR_ENABLED: "false",
      COMPRESSOR_THRESHOLD: "-24",
      COMPRESSOR_RATIO: "12",
      COMPRESSOR_KNEE: "30",
      COMPRESSOR_ATTACK: "0.003",
      COMPRESSOR_RELEASE: "0.25",
      REVERB_ENABLED: "false",
      REVERB_MIX: "0.3",
      DELAY_ENABLED: "false",
      DELAY_TIME: "0.2",
      DELAY_FEEDBACK: "0.3",
      NOISE_GATE_ENABLED: "false",
      NOISE_GATE_THRESHOLD: "-50",
      RECONNECT_MS: "3000",
    };
  }

  // Guardar configuración en disco
  saveConfig() {
    try {
      // Asegurar que el directorio existe antes de guardar
      this.ensureDirectoryExists();

      // Leer todas las configuraciones existentes
      let allConfigs = {};
      if (fs.existsSync(this.configPath)) {
        try {
          const data = fs.readFileSync(this.configPath, "utf8");
          allConfigs = JSON.parse(data);
        } catch (e) {
          console.warn(
            "⚠️ No se pudo leer config existente, creando nuevo:",
            e
          );
          allConfigs = {};
        }
      }

      // Actualizar solo la configuración de esta instancia
      allConfigs[this.instanceKey] = this.config;

      // Guardar todas las configuraciones
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(allConfigs, null, 2),
        "utf8"
      );
      return true;
    } catch (e) {
      console.error("Error al guardar config:", e);
      console.error("Ruta de config:", this.configPath);
      console.error("Instancia:", this.instanceKey);
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

  // Resetear configuración a valores por defecto
  reset() {
    console.log(`🔄 Reseteando configuración a valores por defecto...`);
    this.config = this.getDefaultConfig();
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

  // Obtener la clave de instancia
  getInstanceKey() {
    return this.instanceKey;
  }

  // Listar todas las instancias guardadas
  listInstances() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf8");
        const allConfigs = JSON.parse(data);
        return Object.keys(allConfigs);
      }
    } catch (e) {
      console.error("Error al listar instancias:", e);
    }
    return [];
  }

  // Eliminar configuración de una instancia específica
  deleteInstance(instanceKey) {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf8");
        let allConfigs = JSON.parse(data);

        if (allConfigs[instanceKey]) {
          delete allConfigs[instanceKey];
          fs.writeFileSync(
            this.configPath,
            JSON.stringify(allConfigs, null, 2),
            "utf8"
          );
          console.log(`🗑️  Instancia eliminada: "${instanceKey}"`);
          return true;
        }
      }
    } catch (e) {
      console.error("Error al eliminar instancia:", e);
    }
    return false;
  }
}

module.exports = ConfigManager;
