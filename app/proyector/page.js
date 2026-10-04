'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { seccionesProyeccion } from '@/lib/song';
import ProjectionText from '@/app/components/ProjectionText';
import useSetlist from '@/app/hooks/useSetlist';

export default function VistaProyector() {
  const { canciones: setlist, cancionSeleccionada, setCancionSeleccionada, cargando, error, recargar } = useSetlist();
  const [versoActivo, setVersoActivo] = useState('');
  const [seccionActiva, setSeccionActiva] = useState(null);
  const canal = useRef(null);
  const ultimoTexto = useRef('');

  useEffect(() => {
    const bc = new BroadcastChannel('proyector_channel');
    canal.current = bc;
    bc.onmessage = (e) => {
      if (e.data?.tipo === 'SOLICITAR_TEXTO') {
        bc.postMessage({ tipo: 'PROYECTAR_TEXTO', texto: ultimoTexto.current });
      }
    };
    return () => { canal.current = null; bc.close(); };
  }, []);
  const proyectar = (texto, indice = null) => {
    setSeccionActiva(indice);
    ultimoTexto.current = texto;
    setVersoActivo(texto);
    canal.current?.postMessage({ tipo: 'PROYECTAR_TEXTO', texto });
  };

  return (
    <div 
      className="min-h-dvh lg:h-dvh lg:overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/assets/main-wallpaper.jpg')" }}
    >
      {/* CAPA DE CONTRASTE */}
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] z-0" />

      {/* ENCABEZADO */}
      <header className="relative z-10 shrink-0 flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 py-4 border-b border-slate-800/40 bg-slate-900/30">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 relative flex items-center justify-center">
            <Image 
              src="/assets/cruz.png" 
              alt="Logo Cruz" 
              width={100} 
              height={100} 
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-2xl md:text-3xl text-white drop-shadow-md">
              ET RATZON
            </h1>
            <p className="text-xs text-cyan-300 font-semibold tracking-widest mt-0.5">
              CONSOLA DE PROYECCIÓN EN VIVO
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/proyector/live" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl bg-cyan-700 text-white text-xs">Abrir pantalla en vivo</Link>
          <button onClick={recargar} disabled={cargando} className="px-3 py-2 rounded-xl bg-slate-800 text-xs">{cargando ? 'Cargando...' : 'Actualizar setlist'}</button>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Control de proyección
          </span>
        </div>
      </header>

      {error && <div role="alert" className="relative z-10 p-4 text-rose-300">{error} <button onClick={recargar} disabled={cargando} className="underline ml-3">Reintentar</button></div>}
      {/* CUERPO PRINCIPAL */}
      <div className="relative z-10 flex flex-col lg:flex-row flex-1 min-h-0 p-4 gap-4">
        
        {/* NAVEGACIÓN Y SETLIST */}
        <aside className="w-full lg:w-60 xl:w-64 shrink-0 flex flex-col min-h-0 gap-3">
          <nav aria-label="Navegación de proyección" className="flex items-center gap-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-sm">
            <Link 
              href="/"
              title="Volver al Menú Principal"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-cyan-600 border border-slate-700/80 flex items-center justify-center transition group"
            >
              <Image 
                src="/assets/icons/home-logo.png" 
                alt="Inicio" 
                width={24} 
                height={24} 
                className="object-contain opacity-80 group-hover:opacity-100 transition"
              />
            </Link>

            <button 
              type="button"
              aria-label="Modo proyector actual"
              aria-current="page"
              title="Modo Proyector"
              className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-md"
            >
              <Image 
                src="/assets/icons/play-logo.png" 
                alt="" 
                width={24} 
                height={24} 
                className="object-contain opacity-80 group-hover:opacity-100 transition"
              />
            </button>
          </nav>

        {/* SETLIST */}
        <section className="min-h-0 lg:flex-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-sm">
          <h2 className="text-xs font-bold text-slate-300 tracking-wider">SETLIST DE PROYECCIÓN</h2>
          <div className="flex flex-col gap-2.5 min-h-0 overflow-y-auto max-h-48 lg:max-h-none p-1 -m-1">
            {setlist.map((cancion) => {
              const esActiva = cancionSeleccionada?.id === cancion.id;
              return (
                <button
                  type="button"
                  aria-pressed={esActiva}
                  key={cancion.id}
                  onClick={() => {
                    setCancionSeleccionada(cancion);
                    proyectar('');
                  }}
                  className={`shrink-0 text-left p-3.5 rounded-xl border cursor-pointer transition ${
                    esActiva
                      ? 'bg-slate-800/90 border-cyan-400/80 shadow-lg shadow-cyan-950/60'
                      : 'bg-slate-900/30 border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <h3 className="font-semibold text-sm text-white">{cancion.orden}. {cancion.titulo}</h3>
                  <p className="text-xs text-slate-400 mt-1">{cancion.estilo} | {cancion.bpm} BPM</p>
                </button>
              );
            })}
          </div>
        </section>
        </aside>

        {/* PANEL DE CONTROL DE LETRAS */}
        <main className="flex-1 min-w-0 min-h-0 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 xl:p-6 flex flex-col overflow-hidden backdrop-blur-sm">
          {cancionSeleccionada ? (
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="shrink-0 pb-3 border-b border-slate-800/60 flex flex-wrap gap-3 justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">{cancionSeleccionada.titulo}</h2>
                  <p className="text-xs text-slate-400">Selecciona una sección completa para enviarla a la pantalla en vivo</p>
                </div>
                <button 
                  onClick={() => proyectar('')}
                  className="px-4 py-2 bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold rounded-xl border border-rose-500/40 transition"
                >
                  Limpiar Pantalla 🚫
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4 xl:gap-6 flex-1 min-h-0 min-w-0">
                
                {/* BLOQUES DE LETRA LIMPIA */}
                <div aria-label="Secciones de la canción" tabIndex={0} className="min-h-0 min-w-0 max-h-[55dvh] lg:max-h-none overflow-y-auto overscroll-contain p-2 space-y-3 rounded-xl [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-cyan-400">
                  {seccionesProyeccion(cancionSeleccionada)
                    .map((seccion, index) => {
                      const soloLetra = seccion.texto;
                      const estaProyectando = seccionActiva === index;

                      return (
                        <button
                          type="button"
                          aria-pressed={estaProyectando}
                          key={index}
                          onClick={() => proyectar(soloLetra, index)}
                          className={`w-full text-left p-4 rounded-xl border cursor-pointer transition-colors text-sm whitespace-pre-line break-words leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                            estaProyectando
                              ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-md shadow-cyan-950/60'
                              : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span className="block mb-3 text-xs font-bold text-cyan-300">{seccion.titulo}</span>
                          <span className="block">{soloLetra || 'Sección instrumental · pantalla en negro'}</span>
                        </button>
                      );
                    })}
                </div>

                {/* PREVISUALIZACIÓN PANTALLA EN VIVO */}
                <div className="order-first lg:order-none min-w-0 bg-slate-950 border border-slate-800 rounded-2xl p-4 pt-14 aspect-video w-full self-start max-h-full flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                  <span className="absolute top-4 left-4 text-[10px] font-bold text-cyan-400 tracking-widest bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-500/40">
                    PANTALLA EN VIVO
                  </span>
                  {versoActivo ? (
                    <ProjectionText texto={versoActivo} />
                  ) : (
                    <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                      [ Pantalla en Negro / Sin Contenido ]
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 text-slate-400">{cargando ? 'Cargando setlist...' : error ? 'No se pudo cargar el setlist.' : 'No hay canciones en el setlist. Agrégalas desde el administrador.'}</div>
          )}
        </main>
      </div>
    </div>
  );
}
