from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import os
import database

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, 'dist')

app = Flask(__name__, static_folder=DIST_DIR, static_url_path='/')
CORS(app)

# Ensure database is initialized
database.init_db()

@app.route('/api/summary', methods=['GET'])
def get_summary():
    year = int(request.args.get('year', 2026))
    return jsonify(database.get_summary(year))

@app.route('/api/records', methods=['GET'])
def get_records():
    year = int(request.args.get('year', 2026))
    return jsonify(database.get_records(year))

@app.route('/api/records', methods=['POST'])
def save_record():
    try:
        req = request.json or {}
        date_str = req.get('date')
        if not date_str:
            return jsonify({'ok': False, 'error': 'Falta la fecha'}), 400
        
        category = req.get('category') # None or empty string to delete
        fraction = req.get('fraction', 1.0)
        note = req.get('note', '')
        year = int(req.get('year', date_str[:4]))

        auto_placed = database.set_day_record(date_str, category, fraction, note, year=year)
        return jsonify({
            'ok': True,
            'summary': database.get_summary(year),
            'records': database.get_records(year),
            'autoPlacedCompRj': auto_placed
        })
    except ValueError as ve:
        return jsonify({'ok': False, 'error': str(ve)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/api/records/bulk', methods=['POST'])
def save_bulk_records():
    try:
        req = request.json or {}
        records = req.get('records', [])
        year_raw = req.get('year')
        year = int(year_raw) if year_raw is not None else 2026
        auto_placed = database.set_bulk_records(records, year=year)
        return jsonify({
            'ok': True,
            'summary': database.get_summary(year),
            'records': database.get_records(year),
            'autoPlacedCompRj': auto_placed
        })
    except ValueError as ve:
        return jsonify({'ok': False, 'error': str(ve)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'ok': False,
            'error': str(e)
        }), 500

@app.route('/api/years', methods=['GET'])
def get_years():
    return jsonify(database.get_available_years())

@app.route('/api/years', methods=['POST'])
def create_year():
    req = request.json or {}
    year = int(req.get('year'))
    copy_from = req.get('copy_from')
    if copy_from:
        copy_from = int(copy_from)
    carry_over = bool(req.get('carry_over', True))
    
    summary = database.init_year(year, copy_from_year=copy_from, carry_over_vacations=carry_over)
    return jsonify({
        'ok': True,
        'year': year,
        'summary': summary,
        'years': database.get_available_years()
    })

@app.route('/api/years/<int:year>', methods=['DELETE'])
def delete_year(year):
    if year == 2026:
        return jsonify({'error': 'El año 2026 es el año base y no se puede eliminar'}), 400
    years = database.delete_year(year)
    return jsonify({
        'ok': True,
        'deleted': year,
        'years': years
    })

@app.route('/api/holidays', methods=['GET'])
def get_holidays():
    year = int(request.args.get('year', 2026))
    meta = database.madrid_holidays.get_madrid_holidays_meta(year)
    return jsonify({
        'holidays': database.get_holidays(year),
        'status': meta['status'],
        'isOfficial': meta['isOfficial'],
        'source': meta['source'],
        'url': meta.get('url')
    })

@app.route('/api/holidays/sync', methods=['POST'])
def sync_holidays():
    req = request.json or {}
    year = int(req.get('year', 2026))
    res = database.sync_madrid_holidays(year)
    return jsonify({
        'ok': True,
        'year': year,
        'holidays': res['holidays'],
        'saturdaysCount': res['saturdaysCount'],
        'status': res['status'],
        'isOfficial': res['isOfficial'],
        'source': res['source'],
        'url': res.get('url'),
        'summary': database.get_summary(year)
    })

@app.route('/api/categories/<name>', methods=['POST'])
def update_category(name):
    req = request.json or {}
    total = req.get('total')
    color = req.get('color')
    year = int(req.get('year', 2026))
    if total is not None:
        database.update_category(name, float(total), color=color, year=year)
    return jsonify({
        'ok': True,
        'summary': database.get_summary(year)
    })

@app.route('/api/export', methods=['GET'])
def export_excel():
    year = int(request.args.get('year', 2026))
    export_file = database.export_to_excel(year)
    return send_file(export_file, as_attachment=True, download_name=f'FerroVacaciones_{year}.xlsx')

@app.route('/api/reset-from-excel', methods=['POST'])
def reset_from_excel():
    conn = database.get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM categories WHERE year = 2026')
    c.execute('DELETE FROM holidays WHERE year = 2026')
    c.execute('DELETE FROM day_records WHERE year = 2026')
    conn.commit()
    database.seed_defaults(conn, 2026)
    conn.close()
    return jsonify({
        'ok': True,
        'summary': database.get_summary(2026),
        'records': database.get_records(2026)
    })

# Serve Frontend SPA
@app.route('/')
def serve_root():
    if os.path.exists(os.path.join(DIST_DIR, 'index.html')):
        return send_from_directory(DIST_DIR, 'index.html')
    return "Frontend not built yet. Run 'npm run build' first.", 404

@app.route('/favicon.ico')
def serve_favicon():
    if os.path.exists(os.path.join(DIST_DIR, 'favicon.svg')):
        return send_from_directory(DIST_DIR, 'favicon.svg', mimetype='image/svg+xml')
    return '', 204

@app.route('/<path:path>')
def serve_spa(path):
    file_path = os.path.join(DIST_DIR, path)
    if os.path.exists(file_path):
        return send_from_directory(DIST_DIR, path)
    if os.path.exists(os.path.join(DIST_DIR, 'index.html')):
        return send_from_directory(DIST_DIR, 'index.html')
    return "Not found", 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
