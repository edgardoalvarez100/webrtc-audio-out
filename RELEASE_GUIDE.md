# 🚀 Guía de Publicación de Actualizaciones

## 📦 Build y Publicación

### 1. **Incrementar versión**

Edita `package.json` y cambia la versión:

```json
"version": "1.0.4"
```

### 2. **Generar build**

```bash
npm run build-win
```

Esto generará:

- `dist/WebRTC Audio Out Setup 1.0.4.exe` - Instalador NSIS
- `dist/latest.yml` - Archivo de metadatos para auto-actualización

### 3. **Publicar en GitHub**

#### Opción A: Manual

1. Ve a https://github.com/edgardoalvarez100/webrtc-audio-out/releases/new
2. Crea un nuevo release:
   - **Tag version**: `v1.0.4`
   - **Release title**: `v1.0.4` o descripción (ej: "Mejoras en noise gate")
   - **Description**: Changelog de cambios
3. Sube estos archivos:
   - `WebRTC Audio Out Setup 1.0.4.exe`
   - `latest.yml`
4. Click en "Publish release"

#### Opción B: Automática (requiere token)

**Configuración inicial (solo una vez):**

1. Crea/edita el archivo `.env` en la raíz del proyecto:

   ```properties
   GH_TOKEN=tu_github_token_aqui
   ```

2. Obtén tu token de GitHub:
   - Ve a: https://github.com/settings/tokens/new
   - Nombre: `webrtc-audio-out-releases`
   - Expiration: 90 días o sin expiración
   - Scopes: Marca `repo` (completo)
   - Copia el token generado

**Para publicar (métodos):**

**Método 1: Script automatizado (Recomendado)**

```bash
# Windows CMD
publish.bat

# O PowerShell
.\publish.ps1
```

**Método 2: Manual**

```bash
# CMD
set GH_TOKEN=tu_token
npm run publish

# PowerShell
$env:GH_TOKEN = "tu_token"
npm run publish
```

**⚠️ IMPORTANTE:**

- El archivo `.env` está en `.gitignore` - NO lo subas al repositorio
- Los scripts `publish.bat` y `publish.ps1` leen automáticamente el token de `.env`
- Si usas el método manual, el token solo dura esa sesión de terminal

### 4. **Verificar actualización**

Las aplicaciones en uso verificarán automáticamente y descargarán la actualización en segundo plano.

## 🔐 Firma de Código (Opcional pero recomendado)

### Para Windows:

Necesitas un certificado de firma de código (.pfx o .p12)

1. **Obtener certificado**:

   - DigiCert, Sectigo, SSL.com, etc.
   - Costo: ~$100-500 USD/año

2. **Configurar en package.json**:

```json
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "password",
  "signingHashAlgorithms": ["sha256"],
  "signDlls": true
}
```

3. **O usar variables de entorno**:

```bash
set CSC_LINK=C:\path\to\cert.pfx
set CSC_KEY_PASSWORD=your_password
npm run build-win
```

### Sin firma:

- Windows mostrará "Editor desconocido" al instalar
- Funcional pero menos profesional
- Configurado con `verifyUpdateCodeSignature: false`

## 📝 Changelog Template

Al crear release, usa este formato:

```markdown
## Cambios en v1.0.4

### ✨ Nuevas características

- Auto-actualización automática
- Notificación visual de actualizaciones

### 🐛 Correcciones

- Botón desconectar ahora funciona correctamente
- Noise gate sin clipping

### 🎨 Mejoras

- UX mejorada en botón conectar
- Compresor sin aumento de volumen automático

### 🗑️ Eliminado

- Limitador removido por generar artefactos
```

## 🔄 Proceso de Auto-Actualización

1. **Usuario abre la app** → Verifica actualizaciones después de 3s
2. **Si hay nueva versión** → Descarga en segundo plano
3. **Descarga completa** → Muestra notificación visual
4. **Usuario cierra app** → Actualización se instala automáticamente
5. **Siguiente apertura** → Nueva versión lista

## 📊 Testing

Antes de publicar, prueba:

```bash
# Build local
npm run build-win

# Instalar y probar
cd dist
# Ejecutar el instalador
"WebRTC Audio Out Setup 1.0.4.exe"
```

Verifica:

- ✅ La app se instala correctamente
- ✅ Todas las funciones operan bien
- ✅ Auto-actualización consulta GitHub
- ✅ No hay errores en consola

## 🎯 Checklist Pre-Release

- [ ] Versión incrementada en `package.json`
- [ ] Changelog documentado
- [ ] Build generado sin errores
- [ ] App probada localmente
- [ ] Archivos subidos a GitHub Release
- [ ] Tag creado correctamente (v1.0.X)
- [ ] Release marcado como "latest"

## 📞 Soporte

Para problemas o preguntas sobre el proceso de publicación, consulta:

- [Electron Builder Docs](https://www.electron.build/)
- [Electron Updater Docs](https://www.electron.build/auto-update)
