'use client';
import { useLayoutEffect, useRef } from 'react';

// Ajusta la sección completa al área disponible, sin recortar ni desplazar la letra.
export default function ProjectionText({ texto }) {
  const contenedor = useRef(null);
  const parrafo = useRef(null);
  useLayoutEffect(() => {
    const area = contenedor.current;
    const textoElemento = parrafo.current;
    const ajustar = () => {
      let minimo = 1;
      let maximo = Math.min(96, area.clientHeight / 4);
      for (let i = 0; i < 12; i++) {
        const tamano = (minimo + maximo) / 2;
        textoElemento.style.fontSize = `${tamano}px`;
        if (textoElemento.scrollHeight <= area.clientHeight && textoElemento.scrollWidth <= area.clientWidth) minimo = tamano;
        else maximo = tamano;
      }
      textoElemento.style.fontSize = `${minimo}px`;
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(area);
    return () => observador.disconnect();
  }, [texto]);
  return <div ref={contenedor} className="w-full h-full min-h-0 flex items-center justify-center overflow-hidden">
    <p ref={parrafo} className="w-full text-center text-white font-semibold leading-[1.35] whitespace-pre-wrap break-words" style={{ fontSize: 'clamp(16px, 4vw, 96px)' }}>{texto}</p>
  </div>;
}
