# WebRTC Audio Out - Cliente WHEP

Aplicación de Electron para reproducir audio desde un servidor WebRTC usando el protocolo WHEP (WebRTC HTTP Egress Protocol), compatible con SRS (Simple Realtime Server).

## 🎯 Características

- ✅ **Conexión WHEP**: Soporte completo para el protocolo WHEP de SRS
- ✅ **URL Configurable**: Input para ingresar y guardar la URL del servidor WHEP
- ✅ **Selección de Tarjeta de Audio**: Elige cualquier dispositivo de salida disponible
- ✅ **Control de Volumen Avanzado**: Ajusta el volumen de 0% a 150% (amplificación)
- ✅ **Volumeter Visual**: Medidor de nivel de audio en tiempo real con indicador dB
- ✅ **Persistencia de Configuración**: Guarda URL, tarjeta de audio y volumen automáticamente
- ✅ **Reconexión Automática**: Se reconecta automáticamente si pierde conexión
- ✅ **Prueba de Audio**: Genera un tono de prueba (440 Hz) para verificar la salida
- ✅ **Detección de Dispositivos**: Actualiza automáticamente cuando conectas/desconectas dispositivos de audio
- ✅ **Interfaz Moderna**: Tema oscuro y diseño minimalista

## 🚀 Uso

1. **Ingresar URL WHEP**:

   - Escribe la URL de tu servidor WHEP en el campo "URL WHEP"
   - Ejemplo: `https://bogota.plussoluciones.com:6001/rtc/v1/whep/?app=live&stream=livestream`
   - Presiona Enter o haz clic fuera del campo para guardar

2. **Seleccionar Tarjeta de Audio**:

   - Elige tu dispositivo de salida preferido del menú desplegable
   - Se guardará automáticamente al seleccionarlo

3. **Ajustar Volumen**:

   - Usa el slider de volumen para ajustar de 0% a 150%
   - **0-100%**: Rango normal de volumen
   - **100-150%**: Amplificación de audio (útil para fuentes muy bajas)
   - El volumen se muestra en verde (≤100%) o naranja (>100%)
   - Los cambios se aplican instantáneamente en tiempo real
   - Se guarda automáticamente

4. **Monitor de Nivel de Audio**:

   - El volumeter visual muestra el nivel de audio en tiempo real
   - Barra de color con gradiente verde → naranja → rojo
   - Indicador de decibelios (dB) en tiempo real
   - Verde: nivel normal
   - Naranja: nivel alto
   - Rojo: nivel muy alto (posible distorsión)

5. **Conectar**:

   - Haz clic en "▶ Conectar" para iniciar la reproducción
   - El estado mostrará "conectado ✓" cuando esté funcionando
   - El volumeter comenzará a mostrar el nivel de audio

6. **Probar Audio**:

   - Usa "🔊 Probar tono" para verificar que el dispositivo de salida funciona correctamente
   - Escucharás un tono de 440 Hz con el volumen configurado

7. **Refrescar Dispositivos**:
   - Si conectas nuevos dispositivos de audio, usa "🔄 Refrescar"

## 💾 Persistencia

La aplicación guarda automáticamente toda tu configuración en un archivo central indexado por ubicación.

### 🗂️ Sistema de Configuración por Ubicación

**Característica Única:** Cada copia del ejecutable en una carpeta diferente tiene su propia configuración independiente, pero todas se guardan en un solo archivo central.

```
C:\Audio\Radio1\webrtc-audio-out.exe → Configuración "Radio1"
C:\Audio\Radio2\webrtc-audio-out.exe → Configuración "Radio2"
D:\Backup\webrtc-audio-out.exe      → Configuración "Backup"
```

**Configuración guardada:**

- URL WHEP Primaria y Failover
- Estado de Failover (activado/desactivado)
- Tarjeta de Audio seleccionada
- Volumen (0-150%)
- Presets de EQ y configuraciones personalizadas
- Efectos de Audio (Compresor, Reverb, Delay, Noise Gate)
- Preferencias de UI (Debug mode, auto-connect, tamaño de fuente)

### 📁 Ubicación del Archivo Central

**Archivo único con todas las configuraciones:**

```
Windows:
C:\Users\TuUsuario\AppData\Roaming\webrtc-audio-out\config.json

macOS:
~/Library/Application Support/webrtc-audio-out/config.json

Linux:
~/.config/webrtc-audio-out/config.json
```

**Acceso rápido en Windows:**

- Presiona `Windows + R`
- Escribe: `%APPDATA%\webrtc-audio-out`
- Verás el archivo `config.json`

### 🔑 Cómo Funciona

1. **La ubicación del ejecutable** determina qué configuración se usa
2. **Un solo archivo** contiene todas las configuraciones indexadas
3. **Copiar el ejecutable** a otra carpeta crea automáticamente una nueva configuración
4. **Cada instancia** es completamente independiente

**Ejemplo de estructura del archivo:**

```json
{
  "c_audio_radio1": {
    "WHEP_URL": "https://servidor.com/stream1",
    "DEVICE_ID": "VAIO1",
    "VOLUME": "100"
  },
  "c_audio_radio2": {
    "WHEP_URL": "https://servidor.com/stream2",
    "DEVICE_ID": "VAIO2",
    "VOLUME": "120"
  }
}
```

### 🚀 Uso de Múltiples Instancias

**Crear nuevas instancias:**

1. Copia la carpeta del ejecutable a otra ubicación
2. Ejecuta desde la nueva ubicación
3. Configura independientemente
4. ¡Listo! Cada instancia mantiene su configuración

**Ver documentación completa:** [INSTANCIAS_POR_UBICACION.md](INSTANCIAS_POR_UBICACION.md)

### ✅ Ventajas

- ✅ **Un solo archivo** para backup (contiene todas las configuraciones)
- ✅ **Configuraciones independientes** por ubicación del ejecutable
- ✅ **Fácil de copiar:** Copiar carpeta = Nueva instancia
- ✅ **Portable:** Funciona desde cualquier ubicación (USB, red, etc.)
- ✅ **Sin conflictos:** Cada ubicación tiene su configuración única

## 🔧 Configuración Avanzada

La configuración se guarda en formato JSON en:

```
Windows: C:\Users\<Usuario>\AppData\Roaming\webrtc-audio-out\config.json
```

Ejemplo de configuración:

```json
{
  "WHEP_URL": "https://tu-servidor:puerto/rtc/v1/whep/?app=live&stream=livestream",
  "DEVICE_ID": "default",
  "DEVICE_LABEL": "Default (Sistema)",
  "VOLUME": "100",
  "RECONNECT_MS": "3000"
}
```

### Control de Volumen

El control de volumen permite ajustar el audio de 0% a 150%:

- **0-100%**: Rango estándar de volumen

  - ✅ Sin distorsión
  - ✅ Recomendado para uso normal

- **100-150%**: Amplificación de audio
  - ✅ Útil para fuentes de audio muy bajas
  - ✅ Aumenta el volumen sin modificar la fuente
  - ⚠️ Puede causar distorsión si la fuente ya está alta
  - 💡 Indicado en color naranja en la interfaz

**Nota**: El volumen se aplica mediante Web Audio API (GainNode) para permitir amplificación sobre el 100%.

### Volumeter (Medidor de Nivel)

El volumeter es un medidor visual de nivel de audio en tiempo real:

- **Visualización en Canvas**: Barra animada con actualización en tiempo real
- **Gradiente de Color**:
  - 🟢 Verde: Niveles normales (0-60%)
  - 🟠 Naranja: Niveles altos (60-80%)
  - 🔴 Rojo: Niveles muy altos (>80%)
- **Indicador de Decibelios**: Muestra el nivel en dB en tiempo real
- **Análisis de Frecuencia**: Usa Web Audio API AnalyserNode (FFT 256)
- **Suavizado**: Tiempo de suavizado 0.8 para una visualización fluida

**Características técnicas**:

- Se activa automáticamente al conectar al stream
- Se detiene al desconectar
- No afecta el audio, solo lo analiza
- Actualización a 60fps (requestAnimationFrame)

## 📡 Compatibilidad

- **Servidores**: SRS 4.0+, cualquier servidor con soporte WHEP
- **Formatos**: Audio WebRTC (Opus, etc.)
- **Plataformas**: Windows, macOS, Linux

## 🛠️ Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Crear ejecutable
npm run package
```

## 🔍 Solución de Problemas

### No se conecta al servidor

- Verifica que la URL WHEP sea correcta
- Asegúrate de que el servidor SRS esté corriendo
- Revisa que el stream esté publicado

### No se escucha audio

- Prueba con "🔊 Probar tono" para verificar la salida
- Verifica que el volumen no esté en 0%
- Aumenta el volumen usando el slider
- Cambia a otro dispositivo de salida

### Audio muy bajo

- Aumenta el slider de volumen hasta 150% si es necesario
- Verifica que el volumen del sistema también esté alto
- Comprueba que la fuente de audio tenga nivel adecuado

### Audio distorsionado con volumen alto

- Reduce el volumen por debajo del 100%
- La distorsión ocurre cuando amplificas una fuente que ya está alta
- Intenta ajustar el volumen en la fuente antes de amplificar aquí

### Audio con cortes o glitches

- Aumenta el tamaño del buffer (prueba con 2048 o 4096)
- Cierra aplicaciones que consuman mucha CPU
- Verifica que tu conexión a internet sea estable
- Considera usar un buffer de 1024 o superior para streaming

### Latencia demasiado alta

- Reduce el tamaño del buffer (prueba con 512 o 256)
- Asegúrate de que tu sistema tenga recursos disponibles
- Verifica que el servidor WHEP esté geográficamente cercano

### Error de certificado SSL

- Si usas HTTPS con certificado autofirmado, puede que necesites configurar el servidor correctamente
- Para desarrollo, puedes usar HTTP en lugar de HTTPS

## 📝 Licencia

MIT
