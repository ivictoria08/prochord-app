'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/assets/main-wallpaper.jpg')" }}
    >
      {/* CAPA DE CONTRASTE MÁS LIGERA PARA VER MEJOR EL FONDO */}
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] z-0" />

      {/* ENCABEZADO MÁS GRANDE Y DESTACADO */}
      <header className="relative z-10 flex items-center justify-between px-10 py-8 border-b border-slate-800/40 bg-slate-900/30">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 relative flex items-center justify-center">
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
              TIEMPO FAVORABLE - LIBRO DE ACORDES
            </p>
          </div>
        </div>

        <Link 
          href="/admin/login"
          className="px-5 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700/80 rounded-xl transition shadow-lg"
        >
          Acceso Administrador
        </Link>
      </header>

      {/* CONTENIDO CENTRAL */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 py-12 text-center max-w-4xl mx-auto">
        <span className="text-xs font-bold text-cyan-300 tracking-widest uppercase mb-4 bg-cyan-950/70 px-4 py-1.5 rounded-full border border-cyan-500/40 shadow-lg">
          Plataforma de Control en Vivo
        </span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-lg">
          Selecciona tu área de trabajo
        </h2>
        <p className="text-sm md:text-base text-slate-300 max-w-xl mb-12 drop-shadow">
          Accede a la consola optimizada según tu función durante el servicio de adoración.
        </p>

        {/* TARJETAS DE ROL CON FONDO MÁS TRASLÚCIDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <Link 
            href="/musico"
            className="group p-8 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 hover:border-cyan-400/80 rounded-2xl transition-all duration-300 shadow-2xl backdrop-blur-sm flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-cyan-500/20 border border-cyan-400/40 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition duration-300">
              <Image 
                src="/assets/icons/note-logo.png" 
                alt="Repertorio de Canciones" 
                width={35} 
                height={35} 
                className="object-contain opacity-80 group-hover:opacity-100 transition"
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition">
              Modo Músico
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Consulta el setlist activo, visualiza las letras con acordes y transpón la tonalidad en tiempo real.
            </p>
          </Link>

          <Link 
            href="/proyector"
            className="group p-8 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 hover:border-cyan-400/80 rounded-2xl transition-all duration-300 shadow-2xl backdrop-blur-sm flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-cyan-500/20 border border-cyan-400/40 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition duration-300">
              <Image 
                src="/assets/icons/play-logo.png" 
                alt="Proyector de Letras" 
                width={35} 
                height={35} 
                className="object-contain opacity-80 group-hover:opacity-100 transition"
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition">
              Modo Presentador
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Control de proyección de letras en pantalla limpia, previsualización en vivo y transmisión sincronizada.
            </p>
          </Link>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-400 border-t border-slate-800/40 bg-slate-950/50">
        <p>© 2026 ET RATZON. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}