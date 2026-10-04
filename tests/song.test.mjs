import test from 'node:test';
import assert from 'node:assert/strict';
import { transponerAcorde, transponerTexto, esAcorde } from '../lib/transposer.js';
import { parsearCancion, bloquesProyeccion, obtenerSecciones, seccionesProyeccion, validarCancion } from '../lib/song.js';

test('transpone bemoles, extensiones y ambas notas de un acorde con bajo', () => {
  assert.equal(transponerAcorde('Bb', 2), 'C');
  assert.equal(transponerAcorde('Dbm', 2), 'Ebm');
  assert.equal(transponerAcorde('Cmaj7', 2), 'Dmaj7');
  assert.equal(transponerAcorde('C/E', 2), 'D/F#');
  assert.equal(transponerAcorde('Bb/D', -2), 'Ab/C');
  assert.equal(transponerAcorde('C7sus4', 1), 'C#7sus4');
  assert.equal(transponerAcorde('C7b9', 2), 'D7b9');
});

test('la transposición admite desplazamientos mayores que una octava', () => {
  assert.equal(transponerAcorde('C', -25), 'B');
  assert.equal(transponerAcorde('C', 26), 'D');
  assert.equal(transponerAcorde('Bb', 0), 'Bb');
});

test('preserva encabezados y texto que no es un acorde', () => {
  assert.equal(esAcorde('CORO'), false);
  assert.equal(esAcorde('Do'), false);
  assert.equal(transponerTexto('[CORO]\n[C]Una [G/B]voz [indicación]', 2), '[CORO]\n[D]Una [A/C#]voz [indicación]');
});

const letra = '[ESTROFA 1]\r\n[C]Hoy [G]cantamos\r\nA una voz\r\n\r\n[CORO]\r\n[Bb]Una canción\r\n\r\n[F]Otra frase';

test('separa secciones y bloques con saltos Windows y conserva la letra completa', () => {
  const secciones = parsearCancion(letra);
  assert.equal(secciones.length, 2);
  assert.equal(secciones[0].tipo, 'ESTROFA');
  assert.equal(secciones[0].numero, '1');
  assert.equal(secciones[0].lineas[0].partes[0].texto, 'Hoy ');
  assert.deepEqual(bloquesProyeccion({ letra_acordes: letra }), ['Hoy cantamos\nA una voz', 'Una canción\nOtra frase']);
});

test('no proyecta encabezados ni filas instrumentales y conserva instrucciones desconocidas', () => {
  assert.deepEqual(bloquesProyeccion({ letra_acordes: '[INTRO]\n[C] [G]\n\n[CORO]\n[C]Canta [G]hoy\n[repetir]' }), ['Canta hoy\n[repetir]']);
  assert.deepEqual(bloquesProyeccion({ letra_acordes: 'C G Am F\nCantamos juntos' }), ['Cantamos juntos']);
  assert.deepEqual(bloquesProyeccion({ letra_acordes: 'A\nUna voz' }), ['A\nUna voz']);
});

test('el texto original tiene prioridad sobre secciones antiguas', () => {
  const cancion = { letra_acordes: '[C]Letra actual', secciones: [{ tipo: 'CORO', lineas: [{ letra: 'Antigua' }] }] };
  assert.deepEqual(bloquesProyeccion(cancion), ['Letra actual']);
  assert.equal(obtenerSecciones({ secciones: [{ tipo: 'CORO', lineas: [{ acordes: 'C G/B', letra: 'Cantamos' }] }] })[0].lineas[0].partes[2].acorde, 'G/B');
  assert.deepEqual(bloquesProyeccion({ secciones: [{ lineas: [{ letra: 'Cantamos' }] }] }), ['Cantamos']);
});

const datos = { titulo: 'Una canción', tono_base: 'Bb', bpm: '', compas: '6/8', estilo: 'Alabanza', letra_acordes: letra };
test('acepta canciones válidas con BPM opcional y rechaza campos vacíos o inválidos', () => {
  assert.deepEqual(validarCancion(datos), {});
  assert.deepEqual(validarCancion({ ...datos, tono_base: 'F#m', bpm: '120' }), {});
  for (const bpm of ['0', '-2', '120.5', '1e2', 'abc']) assert.ok(validarCancion({ ...datos, bpm }).bpm);
  assert.ok(validarCancion({ ...datos, titulo: ' ' }).titulo);
  assert.ok(validarCancion({ ...datos, tono_base: 'Do' }).tono_base);
  assert.ok(validarCancion({ ...datos, letra_acordes: '\n ' }).letra_acordes);
  assert.ok(validarCancion({ ...datos, compas: '0/4' }).compas);
});


test('mantiene secciones completas, instrumentales y repeticiones en su orden', () => {
  const texto = '[INTRO]\n[D] [A]\n\n[ESTROFA 1]\n[D]Una frase\n\n[D]Una frase\n\n[CORO]\n[G]Cantamos\n\n[A]Juntos\n\n[CORO]\n[G]Cantamos';
  const secciones = seccionesProyeccion({ letra_acordes: texto });
  assert.deepEqual(secciones.map((s) => s.titulo), ['INTRO', 'ESTROFA 1', 'CORO', 'CORO']);
  assert.deepEqual(secciones.map((s) => s.texto), ['', 'Una frase\nUna frase', 'Cantamos\nJuntos', 'Cantamos']);
  assert.equal(obtenerSecciones({ letra_acordes: texto })[1].lineas.length, 2);
});

test('sin encabezados conserva los bloques anteriores', () => {
  assert.deepEqual(bloquesProyeccion({ letra_acordes: '[C]Una frase\n\n[G]Otra frase' }), ['Una frase', 'Otra frase']);
});
