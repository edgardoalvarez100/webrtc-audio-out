# 🔓 Múltiples Instancias - Guía de Uso

## ✨ Característica Principal

Esta aplicación **permite ejecutar múltiples instancias simultáneamente**, cada una con su propia configuración independiente.

## 🎯 ¿Para qué sirve?

### Casos de uso comunes:

1. **Múltiples Streams de Audio**

   - Recibir varios streams WHEP al mismo tiempo
   - Cada stream con su propia tarjeta de audio
   - Diferentes configuraciones de efectos por stream

2. **Diferentes Configuraciones de Audio**

   - Instancia para voz (preset Vocal + compresor)
   - Instancia para música (preset Rock + EQ personalizado)
   - Instancia para monitoreo (sin efectos)

3. **Producción y Testing**
   - Instancia de producción en carpeta estable
   - Instancia de pruebas con configuración experimental
   - Instancia de backup lista para usar

## 📋 Cómo Usar Múltiples Instancias

### Método 1: Copiar Carpetas (Recomendado)

```
C:\Audio\
├── Stream1\
│   ├── webrtc-audio-out.exe
│   └── config.json (Stream A → Tarjeta 1)
├── Stream2\
│   ├── webrtc-audio-out.exe
│   └── config.json (Stream B → Tarjeta 2)
└── Stream3\
    ├── webrtc-audio-out.exe
    └── config.json (Stream C → Tarjeta 3)
```

**Pasos:**

1. Instala o extrae la aplicación en una carpeta
2. Copia toda la carpeta a otra ubicación
3. Configura cada instancia con su URL y tarjeta de audio
4. Ejecuta todas las instancias que necesites

### Método 2: Instalación + Portable

```
C:\Program Files\webrtc-audio-out\
└── webrtc-audio-out.exe + config.json (Stream principal)

D:\Portable\
├── Radio1\
│   └── webrtc-audio-out.exe + config.json
└── Radio2\
    └── webrtc-audio-out.exe + config.json
```

**Pasos:**

1. Instala normalmente con el instalador NSIS
2. Copia el ejecutable a carpetas portables
3. Cada ubicación mantendrá su propia configuración

## 🎨 Ejemplo Práctico: Radio Multi-Stream

Imagina que necesitas recibir 3 radios diferentes simultáneamente:

### Setup:

```
D:\Radios\
├── RadioMinuto\
│   ├── webrtc-audio-out.exe
│   └── config.json
│       ├── URL: https://servidor.com/...stream=radiominuto
│       ├── Tarjeta: "Voicemeeter VAIO1"
│       └── Preset: Vocal + Compresor
│
├── RadioMusica\
│   ├── webrtc-audio-out.exe
│   └── config.json
│       ├── URL: https://servidor.com/...stream=radiomusica
│       ├── Tarjeta: "Voicemeeter VAIO2"
│       └── Preset: Rock + Reverb
│
└── RadioNoticias\
    ├── webrtc-audio-out.exe
    └── config.json
        ├── URL: https://servidor.com/...stream=radionoticias
        ├── Tarjeta: "Voicemeeter VAIO3"
        └── Preset: Flat (sin efectos)
```

### Resultado:

- 3 ventanas abiertas simultáneamente
- Cada una conectada a su stream
- Cada una con su configuración de audio
- Todo funcionando independientemente

## ⚙️ Configuración Independiente

Cada instancia guarda su propia configuración:

| Configuración                     | Independiente por Instancia |
| --------------------------------- | --------------------------- |
| URL WHEP                          | ✅ Sí                       |
| Tarjeta de Audio                  | ✅ Sí                       |
| Volumen                           | ✅ Sí                       |
| Preset de EQ                      | ✅ Sí                       |
| Efectos (Compresor, Reverb, etc.) | ✅ Sí                       |
| Tamaño de fuente                  | ✅ Sí                       |
| Modo debug                        | ✅ Sí                       |
| Auto-conectar                     | ✅ Sí                       |

## 💾 Gestión de Configuraciones

### Guardar Configuración

```
1. Configura una instancia como te gusta
2. Copia config.json a un lugar seguro
3. Dale un nombre descriptivo: config-vocal.json
```

### Aplicar Configuración Guardada

```
1. Copia config-vocal.json a la carpeta de la instancia
2. Renómbralo a config.json
3. Abre la aplicación
```

### Crear Plantillas

```
D:\Templates\
├── config-vocal.json    (Preset vocal + compresor)
├── config-musica.json   (Preset rock + EQ)
├── config-limpio.json   (Sin efectos)
└── config-full.json     (Todos los efectos activados)
```

## 🔧 Consejos y Trucos

### 1. Nombres de Carpetas Descriptivos

```
✅ Bueno:
D:\Audio\RadioMinuto-VAIO1\
D:\Audio\RadioMusica-VAIO2\

❌ Malo:
D:\Audio\Copia de webrtc (1)\
D:\Audio\Copia de webrtc (2)\
```

### 2. Usar Accesos Directos

```
Crea accesos directos en el escritorio:
- "Radio Minuto.lnk" → D:\Audio\RadioMinuto\webrtc-audio-out.exe
- "Radio Música.lnk" → D:\Audio\RadioMusica\webrtc-audio-out.exe
```

### 3. Script de Inicio Automático

Crea un archivo `.bat` para iniciar todas las instancias:

```batch
@echo off
start "" "D:\Audio\RadioMinuto\webrtc-audio-out.exe"
timeout /t 2
start "" "D:\Audio\RadioMusica\webrtc-audio-out.exe"
timeout /t 2
start "" "D:\Audio\RadioNoticias\webrtc-audio-out.exe"
```

### 4. Monitoreo Visual

```
- Usa tamaños de ventana diferentes por instancia
- Posiciona cada ventana en una parte de la pantalla
- Así puedes ver el volumeter de todas a la vez
```

### 5. Backup de Configuraciones

```
Crea un script de backup:
D:\Backups\
├── 2025-10-17\
│   ├── RadioMinuto-config.json
│   ├── RadioMusica-config.json
│   └── RadioNoticias-config.json
```

## ⚠️ Limitaciones

### 1. Recursos del Sistema

- Cada instancia consume CPU y RAM
- Recomendado: Máximo 5-10 instancias simultáneas
- Depende de tu hardware

### 2. Tarjetas de Audio

- Cada instancia puede usar una tarjeta diferente
- O varias instancias pueden usar la misma tarjeta
- Depende de tu configuración de audio

### 3. Actualizaciones

- Al actualizar, haz backup de todos los `config.json`
- La actualización puede sobrescribir la configuración
- Restaura los archivos después de actualizar

## 🚀 Inicio Rápido

### Para Principiantes:

1. **Instala la aplicación normalmente**
2. **Configura la primera instancia**
   - URL del stream
   - Tarjeta de audio
   - Efectos deseados
3. **Copia la carpeta completa a otro lugar**
4. **Cambia solo la URL y la tarjeta de audio en la segunda instancia**
5. **¡Ejecuta ambas!**

### Para Avanzados:

1. **Crea una carpeta maestra con config.example.json**
2. **Genera plantillas de configuración para cada caso de uso**
3. **Script de deploy automático para crear instancias**
4. **Automatiza backup de configuraciones**
5. **Script de inicio para abrir todas las instancias**

## 📊 Comparación: Instancia Única vs Múltiple

| Característica             | Instancia Única | Múltiples Instancias |
| -------------------------- | --------------- | -------------------- |
| Streams simultáneos        | ❌ 1 solo       | ✅ Ilimitados\*      |
| Configuraciones diferentes | ❌ No           | ✅ Sí                |
| Complejidad                | ✅ Simple       | ⚠️ Requiere gestión  |
| Uso de recursos            | ✅ Bajo         | ⚠️ Medio-Alto        |
| Flexibilidad               | ❌ Limitada     | ✅ Total             |

\*Limitado por recursos del sistema

## 🎓 Ejemplos de Escenarios

### Escenario 1: Estación de Radio con Múltiples Fuentes

```
- Instancia 1: Feed principal (con todos los efectos)
- Instancia 2: Feed de backup (mínimos efectos)
- Instancia 3: Monitor de calidad (sin efectos)
```

### Escenario 2: Producción Multi-Idioma

```
- Instancia 1: Audio en Español → VAIO1
- Instancia 2: Audio en Inglés → VAIO2
- Instancia 3: Audio Original → VAIO3
```

### Escenario 3: Testing y Producción

```
- Instancia 1: Producción (configuración estable)
- Instancia 2: Testing (probando nuevos efectos)
- Instancia 3: Development (última versión beta)
```

## ❓ Preguntas Frecuentes

**P: ¿Puedo ejecutar 100 instancias?**
R: Técnicamente sí, pero tu CPU/RAM dirán que no. Recomendamos máximo 10.

**P: ¿Las instancias se sincronizan entre sí?**
R: No, cada una es completamente independiente.

**P: ¿Puedo usar la misma tarjeta de audio en todas?**
R: Sí, pero el audio se mezclará. Mejor usar tarjetas diferentes.

**P: ¿Las actualizaciones automáticas afectan todas las instancias?**
R: Solo la instancia que descargó la actualización. Las copias portables no se actualizan automáticamente.

**P: ¿Puedo tener una instancia en un USB?**
R: Sí, la aplicación es completamente portable.

## 📞 Soporte

Si tienes problemas con múltiples instancias:

1. Verifica que cada instancia esté en una carpeta diferente
2. Revisa que cada `config.json` sea diferente
3. Confirma que no hay conflictos de tarjetas de audio
4. Revisa el uso de CPU/RAM del sistema
