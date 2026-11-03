# GSM Vacaciones 🏖️ (Versión Plantilla Limpia)

Aplicación web completa e intuitiva para la gestión, planificación y seguimiento del calendario de vacaciones, permisos de reajuste de jornada (RJ), asuntos propios y festivos oficiales de la Comunidad y Ayuntamiento de Madrid.

Esta versión es una **plantilla limpia**: incluye la configuración oficial y obligatoria por convenio, lista para que cualquier usuario empiece a planificar su calendario desde cero sin datos precargados.

---

## ✨ Características de la Versión Limpia

### 📅 Configuración Oficial Incluida
* **Calendario Laboral de Madrid (14 festivos):** Detección en tiempo real de festivos oficiales y estimados según el Estatuto de los Trabajadores y decretos de la CAM / Ayto.
* **Cupos Iniciales Estándar:**
  * **Vacaciones:** 25 días.
  * **Asuntos Propios (AP):** 6 días.
  * **Reajuste de Jornada (RJ):** 12 días.
  * **Compensación Festivo en Sábado:** Detección automática de festivos que caen en sábado y asignación del cupo compensatorio por convenio.
  * **Compensación RJ Verano (6.5h vs 8h):** Baremación automática de bolsas.
* **RJ Obligatorios por Convenio:** Los 4 días prefijados quedan automáticamente registrados:
  1. *Víspera de Reyes (5 de enero)*
  2. *Lunes de Pascua*
  3. *Nochebuena (24 de diciembre)*
  4. *Nochevieja (31 de diciembre)*
* **Días de libre disposición:** **0 días elegidos**. Tu cuadrante empieza 100% disponible.
* **Exportación a Excel:** Generación automática de hoja de cálculo `.xlsx` con cuadrante y desglose de saldo.

---

## 🚀 Puesta en Marcha Rápida

### 🪟 En Windows (1 Clic - Sin Derechos de Administrador)

No necesitas permisos de administrador, ni instalar Node.js, ni compilar nada:

1. Haz doble clic en el archivo **`iniciar.bat`**.
2. El script:
   - Detectará tu instalación de Python (o te indicará cómo instalarlo desde la Microsoft Store en 1 clic sin pedir admin).
   - Creará un entorno virtual local aislado.
   - Instalará las dependencias ligeras (`flask`, `openpyxl`).
   - Abrirá automáticamente tu navegador en **`http://localhost:5000`**.

> **💡 Consejo:** Puedes enviar el archivo `iniciar.bat` a cualquier compañero; si no tiene el código descargado, el propio `.bat` se conectará a GitHub, descargará la versión limpia y la dejará funcionando.

---

### 🐧 En Linux / macOS

```bash
# 1. Crear y activar entorno virtual
python3 -m venv venv
source venv/bin/activate

# 2. Instalar dependencias backend
pip install -r requirements.txt

# 3. Iniciar el servidor
python3 server.py
```
Abre tu navegador en: **`http://localhost:5000`**

---

### 🐳 Con Docker

```bash
docker compose up -d --build
```
La aplicación estará disponible en el puerto `5000`.

---

## 🔒 Privacidad y Datos

* La base de datos SQLite (`vacaciones.db`) se genera en tu propio equipo en local al arrancar la aplicación por primera vez.
* El archivo `.gitignore` está configurado para que tus bases de datos y cuadrantes exportados permanezcan siempre en tu equipo y nunca se suban a repositorios remotos.
