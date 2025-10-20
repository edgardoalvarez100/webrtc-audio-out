# 📖 Guía Visual: Sistema de Configuración por Ubicación

## 🎬 Escenario Paso a Paso

### Paso 1: Primera Instalación

```
Acción: Instalas la aplicación
Ubicación: C:\Program Files\WebRTC Audio Out\

📁 config.json (vacío o no existe)
```

**Al abrir la aplicación:**

```
🔍 Sistema detecta:
   - Ubicación: C:\Program Files\WebRTC Audio Out\
   - Clave: c_program_files_webrtc_audio_out
   - No existe configuración para esta clave

🆕 Crea configuración por defecto:

📁 config.json
{
  "c_program_files_webrtc_audio_out": {
    "WHEP_URL": "",
    "DEVICE_ID": "default",
    "VOLUME": "100",
    "EQ_PRESET": "Flat",
    ...
  }
}

✅ Listo para configurar
```

---

### Paso 2: Configurar Primera Instancia

```
Usuario configura:
✏️ URL: https://servidor.com/stream1
✏️ Tarjeta: Voicemeeter VAIO1
✏️ Volumen: 120
✏️ Preset: Vocal
```

**Resultado:**

```
📁 config.json
{
  "c_program_files_webrtc_audio_out": {
    "WHEP_URL": "https://servidor.com/stream1",
    "DEVICE_ID": "{...VAIO1...}",
    "DEVICE_LABEL": "Voicemeeter VAIO1",
    "VOLUME": "120",
    "EQ_PRESET": "Vocal",
    "COMPRESSOR_ENABLED": "true",
    ...
  }
}

💾 Guardado automáticamente
```

---

### Paso 3: Crear Segunda Instancia

```
Acción: Copias el ejecutable a otra carpeta
Origen:  C:\Program Files\WebRTC Audio Out\
Destino: C:\Audio\Radio2\

Copias: webrtc-audio-out.exe + DLLs + resources\
```

**Al abrir desde C:\Audio\Radio2\:**

```
🔍 Sistema detecta:
   - Ubicación: C:\Audio\Radio2\
   - Clave: c_audio_radio2
   - No existe configuración para esta clave

🆕 Crea configuración por defecto:

📁 config.json (ahora tiene 2 instancias)
{
  "c_program_files_webrtc_audio_out": {
    "WHEP_URL": "https://servidor.com/stream1",
    "DEVICE_ID": "{...VAIO1...}",
    "VOLUME": "120",
    "EQ_PRESET": "Vocal",
    ...
  },
  "c_audio_radio2": {
    "WHEP_URL": "",              ← NUEVA INSTANCIA
    "DEVICE_ID": "default",      ← VALORES POR DEFECTO
    "VOLUME": "100",
    "EQ_PRESET": "Flat",
    ...
  }
}

✅ Radio2 lista para configurar independientemente
```

---

### Paso 4: Configurar Segunda Instancia

```
Usuario configura Radio2:
✏️ URL: https://servidor.com/stream2
✏️ Tarjeta: Voicemeeter VAIO2
✏️ Volumen: 100
✏️ Preset: Rock
```

**Resultado:**

```
📁 config.json
{
  "c_program_files_webrtc_audio_out": {
    "WHEP_URL": "https://servidor.com/stream1",
    "DEVICE_ID": "{...VAIO1...}",
    "VOLUME": "120",
    "EQ_PRESET": "Vocal",
    ...
  },
  "c_audio_radio2": {
    "WHEP_URL": "https://servidor.com/stream2",  ← ACTUALIZADO
    "DEVICE_ID": "{...VAIO2...}",                 ← ACTUALIZADO
    "VOLUME": "100",
    "EQ_PRESET": "Rock",                          ← ACTUALIZADO
    ...
  }
}

✅ Ambas instancias configuradas independientemente
```

---

### Paso 5: Ejecutar Ambas Simultáneamente

```
Instancia 1 en: C:\Program Files\WebRTC Audio Out\
   📖 Lee config: "c_program_files_webrtc_audio_out"
   🎵 Stream: stream1
   🔊 Salida: VAIO1
   📊 Volumen: 120

Instancia 2 en: C:\Audio\Radio2\
   📖 Lee config: "c_audio_radio2"
   🎵 Stream: stream2
   🔊 Salida: VAIO2
   📊 Volumen: 100

📁 Archivo config.json (compartido, pero con secciones independientes)
{
  "c_program_files_webrtc_audio_out": {...},
  "c_audio_radio2": {...}
}

✅ Funcionan independientemente sin conflictos
```

---

### Paso 6: Crear Tercera Instancia en USB

```
Acción: Copias el ejecutable a USB
Destino: E:\PortableApps\WebRTC\

USB (E:\)
└── PortableApps\
    └── WebRTC\
        └── webrtc-audio-out.exe
```

**Al abrir desde USB (primera vez):**

```
🔍 Sistema detecta:
   - Ubicación: E:\PortableApps\WebRTC\
   - Clave: e_portableapps_webrtc
   - No existe configuración para esta clave

🆕 Crea configuración por defecto:

📁 config.json (ahora 3 instancias en AppData del PC actual)
{
  "c_program_files_webrtc_audio_out": {...},
  "c_audio_radio2": {...},
  "e_portableapps_webrtc": {        ← NUEVA INSTANCIA USB
    "WHEP_URL": "",
    "DEVICE_ID": "default",
    "VOLUME": "100",
    ...
  }
}

💡 Nota: La config está en AppData de este PC,
         NO en el USB (el USB solo tiene el ejecutable)
```

---

### Paso 7: USB en Otro PC

```
Acción: Conectas el USB en otro PC
Ubicación sigue siendo: E:\PortableApps\WebRTC\
Clave sigue siendo: e_portableapps_webrtc

Pero estamos en PC2 con su propio AppData
```

**Al abrir desde USB en PC2:**

```
🔍 Sistema detecta:
   - Ubicación: E:\PortableApps\WebRTC\
   - Clave: e_portableapps_webrtc
   - No existe configuración (archivo config.json de PC2 es diferente)

🆕 Crea configuración por defecto en PC2:

📁 config.json de PC2
{
  "e_portableapps_webrtc": {
    "WHEP_URL": "",              ← VALORES POR DEFECTO
    "DEVICE_ID": "default",      ← (Diferente al PC1)
    "VOLUME": "100",
    ...
  }
}

⚠️ Cada PC tiene su propio AppData, por lo tanto su propio config.json
💡 La clave es la misma (e_portableapps_webrtc) pero el contenido puede ser diferente
```

---

## 🎯 Casos de Uso Reales

### Caso 1: Estudio de Radio con 3 Streams

**Setup:**

```
C:\Audio\
├── RadioMinuto\      → stream1, VAIO1, Vocal, Compresor ON
├── RadioMusica\      → stream2, VAIO2, Rock, Reverb ON
└── RadioNoticias\    → stream3, VAIO3, Flat, Sin efectos
```

**config.json resultante:**

```json
{
  "c_audio_radiominuto": {
    "WHEP_URL": "https://server.com/radiominuto",
    "DEVICE_ID": "{...VAIO1...}",
    "VOLUME": "100",
    "EQ_PRESET": "Vocal",
    "COMPRESSOR_ENABLED": "true"
  },
  "c_audio_radiomusica": {
    "WHEP_URL": "https://server.com/radiomusica",
    "DEVICE_ID": "{...VAIO2...}",
    "VOLUME": "120",
    "EQ_PRESET": "Rock",
    "REVERB_ENABLED": "true"
  },
  "c_audio_radionoticias": {
    "WHEP_URL": "https://server.com/radionoticias",
    "DEVICE_ID": "{...VAIO3...}",
    "VOLUME": "100",
    "EQ_PRESET": "Flat"
  }
}
```

**Resultado:**

- ✅ 3 ventanas abiertas simultáneamente
- ✅ Cada una con su stream, tarjeta y configuración
- ✅ Un solo archivo de backup (config.json)

---

### Caso 2: Producción + Desarrollo + Backup

**Setup:**

```
C:\Production\WebRTC\     → Producción (stream principal)
C:\Development\WebRTC\    → Testing (stream de pruebas)
D:\Backup\WebRTC\         → Backup (stream secundario)
```

**config.json resultante:**

```json
{
  "c_production_webrtc": {
    "WHEP_URL": "https://prod.server.com/stream",
    "AUTO_CONNECT": "true",
    "FAILOVER_ENABLED": "true",
    "WHEP_FAILOVER_URL": "https://backup.server.com/stream"
  },
  "c_development_webrtc": {
    "WHEP_URL": "https://dev.server.com/stream",
    "DEBUG_MODE": "true",
    "AUTO_CONNECT": "false"
  },
  "d_backup_webrtc": {
    "WHEP_URL": "https://backup.server.com/stream",
    "AUTO_CONNECT": "false"
  }
}
```

---

### Caso 3: Primera Vez Desde Nueva Ubicación

**Escenario:**

```
Usuario: Copio el .exe a D:\Test\
Sistema: No existe configuración para "d_test"
```

**Lo que verás en consola al abrir:**

```
📂 Ejecutable ubicado en: D:\Test
🔑 Clave de instancia: d_test
📄 Archivo de configuración no encontrado, creando nuevo...
🆕 Nueva instancia detectada: "d_test"
📝 Creando configuración por defecto...
💾 Configuración guardada
📁 Archivo de configuración central: C:\Users\...\config.json
🔓 Múltiples instancias: ACTIVADO
✅ Lista para usar
```

**Estado del archivo:**

```json
{
  "d_test": {
    "WHEP_URL": "",
    "DEVICE_ID": "default",
    "VOLUME": "100",
    "EQ_PRESET": "Flat",
    "DEBUG_MODE": "false",
    "AUTO_CONNECT": "false",
    ...
  }
}
```

---

## 🔄 Flujo Completo

```
┌─────────────────────────────────────┐
│  Ejecutar webrtc-audio-out.exe     │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Detectar ubicación del ejecutable │
│  Ejemplo: C:\Audio\Radio1\         │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Generar clave única                │
│  c_audio_radio1                     │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Buscar config.json en AppData      │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────┴────────┐
        │                │
   ¿Existe?          ¿No existe?
        │                │
        ▼                ▼
┌──────────────┐  ┌─────────────────┐
│ Leer archivo │  │ Crear archivo   │
└──────┬───────┘  │ vacío           │
       │          └────────┬────────┘
       ▼                   │
   ┌────────────────────┐  │
   │ ¿Existe la clave?  │◄─┘
   └────┬───────┬───────┘
        │       │
    Sí  │       │  No
        ▼       ▼
┌────────────┐ ┌────────────────────┐
│ Cargar     │ │ Crear config       │
│ config     │ │ por defecto        │
│ existente  │ │                    │
└─────┬──────┘ └─────┬──────────────┘
      │              │
      │              ▼
      │        ┌──────────────────┐
      │        │ Guardar en       │
      │        │ config.json      │
      │        └─────┬────────────┘
      │              │
      └──────┬───────┘
             ▼
   ┌──────────────────────┐
   │ Configuración lista  │
   │ para usar            │
   └──────────────────────┘
```

---

## ✅ Resumen

**Comportamiento automático:**

1. **Primera vez desde una ubicación nueva:**

   - ✅ Detecta que no existe configuración
   - ✅ Crea configuración con valores por defecto
   - ✅ Guarda automáticamente
   - ✅ Lista para usar

2. **Segunda vez desde la misma ubicación:**

   - ✅ Carga la configuración guardada
   - ✅ Mantiene todos tus ajustes

3. **Copiar ejecutable a nueva ubicación:**

   - ✅ Se trata como instancia nueva
   - ✅ Crea nueva configuración por defecto
   - ✅ Independiente de la original

4. **Múltiples instancias simultáneas:**
   - ✅ Cada una lee su propia configuración
   - ✅ Sin conflictos
   - ✅ Un solo archivo central

**¡No necesitas hacer nada especial!**
Solo copia el ejecutable donde quieras y el sistema se encarga del resto.
