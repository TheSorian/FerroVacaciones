# FerroVacaciones 🏖️

Aplicación web completa, moderna e intuitiva para la gestión, planificación y seguimiento del calendario laboral, vacaciones, permisos de reajuste de jornada (RJ), asuntos propios y festivos de la Comunidad y Ayuntamiento de Madrid.

Diseñada con interfaz reactiva moderna en **React 18 + Vite**, servidor backend ligero en **Python / Flask**, persistencia local en **SQLite 3** y sincronización/exportación a hojas de cálculo **Excel (.xlsx)**.

---

## ✨ Características Principales

### 📅 Calendario Laboral Inteligente de Madrid (14 Festivos)
* **Festivos Oficiales y Ratificados:** Integración con el calendario oficial de Madrid Capital (9 nacionales, 3 autonómicos de la Comunidad de Madrid y 2 locales: San Isidro y La Almudena).
* **Indicador en Tiempo Real (Oficial vs Estimado):**
  * **🟢 Oficial:** Festivo ratificado y publicado en decretos oficiales (BOCM / BOAM / madrid.es), con enlaces directos a las resoluciones.
  * **🟡 Estimado:** Proyección automática mediante cálculo pascual (algoritmo Butcher/Meeus) y el Estatuto de los Trabajadores para años futuros pendientes de publicación.
* **Cómputo Automático de Festivos en Sábado:** Detección de festivos que caen en sábado y asignación automática del cupo de días recuperables por convenio.
* **Sincronización en 1 Clic:** Botón directo para refrescar y sincronizar los festivos oficiales del año seleccionado.

### ⏱️ Reglas Específicas de Jornada y Convenio
* **Configuración Inicial Limpia:**
  * **Vacaciones:** 25 días laborables anuales disponibles (0 consumidos).
  * **Asuntos Propios (AP):** 6 días anuales disponibles (0 consumidos).
  * **Reajuste de Jornada (RJ):** 12 días totales (8 de libre disposición + 4 fijos por convenio).
  * **Bolsas (Comp RJ):** 0 días iniciales.
* **RJ Obligatorios Prefijados por Convenio:** Los 4 días clave quedan asignados automáticamente:
  1. *Víspera de Reyes* (5 de enero)
  2. *Lunes de Pascua* (siguiente al Domingo de Resurrección)
  3. *Nochebuena* (24 de diciembre)
  4. *Nochevieja* (31 de diciembre)
* **Compensación RJ Verano (6.5h vs 8h):** En periodo de jornada intensiva de verano (15 de junio al 15 de septiembre), la diferencia de jornada acumula horas en la bolsa de compensación. Al completar semanas completas de vacaciones (5 días hábiles), se computa automáticamente la jornada recuperable.
* **Selector de Horas Sueltas / Fracciones:** Posibilidad de registrar fracciones de jornada (por horas en base a 8h/día), disponible para las bolsas de reajuste.
* **Restricciones de Calendario:** Validación automática de plazos de disfrute según normativa (RJ utilizables hasta el 30 de noviembre excepto 24 y 31 de diciembre; vacaciones del año anterior prorrogables hasta el 31 de marzo).

### 🎯 Modos de Planificación y Analítica
* **👆 Modo Individual:** Asignación rápida de categoría en 1 solo clic.
* **☑️ Selección Múltiple:** Selección en lote de días dispersos con barra flotante de asignación masiva.
* **📅 Rango Continuo:** Selección ágil de quincenas o periodos prolongados con filtrado automático de fines de semana y festivos.
* **📊 Analítica en Tiempo Real:** Métricas de días consumidos/restantes, barras de progreso por categoría, contador dinámico y cálculo de la mayor racha de días libres consecutivos.
* **📑 Exportación a Excel:** Descarga instantánea del cuadrante anual completo y el desglose en formato `.xlsx`.

---

## 🚀 Puesta en Marcha Rápida

### 🪟 En Windows (1 Clic - Cero Derechos de Administrador)

No necesitas conocimientos técnicos, ni permisos de administrador, ni instalar Node.js:

1. Descarga directamente el archivo **[`iniciar.bat`](https://github.com/TheSorian/FerroVacaciones/releases/download/v1.0.0/iniciar.bat)** desde la sección de **[Releases](https://github.com/TheSorian/FerroVacaciones/releases/latest)** (o clona el repositorio si lo prefieres):
   ```bash
   git clone https://github.com/TheSorian/FerroVacaciones.git
   cd FerroVacaciones
   ```
2. Haz doble clic en **`iniciar.bat`**.
3. **El script automatiza todo el proceso:**
   * **Autoinstalación de Python:** Si no tienes Python instalado en el sistema, PowerShell lo descarga directamente desde `python.org` y lo instala en tu carpeta de usuario (`AppData\Local\Programs\Python`) **sin requerir permisos de administrador ni contraseñas UAC**.
   * Crea un entorno virtual local aislado (`venv`).
   * Instala las dependencias necesarias (`Flask`, `OpenPyXL`).
   * Abre automáticamente tu navegador en **`http://localhost:5000`** con la aplicación en funcionamiento.

> **💡 Portabilidad:** Puedes enviar únicamente el archivo `iniciar.bat` a cualquier compañero; si lo ejecuta en una carpeta vacía, el propio script descargará el proyecto desde GitHub y lo pondrá en marcha de forma 100% desatendida.

---

### 🐧 En Linux / macOS

```bash
# 1. Clonar el repositorio
git clone https://github.com/TheSorian/FerroVacaciones.git
cd FerroVacaciones

# 2. Crear y activar entorno virtual de Python
python3 -m venv venv
source venv/bin/activate

# 3. Instalar dependencias backend
pip install -r requirements.txt

# 4. Iniciar el servidor
python3 server.py
```
Abre tu navegador en: **`http://localhost:5000`**

---

### 🐳 Con Docker y Docker Compose

```bash
# Construir y levantar el contenedor en segundo plano
docker compose up -d --build
```
La aplicación quedará disponible en el puerto `http://localhost:5000`.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** [React 18](https://react.dev/), [Vite 5](https://vitejs.dev/), CSS3 moderno con variables CSS, animaciones fluidas y soporte responsive con tema oscuro.
* **Backend:** [Python 3.10+](https://www.python.org/), [Flask](https://flask.palletsprojects.com/), [OpenPyXL](https://openpyxl.readthedocs.io/).
* **Persistencia:** SQLite 3 con modo WAL de alta concurrencia.
* **Despliegue / Contenedores:** Docker, Docker Compose, PowerShell automatizado.

---

## 🔒 Privacidad y Almacenamiento Local

* **Tus datos son 100% privados:** La base de datos (`vacaciones.db`) se crea exclusivamente en local en tu propio equipo al arrancar por primera vez.
* **Protección Git:** El archivo `.gitignore` está configurado para que ni tu base de datos SQLite ni los archivos `.xlsx` exportados se suban nunca al repositorio.
