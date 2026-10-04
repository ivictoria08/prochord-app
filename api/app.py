"""API compatible con el frontend. No crea ni modifica el esquema de MySQL."""
import os
import re
from contextlib import contextmanager
from datetime import timedelta
from functools import wraps
from threading import Lock

import mysql.connector
from flask import Flask, g, jsonify, request, session
from flask_cors import CORS
from mysql.connector import pooling
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash


def create_app(config=None, connection_factory=None):
    app = Flask(__name__)
    secure = os.getenv('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
    app.config.update(
        SECRET_KEY=os.getenv('SECRET_KEY'),
        ADMIN_USER_IDS={int(value.strip()) for value in os.getenv('ADMIN_USER_IDS', '').split(',') if value.strip()},
        FRONTEND_ORIGINS=[value.strip().rstrip('/') for value in os.getenv('FRONTEND_ORIGINS', 'http://localhost:3000').split(',') if value.strip()],
        SESSION_COOKIE_NAME='prochord_session',
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=secure,
        SESSION_COOKIE_SAMESITE='None' if secure else 'Lax',
        PERMANENT_SESSION_LIFETIME=timedelta(hours=24),
        SESSION_REFRESH_EACH_REQUEST=False,
        MAX_CONTENT_LENGTH=1024 * 1024,
    )
    if config:
        app.config.update(config)
    if not app.config['SECRET_KEY'] or len(app.config['SECRET_KEY']) < 32:
        raise RuntimeError('Configura SECRET_KEY con al menos 32 caracteres aleatorios.')
    if not app.config['ADMIN_USER_IDS']:
        raise RuntimeError('Configura ADMIN_USER_IDS con los IDs de usuarios administradores.')
    if not app.config['FRONTEND_ORIGINS'] or '*' in app.config['FRONTEND_ORIGINS']:
        raise RuntimeError('FRONTEND_ORIGINS debe contener orígenes explícitos.')

    if connection_factory is None:
        required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
        if any(not os.getenv(key) for key in required):
            raise RuntimeError('Configura DB_HOST, DB_USER, DB_PASSWORD y DB_NAME.')
        dbconfig = dict(host=os.environ['DB_HOST'], user=os.environ['DB_USER'],
                        password=os.environ['DB_PASSWORD'], database=os.environ['DB_NAME'],
                        port=int(os.getenv('DB_PORT', '3306')), autocommit=False,
                        connection_timeout=10)
        pool = None
        pool_lock = Lock()

        def connection_factory():
            nonlocal pool
            with pool_lock:
                if pool is None:
                    pool = pooling.MySQLConnectionPool(pool_name='prochord_pool', pool_size=2,
                                                      pool_reset_session=True, **dbconfig)
            return pool.get_connection()

    CORS(app, resources={r'/api/*': {'origins': app.config['FRONTEND_ORIGINS']}},
         supports_credentials=True, allow_headers=['Content-Type'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

    def db():
        if 'connection' not in g:
            g.connection = connection_factory()
        return g.connection

    @app.teardown_appcontext
    def close_connection(_error):
        connection = g.pop('connection', None)
        if connection is not None:
            try:
                connection.rollback()
            except mysql.connector.Error:
                app.logger.error('No se pudo revertir la conexión durante su cierre.')
            finally:
                try:
                    connection.close()
                except mysql.connector.Error:
                    app.logger.error('No se pudo devolver la conexión al pool.')

    @contextmanager
    def cursor():
        value = db().cursor(dictionary=True)
        try:
            yield value
        finally:
            value.close()

    @contextmanager
    def write_transaction():
        connection = db()
        # Serializa las escrituras del catálogo y del único setlist, incluso vacío.
        with cursor() as cur:
            cur.execute("SELECT GET_LOCK('prochord_write', 5) AS acquired")
            if cur.fetchone()['acquired'] != 1:
                from werkzeug.exceptions import ServiceUnavailable
                raise ServiceUnavailable('Otra escritura está en curso. Intenta nuevamente.')
            try:
                connection.commit()
                connection.start_transaction()
                yield cur
                connection.commit()
            except Exception:
                connection.rollback()
                raise
            finally:
                cur.execute("SELECT RELEASE_LOCK('prochord_write') AS released")
                cur.fetchone()

    def admin_required(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            user_id = session.get('user_id')
            if user_id is None:
                return jsonify(message='Inicia sesión para realizar esta operación.'), 401
            if user_id not in app.config['ADMIN_USER_IDS']:
                return jsonify(message='No tienes permisos de administrador.'), 403
            # Confirma que el usuario aún existe; no basta la cookie del frontend.
            with cursor() as cur:
                cur.execute('SELECT id FROM usuarios WHERE id = %s', (user_id,))
                if cur.fetchone() is None:
                    session.clear()
                    return jsonify(message='La sesión ya no es válida.'), 401
            return handler(*args, **kwargs)
        return wrapped

    @app.before_request
    def check_origin():
        # CORS no protege por sí solo frente a escrituras iniciadas por otros sitios.
        if request.path.startswith('/api/') and request.method in {'POST', 'PUT', 'DELETE'}:
            if request.headers.get('Origin') not in app.config['FRONTEND_ORIGINS']:
                return jsonify(message='Origen no autorizado.'), 403

    @app.after_request
    def disable_cache(response):
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        return response

    @app.errorhandler(mysql.connector.Error)
    def database_error(error):
        app.logger.error('Error MySQL: %s', type(error).__name__)
        return jsonify(message='No se pudo completar la operación en la base de datos.'), 503

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(message=error.description), error.code

    @app.errorhandler(Exception)
    def server_error(error):
        app.logger.error('Error del servidor: %s', type(error).__name__)
        return jsonify(message='Error interno del servidor.'), 500

    def json_object():
        from werkzeug.exceptions import BadRequest
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            raise BadRequest('Envía un objeto JSON válido.')
        return data

    def song_data():
        from werkzeug.exceptions import BadRequest
        data = json_object()
        values = {}
        for field in ['titulo', 'tono_base', 'compas', 'estilo', 'letra_acordes']:
            value = data.get(field)
            if not isinstance(value, str) or not value.strip():
                raise BadRequest(f'El campo {field} es requerido y debe ser texto.')
            values[field] = value.strip()
        if not re.fullmatch(r'[A-G](?:#|b)?m?', values['tono_base']):
            raise BadRequest('Usa un tono como C, Bb o F#m.')
        if not re.fullmatch(r'[1-9]\d*/(?:2|4|8|16)', values['compas']):
            raise BadRequest('Compás inválido.')
        if values['estilo'] not in {'Alabanza', 'Adoración', 'Júbilo'}:
            raise BadRequest('Estilo inválido.')
        bpm = data.get('bpm')
        if bpm is not None and (type(bpm) is not int or not 1 <= bpm <= 2147483647):
            raise BadRequest('El BPM debe ser un entero positivo o null.')
        values['bpm'] = bpm
        values['letra_acordes'] = values['letra_acordes'].replace('\r\n', '\n').replace('\r', '\n')
        return values

    columns = 'id, titulo, tono_base, bpm, compas, estilo, letra_acordes, UNIX_TIMESTAMP(updated_at) AS last_updated'

    @app.post('/api/auth/login')
    def login():
        data = json_object()
        email, password = data.get('email'), data.get('password')
        if not isinstance(email, str) or not email.strip() or not isinstance(password, str) or not password:
            return jsonify(message='Correo y contraseña requeridos.'), 400
        session.clear()
        with cursor() as cur:
            cur.execute('SELECT id, nombre, email, password_hash FROM usuarios WHERE LOWER(email) = %s LIMIT 1',
                        (email.strip().lower(),))
            user = cur.fetchone()
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify(message='Credenciales incorrectas.'), 401
        if user['id'] not in app.config['ADMIN_USER_IDS']:
            return jsonify(message='No tienes permisos de administrador.'), 403
        session['user_id'] = user['id']
        session.permanent = True
        return jsonify(message='Inicio de sesión exitoso', user={key: user[key] for key in ['id', 'nombre', 'email']})

    @app.post('/api/auth/logout')
    def logout():
        session.clear()
        return jsonify(message='Sesión cerrada.')

    @app.get('/api/setlist')
    def get_setlist():
        with cursor() as cur:
            cur.execute('''SELECT c.id, s.orden, c.titulo, c.tono_base, c.bpm, c.compas,
                c.estilo, c.letra_acordes, UNIX_TIMESTAMP(c.updated_at) AS last_updated
                FROM setlist s INNER JOIN canciones c ON s.cancion_id = c.id ORDER BY s.orden''')
            songs = cur.fetchall()
        return jsonify(setlist=songs, count=len(songs))

    @app.get('/api/canciones')
    @admin_required
    def get_songs():
        with cursor() as cur:
            cur.execute(f'SELECT {columns} FROM canciones ORDER BY titulo, id')
            songs = cur.fetchall()
        return jsonify(canciones=songs, count=len(songs))

    @app.post('/api/canciones')
    @admin_required
    def create_song():
        song = song_data()
        with write_transaction() as cur:
            cur.execute('''INSERT INTO canciones
                (titulo, tono_base, bpm, compas, estilo, letra_acordes, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)''',
                tuple(song[key] for key in ['titulo', 'tono_base', 'bpm', 'compas', 'estilo', 'letra_acordes']))
            song_id = cur.lastrowid
        return jsonify(message='Canción creada.', id=song_id), 201

    @app.put('/api/canciones/<int:song_id>')
    @admin_required
    def update_song(song_id):
        from werkzeug.exceptions import NotFound
        song = song_data()
        with write_transaction() as cur:
            cur.execute('SELECT id FROM canciones WHERE id = %s', (song_id,))
            if cur.fetchone() is None:
                raise NotFound('Canción no encontrada.')
            cur.execute('''UPDATE canciones SET titulo=%s, tono_base=%s, bpm=%s,
                compas=%s, estilo=%s, letra_acordes=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s''',
                tuple(song[key] for key in ['titulo', 'tono_base', 'bpm', 'compas', 'estilo', 'letra_acordes']) + (song_id,))
        return jsonify(message='Canción actualizada.', id=song_id)

    @app.delete('/api/canciones/<int:song_id>')
    @admin_required
    def delete_song(song_id):
        from werkzeug.exceptions import NotFound
        with write_transaction() as cur:
            cur.execute('SELECT id FROM canciones WHERE id = %s', (song_id,))
            if cur.fetchone() is None:
                raise NotFound('Canción no encontrada.')
            cur.execute('DELETE FROM setlist WHERE cancion_id = %s', (song_id,))
            cur.execute('DELETE FROM canciones WHERE id = %s', (song_id,))
        return jsonify(message='Canción eliminada.')

    @app.post('/api/setlist')
    @admin_required
    def save_setlist():
        from werkzeug.exceptions import BadRequest
        ids = json_object().get('canciones_ids')
        if not isinstance(ids, list) or len(ids) > 500 or any(type(value) is not int or value <= 0 or value > 2147483647 for value in ids):
            raise BadRequest('canciones_ids debe ser una lista de IDs enteros positivos (máximo 500).')
        if len(set(ids)) != len(ids):
            raise BadRequest('No repitas canciones en el setlist.')
        with write_transaction() as cur:
            if ids:
                placeholders = ','.join(['%s'] * len(ids))
                cur.execute(f'SELECT id FROM canciones WHERE id IN ({placeholders})', tuple(ids))
                if {row['id'] for row in cur.fetchall()} != set(ids):
                    raise BadRequest('Una o más canciones ya no existen. Actualiza el catálogo.')
            cur.execute('DELETE FROM setlist')
            if ids:
                cur.executemany('INSERT INTO setlist (cancion_id, orden) VALUES (%s, %s)',
                                [(song_id, order) for order, song_id in enumerate(ids, start=1)])
        return jsonify(message='Setlist guardado.', count=len(ids))

    return app
