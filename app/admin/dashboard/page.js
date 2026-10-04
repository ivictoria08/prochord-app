'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { solicitarApi } from '@/lib/api';
import { validarCancion, seccionesProyeccion } from '@/lib/song';
import SongContent from '@/app/components/SongContent';

export default function PanelAdmin() {
  const [tabActiva, setTabActiva] = useState('canciones');
  const [canciones, setCanciones] = useState([]);
  const [cargandoCanciones, setCargandoCanciones] = useState(true);
  const [errorCanciones, setErrorCanciones] = useState('');
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [errorSesion, setErrorSesion] = useState('');

  // ESTADO DEL SETLIST
  const [setlist, setSetlist] = useState([]);
  const [cargandoSetlist, setCargandoSetlist] = useState(false);
  const [setlistDisponible, setSetlistDisponible] = useState(false);
  const [guardandoSetlist, setGuardandoSetlist] = useState(false);
  const [mensajeSetlist, setMensajeSetlist] = useState({ tipo: '', texto: '' });

  // Estado del Modal y Edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [erroresForm, setErroresForm] = useState({});
  const [errorGuardado, setErrorGuardado] = useState('');
  const [cancionEditandoId, setCancionEditandoId] = useState(null); // null = Modo Crear, ID = Modo Editar

  // Campos del formulario
  const [formData, setFormData] = useState({
    titulo: '',
    tono_base: 'C',
    bpm: '',
    compas: '4/4',
    estilo: 'Alabanza',
    letra_acordes: ''
  });

  const router = useRouter();

  // ---------------------------------------------------------------------------
  // FUNCIONES DE CANCIONES (GESTOR)
  // ---------------------------------------------------------------------------
  const obtenerCanciones = useCallback(async (signal) => {
    setCargandoCanciones(true);
    setErrorCanciones('');
    try {
      const data = await solicitarApi('/api/canciones', { signal });
      if (!Array.isArray(data.canciones)) throw new Error('El servidor devolvió un catálogo inválido.');
      if (!signal?.aborted) setCanciones(data.canciones);
    } catch (err) {
      if (!signal?.aborted) setErrorCanciones(err.message);
    } finally {
      if (!signal?.aborted) setCargandoCanciones(false);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErroresForm((prev) => ({ ...prev, [name]: '' }));
    setErrorGuardado('');
  };

  const abrirModalCrear = () => {
    setErroresForm({}); setErrorGuardado('');
    setCancionEditandoId(null);
    setFormData({
      titulo: '',
      tono_base: 'C',
      bpm: '',
      compas: '4/4',
      estilo: 'Alabanza',
      letra_acordes: ''
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (cancion) => {
    setErroresForm({}); setErrorGuardado('');
    setCancionEditandoId(cancion.id);
    setFormData({
      titulo: cancion.titulo || '',
      tono_base: cancion.tono_base || 'C',
      bpm: cancion.bpm ? cancion.bpm.toString() : '',
      compas: cancion.compas || '4/4',
      estilo: cancion.estilo || 'Alabanza',
      letra_acordes: cancion.letra_acordes || ''
    });
    setModalAbierto(true);
  };

  const handleGuardarCancion = async (e) => {
    e.preventDefault();
    if (guardando) return;
    const errores = validarCancion(formData);
    setErroresForm(errores);
    setErrorGuardado('');
    if (Object.keys(errores).length) return;
    setGuardando(true);

    const esEdicion = cancionEditandoId !== null;
    const url = esEdicion 
      ? `/api/canciones/${cancionEditandoId}`
      : '/api/canciones';
    const method = esEdicion ? 'PUT' : 'POST';

    try {
      await solicitarApi(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          titulo: formData.titulo.trim(),
          tono_base: formData.tono_base.trim(),
          letra_acordes: formData.letra_acordes.replace(/\r\n?/g, '\n').trim(),
          bpm: String(formData.bpm).trim() ? Number(formData.bpm) : null
        })
      });


      setModalAbierto(false);
      obtenerCanciones();
    } catch (err) {
      setErrorGuardado(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCancion = async (id, titulo) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${titulo}"?`)) return;

    try {
      await solicitarApi(`/api/canciones/${id}`, { method: 'DELETE' });
      setSetlist((prev) => prev.filter((c) => c.id !== id));
      obtenerCanciones();
    } catch (err) {
      setErrorCanciones(err.message);
    }
  };

  // ---------------------------------------------------------------------------
  // FUNCIONES DEL SETLIST
  // ---------------------------------------------------------------------------
  const cargarSetlist = useCallback(async (signal) => {
    setCargandoSetlist(true);
    setSetlistDisponible(false);
    setMensajeSetlist({ tipo: '', texto: '' });
    try {
      const data = await solicitarApi('/api/setlist', { signal });
      if (!Array.isArray(data.setlist)) throw new Error('El servidor devolvió un setlist inválido.');
      if (!signal?.aborted) {
        setSetlist(data.setlist);
        setSetlistDisponible(true);
      }
    } catch (err) {
      if (!signal?.aborted) setMensajeSetlist({ tipo: 'error', texto: err.message });
    } finally {
      if (!signal?.aborted) setCargandoSetlist(false);
    }
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    queueMicrotask(() => {
      if (controlador.signal.aborted) return;
      obtenerCanciones(controlador.signal);
      if (tabActiva === 'setlists') cargarSetlist(controlador.signal);
    });
    return () => controlador.abort();
  }, [tabActiva, obtenerCanciones, cargarSetlist]);

  const agregarAlSetlist = (cancion) => {
    if (setlist.some((item) => item.id === cancion.id)) return;
    setSetlist([...setlist, cancion]);
  };

  const quitarDelSetlist = (id) => {
    setSetlist(setlist.filter((item) => item.id !== id));
  };

  const moverCancion = (index, direccion) => {
    const nuevoSetlist = [...setlist];
    const targetIndex = index + direccion;

    if (targetIndex < 0 || targetIndex >= nuevoSetlist.length) return;

    const temp = nuevoSetlist[index];
    nuevoSetlist[index] = nuevoSetlist[targetIndex];
    nuevoSetlist[targetIndex] = temp;

    setSetlist(nuevoSetlist);
  };

  const handleGuardarSetlist = async () => {
    if (guardandoSetlist || cargandoSetlist || !setlistDisponible) return;
    setGuardandoSetlist(true);
    setMensajeSetlist({ tipo: '', texto: '' });
    try {
      await solicitarApi('/api/setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canciones_ids: setlist.map((c) => c.id)
        })
      });


      setMensajeSetlist({ tipo: 'éxito', texto: 'Setlist guardado. Actualiza las vistas de músico y proyector para cargar los cambios.' });
    } catch (err) {
      setMensajeSetlist({ tipo: 'error', texto: err.message });
    } finally {
      setGuardandoSetlist(false);
    }
  };

  const handleLogout = async () => {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
    setErrorSesion('');
    try {
      await solicitarApi('/api/auth/logout', { method: 'POST' });
      router.replace('/admin/login');
      router.refresh();
    } catch (err) {
      setErrorSesion(err.message);
    } finally {
      setCerrandoSesion(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/assets/main-wallpaper.jpg')" }}
    >
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] z-0" />

      {/* ENCABEZADO */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-slate-800/40 bg-slate-900/30">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 relative flex items-center justify-center">
            <Image src="/assets/cruz.png" alt="Logo Cruz" width={100} height={100} className="object-contain" />
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-2xl md:text-3xl text-white drop-shadow-md">ET RATZON</h1>
            <p className="text-xs text-cyan-300 font-semibold tracking-widest mt-0.5">PANEL DE ADMINISTRACIÓN Y REPERTORIO</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-200 transition shadow-lg">
            <Image src="/assets/icons/home-logo.png" alt="Inicio" width={18} height={18} className="object-contain" />
            Ir al Inicio
          </Link>
          <button onClick={handleLogout} disabled={cerrandoSesion} className="flex items-center gap-2 px-4 py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-bold transition shadow-lg hover:border-rose-600">
            {cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar Sesión'}
          </button>
        </div>
      </header>
      {errorSesion && <p role="alert" className="relative z-10 p-4 text-rose-300">{errorSesion}</p>}

      {/* CONTENIDO PRINCIPAL */}
      <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-6">
        <div className="flex gap-3 bg-slate-900/40 p-2 rounded-2xl border border-slate-800/80 backdrop-blur-sm w-fit">
          <button onClick={() => setTabActiva('canciones')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${tabActiva === 'canciones' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50' : 'text-slate-400 hover:text-white'}`}>
            Gestor de Canciones
          </button>
          <button onClick={() => setTabActiva('setlists')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${tabActiva === 'setlists' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50' : 'text-slate-400 hover:text-white'}`}>
            Diseñador de Setlist
          </button>
        </div>

        <main className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm flex-1 flex flex-col justify-between">
          {tabActiva === 'canciones' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Catálogo de Alabanzas</h2>
                  <p className="text-xs text-slate-400">Agrega, edita o elimina canciones de la base de datos central.</p>
                </div>
                <button onClick={abrirModalCrear} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl border border-cyan-400/40 transition shadow-lg">
                  + Nueva Canción
                </button>
              </div>

              {errorCanciones && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs rounded-xl">{errorCanciones} <button onClick={() => obtenerCanciones()} disabled={cargandoCanciones} className="ml-3 underline">Reintentar</button> <Link href="/admin/login" className="ml-3 underline">Iniciar sesión</Link></div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800/80 text-cyan-300 uppercase tracking-wider bg-slate-950/40">
                    <tr>
                      <th className="py-3 px-4">Título</th>
                      <th className="py-3 px-4">Tono Base</th>
                      <th className="py-3 px-4">BPM</th>
                      <th className="py-3 px-4">Estilo</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {cargandoCanciones ? (
                      <tr><td colSpan="5" className="py-8 text-center text-slate-400">Cargando canciones...</td></tr>
                    ) : canciones.length === 0 ? (
                      <tr><td colSpan="5" className="py-8 text-center text-slate-400">No hay canciones registradas.</td></tr>
                    ) : (
                      canciones.map((cancion) => (
                        <tr key={cancion.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-bold text-white">{cancion.titulo}</td>
                          <td className="py-3 px-4">{cancion.tono_base}</td>
                          <td className="py-3 px-4">{cancion.bpm || 'N/A'}</td>
                          <td className="py-3 px-4">{cancion.estilo}</td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button onClick={() => abrirModalEditar(cancion)} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200">Editar</button>
                            <button onClick={() => handleEliminarCancion(cancion.id, cancion.titulo)} className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded border border-rose-800/50">Eliminar</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-slate-800/60 pb-4">
                <h2 className="text-xl font-bold text-white">Configuración del Setlist Domingo</h2>
                <p className="text-xs text-slate-400">Selecciona y ordena las canciones para la próxima reunión en vivo.</p>
              </div>

              {mensajeSetlist.texto && (
                <div className={`p-3 rounded-xl text-xs border ${
                  mensajeSetlist.tipo === 'éxito' 
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300' 
                    : 'bg-rose-950/50 border-rose-800/60 text-rose-300'
                }`}>
                  {mensajeSetlist.texto}
                  {mensajeSetlist.tipo === 'error' && <button onClick={() => cargarSetlist()} disabled={cargandoSetlist} className="ml-3 underline">Volver a cargar setlist</button>}
                </div>
              )}

              <fieldset disabled={guardandoSetlist || cargandoSetlist || !setlistDisponible} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* COLUMNA IZQUIERDA: CATÁLOGO DISPONIBLE */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider pb-2 border-b border-slate-800/80">
                    Catálogo Disponible ({canciones.length})
                  </h3>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {cargandoCanciones ? (
                      <p className="text-center py-8 text-xs text-slate-500">Cargando catálogo...</p>
                    ) : canciones.length === 0 ? (
                      <p className="text-center py-8 text-xs text-slate-500">No hay canciones disponibles.</p>
                    ) : (
                      canciones.map((cancion) => {
                        const yaAgregada = setlist.some((item) => item.id === cancion.id);
                        return (
                          <div key={cancion.id} className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 hover:border-slate-700 transition">
                            <div>
                              <p className="font-bold text-white text-xs">{cancion.titulo}</p>
                              <p className="text-[10px] text-slate-400">Tono: {cancion.tono_base} | BPM: {cancion.bpm || 'N/A'} | {cancion.estilo}</p>
                            </div>
                            <button
                              disabled={yaAgregada}
                              onClick={() => agregarAlSetlist(cancion)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                yaAgregada
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                              }`}
                            >
                              {yaAgregada ? 'Agregada' : '+ Agregar'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* COLUMNA DERECHA: ORDEN DEL SETLIST */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                      <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        Orden del Show ({setlist.length} temas)
                      </h3>
                      <button
                        onClick={handleGuardarSetlist}
                        disabled={guardandoSetlist || cargandoSetlist || !setlistDisponible}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl shadow border border-emerald-400/30 transition"
                      >
                        {guardandoSetlist ? 'Guardando...' : 'Guardar Setlist'}
                      </button>
                    </div>

                    <div className="space-y-2 mt-3 max-h-[420px] overflow-y-auto pr-1">
                      {cargandoSetlist ? (
                        <p className="text-center py-8 text-xs text-slate-500">Cargando orden actual...</p>
                      ) : setlist.length === 0 ? (
                        <p className="text-center py-8 text-xs text-slate-500">Agrega canciones desde la lista de la izquierda.</p>
                      ) : (
                        setlist.map((cancion, index) => (
                          <div key={cancion.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-cyan-900/30">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-black flex items-center justify-center">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-bold text-white text-xs">{cancion.titulo}</p>
                                <p className="text-[10px] text-slate-400">Tono: {cancion.tono_base} | BPM: {cancion.bpm || 'N/A'}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moverCancion(index, -1)}
                                disabled={index === 0}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-xs text-slate-300 transition"
                                title="Subir"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => moverCancion(index, 1)}
                                disabled={index === setlist.length - 1}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-xs text-slate-300 transition"
                                title="Bajar"
                              >
                                ▼
                              </button>
                              <button
                                onClick={() => quitarDelSetlist(cancion.id)}
                                className="p-1.5 bg-rose-950/80 text-rose-300 hover:bg-rose-900 rounded text-xs ml-2 border border-rose-800/50 transition"
                                title="Remover"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </fieldset>
            </div>
          )}
        </main>
      </div>

      {/* MODAL REUTILIZABLE (CREAR / EDITAR) */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {cancionEditandoId ? 'Editar Canción' : 'Registrar Nueva Canción'}
              </h3>
              <button disabled={guardando} onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleGuardarCancion} noValidate className="space-y-4">
              <fieldset disabled={guardando} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="titulo" className="block text-xs font-semibold text-slate-300 mb-1">Título *</label>
                  <input type="text" id="titulo" name="titulo" aria-invalid={!!erroresForm.titulo} aria-describedby={erroresForm.titulo ? 'error-titulo' : undefined} required value={formData.titulo} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500" placeholder="Ej. Agnus Dei" />
                  {erroresForm.titulo && <p id="error-titulo" role="alert" className="mt-1 text-xs text-rose-300">{erroresForm.titulo}</p>}
                </div>
                <div>
                  <label htmlFor="tono_base" className="block text-xs font-semibold text-slate-300 mb-1">Tono Base *</label>
                  <input type="text" id="tono_base" name="tono_base" aria-invalid={!!erroresForm.tono_base} aria-describedby={erroresForm.tono_base ? 'error-tono_base' : undefined} required value={formData.tono_base} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500" placeholder="Ej. A, F#m" />
                  {erroresForm.tono_base && <p id="error-tono_base" role="alert" className="mt-1 text-xs text-rose-300">{erroresForm.tono_base}</p>}
                </div>
                <div>
                  <label htmlFor="bpm" className="block text-xs font-semibold text-slate-300 mb-1">BPM</label>
                  <input type="number" min="1" step="1" id="bpm" name="bpm" aria-invalid={!!erroresForm.bpm} aria-describedby={erroresForm.bpm ? 'error-bpm' : undefined} value={formData.bpm} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500" placeholder="Ej. 68" />
                  {erroresForm.bpm && <p id="error-bpm" role="alert" className="mt-1 text-xs text-rose-300">{erroresForm.bpm}</p>}
                </div>
                <div>
                  <label htmlFor="estilo" className="block text-xs font-semibold text-slate-300 mb-1">Estilo</label>
                  <select id="estilo" name="estilo" value={formData.estilo} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500">
                    <option value="Alabanza">Alabanza</option>
                    <option value="Adoración">Adoración</option>
                    <option value="Júbilo">Júbilo</option>
                  </select>
                  {erroresForm.estilo && <p role="alert" className="text-xs text-rose-300">{erroresForm.estilo}</p>}
                </div>
                <div>
                  <label htmlFor="compas" className="block text-xs font-semibold text-slate-300 mb-1">Compás</label>
                  <select id="compas" name="compas" value={formData.compas} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    {['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'].includes(formData.compas) ? null : <option value={formData.compas}>{formData.compas}</option>}
                    {['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'].map((compas) => <option key={compas} value={compas}>{compas}</option>)}
                  </select>
                  {erroresForm.compas && <p role="alert" className="text-xs text-rose-300">{erroresForm.compas}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="letra_acordes" className="block text-xs font-semibold text-slate-300 mb-1">Letra y Cifrado *</label>
                <textarea id="letra_acordes" name="letra_acordes" aria-invalid={!!erroresForm.letra_acordes} aria-describedby={erroresForm.letra_acordes ? 'error-letra_acordes' : undefined} required rows={6} value={formData.letra_acordes} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500" placeholder="[A]Aleluya..." />
                  {erroresForm.letra_acordes && <p id="error-letra_acordes" role="alert" className="mt-1 text-xs text-rose-300">{erroresForm.letra_acordes}</p>}
              </div>

              <p className="text-xs text-slate-400">Escribe acordes entre corchetes, como [C]letra [G]letra. Usa [ESTROFA 1] o [CORO] para iniciar cada sección. Las líneas vacías dentro de una sección no la dividen.</p>
              <details className="rounded-xl border border-slate-800 p-4">
                <summary className="cursor-pointer text-sm text-cyan-300">Previsualizar canción</summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div><h4 className="mb-2 font-bold text-sm">Vista músico</h4><SongContent cancion={formData} /></div>
                  <div><h4 className="mb-2 font-bold text-sm">Bloques del proyector</h4>
                    {seccionesProyeccion(formData).map((seccion, i) => <section key={i} className="mb-3 p-4 bg-black rounded-xl"><h5 className="mb-3 text-xs font-bold text-cyan-300">{seccion.titulo}</h5><p className="whitespace-pre-wrap text-center font-sans leading-relaxed">{seccion.texto || 'Sección instrumental · pantalla en negro'}</p></section>)}
                    {!seccionesProyeccion(formData).length && <p className="text-xs text-slate-400">No hay letra para proyectar.</p>}
                  </div>
                </div>
              </details>
              {errorGuardado && <p role="alert" className="text-sm text-rose-300">{errorGuardado}</p>}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition">Cancelar</button>
                <button type="submit" disabled={guardando} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl border border-cyan-400/40 transition shadow-lg">
                  {guardando ? 'Guardando...' : (cancionEditandoId ? 'Actualizar Canción' : 'Guardar Canción')}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
