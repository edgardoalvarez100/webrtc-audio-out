@echo off
REM Script para publicar la aplicacion en GitHub Releases
REM Asegurate de tener configurado tu GH_TOKEN en el archivo .env

echo ========================================
echo   WebRTC Audio Out - Publicacion
echo ========================================
echo.

REM Leer GH_TOKEN del archivo .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="GH_TOKEN" set GH_TOKEN=%%b
)

REM Verificar si se encontro el token
if "%GH_TOKEN%"=="" (
    echo ERROR: No se encontro GH_TOKEN en el archivo .env
    echo.
    echo Agrega tu token de GitHub en el archivo .env:
    echo GH_TOKEN=tu_token_aqui
    echo.
    pause
    exit /b 1
)

echo Token de GitHub configurado correctamente
echo.
echo Iniciando publicacion...
echo.

REM Ejecutar npm run publish
npm run publish

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: La publicacion fallo
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Publicacion completada exitosamente
echo ========================================
echo.
pause
