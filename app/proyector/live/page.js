'use client';
import { useState, useEffect } from 'react';
import ProjectionText from '@/app/components/ProjectionText';

export default function ProyectorLive() {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    const bc = new BroadcastChannel('proyector_channel');
    bc.onmessage = (e) => {
      if (e.data?.tipo === 'PROYECTAR_TEXTO' && typeof e.data.texto === 'string') {
        setTexto(e.data.texto);
      }
    };
    bc.postMessage({ tipo: 'SOLICITAR_TEXTO' });
    return () => bc.close();
  }, []);

  return (
    <div className="h-dvh w-screen bg-black p-[4vmin] select-none overflow-hidden">
      <ProjectionText texto={texto} />
    </div>
  );
}
