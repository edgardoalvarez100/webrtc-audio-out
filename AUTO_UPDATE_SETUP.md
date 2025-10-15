# 🎉 Sistema de Auto-Actualización Configurado

## ✅ Estado Actual

Tu aplicación ya tiene configurado el sistema completo de auto-actualización:

### Archivos generados en `dist/`:

- ✅ `WebRTC Audio Out Setup 1.0.3.exe` - Instalador NSIS
- ✅ `latest.yml` - Archivo de metadatos para auto-actualización
- ✅ `WebRTC Audio Out Setup 1.0.3.exe.blockmap` - Para actualizaciones diferenciales

## 📋 Próximos Pasos para Publicar

### 1. Crear un Release en GitHub

1. Ve a: https://github.com/edgardoalvarez100/webrtc-audio-out/releases/new

2. Completa el formulario:

   - **Tag version**: `v1.0.3`
   - **Release title**: `v1.0.3 - Auto-Update Feature`
   - **Description**:

     ```markdown
     ## 🚀 Nueva Versión 1.0.3

     ### ✨ Nuevas Características

     - Sistema de auto-actualización automática
     - Notificaciones visuales de actualizaciones disponibles
     - Instalación automática al cerrar la app

     ### 🔧 Mejoras

     - Botón desconectar funciona correctamente
     - UX mejorada en proceso de conexión
     - Noise Gate sin clipping
     - Compresor sin aumento automático de volumen

     ### 🗑️ Eliminado

     - Limitador (generaba artefactos audibles)
     ```

3. **Arrastra y suelta estos archivos desde `dist/`:**

   - `WebRTC Audio Out Setup 1.0.3.exe`
   - `latest.yml`

4. Click en **"Publish release"**

### 2. Verificar que Funciona

Después de publicar:

1. Cierra la app actual si está abierta
2. Ábrela de nuevo
3. En la consola de desarrollador (F12) verás:
   ```
   🔍 Verificando actualizaciones...
   ✅ La aplicación está actualizada (v1.0.3)
   ```

## 🔄 Para Futuras Actualizaciones

### Paso 1: Incrementar versión

En `package.json`:

```json
"version": "1.0.4"
```

### Paso 2: Build

```bash
npm run build-win
```

### Paso 3: Crear Release

1. Ve a GitHub Releases
2. Crea nuevo release con tag `v1.0.4`
3. Sube los archivos de `dist/`:
   - `WebRTC Audio Out Setup 1.0.4.exe`
   - `latest.yml`

### Paso 4: Distribución automática

Las apps instaladas verificarán automáticamente:

- ✅ Al abrir la app (después de 3 segundos)
- ✅ Descarga en segundo plano si hay actualización
- ✅ Notifica al usuario cuando está lista
- ✅ Se instala al cerrar la app

## 📊 Monitoreo

### En desarrollo:

```bash
npm start
```

Verás en consola:

```
🔍 Verificando actualizaciones...
❌ Error en auto-updater: [mensaje]
```

(Es normal en dev, solo funciona con .exe firmado)

### En producción:

Los usuarios verán una notificación visual cuando haya actualización:

```
┌─────────────────────────────────┐
│ 🎉 ¡Actualización lista!        │
│ Versión 1.0.4 se instalará al   │
│ cerrar la aplicación            │
└─────────────────────────────────┘
```

## 🔐 Firma de Código (Opcional)

Para eliminar el warning de "Editor desconocido":

1. **Obtener certificado** (~$100-500/año):

   - DigiCert
   - Sectigo
   - SSL.com

2. **Configurar variables de entorno**:

   ```cmd
   set CSC_LINK=C:\ruta\a\certificado.pfx
   set CSC_KEY_PASSWORD=tu_password
   ```

3. **Build firmado**:
   ```bash
   npm run build-win
   ```

Sin firma, la app funciona perfectamente pero Windows mostrará:

- "Editor: Desconocido"
- Requiere confirmación adicional al instalar

## 🎯 Comandos Disponibles

```bash
# Desarrollo
npm start                    # Ejecutar en modo desarrollo

# Build
npm run build-win            # Windows installer
npm run build-win-portable   # Windows portable
npm run build-mac            # macOS (requiere macOS)
npm run build-linux          # Linux AppImage + deb

# Publicación (requiere GH_TOKEN)
npm run publish              # Build + upload a GitHub
```

## 📝 Notas Importantes

### GitHub Token (para `npm run publish`):

1. Ve a: https://github.com/settings/tokens
2. Genera un token con permisos `repo`
3. Configura:
   ```cmd
   set GH_TOKEN=ghp_tu_token_aqui
   ```

### Versioning:

Sigue [Semantic Versioning](https://semver.org/):

- **1.0.X** - Bugfixes
- **1.X.0** - Nuevas características (compatible)
- **X.0.0** - Breaking changes

### Testing:

Antes de publicar, siempre prueba localmente:

```bash
npm run build-win
cd dist
.\WebRTC Audio Out Setup 1.0.X.exe
```

## 🆘 Troubleshooting

### "Error: GitHub token not set"

```cmd
set GH_TOKEN=tu_token
npm run publish
```

### "No se detecta actualización"

- Verifica que el tag en GitHub sea `v1.0.X` (con v)
- Verifica que `latest.yml` esté subido
- Verifica que el release no esté marcado como "pre-release"

### "Update download failed"

- Verifica conexión a internet
- Verifica que los archivos en GitHub sean públicos
- Revisa logs en consola (F12)

## ✨ ¡Listo!

Tu aplicación ahora:

- ✅ Se auto-actualiza automáticamente
- ✅ Notifica a los usuarios
- ✅ Instalación transparente
- ✅ Sin intervención manual del usuario

Para publicar la primera versión con auto-update, sigue los pasos en **"Próximos Pasos para Publicar"** arriba. 🚀
