const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const PITCHES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CHORD = /^([A-Ga-g](?:#|b)?)((?:maj|min|dim|aug|sus|add|m|M|\d+|[#b]\d+|\+|-)*)(?:\/([A-Ga-g](?:#|b)?))?$/;

export function esAcorde(texto) {
  return typeof texto === 'string' && CHORD.test(texto.trim());
}
function transponerNota(nota, semitonos) {
  const alteracion = nota[1] === '#' ? 1 : nota[1] === 'b' ? -1 : 0;
  const indice = ((PITCHES[nota[0].toUpperCase()] + alteracion + semitonos) % 12 + 12) % 12;
  return (nota.includes('b') ? FLATS : SHARPS)[indice];
}
export function transponerAcorde(acorde, semitonos) {
  const match = typeof acorde === 'string' && acorde.trim().match(CHORD);
  if (!match || !Number.isInteger(semitonos) || semitonos === 0) return acorde;
  const [, nota, extension, bajo] = match;
  return `${transponerNota(nota, semitonos)}${extension}${bajo ? `/${transponerNota(bajo, semitonos)}` : ''}`;
}
// Los encabezados y cualquier otro texto entre corchetes se conservan.
export function transponerTexto(texto, semitonos) {
  return (texto || '').replace(/\[([^\]\n]+)\]/g, (match, acorde) =>
    esAcorde(acorde) ? `[${transponerAcorde(acorde, semitonos)}]` : match
  );
}
