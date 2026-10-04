import { esAcorde } from './transposer.js';

const SECTION = /^\[(INTRO|ESTROFA|VERSO|CORO|PRE[- ]?CORO|PUENTE|INTERLUDIO|OUTRO|FINAL)(?:\s+(\d+))?\]$/i;

function leerLinea(texto) {
  const partes = [];
  const agregarTexto = (fragmento) => {
    const anterior = partes[partes.length - 1];
    if (anterior?.acorde) anterior.texto = fragmento;
    else partes.push({ texto: fragmento });
  };
  let inicio = 0;
  for (const match of texto.matchAll(/\[([^\]\n]+)\]/g)) {
    if (!esAcorde(match[1])) continue;
    if (match.index > inicio) agregarTexto(texto.slice(inicio, match.index));
    partes.push({ acorde: match[1].trim() });
    inicio = match.index + match[0].length;
  }
  if (inicio < texto.length) agregarTexto(texto.slice(inicio));
  return { partes, letra: partes.map((p) => p.texto || '').join('') };
}

// Los encabezados delimitan secciones completas; las líneas vacías interiores no las dividen.
// Sin encabezados, las líneas vacías conservan la separación de canciones antiguas.
// Una fila sin corchetes necesita al menos dos acordes para no borrar la palabra "A".
export function parsearCancion(texto = '') {
  const secciones = [];
  let tipo = '';
  let numero = '';
  let lineas = [];
  const cerrar = () => {
    if (lineas.length) secciones.push({ tipo, numero, lineas });
    lineas = [];
  };
  for (const linea of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const encabezado = linea.trim().match(SECTION);
    if (encabezado) {
      cerrar(); tipo = encabezado[1].toUpperCase(); numero = encabezado[2] || '';
    } else if (!linea.trim()) {
      if (!tipo) cerrar();
    } else {
      const palabras = linea.trim().split(/\s+/);
      const soloAcordes = !linea.includes('[') && palabras.length >= 2 && palabras.every(esAcorde);
      lineas.push(soloAcordes ? { letra: '', partes: palabras.flatMap((acorde) => [{ acorde }, { texto: ' ' }]) } : leerLinea(linea));
    }
  }
  cerrar();
  return secciones;
}

export function obtenerSecciones(cancion) {
  if (cancion?.letra_acordes?.trim()) return parsearCancion(cancion.letra_acordes);
  return (cancion?.secciones || []).map((seccion) => ({
    tipo: seccion.tipo || '', numero: seccion.numero || '',
    lineas: (seccion.lineas || []).map((linea) => {
      const acordes = (linea.acordes || '').replace(/\[([^\]]+)\]/g, '$1').trim().split(/\s+/).filter(esAcorde);
      return { letra: linea.letra || '', partes: [
        ...acordes.flatMap((acorde) => [{ acorde }, { texto: ' ' }]),
        { texto: linea.letra || '' }
      ] };
    })
  }));
}

export function bloquesProyeccion(cancion) {
  return seccionesProyeccion(cancion).map((seccion) => seccion.texto)
    .filter(Boolean);
}

export function seccionesProyeccion(cancion) {
  return obtenerSecciones(cancion).map((seccion, indice) => ({
    titulo: seccion.tipo ? `${seccion.tipo} ${seccion.numero}`.trim() : `BLOQUE ${indice + 1}`,
    texto: seccion.lineas.map((linea) => linea.letra.trim()).filter(Boolean).join('\n')
  }));
}

export function validarCancion(datos) {
  const errores = {};
  if (!datos.titulo.trim()) errores.titulo = 'Escribe un título.';
  if (!/^[A-G](?:#|b)?m?$/.test(datos.tono_base.trim())) errores.tono_base = 'Usa un tono como C, Bb o F#m.';
  if (String(datos.bpm).trim() && (!/^\d+$/.test(String(datos.bpm).trim()) || Number(datos.bpm) <= 0 || !Number.isSafeInteger(Number(datos.bpm)))) errores.bpm = 'El BPM debe ser un número entero positivo.';
  if (!/^\d+\/(2|4|8|16)$/.test(datos.compas) || Number(datos.compas.split('/')[0]) <= 0) errores.compas = 'Selecciona un compás válido.';
  if (!['Alabanza', 'Adoración', 'Júbilo'].includes(datos.estilo)) errores.estilo = 'Selecciona un estilo válido.';
  if (!datos.letra_acordes.trim()) errores.letra_acordes = 'Escribe la letra o el cifrado de la canción.';
  return errores;
}
