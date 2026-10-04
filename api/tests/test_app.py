import unittest
import sys
from pathlib import Path

import mysql.connector
from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import create_app


PASSWORD_HASH = generate_password_hash('test-password')
ORIGIN = 'https://frontend.example'
SONG = dict(titulo='Canción de prueba', tono_base='Bb', bpm=120, compas='6/8',
            estilo='Alabanza', letra_acordes='[CORO]\r\n[Bb]Una voz')


class FakeCursor:
    def __init__(self, db):
        self.db = db
        self.query = ''
        self.params = ()
        self.lastrowid = 7

    def execute(self, query, params=()):
        self.query, self.params = query, params
        self.db.queries.append((query, params))

    def executemany(self, query, params):
        self.db.queries.append((query, params))
        if self.db.fail_insert:
            raise mysql.connector.Error('Simulated database failure')

    def fetchone(self):
        if 'GET_LOCK' in self.query:
            return {'acquired': self.db.lock_acquired}
        if 'RELEASE_LOCK' in self.query:
            return {'released': 1}
        if 'password_hash' in self.query:
            return self.db.user if self.params[0] == self.db.user['email'] else None
        if 'FROM usuarios' in self.query:
            return {'id': self.params[0]} if self.db.user_exists else None
        if 'FROM canciones' in self.query:
            return {'id': self.params[0]} if self.params[0] in self.db.song_ids else None
        raise AssertionError(f'Consulta no prevista: {self.query}')

    def fetchall(self):
        if 'WHERE id IN' in self.query:
            return [{'id': value} for value in self.params if value in self.db.song_ids]
        return [{'id': 1, **SONG}]

    def close(self):
        self.db.closed_cursors += 1


class FakeConnection:
    def __init__(self):
        self.queries = []
        self.song_ids = {1, 3}
        self.user = dict(id=1, nombre='Admin', email='admin@example.test', password_hash=PASSWORD_HASH)
        self.user_exists = True
        self.fail_insert = False
        self.lock_acquired = 1
        self.commits = self.rollbacks = self.closed_cursors = self.closed_connections = 0
        self.transactions = 0

    def cursor(self, dictionary=False):
        return FakeCursor(self)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def start_transaction(self):
        self.transactions += 1

    def close(self):
        self.closed_connections += 1


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeConnection()
        self.config = dict(TESTING=True, SECRET_KEY='test-only-secret-key-of-at-least-32-characters',
                           ADMIN_USER_IDS={1}, FRONTEND_ORIGINS=[ORIGIN],
                           SESSION_COOKIE_SECURE=True, SESSION_COOKIE_SAMESITE='None')
        self.app = create_app(self.config, connection_factory=lambda: self.db)
        self.client = self.app.test_client()

    def request(self, method, path, **kwargs):
        headers = kwargs.pop('headers', {'Origin': ORIGIN})
        return self.client.open(path, method=method, base_url='https://api.example', headers=headers, **kwargs)

    def login(self):
        return self.request('POST', '/api/auth/login', json=dict(email=' ADMIN@example.test ', password='test-password'))

    def test_setlist_public_and_uncached(self):
        response = self.request('GET', '/api/setlist')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['count'], 1)
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        self.assertEqual(self.db.closed_connections, 1)

    def test_protected_routes_require_real_session(self):
        for method, path in [('GET', '/api/canciones'), ('POST', '/api/canciones'),
                             ('PUT', '/api/canciones/1'), ('DELETE', '/api/canciones/1'),
                             ('POST', '/api/setlist')]:
            self.assertEqual(self.request(method, path, json={}).status_code, 401)
        self.assertEqual(self.db.queries, [])

    def test_login_creates_signed_cookie_and_logout_removes_access(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('password_hash', response.json['user'])
        cookie = response.headers['Set-Cookie']
        for attribute in ['prochord_session=', 'Secure', 'HttpOnly', 'SameSite=None']:
            self.assertIn(attribute, cookie)
        self.assertEqual(self.request('GET', '/api/canciones').status_code, 200)
        self.assertEqual(self.request('POST', '/api/auth/logout').status_code, 200)
        self.assertEqual(self.request('GET', '/api/canciones').status_code, 401)

    def test_wrong_password_and_non_admin_rejected(self):
        response = self.request('POST', '/api/auth/login', json=dict(email='admin@example.test', password='wrong'))
        self.assertEqual(response.status_code, 401)
        self.db.user['id'] = 2
        self.assertEqual(self.login().status_code, 403)
        self.assertEqual(self.request('GET', '/api/canciones').status_code, 401)

    def test_removed_user_loses_access(self):
        self.login()
        self.db.user_exists = False
        self.assertEqual(self.request('GET', '/api/canciones').status_code, 401)
        self.assertEqual(self.request('GET', '/api/canciones').status_code, 401)

    def test_cors_preflight_allows_json_and_untrusted_writes_blocked(self):
        response = self.request('OPTIONS', '/api/canciones', headers={
            'Origin': ORIGIN, 'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['Access-Control-Allow-Origin'], ORIGIN)
        self.assertEqual(response.headers['Access-Control-Allow-Credentials'], 'true')
        self.assertIn('content-type', response.headers['Access-Control-Allow-Headers'].lower())
        for headers in [{}, {'Origin': 'https://untrusted.example'}]:
            self.assertEqual(self.request('POST', '/api/auth/login', headers=headers, json={}).status_code, 403)
        self.assertEqual(self.db.queries, [])

    def test_create_song_uses_parameters_and_normalizes_lines(self):
        self.login()
        song = {**SONG, 'titulo': "  Canción ' literal  "}
        response = self.request('POST', '/api/canciones', json=song)
        self.assertEqual(response.status_code, 201)
        insert = next(item for item in self.db.queries if 'INSERT INTO canciones' in item[0])
        self.assertNotIn("Canción ' literal", insert[0])
        self.assertEqual(insert[1][0], "Canción ' literal")
        self.assertEqual(insert[1][-1], '[CORO]\n[Bb]Una voz')
        self.assertEqual(self.db.transactions, 1)
        self.assertEqual(self.db.commits, 2)

    def test_invalid_song_fields_rejected_before_writing(self):
        self.login()
        for changes in [{'titulo': ' '}, {'tono_base': 'Do'}, {'bpm': -1}, {'bpm': True},
                        {'bpm': 100.5}, {'bpm': '120'}, {'compas': '0/4'},
                        {'estilo': 'unknown'}, {'letra_acordes': []}]:
            response = self.request('POST', '/api/canciones', json={**SONG, **changes})
            self.assertEqual(response.status_code, 400, changes)
        self.assertFalse(any('INSERT' in query for query, _ in self.db.queries))

    def test_invalid_json_returns_400(self):
        self.assertEqual(self.request('POST', '/api/auth/login', json=[]).status_code, 400)
        self.assertEqual(self.request('POST', '/api/auth/login', data='{', content_type='application/json').status_code, 400)

    def test_edit_existing_and_missing_song(self):
        self.login()
        self.assertEqual(self.request('PUT', '/api/canciones/1', json=SONG).status_code, 200)
        self.assertEqual(self.request('PUT', '/api/canciones/99', json=SONG).status_code, 404)

    def test_delete_removes_setlist_reference_before_song(self):
        self.login()
        self.assertEqual(self.request('DELETE', '/api/canciones/3').status_code, 200)
        deletes = [query for query, _ in self.db.queries if query.startswith('DELETE')]
        self.assertEqual(deletes, ['DELETE FROM setlist WHERE cancion_id = %s', 'DELETE FROM canciones WHERE id = %s'])
        self.assertEqual(self.request('DELETE', '/api/canciones/99').status_code, 404)

    def test_save_setlist_preserves_order_and_supports_empty_list(self):
        self.login()
        response = self.request('POST', '/api/setlist', json={'canciones_ids': [3, 1]})
        self.assertEqual(response.status_code, 200)
        insert = next(item for item in self.db.queries if 'INSERT INTO setlist' in item[0])
        self.assertEqual(insert[1], [(3, 1), (1, 2)])
        self.assertEqual(self.request('POST', '/api/setlist', json={'canciones_ids': []}).json['count'], 0)

    def test_invalid_or_missing_ids_never_delete_previous_setlist(self):
        self.login()
        for ids in [[1, 1], [99], [True], ['1'], [-1], None, [1] * 501]:
            self.assertEqual(self.request('POST', '/api/setlist', json={'canciones_ids': ids}).status_code, 400)
        self.assertFalse(any(query == 'DELETE FROM setlist' for query, _ in self.db.queries))

    def test_failed_setlist_insert_rolls_back_and_releases_lock(self):
        self.login()
        self.db.fail_insert = True
        response = self.request('POST', '/api/setlist', json={'canciones_ids': [1]})
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('Simulated', response.json['message'])
        self.assertEqual(self.db.commits, 1)  # No commit de la escritura fallida.
        self.assertGreaterEqual(self.db.rollbacks, 2)
        self.assertTrue(any('RELEASE_LOCK' in query for query, _ in self.db.queries))

    def test_lock_timeout_does_not_write(self):
        self.login()
        self.db.lock_acquired = 0
        self.assertEqual(self.request('POST', '/api/setlist', json={'canciones_ids': [1]}).status_code, 503)
        self.assertFalse(any(query == 'DELETE FROM setlist' for query, _ in self.db.queries))

    def test_startup_rejects_missing_secret_admins_and_wildcard_origin(self):
        for override in [{'SECRET_KEY': ''}, {'ADMIN_USER_IDS': set()}, {'FRONTEND_ORIGINS': ['*']}]:
            with self.assertRaises(RuntimeError):
                create_app({**self.config, **override}, connection_factory=lambda: self.db)

    def test_connection_failure_returns_json_without_exposing_database_details(self):
        def fail():
            raise mysql.connector.Error('secret-database-details')
        app = create_app(self.config, connection_factory=fail)
        response = app.test_client().get('/api/setlist')
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('secret-database-details', response.get_data(as_text=True))


if __name__ == '__main__':
    unittest.main()
