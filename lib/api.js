import { crearApiSupabase } from './supabase/api.js';

export async function solicitarApi(ruta, opciones = {}) {
  const { createClient } = await import('./supabase/client.js');
  return crearApiSupabase(createClient())(ruta, opciones);
}
