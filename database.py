import sqlite3
import os
import openpyxl
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'vacaciones.db')
EXCEL_PATH = os.path.join(BASE_DIR, 'Vacaciones_2026_GSM.xlsx')

DEFAULT_CATEGORY_COLORS = {
    'Vacaciones': '#3b82f6',         # Azul vivo
    'Vacaciones 2025': '#38bdf8',    # Celeste
    'Asuntos Propios': '#f97316',    # Naranja
    'RJ': '#a855f7',                 # Púrpura
    'Comp RJ': '#06b6d4',            # Turquesa / Cyan
    'Historicos RJ': '#eab308',      # Ámbar / Mostaza
    'Festivo en sábado': '#ec4899',  # Rosa frambuesa
}

def get_category_color(name):
    if name in DEFAULT_CATEGORY_COLORS:
        return DEFAULT_CATEGORY_COLORS[name]
    if name.startswith('Vacaciones '):
        return '#38bdf8'
    return '#64748b'

import madrid_holidays

def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA busy_timeout = 30000')
    conn.row_factory = sqlite3.Row
    return conn

def get_mandatory_rj_days(year):
    """Devuelve los 4 días de RJ obligatorios prefijados por convenio para cualquier año."""
    easter_monday = (madrid_holidays.easter(year) + timedelta(days=1)).strftime('%Y-%m-%d')
    return [
        (f"{year}-01-05", "Víspera de Reyes"),
        (easter_monday, "Lunes de Pascua"),
        (f"{year}-12-24", "Nochebuena"),
        (f"{year}-12-31", "Nochevieja")
    ]

def seed_defaults(conn, year=2026):
    """Inicializa la base de datos con festivos oficiales, categorías base y solo los 4 RJ obligatorios."""
    c = conn.cursor()
    # 1. Festivos Madrid oficiales/estimados
    h_data = madrid_holidays.get_madrid_holidays(year)
    saturdays_count = 0
    for h in h_data:
        is_sat = 1 if h['isSaturday'] else 0
        if is_sat:
            saturdays_count += 1
        c.execute('''
            INSERT OR REPLACE INTO holidays (year, date, name, is_saturday)
            VALUES (?, ?, ?, ?)
        ''', (year, h['date'], h['name'], is_sat))

    # 2. Categorías base oficiales (sin bolsas de años anteriores)
    categories = [
        ("Vacaciones", 25.0, "#3b82f6", 0),
        ("Asuntos Propios", 6.0, "#f97316", 2),
        ("RJ", 12.0, "#a855f7", 3),
        ("Comp RJ", 0.0, "#06b6d4", 4),
        ("Festivo en sábado", float(saturdays_count), "#ec4899", 6),
    ]
    for name, total, color, idx in categories:
        c.execute('''
            INSERT OR REPLACE INTO categories (year, name, total_days, color, order_index)
            VALUES (?, ?, ?, ?, ?)
        ''', (year, name, float(total), color, idx))

    # 3. Solo los 4 RJ prefijados por convenio (cero días personales elegidos)
    for d_str, note in get_mandatory_rj_days(year):
        c.execute('''
            INSERT OR IGNORE INTO day_records (date, year, category_name, fraction, note)
            VALUES (?, ?, 'RJ', 1.0, ?)
        ''', (d_str, year, note))

    conn.commit()

def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            name TEXT NOT NULL,
            total_days REAL NOT NULL,
            color TEXT NOT NULL,
            order_index INTEGER DEFAULT 0,
            UNIQUE(year, name)
        );

        CREATE TABLE IF NOT EXISTS holidays (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            date TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            is_saturday INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS day_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            year INTEGER NOT NULL,
            category_name TEXT NOT NULL,
            fraction REAL DEFAULT 1.0,
            note TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    conn.commit()

    # Si está vacía, inicializar con plantilla limpia por defecto
    c.execute('SELECT COUNT(*) FROM categories WHERE year = 2026')
    if c.fetchone()[0] == 0:
        seed_defaults(conn, 2026)
    conn.close()

def format_fraction_hours(days_val):
    """Converts a decimal number of days into a human readable days + hours string (8h/day)."""
    if days_val is None:
        return "0d"
    int_days = int(days_val)
    remainder = days_val - int_days
    hours = round(remainder * 8, 2)
    # clean float precision
    if abs(hours - round(hours)) < 0.01:
        hours = int(round(hours))
    
    if hours > 0:
        if int_days == 0:
            return f"{hours}h"
        return f"{int_days}d + {hours}h"
    return f"{int_days}d"

def get_available_years():
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        SELECT DISTINCT year FROM (
            SELECT year FROM categories
            UNION
            SELECT year FROM holidays
            UNION
            SELECT year FROM day_records
        ) WHERE year IS NOT NULL ORDER BY year ASC
    ''')
    rows = c.fetchall()
    conn.close()
    years = [r['year'] for r in rows if r['year']]
    if 2026 not in years:
        years.append(2026)
    return sorted(list(set(years)))

def delete_year(year):
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM day_records WHERE year = ?', (year,))
    c.execute('DELETE FROM holidays WHERE year = ?', (year,))
    c.execute('DELETE FROM categories WHERE year = ?', (year,))
    conn.commit()
    conn.close()
    return get_available_years()

def sync_madrid_holidays(year):
    holidays = madrid_holidays.get_madrid_holidays(year)
    meta = madrid_holidays.get_madrid_holidays_meta(year)
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM holidays WHERE year = ?', (year,))
    saturdays_count = 0
    for h in holidays:
        is_sat = 1 if h['isSaturday'] else 0
        if is_sat:
            saturdays_count += 1
        c.execute('''
            INSERT INTO holidays (year, date, name, is_saturday)
            VALUES (?, ?, ?, ?)
        ''', (year, h['date'], h['name'], is_sat))
    
    # Also update "Festivo en sábado" category total if exists
    c.execute('''
        UPDATE categories SET total_days = ? WHERE year = ? AND name = 'Festivo en sábado'
    ''', (float(saturdays_count), year))
    
    conn.commit()
    conn.close()
    return {
        'holidays': get_holidays(year),
        'saturdaysCount': saturdays_count,
        'status': meta['status'],
        'isOfficial': meta['isOfficial'],
        'source': meta['source'],
        'url': meta.get('url')
    }

def init_year(year, copy_from_year=None, carry_over_vacations=True):
    # Ensure holidays are populated for this year
    sync_madrid_holidays(year)
    
    conn = get_connection()
    c = conn.cursor()
    
    # Check if categories already exist for this year
    c.execute('SELECT COUNT(*) FROM categories WHERE year = ?', (year,))
    if c.fetchone()[0] > 0:
        conn.close()
        return get_summary(year)

    # Calculate saturdays
    c.execute('SELECT COUNT(*) FROM holidays WHERE year = ? AND is_saturday = 1', (year,))
    saturdays_count = c.fetchone()[0]

    # Calculate carryover if requested (only Vacaciones from previous year)
    vacations_carryover = 0.0

    if copy_from_year and carry_over_vacations:
        try:
            prev_sum = get_summary(copy_from_year)
            for cat in prev_sum.get('categories', []):
                if cat['name'] == 'Vacaciones' and cat['remaining'] > 0:
                    vacations_carryover = cat['remaining']
        except Exception as err:
            print(f"Could not compute carryover from {copy_from_year}: {err}")

    base_categories = [
        ("Vacaciones", 25.0, "#3b82f6", 0),
        ("Asuntos Propios", 6.0, "#f97316", 2),
        ("RJ", 12.0, "#a855f7", 3),
        ("Festivo en sábado", float(saturdays_count), "#ec4899", 6),
    ]

    if vacations_carryover > 0 and copy_from_year:
        base_categories.append((f"Vacaciones {copy_from_year}", vacations_carryover, "#38bdf8", 1))

    base_categories.append(("Comp RJ", 0.0, "#06b6d4", 4))

    for name, total, color, idx in base_categories:
        c.execute('''
            INSERT OR REPLACE INTO categories (year, name, total_days, color, order_index)
            VALUES (?, ?, ?, ?, ?)
        ''', (year, name, float(total), color, idx))

    # Asignar los 4 RJ prefijados por convenio (5 ene, Lunes Pascua, 24 dic, 31 dic)
    for d_str, note in get_mandatory_rj_days(year):
        c.execute('''
            INSERT OR IGNORE INTO day_records (date, year, category_name, fraction, note)
            VALUES (?, ?, 'RJ', 1.0, ?)
        ''', (d_str, year, note))

    conn.commit()
def validate_category_date_restriction(date_str, category_name):
    """
    Valida las restricciones de fecha para categorías:
    1. 'Vacaciones XXXX' (arrastre de vacaciones del año anterior): solo se pueden usar hasta el 31 de marzo.
    2. 'RJ': solo se pueden usar hasta el 30 de noviembre, excepto el 24 y el 31 de diciembre.
    """
    if not category_name or not date_str:
        return True, ""

    try:
        parts = date_str.split('-')
        year = int(parts[0])
        month = int(parts[1])
        day = int(parts[2])
    except Exception:
        return True, ""

    # Regla 1: Vacaciones año anterior (ej. "Vacaciones 2025" o "Vacaciones XXXX")
    if category_name.startswith('Vacaciones ') and category_name[11:].strip().isdigit():
        if (month, day) > (3, 31):
            return False, f"Los días de '{category_name}' solo se pueden utilizar hasta el 31 de marzo."

    # Regla 2: RJ (solo hasta 30 de noviembre; en diciembre solo permitidos el 24 y 31 de diciembre)
    if category_name == 'RJ':
        if month == 12 and (day != 24 and day != 31):
            return False, "Los días de RJ solo se pueden usar hasta el 30 de noviembre (en diciembre solo se permiten el 24 y el 31)."
        elif month > 12:
            return False, "Los días de RJ solo se pueden usar hasta el 30 de noviembre."

    return True, ""

def sync_vacations_carryover_for_year(year):
    """
    Sincroniza los días de vacaciones no agotados del año anterior (year - 1)
    como categoría 'Vacaciones {year - 1}' en el año actual (year).
    """
    prev_year = year - 1
    conn = get_connection()
    c = conn.cursor()

    try:
        # Verificar que el año actual y el anterior existen en categorías
        c.execute('SELECT COUNT(*) FROM categories WHERE year = ?', (year,))
        if c.fetchone()[0] == 0:
            return

        c.execute('SELECT COUNT(*) FROM categories WHERE year = ?', (prev_year,))
        if c.fetchone()[0] == 0:
            return

        # Obtener total de 'Vacaciones' del año anterior
        c.execute('SELECT total_days FROM categories WHERE year = ? AND name = ?', (prev_year, 'Vacaciones'))
        row = c.fetchone()
        if not row:
            return
        prev_total = float(row['total_days'])

        # Obtener días usados de 'Vacaciones' en el año anterior
        c.execute('SELECT SUM(fraction) FROM day_records WHERE year = ? AND category_name = ?', (prev_year, 'Vacaciones'))
        used_row = c.fetchone()
        prev_used = float(used_row[0]) if used_row and used_row[0] is not None else 0.0

        prev_remaining = max(0.0, prev_total - prev_used)
        cat_name = f"Vacaciones {prev_year}"

        # Comprobar si ya existe la categoría en el año actual
        c.execute('SELECT total_days FROM categories WHERE year = ? AND name = ?', (year, cat_name))
        cat_row = c.fetchone()

        # Comprobar si hay días registrados con esa categoría en el año actual
        c.execute('SELECT COUNT(*) FROM day_records WHERE year = ? AND category_name = ?', (year, cat_name))
        used_in_curr = c.fetchone()[0] or 0

        color = get_category_color(cat_name)

        if prev_remaining > 0 or used_in_curr > 0:
            if cat_row:
                c.execute('''
                    UPDATE categories
                    SET total_days = ?
                    WHERE year = ? AND name = ?
                ''', (prev_remaining, year, cat_name))
            else:
                c.execute('''
                    INSERT INTO categories (year, name, total_days, color, order_index)
                    VALUES (?, ?, ?, ?, 1)
                ''', (year, cat_name, prev_remaining, color))
        else:
            # Si no sobró ningún día y no se ha usado nada en el año actual, eliminar si existía
            if cat_row and used_in_curr == 0:
                c.execute('DELETE FROM categories WHERE year = ? AND name = ?', (year, cat_name))

        conn.commit()
    finally:
        conn.close()

def get_summary(year=2026):
    # Sincronizar arrastre de vacaciones desde el año anterior si aplica
    sync_vacations_carryover_for_year(year)

    conn = get_connection()
    c = conn.cursor()

    # Check if this year exists in categories
    c.execute('SELECT COUNT(*) FROM categories WHERE year = ?', (year,))
    if c.fetchone()[0] == 0:
        conn.close()
        available = get_available_years()
        copy_from = (year - 1) if (year - 1) in available else None
        init_year(year, copy_from_year=copy_from)
        conn = get_connection()
        c = conn.cursor()

    # Fetch all categories
    c.execute('SELECT name, total_days, color, order_index FROM categories WHERE year = ? ORDER BY order_index ASC', (year,))
    cats = c.fetchall()

    # Fetch used sum grouped by category
    c.execute('''
        SELECT category_name, SUM(fraction) as used_sum, COUNT(*) as count_days
        FROM day_records
        WHERE year = ?
        GROUP BY category_name
    ''', (year,))
    used_map = {row['category_name']: (row['used_sum'], row['count_days']) for row in c.fetchall()}

    summary_categories = []
    total_allowed = 0.0
    total_used = 0.0

    for cat in cats:
        name = cat['name']
        total = float(cat['total_days'])
        used_sum, count_days = used_map.get(name, (0.0, 0))
        rest = total - used_sum
        total_allowed += total
        total_used += used_sum

        summary_categories.append({
            'name': name,
            'total': total,
            'totalFormatted': format_fraction_hours(total),
            'used': used_sum,
            'usedFormatted': format_fraction_hours(used_sum),
            'remaining': rest,
            'remainingFormatted': format_fraction_hours(rest),
            'countDays': count_days,
            'color': cat['color'],
            'order': cat['order_index']
        })

    # Fetch holidays count
    c.execute('SELECT COUNT(*) FROM holidays WHERE year = ?', (year,))
    holidays_count = c.fetchone()[0]

    # Fetch total records count
    c.execute('SELECT COUNT(*) FROM day_records WHERE year = ?', (year,))
    marked_count = c.fetchone()[0]

    conn.close()

    total_remaining = total_allowed - total_used
    meta = madrid_holidays.get_madrid_holidays_meta(year)

    return {
        'year': year,
        'total': total_allowed,
        'totalFormatted': format_fraction_hours(total_allowed),
        'used': total_used,
        'usedFormatted': format_fraction_hours(total_used),
        'remaining': total_remaining,
        'remainingFormatted': format_fraction_hours(total_remaining),
        'categories': summary_categories,
        'daysMarked': marked_count,
        'holidaysCount': holidays_count,
        'holidaysStatus': meta['status'],
        'isOfficialHolidays': meta['isOfficial'],
        'holidaysSource': meta['source'],
        'holidaysUrl': meta.get('url')
    }

def get_records(year=2026):
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT date, category_name, fraction, note FROM day_records WHERE year = ?', (year,))
    rows = c.fetchall()
    conn.close()
    return {r['date']: {'category': r['category_name'], 'fraction': r['fraction'], 'note': r['note']} for r in rows}

def recalculate_summer_comp_rj(year):
    """
    Regla para 2027 en adelante:
    - Periodo de verano: 15 de junio al 15 de septiembre.
    - Jornada ordinaria: 8h; jornada de verano: 6.5h. Diferencia por día de vacaciones: 1.5h = 0.1875 días.
    - Cada bloque de 5 días laborables seguidos de vacaciones en verano genera 1 día completo de Comp RJ (1.0).
      Ese día se coloca automáticamente en el siguiente día laborable disponible tras el bloque de vacaciones.
    - Días sueltos de vacaciones que no forman bloque de 5: cada uno suma 1.5h (0.1875 días) al cupo de Comp RJ.
    """
    if year <= 2026:
        return []

    conn = get_connection()
    c = conn.cursor()

    # 1. Eliminar días de Comp RJ colocados automáticamente previamente
    c.execute("""
        DELETE FROM day_records 
        WHERE year = ? 
          AND category_name = 'Comp RJ' 
          AND note LIKE '%generado por semana de vacaciones%'
    """, (year,))

    # 2. Cargar festivos del año
    c.execute("SELECT date FROM holidays WHERE year = ?", (year,))
    holiday_set = set(r['date'] for r in c.fetchall())

    # 3. Cargar registros actuales del año
    c.execute("SELECT date, category_name FROM day_records WHERE year = ?", (year,))
    existing_records = {r['date']: r['category_name'] for r in c.fetchall()}

    start_summer = datetime(year, 6, 15).date()
    end_summer = datetime(year, 9, 15).date()

    # 4. Obtener todos los días laborables del periodo estival ordenados
    working_days = []
    curr = start_summer
    while curr <= end_summer:
        d_str = curr.strftime('%Y-%m-%d')
        if curr.weekday() < 5 and d_str not in holiday_set:
            working_days.append(curr)
        curr += timedelta(days=1)

    # 5. Agrupar días de vacaciones laborables consecutivos
    stretches = []
    current_stretch = []
    for w_day in working_days:
        d_str = w_day.strftime('%Y-%m-%d')
        cat = existing_records.get(d_str, '')
        if cat and cat.startswith('Vacaciones'):
            current_stretch.append(w_day)
        else:
            if current_stretch:
                stretches.append(current_stretch)
                current_stretch = []
    if current_stretch:
        stretches.append(current_stretch)

    total_comp_rj_days = 0.0
    newly_placed_dates = []

    for stretch in stretches:
        n = len(stretch)
        full_blocks = n // 5
        remainder = n % 5
        total_comp_rj_days += (full_blocks * 1.0) + (remainder * 0.1875)

        # Colocar 1 día de Comp RJ por cada bloque de 5 días laborables
        if full_blocks > 0:
            last_day = stretch[-1]
            placed_count = 0
            check_day = last_day + timedelta(days=1)

            while placed_count < full_blocks and check_day.year == year:
                check_str = check_day.strftime('%Y-%m-%d')
                is_working = (check_day.weekday() < 5 and check_str not in holiday_set)
                if is_working:
                    curr_cat = existing_records.get(check_str)
                    if not curr_cat:
                        c.execute("""
                            INSERT INTO day_records (date, year, category_name, fraction, note)
                            VALUES (?, ?, 'Comp RJ', 1.0, 'Comp RJ (generado por semana de vacaciones)')
                        """, (check_str, year))
                        existing_records[check_str] = 'Comp RJ'
                        newly_placed_dates.append(check_str)
                        placed_count += 1
                check_day += timedelta(days=1)

    # 6. Actualizar el cupo total de la categoría 'Comp RJ'
    c.execute("""
        UPDATE categories 
        SET total_days = ? 
        WHERE year = ? AND name = 'Comp RJ'
    """, (float(total_comp_rj_days), year))

    conn.commit()
    conn.close()
    return newly_placed_dates

def set_day_record(date_str, category_name, fraction=1.0, note='', year=2026):
    if category_name:
        valid, err_msg = validate_category_date_restriction(date_str, category_name)
        if not valid:
            raise ValueError(err_msg)

    conn = get_connection()
    c = conn.cursor()
    if not category_name:
        # Delete if category is None or empty
        c.execute('DELETE FROM day_records WHERE date = ?', (date_str,))
    else:
        c.execute('''
            INSERT INTO day_records (date, year, category_name, fraction, note)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                category_name = excluded.category_name,
                fraction = excluded.fraction,
                note = excluded.note
        ''', (date_str, year, category_name, float(fraction), note))
    conn.commit()
    conn.close()

    # Sincronizar arrastre de vacaciones hacia el año siguiente
    sync_vacations_carryover_for_year(year + 1)

    auto_placed = []
    if year >= 2027:
        auto_placed = recalculate_summer_comp_rj(year)
    return auto_placed

def set_bulk_records(records_list, year=2026):
    # Validar primero todas las fechas y categorías
    for item in records_list:
        cat_name = item.get('category')
        date_str = item.get('date')
        if cat_name and date_str:
            valid, err_msg = validate_category_date_restriction(date_str, cat_name)
            if not valid:
                raise ValueError(err_msg)

    conn = get_connection()
    try:
        c = conn.cursor()
        for item in records_list:
            date_str = item.get('date')
            if not date_str:
                continue
            cat_name = item.get('category')
            raw_fraction = item.get('fraction')
            fraction = float(raw_fraction) if raw_fraction is not None else 1.0
            note = item.get('note') or ''
            if not cat_name:
                c.execute('DELETE FROM day_records WHERE date = ?', (date_str,))
            else:
                c.execute('''
                    INSERT INTO day_records (date, year, category_name, fraction, note)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(date) DO UPDATE SET
                        category_name = excluded.category_name,
                        fraction = excluded.fraction,
                        note = excluded.note
                ''', (date_str, year, cat_name, fraction, note))
        conn.commit()
    finally:
        conn.close()

    # Sincronizar arrastre de vacaciones hacia el año siguiente
    sync_vacations_carryover_for_year(year + 1)

    auto_placed = []
    if year >= 2027:
        auto_placed = recalculate_summer_comp_rj(year)
    return auto_placed

def get_holidays(year=2026):
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM holidays WHERE year = ?', (year,))
    if c.fetchone()[0] == 0:
        conn.close()
        sync_madrid_holidays(year)
        conn = get_connection()
        c = conn.cursor()
    c.execute('SELECT date, name, is_saturday FROM holidays WHERE year = ? ORDER BY date ASC', (year,))
    rows = c.fetchall()
    conn.close()
    return [{'date': r['date'], 'name': r['name'], 'isSaturday': bool(r['is_saturday'])} for r in rows]

def update_category(name, total_days, color=None, year=2026):
    conn = get_connection()
    c = conn.cursor()
    if color:
        c.execute('UPDATE categories SET total_days = ?, color = ? WHERE year = ? AND name = ?', (total_days, color, year, name))
    else:
        c.execute('UPDATE categories SET total_days = ? WHERE year = ? AND name = ?', (total_days, year, name))
    conn.commit()
    conn.close()
    return True

def export_to_excel(year=2026, output_path=None):
    if not output_path:
        output_path = os.path.join(BASE_DIR, f'Vacaciones_{year}_Exportado.xlsx')
    
    # Use existing template if available
    if os.path.exists(EXCEL_PATH):
        wb = openpyxl.load_workbook(EXCEL_PATH)
        sheet_name = str(year)
        if sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
        else:
            ws = wb.active

        # Fetch current records from SQLite
        records = get_records(year)
        holidays = {h['date']: h['name'] for h in get_holidays(year)}

        # Update columns AD, AE, AF (Registro de días)
        for r in range(3, 368):
            dt_val = ws.cell(r, 30).value
            if dt_val:
                dt_str = dt_val.strftime('%Y-%m-%d') if hasattr(dt_val, 'strftime') else str(dt_val)[:10]
                if dt_str in records:
                    ws.cell(r, 31).value = records[dt_str]['category']
                elif dt_str in holidays:
                    ws.cell(r, 31).value = 'Festivo'
                else:
                    try:
                        weekday = datetime.strptime(dt_str, '%Y-%m-%d').weekday()
                        if weekday == 5:
                            ws.cell(r, 31).value = 'Sábado'
                        elif weekday == 6:
                            ws.cell(r, 31).value = 'Domingo'
                        else:
                            ws.cell(r, 31).value = None
                    except Exception:
                        ws.cell(r, 31).value = None
    else:
        # Generar un libro de Excel limpio y formateado desde cero
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = str(year)

        # Encabezado del Resumen
        ws.cell(1, 1).value = f"Cuadrante y Resumen de Vacaciones {year}"
        ws.cell(3, 1).value = "Categoría"
        ws.cell(3, 2).value = "Total (días)"
        ws.cell(3, 3).value = "Consumido"
        ws.cell(3, 4).value = "Disponible"

        summary = get_summary(year)
        row_idx = 4
        for cat in summary.get('categories', []):
            ws.cell(row_idx, 1).value = cat['name']
            ws.cell(row_idx, 2).value = cat['total']
            ws.cell(row_idx, 3).value = cat['used']
            ws.cell(row_idx, 4).value = cat['remaining']
            row_idx += 1

        # Encabezado del Cuadrante Diario
        ws.cell(3, 6).value = "Fecha"
        ws.cell(3, 7).value = "Día"
        ws.cell(3, 8).value = "Estado / Asignación"
        ws.cell(3, 9).value = "Fracción"
        ws.cell(3, 10).value = "Nota"

        records = get_records(year)
        holidays = {h['date']: h['name'] for h in get_holidays(year)}
        weekday_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

        curr_date = datetime(year, 1, 1)
        r = 4
        while curr_date.year == year:
            d_str = curr_date.strftime('%Y-%m-%d')
            w_idx = curr_date.weekday()
            w_name = weekday_names[w_idx]

            ws.cell(r, 6).value = d_str
            ws.cell(r, 7).value = w_name

            if d_str in records:
                ws.cell(r, 8).value = records[d_str]['category']
                ws.cell(r, 9).value = records[d_str].get('fraction', 1.0)
                ws.cell(r, 10).value = records[d_str].get('note', '')
            elif d_str in holidays:
                ws.cell(r, 8).value = f"Festivo ({holidays[d_str]})"
            elif w_idx == 5:
                ws.cell(r, 8).value = "Sábado"
            elif w_idx == 6:
                ws.cell(r, 8).value = "Domingo"
            else:
                ws.cell(r, 8).value = "Laborable"

            curr_date += timedelta(days=1)
            r += 1

    wb.save(output_path)
    return output_path

if __name__ == '__main__':
    init_db()
    summary = get_summary(2026)
    print("Test summary:")
    print("Total:", summary['total'], summary['totalFormatted'])
    print("Used:", summary['used'], summary['usedFormatted'])
    print("Remaining:", summary['remaining'], summary['remainingFormatted'])
    for cat in summary['categories']:
        print(f" - {cat['name']}: {cat['used']}/{cat['total']} ({cat['usedFormatted']}/{cat['totalFormatted']})")
