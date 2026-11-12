#!/usr/bin/env node
/**
 * Narración con voz de los pasos de los ejercicios «uno por uno», con ElevenLabs.
 *
 * La voz dice cada paso tal como está en la app: el título y el texto (y la frase, si el paso
 * la tiene). No dice las aclaraciones ni las lecturas, que son notas de la revisión. Decidido
 * por el usuario el 2026-11-12.
 *
 * Uso:
 *   npm run voz                                   revisar: escribe docs/voz/guion.md (no llama a ElevenLabs)
 *   npm run voz -- --generar                      genera los audios que falten o hayan cambiado
 *   npm run voz -- --generar --ejercicio <id>     solo un ejercicio (p. ej. recorrido-por-chakras)
 *   npm run voz -- --generar --forzar             vuelve a generar aunque no hayan cambiado
 *
 * Los datos de ElevenLabs se leen de `.env` (ver `.env.example`). La clave nunca llega al
 * navegador: solo la usa este script. Los audios quedan en public/voz/<ejercicio>/<paso>.mp3 y
 * su duración en src/contenido/voz.json, que la app usa para sincronizarlos con la animación.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EJERCICIOS } from '../../src/contenido/ejercicios.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFIESTO = join(RAIZ, 'src', 'contenido', 'voz.json');
const GUION = join(RAIZ, 'docs', 'voz', 'guion.md');
/** Español narrado, con la velocidad un poco más lenta: unos 13 caracteres por segundo. */
const CARACTERES_POR_SEGUNDO = 13;
/** Precio por API de los modelos multilingües (eleven_v4 y eleven_multilingual_v2), leído el 2026-11-12. */
const USD_POR_MIL = 0.08;

const args = process.argv.slice(2);
const generar = args.includes('--generar');
const forzar = args.includes('--forzar');
const soloEjercicio = args.includes('--ejercicio') ? args[args.indexOf('--ejercicio') + 1] : null;

// ── El texto que dice la voz ─────────────────────────────────────────────

const mayusculaInicial = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** Las frases están en mayúsculas en la app: la voz las dice en tono normal. */
const fraseNatural = (f) => mayusculaInicial(f.toLocaleLowerCase('es'));
const sinTildes = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Lo que conviene leer distinto de como se escribe (símbolos y abreviaturas). */
const LECTURAS = [
  // Distancias y tiempos.
  [/\ba\s+(\d+)\s*[–-]\s*(\d+)\s*cm\b/g, 'a una distancia de $1 a $2 centímetros'],
  [/(\d+)\s*[–-]\s*(\d+)\s*cm\b/g, 'de $1 a $2 centímetros'],
  [/\b1\s*cm\b/g, 'un centímetro'],
  [/(\d+(?:,\d+)?)\s*cm\b/g, '$1 centímetros'],
  [/\b1\s*s\b/g, 'un segundo'],
  [/(\d+(?:,\d+)?)\s*s\b/g, '$1 segundos'],
  [/\b1\s*m\b/g, 'un metro'],
  [/(\d+(?:,\d+)?)\s*m\b/g, '$1 metros'],
  // Ángulos: «a 90°» se decía mal (corregido por el usuario el 2026-11-12).
  [/\b1\s*°/g, 'un grado'],
  [/(\d+)\s*°/g, '$1 grados'],
  // Fracciones de la línea del brazo.
  [/¼/g, 'un cuarto'],
  [/½/g, 'la mitad'],
  [/¾/g, 'tres cuartos'],
  // Secuencias (izquierda → derecha → …) y separadores.
  [/\s*→\s*/g, ', '],
  [/\s+·\s+/g, ', '],
  [/n\.º\s*/g, 'número '],
  // Cargas de energía: − de la tierra, + del cielo (confirmado por el usuario el 2026-11-12).
  [/energía\s*−/g, 'energía negativa'],
  [/energía\s*\+/g, 'energía positiva'],
];

/** Cómo se dicen algunos símbolos (se listan en el guion). */
const LECTURAS_DE_SIMBOLOS = [
  ['90°', '«90 grados»'],
  ['5–10 cm', '«a una distancia de 5 a 10 centímetros»'],
  ['5 s', '«5 segundos»'],
  ['¼, ½, ¾', '«un cuarto, la mitad, tres cuartos»'],
  ['izquierda → derecha', '«izquierda, derecha»'],
  ['energía −', '«energía negativa» (confirmado por el usuario)'],
  ['energía +', '«energía positiva» (confirmado por el usuario)'],
];

function paraVoz(s) {
  let r = s;
  for (const [re, rep] of LECTURAS) r = r.replace(re, rep);
  return r.replace(/\s{2,}/g, ' ').trim();
}

/** Solo las palabras, para comparar dos textos sin tildes, mayúsculas ni puntuación. */
const soloPalabras = (s) => sinTildes(s).replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Lo que dice la voz en un paso: el título y el texto, y la frase si el texto no la incluye.
 * Si el texto solo repite el título (09, paso 5: «Decir la frase.»), se dice una vez.
 */
function textoDelPaso(ej, paso, i) {
  const partes = [];
  if (i === 0) partes.push(`${paraVoz(ej.titulo)}.`);
  partes.push(`Paso ${i + 1}. ${paraVoz(paso.titulo)}.`);
  if (soloPalabras(paso.texto) !== soloPalabras(paso.titulo)) partes.push(paraVoz(paso.texto));
  if (paso.frase && !sinTildes(paso.texto).includes(sinTildes(paso.frase))) partes.push(`La frase es: «${fraseNatural(paso.frase)}».`);
  return partes.join(' ');
}

const unoPorUno = EJERCICIOS.filter((e) => e.origen === 'revision');
if (soloEjercicio && !unoPorUno.some((e) => e.id === soloEjercicio)) {
  console.error(`No hay un ejercicio «uno por uno» con id «${soloEjercicio}».`);
  process.exit(1);
}

/** Todos los ejercicios (para el guion) y los que se generan (todos, o el pedido con --ejercicio). */
const todas = unoPorUno.map((ej) => ({
  ej,
  pasos: ej.pasos.map((paso, i) => ({ paso, i, texto: textoDelPaso(ej, paso, i) })),
}));
const narraciones = todas.filter((n) => !soloEjercicio || n.ej.id === soloEjercicio);

// ── Revisar: el guion completo, sin llamar a ElevenLabs ──────────────────

function escribirGuion() {
  const total = todas.reduce((a, n) => a + n.pasos.reduce((b, p) => b + p.texto.length, 0), 0);
  const lineas = [
    '# Guion de voz · ejercicios uno por uno',
    '',
    '> Generado por `npm run voz` a partir de los pasos de la app (`src/contenido/ejercicios.ts`). No editar a mano:',
    '> para cambiar lo que dice la voz se cambia el texto del paso y se vuelve a generar.',
    '',
    `**Total:** ${total.toLocaleString('es')} caracteres, unos ${Math.round(total / CARACTERES_POR_SEGUNDO / 60)} minutos de voz.`,
    `Costo por API con los modelos multilingües: unos ${((total / 1000) * USD_POR_MIL).toFixed(2)} USD por pasada completa (1 crédito por carácter en la web).`,
    '',
    '**Cómo dice la voz algunos símbolos:**',
    ...LECTURAS_DE_SIMBOLOS.map(([a, b]) => `- «${a}» se dice ${b}.`),
    '',
  ];
  for (const { ej, pasos } of todas) {
    const car = pasos.reduce((a, p) => a + p.texto.length, 0);
    lineas.push(`## ${String(ej.numero).padStart(2, '0')} · ${ej.titulo}`, '', `${car.toLocaleString('es')} caracteres, unos ${Math.round(car / CARACTERES_POR_SEGUNDO)} s de voz.`, '');
    for (const { paso, i, texto } of pasos) {
      lineas.push(`**Paso ${i + 1} · ${paso.titulo}** (${texto.length} caracteres, unos ${Math.round(texto.length / CARACTERES_POR_SEGUNDO)} s)`, '', `> ${texto}`, '');
    }
  }
  mkdirSync(dirname(GUION), { recursive: true });
  writeFileSync(GUION, lineas.join('\n'));
  console.log(`Guion: ${GUION}`);
  console.log(`${todas.length} ejercicios, ${total.toLocaleString('es')} caracteres (unos ${Math.round(total / CARACTERES_POR_SEGUNDO / 60)} min de voz, unos ${((total / 1000) * USD_POR_MIL).toFixed(2)} USD por API).`);
}

// ── Generar: llama a ElevenLabs y guarda los audios ──────────────────────

function leerConfiguracion() {
  const archivo = join(RAIZ, '.env');
  if (!existsSync(archivo)) throw new Error('Falta el archivo .env (cópialo de .env.example y completa tus datos).');
  process.loadEnvFile(archivo);
  const v = (k, def) => (process.env[k] ?? '').trim() || def;
  const cfg = {
    clave: v('ELEVENLABS_API_KEY'),
    voz: v('ELEVENLABS_VOICE_ID'),
    modelo: v('ELEVENLABS_MODEL_ID', 'eleven_multilingual_v2'),
    formato: v('ELEVENLABS_OUTPUT_FORMAT', 'mp3_44100_128'),
    ajustes: {
      stability: Number(v('ELEVENLABS_STABILITY', '0.55')),
      similarity_boost: Number(v('ELEVENLABS_SIMILARITY_BOOST', '0.75')),
      style: Number(v('ELEVENLABS_STYLE', '0')),
      speed: Number(v('ELEVENLABS_SPEED', '0.95')),
    },
  };
  const faltan = [!cfg.clave && 'ELEVENLABS_API_KEY', !cfg.voz && 'ELEVENLABS_VOICE_ID'].filter(Boolean);
  if (faltan.length) throw new Error(`Completa en .env: ${faltan.join(', ')}.`);
  return cfg;
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedirAudio(cfg, texto, anterior, siguiente) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(cfg.voz)}/with-timestamps?output_format=${cfg.formato}`;
  const cuerpo = {
    text: texto,
    model_id: cfg.modelo,
    voice_settings: cfg.ajustes,
    // Continuidad de entonación entre pasos.
    ...(anterior ? { previous_text: anterior } : {}),
    ...(siguiente ? { next_text: siguiente } : {}),
  };
  for (let intento = 1; intento <= 4; intento++) {
    const res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': cfg.clave, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    if (res.ok) return res.json();
    const detalle = (await res.text()).slice(0, 400);
    // Demasiadas peticiones o servidor ocupado: espera y reintenta.
    if ((res.status === 429 || res.status >= 500) && intento < 4) {
      await espera(2000 * intento);
      continue;
    }
    throw new Error(`ElevenLabs respondió ${res.status}: ${detalle}`);
  }
}

async function generarAudios() {
  const cfg = leerConfiguracion();
  const manifiesto = existsSync(MANIFIESTO) ? JSON.parse(readFileSync(MANIFIESTO, 'utf8')) : {};
  let hechos = 0;
  let iguales = 0;
  let caracteres = 0;
  for (const { ej, pasos } of narraciones) {
    for (const { paso, i, texto } of pasos) {
      const clave = `${ej.id}/${paso.id}`;
      const firma = createHash('sha1').update(JSON.stringify({ texto, voz: cfg.voz, modelo: cfg.modelo, formato: cfg.formato, ajustes: cfg.ajustes })).digest('hex').slice(0, 12);
      const ruta = `voz/${ej.id}/${paso.id}.mp3`;
      const archivo = join(RAIZ, 'public', ruta);
      if (!forzar && manifiesto[clave]?.firma === firma && existsSync(archivo)) {
        iguales++;
        continue;
      }
      process.stdout.write(`${clave} (${texto.length} car.)… `);
      const r = await pedirAudio(cfg, texto, pasos[i - 1]?.texto, pasos[i + 1]?.texto);
      mkdirSync(dirname(archivo), { recursive: true });
      writeFileSync(archivo, Buffer.from(r.audio_base64, 'base64'));
      const fin = r.alignment?.character_end_times_seconds;
      const segundos = fin?.length ? Math.round(fin[fin.length - 1] * 100) / 100 : null;
      manifiesto[clave] = { audio: ruta, segundos, firma, caracteres: texto.length };
      writeFileSync(MANIFIESTO, `${JSON.stringify(manifiesto, null, 2)}\n`);
      console.log(`${segundos ?? '?'} s`);
      hechos++;
      caracteres += texto.length;
    }
  }
  console.log(`Listo: ${hechos} audios nuevos (${caracteres.toLocaleString('es')} caracteres), ${iguales} sin cambios. Duraciones en ${MANIFIESTO}.`);
}

escribirGuion();
if (generar) {
  generarAudios().catch((e) => {
    console.error(`\nNo se pudo generar: ${e.message}`);
    process.exit(1);
  });
} else {
  console.log('Para generar los audios: npm run voz -- --generar  (o con --ejercicio <id> para uno solo).');
}
