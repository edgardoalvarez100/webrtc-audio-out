# 📋 Configuración de la Aplicación

## � Múltiples Instancias

Esta aplicación **permite ejecutar múltiples instancias simultáneamente**, cada una con su propia configuración independiente. Esto es útil para:

- Recibir múltiples streams de audio simultáneamente
- Usar diferentes configuraciones de audio para diferentes propósitos
- Tener instancias portables en diferentes carpetas

## �📁 Ubicación del Archivo de Configuración

La aplicación guarda su configuración en un archivo `config.json` ubicado **en la misma carpeta donde está el ejecutable**.

### Versión Instalada (NSIS Installer)

```
C:\Users\<TuUsuario>\AppData\Local\Programs\webrtc-audio-out\config.json
```

O la carpeta donde elegiste instalar la aplicación.

### Versión Portable

```
<Carpeta donde copiaste el ejecutable>\config.json
```

### Desarrollo

```
<Carpeta del proyecto>\config.json
```

## 🔧 ¿Por qué esta ubicación?

1. **✅ Múltiples instancias independientes**: Cada instalación/copia tiene su propia configuración
2. **✅ Portable**: Puedes copiar toda la carpeta a otro lugar y llevará su configuración
3. **✅ Múltiples configuraciones**: Crea copias en diferentes carpetas para diferentes usos
4. **⚠️ Las actualizaciones SÍ pueden sobrescribir**: Al actualizar, considera hacer backup de tu `config.json`

## 🎯 Casos de Uso

### Caso 1: Múltiples Streams Simultáneos

```
C:\Audio\Stream1\webrtc-audio-out.exe + config.json (Stream A)
C:\Audio\Stream2\webrtc-audio-out.exe + config.json (Stream B)
C:\Audio\Stream3\webrtc-audio-out.exe + config.json (Stream C)
```

Cada instancia se conecta a un stream diferente con su propia configuración de audio.

### Caso 2: Configuraciones Diferentes

```
D:\Portable\Voz\webrtc-audio-out.exe + config.json (Preset Vocal)
D:\Portable\Musica\webrtc-audio-out.exe + config.json (Preset Rock)
```

### Caso 3: Portable USB

```
E:\MiUSB\AudioApp\webrtc-audio-out.exe + config.json
```

Lleva la aplicación con su configuración en un USB.

## 📝 Contenido del Archivo

El archivo `config.json` contiene:

```json
{
  "DEVICE_ID": "id-del-dispositivo-de-audio",
  "DEVICE_LABEL": "Nombre del dispositivo de audio",
  "WHEP_URL": "https://tu-servidor.com/rtc/v1/whep/?app=live&stream=audio",
  "fontSize": "medium",
  "DEBUG_MODE": "false",
  "AUTO_CONNECT": "false",
  "VOLUME": "100",
  "pluginsConfig": "{...configuración de efectos...}",
  "autostart": "false"
}
```

### Campos principales:

- **DEVICE_ID**: Identificador único del dispositivo de audio seleccionado
- **DEVICE_LABEL**: Nombre legible del dispositivo
- **WHEP_URL**: URL del servidor WHEP para streaming
- **fontSize**: Tamaño de fuente de la interfaz (`small`, `medium`, `large`)
- **DEBUG_MODE**: Modo debug (`"true"` o `"false"`)
- **AUTO_CONNECT**: Conexión automática al iniciar (`"true"` o `"false"`)
- **VOLUME**: Nivel de volumen (0-150)
- **pluginsConfig**: JSON stringificado con la configuración de todos los efectos de audio
- **autostart**: Iniciar con el sistema (`"true"` o `"false"`)

## 🆕 Primera Instalación

Al instalar o ejecutar la aplicación por primera vez:

1. **No existe config.json** → La app usa valores por defecto
2. **Al hacer cambios** → Se crea automáticamente `config.json` en la misma carpeta
3. **Configuración guardada** → Persiste en esa carpeta específica

## 🔄 Actualizaciones

⚠️ **IMPORTANTE**: Al actualizar a una nueva versión:

1. **Instalación automática** → El `config.json` puede ser sobrescrito
2. **Recomendación** → Haz backup de tu `config.json` antes de actualizar
3. **Versión portable** → Copia solo el ejecutable nuevo, mantén tu `config.json`

### Cómo hacer backup:

```
1. Copia config.json a otra ubicación
2. Instala/actualiza la aplicación
3. Copia de vuelta tu config.json
```

O usa el archivo `config.example.json` como plantilla para restaurar tu configuración.

## 🗑️ Resetear Configuración

Si quieres resetear la configuración a valores por defecto:

### Opción 1: Eliminar el archivo

1. Cierra la aplicación
2. Elimina el archivo `config.json` de la ubicación correspondiente
3. Abre la aplicación nuevamente

### Opción 2: Desde la aplicación

1. Ve a "Configuración"
2. Haz clic en "Restablecer configuración" (si está disponible)

## 📦 Desarrollo vs Producción

### Durante el desarrollo:

- El `config.json` se guarda en la carpeta del proyecto
- Este archivo NO se incluye en el build (está en `.gitignore`)
- Incluye `config.example.json` como referencia

### En producción:

- El `config.json` se crea automáticamente en la carpeta del ejecutable
- Cada copia de la aplicación tiene su propia configuración
- Permite múltiples instancias con diferentes configuraciones

## 🔍 Verificar Ubicación

Para saber dónde está tu archivo de configuración:

1. Abre la aplicación
2. Abre la consola de desarrollador (Ctrl+Shift+I en Windows/Linux, Cmd+Option+I en macOS)
3. Busca el mensaje: `📁 Archivo de configuración: ...`
4. También verás: `🔓 Múltiples instancias: ACTIVADO`

## 📋 Ejemplo de Configuración

Puedes usar `config.example.json` como referencia para crear tu propia configuración:

```json
{
  "WHEP_URL": "https://tu-servidor.com/rtc/v1/whep/?app=live&stream=audio",
  "VOLUME": "80",
  "AUTO_CONNECT": "true",
  "DEBUG_MODE": "false"
}
```

## ⚠️ Notas Importantes

1. **No editar manualmente durante ejecución**: Cierra la app antes de editar el archivo
2. **JSON válido**: Asegúrate de que el formato JSON sea correcto
3. **Backup antes de actualizar**: Guarda tu `config.json` antes de actualizar la app
4. **Múltiples instancias**: Cada copia en diferente carpeta = configuración independiente
5. **Desinstalación**: El archivo puede ser eliminado si está en la carpeta de instalación
6. **Permisos**: La aplicación necesita permisos de escritura en su propia carpeta

## 🛠️ Solución de Problemas

### La configuración no se guarda

- Verifica permisos de escritura en la carpeta del ejecutable
- En Windows: ejecuta como administrador si está en Program Files
- Considera usar una versión portable en una carpeta con permisos completos
- Revisa que no haya procesos bloqueando el archivo
- Verifica el formato JSON si editaste manualmente

### Configuración corrupta

- Elimina el archivo `config.json` de la carpeta del ejecutable
- Reinicia la aplicación
- Se creará uno nuevo con valores por defecto
- O copia `config.example.json` y renómbralo a `config.json`

### Quiero usar diferentes configuraciones

- Crea copias de la carpeta completa de la aplicación
- Cada carpeta tendrá su propio `config.json` independiente
- Puedes ejecutar todas las instancias simultáneamente

### No puedo ejecutar múltiples instancias

- Verifica que cada instancia esté en una carpeta diferente
- Si están en la misma carpeta, compartirán el mismo `config.json`
- La aplicación permite múltiples instancias por defecto
