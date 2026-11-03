@echo off
setlocal EnableExtensions
title FerroVacaciones - Gestor de Calendario y Cuadrante

REM Asegurar que el directorio de trabajo sea siempre la carpeta donde esta este archivo .bat
cd /d "%~dp0"

echo ======================================================================
echo           FERROVACACIONES - INSTALADOR Y LANZADOR
echo       Planificador de Vacaciones, RJ y Asuntos Propios
echo ======================================================================
echo.

REM 1. COMPROBAR O DESCARGAR EL REPOSITORIO EN LA CARPETA ACTUAL
if exist "server.py" goto :CHECK_PYTHON

REM Si en una ejecucion previa se descargo en subcarpeta FerroVacaciones, unificar aqui
if exist "FerroVacaciones\server.py" (
    echo Unificando archivos en la carpeta principal...
    xcopy /s /e /y /q "FerroVacaciones\*" "." >nul 2>nul
    rd /s /q "FerroVacaciones" >nul 2>nul
    if exist "server.py" goto :CHECK_PYTHON
)

:DOWNLOAD_REPO
echo [1/4] Descargando FerroVacaciones desde GitHub en esta carpeta...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Descargando paquete oficial...'; Invoke-WebRequest -Uri 'https://github.com/TheSorian/FerroVacaciones/archive/refs/heads/main.zip' -OutFile 'repo.zip'; Write-Host 'Extrayendo archivos...'; Expand-Archive -Path 'repo.zip' -DestinationPath 'temp_zip' -Force; Copy-Item -Path 'temp_zip\FerroVacaciones-main\*' -Destination '.' -Recurse -Force; Remove-Item 'repo.zip' -Force; Remove-Item 'temp_zip' -Recurse -Force"

if not exist "server.py" (
    echo [ERROR] No se pudo encontrar server.py tras la descarga.
    echo Asegurate de tener conexion a Internet y vuelve a intentarlo.
    pause
    exit /b 1
)

:CHECK_PYTHON
echo [2/4] Verificando instalacion de Python...
set "PY_CMD="

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
    goto :PYTHON_FOUND
)

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=py"
    goto :PYTHON_FOUND
)

if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    goto :PYTHON_FOUND
)
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    goto :PYTHON_FOUND
)
if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    goto :PYTHON_FOUND
)

echo.
echo Python no detectado en el sistema.
echo Descargando e instalando Python 3.12 automaticamente...
echo (Instalacion en modo usuario: no requiere permisos de administrador)
echo Por favor, espera unos instantes...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $installer = Join-Path $env:TEMP 'python_installer.exe'; $is64 = [Environment]::Is64BitOperatingSystem; $url = if ($is64) { 'https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe' } else { 'https://www.python.org/ftp/python/3.12.7/python-3.12.7.exe' }; Invoke-WebRequest -Uri $url -OutFile $installer; Start-Process -FilePath $installer -ArgumentList '/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_test=0 Shortcuts=0' -Wait; Remove-Item $installer -Force -ErrorAction SilentlyContinue"

if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    goto :PYTHON_FOUND
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
    goto :PYTHON_FOUND
)

echo.
echo [AVISO] La instalacion automatica no pudo completarse.
echo Puedes instalar Python en 1 clic desde la Microsoft Store de Windows
echo buscando 'Python 3.12' (se instala en tu usuario sin pedir admin).
pause
exit /b 1

:PYTHON_FOUND
echo Python detectado correctamente: %PY_CMD%

:SETUP_VENV
if exist "venv\Scripts\python.exe" goto :INSTALL_DEPS

echo [3/4] Creando entorno virtual local aislado: venv
"%PY_CMD%" -m venv venv
if %ERRORLEVEL% neq 0 (
    echo [ERROR] No se pudo crear el entorno virtual.
    pause
    exit /b 1
)

:INSTALL_DEPS
echo [3/4] Comprobando e instalando dependencias (Flask, OpenPyXL)...
call venv\Scripts\activate.bat
venv\Scripts\python.exe -m pip install -r requirements.txt --quiet --disable-pip-version-check
if %ERRORLEVEL% neq 0 (
    echo [AVISO] Reintentando instalacion de dependencias...
    venv\Scripts\pip.exe install -r requirements.txt
)

:LAUNCH
echo.
echo ======================================================================
echo [4/4] Todo listo! Iniciando FerroVacaciones...
echo.
echo   - Aplicacion disponible en: http://localhost:5000
echo   - Abriendo navegador automaticamente...
echo   - Para cerrar la aplicacion, simplemente cierra esta ventana.
echo ======================================================================
echo.

REM Abrir navegador en 2 segundos para dar tiempo a que Flask inicie el servidor
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5000'"
venv\Scripts\python.exe server.py

pause
