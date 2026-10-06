'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { solicitarApi } from '@/lib/api';

export default function LoginAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setCargando(true);

    try {
      await solicitarApi('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Necesario para la comunicación de credenciales/cookies
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password 
        }),
      });
      // Redirigir al dashboard
      router.replace('/admin/dashboard');
      router.refresh();

    } catch (err) {
      setErrorMsg(err.message || 'Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/assets/main-wallpaper.jpg')" }}
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-0" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 relative mb-3 flex items-center justify-center">
            <Image 
              src="/assets/cruz.png" 
              alt="Logo Cruz" 
              width={100} 
              height={100} 
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">ET RATZON</h1>
          <p className="text-xs text-cyan-400 font-semibold tracking-widest mt-1">ACCESO DE ADMINISTRADOR</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs text-center font-medium animate-fade-in">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <input 
              type="email" 
              required
              disabled={cargando}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@etratzon.com"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <input 
              type="password" 
              required
              disabled={cargando}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
            />
          </div>

          <button 
            type="submit"
            disabled={cargando}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl border border-cyan-400/40 transition shadow-lg shadow-cyan-950/50 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {cargando ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verificando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* ENLACE AL HOME PAGE DEBAJO DEL FORMULARIO */}
        <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors duration-200 group"
          >
            <svg 
              className="w-4 h-4 transition-transform group-hover:-translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Volver a la página principal
          </Link>
        </div>

      </div>
    </div>
  );
}
