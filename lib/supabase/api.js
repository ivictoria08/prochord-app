function fallo(error) {
  if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) {
    throw new DOMException('Solicitud cancelada', 'AbortError');
  }
  if (error?.code === '42501') throw new Error('No tienes permisos para esta operación.');
  if (error?.code === '23503') throw new Error('La canción ya no existe. Actualiza el catálogo.');
  if (error?.code === '23514') throw new Error('Revisa los campos de la canción: hay un valor inválido.');
  throw new Error(error?.message || 'No se pudo completar la operación en Supabase.');
}

export function crearApiSupabase(client) {
  const ejecutar = async (query, signal) => {
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError');
    if (error) fallo(error);
    return data;
  };
  const exigirAdmin = async () => {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error('Inicia sesión para realizar esta operación.');
    const admin = await ejecutar(client.rpc('es_administrador'));
    if (!admin) throw new Error('No tienes permisos de administrador.');
  };

  return async (ruta, opciones = {}) => {
    if (opciones.signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError');
    const method = (opciones.method || 'GET').toUpperCase();
    const body = opciones.body ? JSON.parse(opciones.body) : {};
    if (ruta === '/api/auth/login' && method === 'POST') {
      const { data, error } = await client.auth.signInWithPassword(body);
      if (error) {
        if (error.code === 'invalid_credentials') throw new Error('Correo o contraseña incorrectos.');
        fallo(error);
      }
      try { await exigirAdmin(); }
      catch (err) { await client.auth.signOut(); throw err; }
      return { user: data.user, message: 'Inicio de sesión exitoso.' };
    }
    if (ruta === '/api/auth/logout' && method === 'POST') {
      const { error } = await client.auth.signOut();
      if (error) fallo(error);
      return { message: 'Sesión cerrada.' };
    }
    if (ruta === '/api/setlist' && method === 'GET') {
      const filas = await ejecutar(client.from('setlist').select('orden, cancion:canciones!inner(*)').order('orden'), opciones.signal);
      const setlist = filas.map(({ orden, cancion }) => ({ ...cancion, orden }));
      return { setlist, count: setlist.length };
    }
    if (ruta === '/api/setlist' && method === 'POST') {
      await exigirAdmin();
      await ejecutar(client.rpc('guardar_setlist', { canciones_ids: body.canciones_ids }), opciones.signal);
      return { message: 'Setlist guardado.' };
    }
    const match = ruta.match(/^\/api\/canciones(?:\/(\d+))?$/);
    if (!match) throw new Error('Operación de Supabase no reconocida.');
    await exigirAdmin();
    const tabla = client.from('canciones');
    if (method === 'GET' && !match[1]) {
      const canciones = await ejecutar(tabla.select('*').order('titulo').order('id'), opciones.signal);
      return { canciones, count: canciones.length };
    }
    if (method === 'POST' && !match[1]) {
      const cancion = await ejecutar(tabla.insert(body).select('id').single(), opciones.signal);
      return { id: cancion.id, message: 'Canción creada.' };
    }
    if (match[1] && ['PUT', 'DELETE'].includes(method)) {
      const id = Number(match[1]);
      const query = method === 'PUT' ? tabla.update(body) : tabla.delete();
      const filas = await ejecutar(query.eq('id', id).select('id'), opciones.signal);
      if (!filas.length) throw new Error('Canción no encontrada.');
      return { id, message: method === 'PUT' ? 'Canción actualizada.' : 'Canción eliminada.' };
    }
    throw new Error('Operación de Supabase no reconocida.');
  };
}
