'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { solicitarApi } from '@/lib/api';

export default function useSetlist() {
  const [canciones, setCanciones] = useState([]);
  const [cancionSeleccionada, setCancionSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const solicitud = useRef(null);
  const recargar = useCallback(async () => {
    solicitud.current?.abort();
    const controlador = new AbortController();
    solicitud.current = controlador;
    setCargando(true); setError('');
    try {
      const data = await solicitarApi('/api/setlist', { signal: controlador.signal });
      if (!Array.isArray(data.setlist)) throw new Error('El servidor devolvió un setlist inválido.');
      if (controlador.signal.aborted) return;
      setCanciones(data.setlist);
      setCancionSeleccionada((prev) => data.setlist.find((c) => c.id === prev?.id) || data.setlist[0] || null);
    } catch (err) {
      if (!controlador.signal.aborted) setError(err.message);
    } finally {
      if (!controlador.signal.aborted) setCargando(false);
    }
  }, []);
  useEffect(() => {
    let activo = true;
    queueMicrotask(() => { if (activo) recargar(); });
    return () => { activo = false; solicitud.current?.abort(); };
  }, [recargar]);
  return { canciones, cancionSeleccionada, setCancionSeleccionada, cargando, error, recargar };
}
