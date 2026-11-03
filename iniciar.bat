@echo off
chcp 65001 >nul
title FerroVacaciones 🏖️ - Gestor de Calendario y Cuadrante

echo ======================================================================
echo           🏖️  FERROVACACIONES - INSTALADOR Y LANZADOR 🏖️
echo           Planificador de Vacaciones, RJ, Asuntos Propios
echo ======================================================================
echo.

REM ----------------------------------------------------------------------
REM 1. COMPROBAR O DESCARGAR EL REPOSITORIO DESDE GITHUB
REM ----------------------------------------------------------------------
if not exist "server.py" (
    if exist "FerroVacaciones\server.py" (
        cd FerroVacaciones
    ) else (
        echo [1/4] Descargando la aplicación desde GitHub...
        where git >nul 2>nul
        if %ERRORLEVEL% equ 0 (
            echo Clonando repositorio con Git...
            git clone https://github.com/TheSorian/FerroVacaciones.git
            cd FerroVacaciones
        ) else (
            echo Git no detectado. Descargando repositorio con PowerShell...
            powershell -NoProfile -ExecutionPolicy Bypass -Command ^
                "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
                "Write-Host 'Descargando paquete FerroVacaciones...'; " ^
                "Invoke-WebRequest -Uri 'https://github.com/TheSorian/FerroVacaciones/archive/refs/heads/main.zip' -OutFile 'repo.zip'; " ^
                "Write-Host 'Extrayendo archivos...'; " ^
                "Expand-Archive -Path 'repo.zip' -DestinationPath 'temp_zip' -Force; " ^
                "Move-Item -Path 'temp_zip\FerroVacaciones-main\*' -Destination '.' -Force; " ^
                "Remove-Item 'repo.zip' -Force; " ^
                "Remove-Item 'temp_zip' -Recurse -Force;"
        )
    )
)

if not exist "server.py" (
    echo [ERROR] No se pudo encontrar server.py en la carpeta.
    echo Asegúrate de tener conexión a Internet y vuelve a intentarlo.
    pause
    exit /b 1
)

REM ----------------------------------------------------------------------
REM 2. DETECTAR O INSTALAR PYTHON AUTOMÁTICAMENTE (0%% PRIVILEGIOS ADMIN)
REM ----------------------------------------------------------------------
echo [2/4] Verificando instalación de Python...
set "PY_CMD="

REM Comprobar si python está en el PATH del sistema
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
    goto :PYTHON_FOUND
)

REM Comprobar lanzador py
where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=py"
    goto :PYTHON_FOUND
)

REM Comprobar si ya está instalado en el perfil de usuario (sin estar en PATH)
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

REM Si NO está instalado, descargarlo e instalarlo automáticamente mediante PowerShell
echo.
echo [Python no detectado] Descargando e instalando Python oficial automáticamente...
echo (Instalación en modo usuario: no requiere ningún permiso de administrador).
echo Por favor, espera unos instantes...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
    "$installer = Join-Path $env:TEMP 'python_installer.exe'; " ^
    "$is64 = [Environment]::Is64BitOperatingSystem; " ^
    "$url = if ($is64) { 'https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe' } else { 'https://www.python.org/ftp/python/3.12.7/python-3.12.7.exe' }; " ^
    "Write-Host 'Descargando instalador de Python desde python.org...'; " ^
    "Invoke-WebRequest -Uri $url -OutFile $installer; " ^
    "Write-Host 'Instalando Python en tu perfil de usuario (sin permisos de administrador)...'; " ^
    "Start-Process -FilePath $installer -ArgumentList '/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_test=0 Shortcuts=0' -Wait; " ^
    "Remove-Item $installer -Force -ErrorAction SilentlyContinue;"

REM Verificar si la instalación completó con éxito en LocalAppData
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    goto :PYTHON_FOUND
)

REM Reintentar con el comando recién añadido al PATH
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
    goto :PYTHON_FOUND
)

echo.
echo [AVISO] La autoinstalación automática no pudo completarse.
echo Puedes instalar Python en 1 solo clic desde la Microsoft Store de Windows
echo buscando 'Python 3.12' (se instala en tu usuario sin pedir permisos de admin).
pause
exit /b 1

:PYTHON_FOUND
echo Python detectado correctamente: %PY_CMD%

REM ----------------------------------------------------------------------
REM 3. CREAR ENTORNO VIRTUAL LOCAL (VENV) E INSTALAR DEPENDENCIAS
REM ----------------------------------------------------------------------
if not exist "venv\Scripts\python.exe" (
    echo [3/4] Creando entorno virtual local aislado (venv)...
    "%PY_CMD%" -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Error al crear el entorno virtual con %PY_CMD%.
        pause
        exit /b 1
    )
)

echo [3/4] Comprobando e instalando dependencias (Flask, OpenPyXL)...
call venv\Scripts\activate.bat
python -m pip install -r requirements.txt --quiet --disable-pip-version-check
if %ERRORLEVEL% neq 0 (
    echo [AVISO] Reintentando instalación de dependencias...
    pip install -r requirements.txt
)

REM ----------------------------------------------------------------------
REM 4. ARRANCAR EL SERVIDOR WEB Y ABRIR EL NAVEGADOR
REM ----------------------------------------------------------------------
echo.
echo ======================================================================
echo [4/4] ¡Todo listo! Iniciando FerroVacaciones...
echo.
echo  - Aplicación disponible en: http://localhost:5000
echo  - Para cerrar la aplicación, simplemente cierra esta ventana.
echo ======================================================================
echo.

start "" "http://localhost:5000"
python server.py

pause
