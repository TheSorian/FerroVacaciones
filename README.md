# FerroVacaciones 🏖️ (Versión Plantilla Oficial)

Aplicación web completa, moderna e intuitiva para la gestión, planificación y seguimiento del calendario de vacaciones, permisos de reajuste de jornada (RJ), asuntos propios y festivos oficiales de la Comunidad y Ayuntamiento de Madrid.

Esta versión es una **plantilla limpia y oficial**: incluye la configuración y festivos oficiales por convenio, lista para que cualquier usuario empiece a planificar su calendario desde cero sin datos precargados.

---

## ✨ Características de la Versión Limpia

### 📅 Configuración Oficial Incluida
* **Calendario Laboral Inteligente de Madrid (14 festivos):** Detección en tiempo real de festivos oficiales y estimados según el Estatuto de los Trabajadores y decretos ratificados de la CAM / Ayuntamiento de Madrid.
* **Cupos Iniciales Estándar:**
  * **Vacaciones:** 25 días disponibles (0 consumidos).
  * **Asuntos Propios (AP):** 6 días disponibles (0 consumidos).
  * **Reajuste de Jornada (RJ):** 12 días asignados (4 consumidos por los obligatorios de convenio, 8 de libre disposición).
  * **Compensación Festivo en Sábado:** Detección automática de festivos que caen en sábado y asignación del cupo compensatorio por convenio (en 2026 computa 2 días por el 2 de mayo y 15 de agosto).
  * **Compensación RJ Verano (6.5h vs 8h):** Baremación automática de bolsas al completar semanas de vacaciones en periodo estival.
* **RJ Obligatorios por Convenio:** Los 4 días prefijados quedan automáticamente registrados:
  1. *Víspera de Reyes (5 de enero)*
  2. *Lunes de Pascua*
  3. *Nochebuena (24 de diciembre)*
  4. *Nochevieja (31 de diciembre)*
* **Días de libre disposición:** **0 días elegidos**. Tu cuadrante empieza 100% disponible.
* **Exportación a Excel:** Generación instantánea de hoja de cálculo `.xlsx` con cuadrante completo y desglose de saldo.

---

## 🚀 Puesta en Marcha Rápida

### 🪟 En Windows (1 Clic - Cero Privilegios de Administrador)

No necesitas permisos de administrador, ni instalar Node.js, ni compilar nada:

1. Haz doble clic en el archivo **`iniciar.bat`**.
2. El script se encarga de **TODO**:
   - Si no tienes Python instalado, **PowerShell lo descarga e instala automáticamente** en tu perfil de usuario sin pedir permisos de administrador ni credenciales UAC.
   - Crea un entorno virtual local (`venv`) aislado.
   - Instala las dependencias ligeras (`flask`, `openpyxl`).
   - Abre automáticamente tu navegador en **`http://localhost:5000`**.

> **💡 Consejo:** Puedes enviarle únicamente el archivo `iniciar.bat` a cualquier compañero; si no tiene el proyecto descargado, el propio script descargará el repositorio desde GitHub mediante Git o PowerShell y dejará la web lista en marcha.

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

* La base de datos SQLite (`vacaciones.db`) se genera automáticamente en tu propio equipo en local al arrancar la aplicación por primera vez.
* El archivo `.gitignore` está configurado para que tu base de datos y tus cuadrantes exportados permanezcan siempre en tu equipo y nunca se suban a repositorios remotos.
