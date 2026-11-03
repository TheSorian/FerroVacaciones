import datetime
import urllib.request
import json
import logging

def easter(year):
    """Computes the date of Easter Sunday using the Meeus/Jones/Butcher algorithm."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return datetime.date(year, month, day)

# Calendarios oficiales ratificados y publicados por la Comunidad y Ayuntamiento de Madrid (BOCM / BOAM / madrid.es)
OFFICIAL_MADRID_CALENDARS = {
    2026: {
        'status': 'Oficial',
        'isOfficial': True,
        'source': 'BOCM y Ayuntamiento de Madrid (BOAM)',
        'url': 'https://www.madrid.es/portales/munimadrid/es/Inicio/Actividad-economica-y-hacienda/Empresa-y-comercio/Gestiones-y-tramites/Calendario-oficial-laboral-y-de-dias-inhabiles-y-festivos-2026-para-Madrid/',
        'holidays': [
            {'date': '2026-01-01', 'name': 'Año Nuevo', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-01-06', 'name': 'Epifanía del Señor', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-04-02', 'name': 'Jueves Santo', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-04-03', 'name': 'Viernes Santo', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-05-01', 'name': 'Fiesta del Trabajo', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-05-02', 'name': 'Fiesta de la Comunidad de Madrid', 'isSaturday': True, 'source': 'BOCM / BOAM'},
            {'date': '2026-05-15', 'name': 'San Isidro Labrador', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-08-15', 'name': 'Asunción de la Virgen', 'isSaturday': True, 'source': 'BOCM / BOAM'},
            {'date': '2026-10-12', 'name': 'Fiesta Nacional de España', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-11-02', 'name': 'Todos los Santos (traslado)', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-11-09', 'name': 'Nuestra Señora de La Almudena', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-12-07', 'name': 'Día de la Constitución Española (traslado)', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-12-08', 'name': 'Inmaculada Concepción', 'isSaturday': False, 'source': 'BOCM / BOAM'},
            {'date': '2026-12-25', 'name': 'Natividad del Señor', 'isSaturday': False, 'source': 'BOCM / BOAM'},
        ]
    },
    2027: {
        'status': 'Oficial',
        'isOfficial': True,
        'source': 'Ayuntamiento de Madrid (madrid.es / BOCM)',
        'url': 'https://www.madrid.es/portales/munimadrid/es/Inicio/Actividad-economica-y-hacienda/Empresa-y-comercio/Gestiones-y-tramites/Calendario-oficial-laboral-y-de-dias-inhabiles-y-festivos-2027-para-Madrid/?vgnextoid=f67c646ba5011a10VgnVCM100000891ecb1aRCRD&vgnextchannel=b42c6d5ef88fe410VgnVCM1000000b205a0aRCRD',
        'holidays': [
            {'date': '2027-01-01', 'name': 'Año Nuevo', 'isSaturday': False, 'source': 'madrid.es / BOCM'},
            {'date': '2027-01-06', 'name': 'Epifanía del Señor', 'isSaturday': False, 'source': 'madrid.es / BOCM'},
            {'date': '2027-03-19', 'name': 'San José', 'isSaturday': False, 'source': 'madrid.es / BOCM'},
            {'date': '2027-03-25', 'name': 'Jueves Santo', 'isSaturday': False, 'source': 'madrid.es / BOCM'},
            {'date': '2027-03-26', 'name': 'Viernes Santo', 'isSaturday': False, 'source': 'madrid.es / BOCM'},
            {'date': '2027-05-01', 'name': 'Fiesta del Trabajo', 'isSaturday': True, 'source': 'madrid.es / BOCM'},
            {'date': '2027-05-15', 'name': 'San Isidro Labrador', 'isSaturday': True, 'source': 'madrid.es / BOAM'},
            {'date': '2027-08-16', 'name': 'Traslado de la Asunción de la Virgen', 'isSaturday': False, 'source': 'madrid.es / BOCM'},
            {'date': '2027-10-12', 'name': 'Fiesta Nacional de España', 'isSaturday': False, 'source': 'madrid.es / BOCM'},
            {'date': '2027-11-01', 'name': 'Día de Todos los Santos', 'isSaturday': False, 'source': 'madrid.es / BOCM'},
            {'date': '2027-11-09', 'name': 'Nuestra Señora de La Almudena', 'isSaturday': False, 'source': 'madrid.es / BOAM'},
            {'date': '2027-12-06', 'name': 'Día de la Constitución Española', 'isSaturday': False, 'source': 'madrid.es / BOCM'},
            {'date': '2027-12-08', 'name': 'Inmaculada Concepción', 'isSaturday': False, 'source': 'madrid.es / BOCM'},
            {'date': '2027-12-25', 'name': 'Natividad del Señor', 'isSaturday': True, 'source': 'madrid.es / BOCM'},
        ]
    }
}

def compute_statutory_madrid_holidays(year):
    """
    Computes an ESTIMATED statutory calendar for Madrid Capital when not yet officially published.
    """
    e = easter(year)
    jueves_santo = e - datetime.timedelta(days=3)
    viernes_santo = e - datetime.timedelta(days=2)

    candidates = [
        (datetime.date(year, 1, 1), 'Año Nuevo', True),
        (datetime.date(year, 1, 6), 'Epifanía del Señor', True),
        (jueves_santo, 'Jueves Santo', False),
        (viernes_santo, 'Viernes Santo', False),
        (datetime.date(year, 5, 1), 'Fiesta del Trabajo', True),
        (datetime.date(year, 5, 2), 'Fiesta de la Comunidad de Madrid', True),
        (datetime.date(year, 5, 15), 'San Isidro Labrador', True),
        (datetime.date(year, 8, 15), 'Asunción de la Virgen', True),
        (datetime.date(year, 10, 12), 'Fiesta Nacional de España', True),
        (datetime.date(year, 11, 1), 'Todos los Santos', True),
        (datetime.date(year, 11, 9), 'Nuestra Señora de La Almudena', True),
        (datetime.date(year, 12, 6), 'Día de la Constitución Española', True),
        (datetime.date(year, 12, 8), 'Inmaculada Concepción', True),
        (datetime.date(year, 12, 25), 'Natividad del Señor', True),
    ]

    holidays = []
    for dt, name, can_transfer in candidates:
        if can_transfer and dt.weekday() == 6: # Sunday
            dt = dt + datetime.timedelta(days=1)
            name = f"{name} (traslado)"
        
        is_sat = (dt.weekday() == 5)
        holidays.append({
            'date': dt.strftime('%Y-%m-%d'),
            'name': name,
            'isSaturday': bool(is_sat),
            'source': 'Estimación normativa (Pascua + Estatuto)'
        })

    holidays.sort(key=lambda x: x['date'])
    return holidays

def fetch_online_madrid_holidays(year):
    """
    Attempts to fetch published holidays from Nager.Date API for Spain / Comunidad de Madrid (ES-MD)
    and complements with Madrid Capital local holidays (San Isidro and Almudena).
    """
    url = f"https://date.nager.at/api/v3/PublicHolidays/{year}/ES"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Vacaciones-GSM/1.0)'})
    
    with urllib.request.urlopen(req, timeout=4) as response:
        if response.status != 200:
            return None
        data = json.loads(response.read().decode('utf-8'))
        
        fetched_holidays = {}
        for item in data:
            counties = item.get('counties')
            if not counties or 'ES-MD' in counties:
                dt_str = item['date']
                local_name = item.get('localName', item.get('name', 'Festivo'))
                
                dt = datetime.datetime.strptime(dt_str, '%Y-%m-%d').date()
                if dt.weekday() == 6:
                    dt = dt + datetime.timedelta(days=1)
                    dt_str = dt.strftime('%Y-%m-%d')
                    local_name = f"{local_name} (traslado)"
                    
                fetched_holidays[dt_str] = local_name

        san_isidro = datetime.date(year, 5, 15)
        if san_isidro.weekday() == 6:
            san_isidro += datetime.timedelta(days=1)
        fetched_holidays[san_isidro.strftime('%Y-%m-%d')] = 'San Isidro Labrador'

        almudena = datetime.date(year, 11, 9)
        if almudena.weekday() == 6:
            almudena += datetime.timedelta(days=1)
        fetched_holidays[almudena.strftime('%Y-%m-%d')] = 'Nuestra Señora de La Almudena'

        result = []
        for dt_str, name in sorted(fetched_holidays.items()):
            dt = datetime.datetime.strptime(dt_str, '%Y-%m-%d').date()
            is_sat = (dt.weekday() == 5)
            result.append({
                'date': dt_str,
                'name': name,
                'isSaturday': is_sat,
                'source': 'API Oficial Publicada'
            })
            
        return result

def get_madrid_holidays_meta(year):
    """Returns official status, source and link information for a given year."""
    if year in OFFICIAL_MADRID_CALENDARS:
        entry = OFFICIAL_MADRID_CALENDARS[year]
        return {
            'status': entry['status'],
            'isOfficial': entry['isOfficial'],
            'source': entry['source'],
            'url': entry.get('url', None)
        }
    return {
        'status': 'Estimado',
        'isOfficial': False,
        'source': 'Estimación normativa (Pascua + Estatuto, pendiente de BOCM)',
        'url': None
    }

def get_madrid_holidays(year):
    """
    Main function to get 14 official holidays for Madrid Capital:
    1. Returns verified published official calendar if registered in OFFICIAL_MADRID_CALENDARS.
    2. Tries to fetch officially published calendar from online API.
    3. Falls back to statutory computation if offline or not yet published.
    """
    if year in OFFICIAL_MADRID_CALENDARS:
        return OFFICIAL_MADRID_CALENDARS[year]['holidays']

    try:
        online = fetch_online_madrid_holidays(year)
        if online and len(online) >= 12:
            return online
    except Exception as e:
        logging.warning(f"Could not fetch online holidays for {year}: {e}")

    return compute_statutory_madrid_holidays(year)
