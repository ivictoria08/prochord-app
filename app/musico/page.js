'use client';
import { useState } from 'react';
import Link from 'next/link';
import { transponerAcorde } from '@/lib/transposer';
import SongContent from '@/app/components/SongContent';
import useSetlist from '@/app/hooks/useSetlist';

export default function VistaMusico() {
  const { canciones, cancionSeleccionada, setCancionSeleccionada, cargando, error, recargar } = useSetlist();
  // Estados de control de la vista
  const [semitonos, setSemitonos] = useState(0);
  const [tamanoFuente, setTamanoFuente] = useState('text-base'); // text-sm, text-base, text-lg
  const [mostrarAcordes, setMostrarAcordes] = useState(true);


  const seleccionarCancion = (cancion) => {
    setCancionSeleccionada(cancion);
    setSemitonos(0); // Reiniciar transporte al cambiar de canción
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* 1. BARRA SUPERIOR DE CONTROL */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-10 shrink-0">
        <div className="flex items-center space-x-4">
          <Link href="/" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition text-slate-300">
            ← Volver al Inicio
          </Link>
          <h1 className="text-xl font-extrabold text-white tracking-wide hidden sm:block">
            VISTA MÚSICO
          </h1>
        </div>

        {/* SELECTOR DE CANCIÓN Y BOTÓN REFRESH */}
        <div className="flex-1 max-w-md flex items-center gap-2">
          <select
            value={cancionSeleccionada?.id || ''}
            onChange={(e) => {
              const encontrada = canciones.find(c => String(c.id) === e.target.value);
              if (encontrada) seleccionarCancion(encontrada);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
          >
            {canciones.map((c, idx) => (
              <option key={c.id} value={c.id}>
                {idx + 1}. {c.titulo} ({c.tono_base})
              </option>
            ))}
          </select>

          {/* BOTÓN PARA LIMPIAR CACHÉ / RECARGAR EN VIVO */}
          <button
            onClick={() => recargar()}
            disabled={cargando}
            title="Recargar setlist desde el servidor"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-cyan-400 hover:text-cyan-300 transition disabled:opacity-50 shrink-0"
          >
            <span className={`inline-block ${cargando ? 'animate-spin' : ''}`}>🔄</span>
          </button>
        </div>

        <button onClick={() => setMostrarAcordes((prev) => !prev)} aria-pressed={mostrarAcordes} className="px-3 py-2 bg-slate-800 rounded-xl text-xs text-cyan-300">
          {mostrarAcordes ? 'Ocultar acordes' : 'Mostrar acordes'}
        </button>
        {/* CONTROLES DE TRANSPOSICIÓN Y FUENTE */}
        <div className="flex items-center gap-3">
          
          {/* CONTROL DE TONO */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setSemitonos((prev) => prev - 1)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg text-sm"
            >
              -
            </button>
            <div className="px-3 text-center min-w-[70px]">
              <span className="text-xs text-slate-400 block">TONO</span>
              <span className="text-sm font-extrabold text-white">{transponerAcorde(cancionSeleccionada?.tono_base || 'C', semitonos)}</span>
            </div>
            <button
              onClick={() => setSemitonos((prev) => prev + 1)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg text-sm"
            >
              +
            </button>
          </div>

          {/* CONTROL TAMAÑO DE TEXTO */}
          <div className="hidden md:flex bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setTamanoFuente('text-sm')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg ${tamanoFuente === 'text-sm' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
            >
              A-
            </button>
            <button
              onClick={() => setTamanoFuente('text-base')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg ${tamanoFuente === 'text-base' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
            >
              A
            </button>
            <button
              onClick={() => setTamanoFuente('text-lg')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg ${tamanoFuente === 'text-lg' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
            >
              A+
            </button>
          </div>
        </div>
      </header>

      {error && <div role="alert" className="p-4 text-rose-300 bg-rose-950/50">{error} <button onClick={recargar} disabled={cargando} className="underline ml-3">Reintentar</button></div>}
      {/* 2. BARRA DE INFORMACIÓN DE CANCIÓN */}
      {cancionSeleccionada && (
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex gap-4">
            <span>BPM: <strong className="text-white">{cancionSeleccionada.bpm || 'N/A'}</strong></span>
            <span>COMPÁS: <strong className="text-white">{cancionSeleccionada.compas || '4/4'}</strong></span>
            <span>ESTILO: <strong className="text-white">{cancionSeleccionada.estilo}</strong></span>
          </div>
          {semitonos !== 0 && (
            <button
              onClick={() => setSemitonos(0)}
              className="text-rose-400 hover:underline font-semibold"
            >
              Restablecer Tono Original ({cancionSeleccionada.tono_base})
            </button>
          )}
        </div>
      )}

      {/* 3. ÁREA DE CONTENIDO PRINCIPAL CON SCROLL INDEPENDIENTE */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950">
        {cargando ? (
          <div className="text-center py-20 text-slate-400">Cargando setlist musical...</div>
        ) : error && !cancionSeleccionada ? (
          <div className="text-center py-20 text-slate-400">No se pudo cargar el setlist.</div>
        ) : !cancionSeleccionada ? (
          <div className="text-center py-20 text-slate-400">No hay canciones guardadas en el setlist actual.</div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 pb-16">
            
            {/* ENCABEZADO TITULO */}
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-3xl font-black text-white">{cancionSeleccionada.titulo}</h2>
            </div>

            <SongContent cancion={cancionSeleccionada} semitonos={semitonos} mostrarAcordes={mostrarAcordes} tamanoFuente={tamanoFuente} />
          </div>
        )}
      </main>
    </div>
  );
}
