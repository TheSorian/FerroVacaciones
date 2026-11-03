#!/usr/bin/env bash
set -e

# Asegurar que el directorio de trabajo sea siempre la carpeta donde está este script
cd "$(dirname "$0")"

# Colores para terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}          🏖️  FERROVACACIONES - INSTALADOR Y LANZADOR 🏖️          ${NC}"
echo -e "${BLUE}          Planificador de Vacaciones, RJ, Asuntos Propios            ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# ----------------------------------------------------------------------
# 1. COMPROBAR O DESCARGAR EL REPOSITORIO EN LA CARPETA ACTUAL
# ----------------------------------------------------------------------
if [ ! -f "server.py" ]; then
    if [ -f "FerroVacaciones/server.py" ]; then
        echo "Unificando archivos en la carpeta principal..."
        cp -rn FerroVacaciones/* . 2>/dev/null || cp -r FerroVacaciones/* .
        rm -rf FerroVacaciones
    else
        echo -e "${YELLOW}[1/4] Descargando FerroVacaciones desde GitHub en esta carpeta...${NC}"
        if command -v curl >/dev/null 2>&1; then
            curl -sSL "https://github.com/TheSorian/FerroVacaciones/archive/refs/heads/main.zip" -o repo.zip
            unzip -q repo.zip
            cp -rn FerroVacaciones-main/* . 2>/dev/null || cp -r FerroVacaciones-main/* .
            rm -rf repo.zip FerroVacaciones-main
        elif command -v wget >/dev/null 2>&1; then
            wget -q "https://github.com/TheSorian/FerroVacaciones/archive/refs/heads/main.zip" -O repo.zip
            unzip -q repo.zip
            cp -rn FerroVacaciones-main/* . 2>/dev/null || cp -r FerroVacaciones-main/* .
            rm -rf repo.zip FerroVacaciones-main
        elif command -v git >/dev/null 2>&1; then
            git clone --depth 1 https://github.com/TheSorian/FerroVacaciones.git temp_git
            cp -rn temp_git/* . 2>/dev/null || cp -r temp_git/* .
            rm -rf temp_git
        else
            echo -e "${RED}[ERROR] Se requiere curl, wget o git para descargar el repositorio.${NC}"
            exit 1
        fi
    fi
fi

if [ ! -f "server.py" ]; then
    echo -e "${RED}[ERROR] No se pudo encontrar server.py tras la descarga.${NC}"
    echo "Asegúrate de tener conexión a Internet y vuelve a intentarlo."
    exit 1
fi

# ----------------------------------------------------------------------
# 2. DETECTAR PYTHON 3
# ----------------------------------------------------------------------
echo -e "${YELLOW}[2/4] Verificando instalación de Python 3...${NC}"
PY_CMD=""
if command -v python3 >/dev/null 2>&1; then
    PY_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    VER=$(python -c 'import sys; print(sys.version_info[0])' 2>/dev/null || echo "0")
    if [ "$VER" -ge 3 ]; then
        PY_CMD="python"
    fi
fi

if [ -z "$PY_CMD" ]; then
    echo -e "${RED}[ERROR] No se ha encontrado Python 3 en el sistema.${NC}"
    echo ""
    echo "Puedes instalarlo según tu sistema operativo:"
    echo "  • En Ubuntu / Debian:   sudo apt update && sudo apt install python3 python3-venv python3-pip"
    echo "  • En Fedora / RHEL:     sudo dnf install python3"
    echo "  • En Arch Linux:        sudo pacman -S python python-pip"
    echo "  • En macOS:             brew install python3 (o ejecuta: xcode-select --install)"
    echo ""
    exit 1
fi

echo -e "${GREEN}Python detectado: $($PY_CMD --version)${NC}"

# ----------------------------------------------------------------------
# 3. CREAR ENTORNO VIRTUAL LOCAL (VENV) E INSTALAR DEPENDENCIAS
# ----------------------------------------------------------------------
if [ ! -f "venv/bin/python" ]; then
    echo -e "${YELLOW}[3/4] Creando entorno virtual local aislado (venv)...${NC}"
    if ! $PY_CMD -m venv venv 2>/dev/null; then
        echo -e "${YELLOW}[AVISO] No se pudo crear venv estándar (en Debian/Ubuntu suele requerir: sudo apt install python3-venv).${NC}"
        echo -e "${YELLOW}Intentando continuar con pip en modo usuario...${NC}"
    fi
fi

echo -e "${YELLOW}[3/4] Comprobando e instalando dependencias (Flask, OpenPyXL)...${NC}"
if [ -f "venv/bin/pip" ]; then
    venv/bin/python -m pip install -r requirements.txt --quiet --disable-pip-version-check
    PYTHON_EXEC="venv/bin/python"
else
    $PY_CMD -m pip install -r requirements.txt --user --quiet --disable-pip-version-check
    PYTHON_EXEC="$PY_CMD"
fi

# ----------------------------------------------------------------------
# 4. ARRANCAR EL SERVIDOR Y ABRIR EL NAVEGADOR
# ----------------------------------------------------------------------
echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}[4/4] ¡Todo listo! Iniciando FerroVacaciones...${NC}"
echo -e "${GREEN}  - Web disponible en: http://localhost:5000${NC}"
echo -e "${GREEN}  - Abriendo navegador automáticamente...${NC}"
echo -e "${GREEN}  - Para cerrar la aplicación, pulsa Ctrl + C en esta terminal.${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo ""

URL="http://localhost:5000"
(
    sleep 2
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$URL" >/dev/null 2>&1
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL" >/dev/null 2>&1
    fi
) &

exec $PYTHON_EXEC server.py
