@echo off
REM Script para compilar la aplicacion (sin publicar)
REM No requiere GH_TOKEN

echo ========================================
echo   WebRTC Audio Out - Compilacion
echo ========================================
echo.

echo Iniciando compilacion para Windows x64...
echo.

REM Ejecutar npm run build-win
npm run build-win

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: La compilacion fallo
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Compilacion completada exitosamente
echo ========================================
echo.
echo Los archivos se encuentran en la carpeta: dist\
echo.
pause
