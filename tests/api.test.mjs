import test from 'node:test';
import assert from 'node:assert/strict';
import { crearApiSupabase } from '../lib/supabase/api.js';

function fixture({ admin = true, user = { id: 'admin-uuid' }, queryData = [], queryError = null, loginError = null } = {}) {
  const calls = [];
  const result = (data, error = null) => {
    const builder = { then(resolve, reject) { return Promise.resolve({ data, error }).then(resolve, reject); } };
    for (const name of ['select', 'order', 'insert', 'update', 'delete', 'eq', 'single', 'abortSignal']) {
      builder[name] = (...args) => { calls.push([name, ...args]); return builder; };
    }
    return builder;
  };
  const client = {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      signInWithPassword: async (body) => { calls.push(['login', body]); return { data: { user }, error: loginError }; },
      signOut: async () => { calls.push(['logout']); return { error: null }; }
    },
    rpc(name, body) { calls.push(['rpc', name, body]); return result(name === 'es_administrador' ? admin : null); },
    from(table) { calls.push(['from', table]); return result(queryData, queryError); }
  };
  return { api: crearApiSupabase(client), calls };
}

test('login usa Supabase Auth y exige permiso de administrador', async () => {
  const { api, calls } = fixture();
  assert.equal((await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@example.test', password: 'test-only' }) })).user.id, 'admin-uuid');
  assert.equal(calls[0][0], 'login');
  assert.ok(calls.some(([name, rpc]) => name === 'rpc' && rpc === 'es_administrador'));
});

test('rechaza credenciales incorrectas y cierra la sesión de usuarios sin permisos', async () => {
  const invalid = fixture({ loginError: { code: 'invalid_credentials' } });
  await assert.rejects(invalid.api('/api/auth/login', { method: 'POST' }), /incorrectos/);
  const denied = fixture({ admin: false });
  await assert.rejects(denied.api('/api/auth/login', { method: 'POST' }), /administrador/);
  assert.ok(denied.calls.some(([name]) => name === 'logout'));
});

test('setlist público convierte la relación de canciones al formato de las vistas', async () => {
  const { api, calls } = fixture({ user: null, queryData: [{ orden: 1, cancion: { id: 3, titulo: 'Prueba' } }] });
  assert.deepEqual(await api('/api/setlist'), { setlist: [{ id: 3, titulo: 'Prueba', orden: 1 }], count: 1 });
  assert.ok(calls.some(([name, column]) => name === 'order' && column === 'orden'));
  assert.ok(!calls.some(([name]) => name === 'rpc'));
});

test('rechaza escrituras y acceso al catálogo sin sesión o permisos', async () => {
  for (const config of [{ user: null }, { admin: false }]) {
    const { api, calls } = fixture(config);
    for (const [ruta, method] of [['/api/canciones', 'GET'], ['/api/canciones', 'POST'], ['/api/canciones/3', 'PUT'], ['/api/canciones/3', 'DELETE'], ['/api/setlist', 'POST']]) {
      await assert.rejects(api(ruta, { method }));
    }
    assert.ok(!calls.some(([name]) => name === 'from'));
    assert.ok(!calls.some(([name, rpc]) => name === 'rpc' && rpc === 'guardar_setlist'));
  }
});

test('guardar setlist usa una única transacción RPC y admite vaciarlo', async () => {
  for (const ids of [[3, 1], []]) {
    const { api, calls } = fixture();
    await api('/api/setlist', { method: 'POST', body: JSON.stringify({ canciones_ids: ids }) });
    assert.ok(calls.some(([name, rpc, body]) => name === 'rpc' && rpc === 'guardar_setlist' && JSON.stringify(body.canciones_ids) === JSON.stringify(ids)));
    assert.ok(!calls.some(([name]) => name === 'delete' || name === 'insert'));
  }
});

test('crear, editar y eliminar conservan el contrato y detectan canciones ausentes', async () => {
  const create = fixture({ queryData: { id: 7 } });
  assert.equal((await create.api('/api/canciones', { method: 'POST', body: JSON.stringify({ titulo: 'Prueba' }) })).id, 7);
  for (const method of ['PUT', 'DELETE']) {
    const { api, calls } = fixture({ queryData: [{ id: 3 }] });
    assert.equal((await api('/api/canciones/3', { method, body: method === 'PUT' ? JSON.stringify({ titulo: 'Editada' }) : undefined })).id, 3);
    assert.ok(calls.some(([name, column, value]) => name === 'eq' && column === 'id' && value === 3));
    await assert.rejects(fixture().api('/api/canciones/99', { method }), /no encontrada/);
  }
});

test('mantiene cancelación y errores de validación de la base', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fixture().api('/api/setlist', { signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(fixture({ queryError: { code: '23514' } }).api('/api/canciones', { method: 'POST' }), /inválido/);
});

test('logout usa Supabase Auth', async () => {
  const { api, calls } = fixture();
  await api('/api/auth/logout', { method: 'POST' });
  assert.deepEqual(calls, [['logout']]);
});
