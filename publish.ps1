# Script de PowerShell para publicar la aplicacion en GitHub Releases
# Asegurate de tener configurado tu GH_TOKEN en el archivo .env

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WebRTC Audio Out - Publicacion" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Leer GH_TOKEN del archivo .env
$envFile = Get-Content .env
$ghToken = $null

foreach ($line in $envFile) {
    if ($line -match "^GH_TOKEN=(.+)$") {
        $ghToken = $matches[1]
        break
    }
}

# Verificar si se encontro el token
if ([string]::IsNullOrEmpty($ghToken)) {
    Write-Host "ERROR: No se encontro GH_TOKEN en el archivo .env" -ForegroundColor Red
    Write-Host ""
    Write-Host "Agrega tu token de GitHub en el archivo .env:" -ForegroundColor Yellow
    Write-Host "GH_TOKEN=tu_token_aqui" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Establecer la variable de entorno
$env:GH_TOKEN = $ghToken

Write-Host "Token de GitHub configurado correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "Iniciando publicacion..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar npm run publish
npm run publish

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: La publicacion fallo" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Publicacion completada exitosamente" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Read-Host "Presiona Enter para salir"
