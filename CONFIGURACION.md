# 📁 Ubicación del Archivo de Configuración

## 🎯 Resumen Rápido

La aplicación guarda tu configuración automáticamente en un archivo `config.json`. La ubicación depende de si estás usando la versión de desarrollo o la aplicación compilada.

## 📍 Ubicaciones por Sistema Operativo

### Windows

**Aplicación Compilada (instalada):**

```
C:\Users\<TuUsuario>\AppData\Roaming\webrtc-audio-out\config.json
```

**Acceso rápido:**

1. Presiona `Windows + R`
2. Escribe: `%APPDATA%\webrtc-audio-out`
3. Presiona Enter
4. Verás el archivo `config.json`

**Desarrollo (código fuente):**

```
C:\ruta\al\proyecto\webrtc-audio-out\config.json
```

### macOS

**Aplicación Compilada:**

```
~/Library/Application Support/webrtc-audio-out/config.json
```

**Acceso rápido:**

1. Abre Finder
2. Presiona `Cmd + Shift + G`
3. Escribe: `~/Library/Application Support/webrtc-audio-out`
4. Presiona Enter

### Linux

**Aplicación Compilada:**

```
~/.config/webrtc-audio-out/config.json
```

**Acceso rápido:**

```bash
cd ~/.config/webrtc-audio-out
ls -la
```

## 📝 Contenido del Archivo

El archivo `config.json` guarda toda tu configuración en formato JSON:

```json
{
  "WHEP_URL": "https://servidor.com:6001/rtc/v1/whep/?app=live&stream=livestream",
  "WHEP_FAILOVER_URL": "https://servidor-backup.com:6001/rtc/v1/whep/?app=live&stream=livestream",
  "FAILOVER_ENABLED": "true",
  "DEVICE_ID": "default",
  "DEVICE_LABEL": "Altavoces (High Definition Audio)",
  "VOLUME": "100",
  "DEBUG_MODE": "false",
  "AUTO_CONNECT": "false",
  "FONT_SIZE": "16",
  "EQ_PRESET": "Vocal",
  "EQ_BANDS": "[0,0,0,0,0,0,0,0,0,0]",
  "COMPRESSOR_ENABLED": "true",
  "COMPRESSOR_THRESHOLD": "-24",
  "COMPRESSOR_RATIO": "12",
  "REVERB_ENABLED": "false",
  "REVERB_MIX": "0.3",
  "DELAY_ENABLED": "false",
  "DELAY_TIME": "0.2",
  "NOISE_GATE_ENABLED": "false",
  "NOISE_GATE_THRESHOLD": "-50"
}
```

## 🔧 ¿Para Qué Sirve Este Archivo?

### 1. **Backup de Configuración**

Puedes copiar este archivo para hacer backup de tu configuración:

```bash
# Copiar a un lugar seguro
copy "%APPDATA%\webrtc-audio-out\config.json" "D:\Backups\config-2025-10-20.json"
```

### 2. **Transferir Configuración**

Copia el archivo a otro PC para usar la misma configuración:

```bash
# Copiar desde backup
copy "D:\Backups\config-2025-10-20.json" "%APPDATA%\webrtc-audio-out\config.json"
```

### 3. **Plantillas de Configuración**

Crea diferentes plantillas para diferentes casos de uso:

```
D:\Plantillas\
├── config-vocal.json    (Preset Vocal + Compresor)
├── config-musica.json   (Preset Rock + EQ personalizado)
└── config-limpio.json   (Sin efectos)
```

### 4. **Resetear Configuración**

Si quieres volver a los valores por defecto:

```bash
# Windows: Eliminar el archivo (la app creará uno nuevo)
del "%APPDATA%\webrtc-audio-out\config.json"

# macOS/Linux
rm ~/.config/webrtc-audio-out/config.json
```

## 🔄 Múltiples Instancias

⚠️ **Importante:** Cada usuario de Windows tiene su propio archivo `config.json` en su carpeta de usuario.

Si necesitas múltiples instancias con diferentes configuraciones en el **mismo usuario**, cada instancia comparte el mismo archivo de configuración. Para configuraciones verdaderamente independientes por instancia, necesitarías:

1. Usar diferentes usuarios de Windows, o
2. Modificar el código para usar una ruta personalizada

Ver [MULTIPLE_INSTANCES.md](MULTIPLE_INSTANCES.md) para más detalles.

## 🛠️ Edición Manual

Puedes editar el archivo manualmente con cualquier editor de texto:

### Windows:

```bash
notepad "%APPDATA%\webrtc-audio-out\config.json"
```

### Recomendaciones:

- ✅ Usa un editor de texto plano (Notepad, VSCode, Sublime, etc.)
- ✅ Cierra la aplicación antes de editar
- ✅ Verifica que el JSON sea válido (usa https://jsonlint.com)
- ❌ No uses Word o editores de texto enriquecido
- ❌ No cambies la estructura del JSON
- ❌ No elimines las comillas de los valores

### Validar JSON:

```bash
# Copiar contenido y pegar en: https://jsonlint.com
# O usar un validador en línea de comandos
```

## 📊 Valores Comunes

### URLs WHEP

```json
"WHEP_URL": "https://servidor.com:6001/rtc/v1/whep/?app=live&stream=livestream"
"WHEP_FAILOVER_URL": "https://backup.com:6001/rtc/v1/whep/?app=live&stream=livestream"
```

### Volumen (0-150)

```json
"VOLUME": "100"    // Volumen normal
"VOLUME": "150"    // Amplificación máxima
"VOLUME": "50"     // Mitad de volumen
```

### Presets de EQ

```json
"EQ_PRESET": "Flat"           // Sin ecualización
"EQ_PRESET": "Vocal"          // Optimizado para voces
"EQ_PRESET": "Rock"           // Para música rock
"EQ_PRESET": "Bass Boost"     // Aumenta graves
"EQ_PRESET": "Custom"         // Personalizado
```

### Debug Mode

```json
"DEBUG_MODE": "true"    // Mostrar logs en consola
"DEBUG_MODE": "false"   // Modo normal
```

### Auto Connect

```json
"AUTO_CONNECT": "true"    // Conectar automáticamente al abrir
"AUTO_CONNECT": "false"   // Esperar acción del usuario
```

### Failover

```json
"FAILOVER_ENABLED": "true"    // Activar failover automático
"FAILOVER_ENABLED": "false"   // Solo usar URL primaria
```

## 🔍 Troubleshooting

### No se guarda la configuración

**Problema:** Los cambios no persisten después de cerrar la app.

**Solución:**

1. Verifica que tienes permisos de escritura en la carpeta:
   ```bash
   # Windows
   icacls "%APPDATA%\webrtc-audio-out"
   ```
2. Ejecuta la aplicación como administrador (si es necesario)
3. Verifica que no haya otro proceso bloqueando el archivo

### No encuentra el archivo de configuración

**Problema:** La app se abre con configuración por defecto siempre.

**Solución:**

1. Verifica la ruta correcta para tu sistema operativo
2. Abre la consola de desarrollador (Ctrl+Shift+I) y busca:
   ```
   📁 Archivo de configuración: C:\Users\...\config.json
   ```
3. Si la ruta es diferente, el archivo está en esa ubicación

### Error al leer config.json

**Problema:** La app no arranca o muestra errores.

**Solución:**

1. Valida que el JSON sea correcto: https://jsonlint.com
2. Elimina el archivo corrupto:
   ```bash
   del "%APPDATA%\webrtc-audio-out\config.json"
   ```
3. La app creará uno nuevo al iniciar

### Permisos denegados

**Problema:** "Error al guardar config: EACCES: permission denied"

**Solución:**

1. Verifica permisos de la carpeta:
   ```bash
   # Windows: Click derecho → Propiedades → Seguridad
   ```
2. Asegúrate de que tu usuario tenga permisos de escritura
3. Si está en una carpeta del sistema, la app debería usar `AppData` automáticamente

## 💡 Tips Avanzados

### 1. Script de Backup Automático

```batch
@echo off
set FECHA=%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%
copy "%APPDATA%\webrtc-audio-out\config.json" "D:\Backups\config-%FECHA%.json"
echo Backup creado: config-%FECHA%.json
```

### 2. Sincronizar entre PCs

Usa OneDrive, Google Drive o Dropbox para sincronizar el archivo:

```batch
# Crear enlace simbólico (Windows)
mklink "%APPDATA%\webrtc-audio-out\config.json" "D:\OneDrive\Configs\webrtc-config.json"
```

### 3. Configuración por Entorno

Crea diferentes archivos para diferentes escenarios:

```
D:\Configs\
├── config-casa.json      (Red local)
├── config-trabajo.json   (Red corporativa)
└── config-movil.json     (Conexión móvil)
```

## 📞 Soporte

Si tienes problemas con el archivo de configuración:

1. Revisa esta guía
2. Verifica los logs en la consola de desarrollador (Ctrl+Shift+I)
3. Busca en Issues del repositorio
4. Crea un nuevo Issue con detalles del problema
