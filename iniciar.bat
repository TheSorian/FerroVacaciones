@echo off
chcp 65001 >nul
title GSM Vacaciones 🏖️ - Gestor de Calendario y Cuadrante

echo ======================================================================
echo             🏖️  GSM VACACIONES - INSTALADOR Y LANZADOR 🏖️
echo           Planificador de Vacaciones, RJ, Asuntos Propios
echo ======================================================================
echo.

REM 1. Comprobar si estamos dentro de la carpeta del proyecto o hay que descargarlo
if not exist "server.py" (
    if exist "GSMVacaciones-Clean\server.py" (
        cd GSMVacaciones-Clean
    ) else (
        echo [1/4] Descargando la aplicación desde GitHub...
        where git >nul 2>nul
        if %ERRORLEVEL% equ 0 (
            echo Clonando repositorio con Git...
            git clone https://github.com/TheSorian/GSMVacaciones-Clean.git
            cd GSMVacaciones-Clean
        ) else (
            echo Git no detectado. Descargando paquete ZIP mediante PowerShell...
            powershell -NoProfile -ExecutionPolicy Bypass -Command ^
                "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
                "Write-Host 'Descargando archivo...'; " ^
                "Invoke-WebRequest -Uri 'https://github.com/TheSorian/GSMVacaciones-Clean/archive/refs/heads/main.zip' -OutFile 'repo.zip'; " ^
                "Write-Host 'Extrayendo archivos...'; " ^
                "Expand-Archive -Path 'repo.zip' -DestinationPath 'temp_zip' -Force; " ^
                "Move-Item -Path 'temp_zip\GSMVacaciones-Clean-main\*' -Destination '.' -Force; " ^
                "Remove-Item 'repo.zip' -Force; " ^
                "Remove-Item 'temp_zip' -Recurse -Force;"
        )
    )
)

if not exist "server.py" (
    echo [ERROR] No se pudo encontrar server.py en la carpeta.
    echo Asegúrate de tener conexión a Internet para descargar el repositorio.
    pause
    exit /b 1
)

REM 2. Comprobar instalación de Python (sin requerir permisos de admin)
echo [2/4] Verificando Python...
set "PY_CMD="
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
) else (
    where py >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set "PY_CMD=py"
    )
)

if "%PY_CMD%"=="" (
    echo.
    echo [ERROR] No se ha encontrado Python en el sistema.
    echo.
    echo Para ejecutar esta aplicación sin permisos de administrador:
    echo  1. Abre la 'Microsoft Store' en Windows.
    echo  2. Busca 'Python 3.12' o 'Python 3.11' y pulsa 'Obtener' o 'Instalar'.
    echo     (Se instala en tu usuario sin pedir clave de administrador).
    echo  3. Vuelve a ejecutar este archivo 'iniciar.bat'.
    echo.
    pause
    exit /b 1
)

REM 3. Crear entorno virtual local (venv) e instalar dependencias ligeras
if not exist "venv\Scripts\python.exe" (
    echo [3/4] Creando entorno virtual aislado de Python (0%% privilegios requeridos)...
    %PY_CMD% -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Error al crear el entorno virtual.
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

REM 4. Lanzar la aplicación y abrir el navegador web
echo.
echo [4/4] ¡Todo listo! Iniciando servidor web local...
echo.
echo  - Aplicación disponible en: http://localhost:5000
echo  - Para cerrar la aplicación, cierra esta ventana de comandos.
echo.

start "" "http://localhost:5000"
python server.py

pause
