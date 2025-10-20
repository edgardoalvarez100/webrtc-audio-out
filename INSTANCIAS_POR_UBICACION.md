# 🗂️ Sistema de Configuración por Ubicación

## 🎯 ¿Cómo Funciona?

Este sistema permite tener **múltiples instancias** de la aplicación, cada una con su **propia configuración independiente**, usando un **único archivo central** de configuración.

### Concepto Clave

**La ubicación del ejecutable determina qué configuración se usa.**

```
C:\Audio\Radio1\webrtc-audio-out.exe → Configuración "Radio1"
C:\Audio\Radio2\webrtc-audio-out.exe → Configuración "Radio2"
D:\Backup\webrtc-audio-out.exe      → Configuración "Backup"
```

### Comportamiento Automático

Cuando ejecutas la aplicación desde una **nueva ubicación** (que nunca se ha usado antes):

1. ✅ **Detecta** que no existe configuración para esa ubicación
2. ✅ **Crea automáticamente** una configuración con valores por defecto
3. ✅ **Guarda** la configuración en el archivo central
4. ✅ **Lista para usar** - Puedes empezar a configurar inmediatamente

**Configuración por defecto creada automáticamente:**

```json
{
  "WHEP_URL": "",
  "WHEP_FAILOVER_URL": "",
  "FAILOVER_ENABLED": "false",
  "DEVICE_ID": "default",
  "DEVICE_LABEL": "Default (Sistema)",
  "VOLUME": "100",
  "DEBUG_MODE": "false",
  "AUTO_CONNECT": "false",
  "FONT_SIZE": "16",
  "EQ_PRESET": "Flat",
  "EQ_BANDS": "[0,0,0,0,0,0,0,0,0,0]",
  "COMPRESSOR_ENABLED": "false",
  "REVERB_ENABLED": "false",
  "DELAY_ENABLED": "false",
  "NOISE_GATE_ENABLED": "false"
}
```

## 📁 Arquitectura del Sistema

### Archivo Central de Configuración

**Ubicación:**

```
Windows: C:\Users\<Usuario>\AppData\Roaming\webrtc-audio-out\config.json
macOS:   ~/Library/Application Support/webrtc-audio-out/config.json
Linux:   ~/.config/webrtc-audio-out/config.json
```

### Estructura del Archivo

```json
{
  "c_audio_radio1": {
    "WHEP_URL": "https://servidor.com/stream1",
    "DEVICE_ID": "VAIO1",
    "VOLUME": "100",
    "EQ_PRESET": "Vocal"
  },
  "c_audio_radio2": {
    "WHEP_URL": "https://servidor.com/stream2",
    "DEVICE_ID": "VAIO2",
    "VOLUME": "120",
    "EQ_PRESET": "Rock"
  },
  "d_backup": {
    "WHEP_URL": "https://servidor.com/backup",
    "DEVICE_ID": "default",
    "VOLUME": "80",
    "EQ_PRESET": "Flat"
  }
}
```

### Cómo se Genera la Clave

La ruta del ejecutable se transforma en una clave única:

```javascript
// Ejemplo 1
Ruta: C:\Audio\Radio1\
Clave: c_audio_radio1

// Ejemplo 2
Ruta: D:\Portables\WebRTC Audio\
Clave: d_portables_webrtc_audio

// Ejemplo 3 (desarrollo)
Ruta: C:\Users\Edgardo\Desktop\webrtc-audio-out\
Clave: c_users_edgardo_desktop_webrtc-audio-out
```

**Transformaciones:**

- Se elimina `\` → se reemplaza por `/`
- Se elimina `:` (de `C:`, `D:`, etc.)
- Se convierte `/` → `_`
- Todo a minúsculas

## 🚀 Uso Práctico

### Escenario 1: Múltiples Radios

```
C:\Audio\
├── Radio1\
│   └── webrtc-audio-out.exe (Configuración: c_audio_radio1)
├── Radio2\
│   └── webrtc-audio-out.exe (Configuración: c_audio_radio2)
└── Radio3\
    └── webrtc-audio-out.exe (Configuración: c_audio_radio3)
```

**Pasos:**

1. Instala o extrae la aplicación en `C:\Audio\Radio1`
2. Configura (URL, tarjeta de audio, efectos)
3. Copia todo el contenido a `C:\Audio\Radio2`
4. Abre `Radio2\webrtc-audio-out.exe` y configura diferente
5. Cada carpeta mantiene su configuración independiente

### Escenario 2: Producción + Backup

```
C:\Program Files\WebRTC Audio Out\
└── webrtc-audio-out.exe
    Configuración: c_program_files_webrtc_audio_out
    URL: https://servidor-principal.com

D:\Backup\
└── webrtc-audio-out.exe
    Configuración: d_backup
    URL: https://servidor-backup.com
```

### Escenario 3: Portable en USB

```
E:\Apps\Audio\                    (USB Drive)
└── webrtc-audio-out.exe
    Configuración: e_apps_audio
    (La configuración viaja en AppData del PC donde se conecte)
```

## ✅ Ventajas de Este Sistema

### 1. **Un Solo Archivo Central**

- ✅ Fácil de hacer backup: un solo archivo contiene todo
- ✅ Fácil de transferir entre PCs
- ✅ No se pierde configuración al copiar ejecutables

### 2. **Configuraciones Verdaderamente Independientes**

- ✅ Cada carpeta con el ejecutable tiene su configuración
- ✅ Copiar el ejecutable crea automáticamente nueva configuración
- ✅ No hay conflictos entre instancias

### 3. **Portable y Flexible**

- ✅ Puedes mover carpetas sin perder configuración
- ✅ Puedes renombrar carpetas (crea nueva configuración)
- ✅ Compatible con USB drives

### 4. **Gestión Centralizada**

- ✅ Un solo archivo para hacer backup
- ✅ Fácil de editar manualmente si es necesario
- ✅ Puedes ver todas las instancias en un lugar

## 📊 Comparación con Otros Sistemas

| Característica                   | Config por Carpeta    | Config por Nombre      | **Config por Ubicación** |
| -------------------------------- | --------------------- | ---------------------- | ------------------------ |
| Archivo único                    | ❌ No                 | ❌ No                  | ✅ Sí                    |
| Copiar carpeta crea nueva config | ❌ No                 | ❌ No                  | ✅ Sí                    |
| Backup fácil                     | ❌ Múltiples archivos | ❌ Múltiples archivos  | ✅ Un solo archivo       |
| Portable                         | ❌ Limitado           | ❌ Limitado            | ✅ Completo              |
| Instalación simple               | ❌ Copiar config.json | ⚠️ Requiere parámetros | ✅ Copiar ejecutable     |

## 🔧 Ejemplo del Archivo config.json

```json
{
  "c_audio_radiominuto": {
    "WHEP_URL": "https://servidor.com:6001/rtc/v1/whep/?app=live&stream=radiominuto",
    "WHEP_FAILOVER_URL": "https://backup.com:6001/rtc/v1/whep/?app=live&stream=radiominuto",
    "FAILOVER_ENABLED": "true",
    "DEVICE_ID": "{0.0.0.00000000}.{abc123...}",
    "DEVICE_LABEL": "Voicemeeter Input (VB-Audio Voicemeeter VAIO)",
    "VOLUME": "100",
    "DEBUG_MODE": "false",
    "AUTO_CONNECT": "true",
    "FONT_SIZE": "16",
    "EQ_PRESET": "Vocal",
    "EQ_BANDS": "[2,1,0,-1,-2,0,1,2,1,0]",
    "COMPRESSOR_ENABLED": "true",
    "COMPRESSOR_THRESHOLD": "-24",
    "COMPRESSOR_RATIO": "12",
    "REVERB_ENABLED": "false",
    "NOISE_GATE_ENABLED": "false"
  },
  "c_audio_radiomusica": {
    "WHEP_URL": "https://servidor.com:6001/rtc/v1/whep/?app=live&stream=radiomusica",
    "WHEP_FAILOVER_URL": "https://backup.com:6001/rtc/v1/whep/?app=live&stream=radiomusica",
    "FAILOVER_ENABLED": "true",
    "DEVICE_ID": "{0.0.0.00000000}.{def456...}",
    "DEVICE_LABEL": "Voicemeeter Aux Input (VB-Audio Voicemeeter AUX VAIO)",
    "VOLUME": "120",
    "DEBUG_MODE": "false",
    "AUTO_CONNECT": "true",
    "FONT_SIZE": "18",
    "EQ_PRESET": "Rock",
    "EQ_BANDS": "[3,2,0,-1,-2,1,2,3,2,1]",
    "COMPRESSOR_ENABLED": "false",
    "REVERB_ENABLED": "true",
    "REVERB_MIX": "0.3",
    "NOISE_GATE_ENABLED": "false"
  },
  "d_backup_emergencia": {
    "WHEP_URL": "https://servidor-backup.com:6001/rtc/v1/whep/?app=live&stream=emergency",
    "WHEP_FAILOVER_URL": "",
    "FAILOVER_ENABLED": "false",
    "DEVICE_ID": "default",
    "DEVICE_LABEL": "Default (Sistema)",
    "VOLUME": "80",
    "DEBUG_MODE": "true",
    "AUTO_CONNECT": "false",
    "FONT_SIZE": "16",
    "EQ_PRESET": "Flat",
    "EQ_BANDS": "[0,0,0,0,0,0,0,0,0,0]",
    "COMPRESSOR_ENABLED": "false",
    "REVERB_ENABLED": "false",
    "NOISE_GATE_ENABLED": "false"
  }
}
```

## 💾 Gestión de Configuraciones

### Ver Todas las Instancias

El archivo `config.json` contiene todas las configuraciones. Puedes abrirlo con cualquier editor de texto.

**Ubicación rápida en Windows:**

1. Presiona `Windows + R`
2. Escribe: `%APPDATA%\webrtc-audio-out`
3. Abre `config.json`

### Backup de Todas las Configuraciones

```batch
REM Backup simple
copy "%APPDATA%\webrtc-audio-out\config.json" "D:\Backups\config-2025-10-20.json"

REM Backup con fecha automática
set FECHA=%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%
copy "%APPDATA%\webrtc-audio-out\config.json" "D:\Backups\config-%FECHA%.json"
```

### Restaurar Configuración

```batch
copy "D:\Backups\config-2025-10-20.json" "%APPDATA%\webrtc-audio-out\config.json"
```

### Eliminar Configuración de una Instancia

1. Abre `config.json`
2. Encuentra la clave de la instancia (ej: `"c_audio_radio1"`)
3. Elimina toda esa sección
4. Guarda el archivo

O simplemente elimina la carpeta donde está el ejecutable y la configuración se mantendrá pero no se usará.

### Resetear Configuración de una Instancia

Si quieres volver a los valores por defecto de una instancia específica:

**Opción 1: Eliminar y dejar que se recree**

```batch
REM 1. Abre el archivo config.json
notepad "%APPDATA%\webrtc-audio-out\config.json"

REM 2. Elimina la sección de la instancia (ej: "c_audio_radio1": {...})

REM 3. Guarda el archivo

REM 4. Abre la aplicación - creará configuración por defecto automáticamente
```

**Opción 2: Mover el ejecutable temporalmente**

```batch
REM Mover a ubicación temporal (crea nueva config con valores por defecto)
move "C:\Audio\Radio1\webrtc-audio-out.exe" "C:\Audio\Temp\"

REM Ejecutar desde la nueva ubicación
"C:\Audio\Temp\webrtc-audio-out.exe"

REM Configurar todo de nuevo

REM Mover de vuelta (ahora con config limpia)
move "C:\Audio\Temp\webrtc-audio-out.exe" "C:\Audio\Radio1\"
```

**Opción 3: Editar manualmente**

```batch
REM Abre el archivo
notepad "%APPDATA%\webrtc-audio-out\config.json"

REM Reemplaza la configuración de la instancia con valores por defecto:
{
  "c_audio_radio1": {
    "WHEP_URL": "",
    "DEVICE_ID": "default",
    "VOLUME": "100",
    "EQ_PRESET": "Flat",
    ...
  }
}
```

### Transferir Configuración a Otro PC

```batch
REM En PC origen
copy "%APPDATA%\webrtc-audio-out\config.json" "D:\USB\config.json"

REM En PC destino
copy "D:\USB\config.json" "%APPDATA%\webrtc-audio-out\config.json"
```

## 🛠️ Casos de Uso Avanzados

### 1. Plantilla de Configuración

Crea una configuración base y cópiala a nuevas instancias:

```batch
@echo off
REM Crear nueva instancia con plantilla

set NUEVA_CARPETA=C:\Audio\NuevaRadio

REM Copiar ejecutable
xcopy "C:\Audio\Radio1\*.*" "%NUEVA_CARPETA%\" /E /I

echo Nueva instancia creada en: %NUEVA_CARPETA%
echo Al abrir la aplicación, creará una configuración vacía nueva
echo Puedes configurarla desde cero o editar manualmente config.json
```

### 2. Script de Despliegue Múltiple

```batch
@echo off
REM Crear 5 instancias automáticamente

set SOURCE=C:\Audio\Template

for /L %%i in (1,1,5) do (
  xcopy "%SOURCE%\*.*" "C:\Audio\Radio%%i\" /E /I /Y
  echo Instancia Radio%%i creada
)

echo.
echo ✅ 5 instancias creadas exitosamente
echo Cada una tendrá su propia configuración independiente
```

### 3. Sincronizar Configuración Entre PCs

Usa OneDrive/Dropbox para sincronizar el archivo central:

```batch
REM Crear enlace simbólico al archivo en la nube
mklink "%APPDATA%\webrtc-audio-out\config.json" "D:\OneDrive\Configs\webrtc-config.json"
```

Ahora el archivo se sincroniza automáticamente entre todos tus PCs.

## 🔍 Debugging y Troubleshooting

### Ver Información de la Instancia Actual

Abre la consola de desarrollador (`Ctrl+Shift+I`) al iniciar la app:

```
📂 Ejecutable ubicado en: C:\Audio\Radio1
🔑 Clave de instancia: c_audio_radio1
📁 Archivo de configuración central: C:\Users\...\config.json
🔓 Múltiples instancias: ACTIVADO
💾 Las configuraciones se guardan indexadas por ubicación del ejecutable
```

### Problemas Comunes

**Problema 1: La configuración no se guarda**

```
Solución: Verifica permisos de escritura en %APPDATA%
```

**Problema 2: Dos instancias comparten configuración**

```
Causa: Están en la misma carpeta
Solución: Copia el ejecutable a carpetas diferentes
```

**Problema 3: Configuración se pierde al mover carpeta**

```
Causa: La clave cambió al mover la carpeta
Solución: Edita manualmente config.json y renombra la clave
```

**Problema 4: Quiero resetear una instancia**

```
Solución 1: Elimina su sección en config.json
Solución 2: Mueve el ejecutable a otra carpeta (nueva clave)
```

### Editar Manualmente el config.json

```batch
notepad "%APPDATA%\webrtc-audio-out\config.json"
```

**Importante:**

- ✅ Cierra todas las instancias antes de editar
- ✅ Verifica que el JSON sea válido (https://jsonlint.com)
- ✅ Respeta la estructura de claves existentes
- ❌ No uses Word (solo editores de texto plano)

## 💡 Tips y Trucos

### 1. Nombres de Carpetas Descriptivos

```
✅ Bueno:
C:\Audio\RadioMinuto\
C:\Audio\RadioMusica\
C:\Audio\RadioNoticias\

❌ Malo:
C:\Audio\Copia (1)\
C:\Audio\Nueva carpeta\
```

### 2. Documentar tus Instancias

Crea un archivo `README.txt` en cada carpeta:

```
# Radio Minuto
URL: https://servidor.com/radiominuto
Tarjeta: Voicemeeter VAIO1
Preset: Vocal + Compresor
```

### 3. Backup Automático Programado

Crea una tarea programada en Windows:

```batch
schtasks /create /tn "Backup WebRTC Config" /tr "copy %APPDATA%\webrtc-audio-out\config.json D:\Backups\config.json" /sc daily /st 03:00
```

### 4. Ver Todas tus Instancias

Abre `config.json` y mira las claves. Ejemplo:

```json
{
  "c_audio_radiominuto": {...},
  "c_audio_radiomusica": {...},
  "d_backup": {...}
}
```

Significa que tienes 3 instancias:

- `C:\Audio\RadioMinuto\`
- `C:\Audio\RadioMusica\`
- `D:\Backup\`

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en la consola de desarrollador
2. Verifica el contenido de `config.json`
3. Asegúrate de que cada instancia esté en una carpeta diferente
4. Verifica permisos de escritura en `%APPDATA%`
