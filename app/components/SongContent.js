import { obtenerSecciones } from '@/lib/song';
import { transponerAcorde } from '@/lib/transposer';

export default function SongContent({ cancion, semitonos = 0, mostrarAcordes = true, tamanoFuente = 'text-base' }) {
  return <div className="space-y-5">
    {obtenerSecciones(cancion).map((seccion, indice) => <section key={indice} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      {seccion.tipo && <h3 className="text-xs font-bold text-cyan-300">{seccion.tipo} {seccion.numero}</h3>}
      {seccion.lineas.map((linea, i) => <div key={i} className={`font-mono whitespace-pre-wrap leading-relaxed ${tamanoFuente}`}>
        {mostrarAcordes ? linea.partes.map((parte, j) => parte.acorde
          ? <span key={j} className="inline-flex flex-col align-bottom"><span className="text-cyan-300 font-bold">{transponerAcorde(parte.acorde, semitonos)}</span><span>{parte.texto || '\u00a0'}</span></span>
          : <span key={j}>{parte.texto}</span>) : linea.letra}
      </div>)}
    </section>)}
  </div>;
}
