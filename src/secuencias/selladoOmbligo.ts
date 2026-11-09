import type { Estado } from '../escena/estado';
import { mezclarPose } from '../escena/cuerpo';
import { type V3, clamp, entraSaleSeno, escalaV, lerp, sumaV, tramo } from '../escena/mate';
import { SERENA } from '../escena/poses';
import { TOMAS, pulso } from './comunes';
import { type Secuencia, encuadre, enMundo, fijarPose, toma } from './motor';
import { type Fase, type Mano, armar, duracion, enFase, mezclarMano, ortogonal, sostener, suelta } from './sensibilizarManos';

/**
 * «Sellado final», versión uno por uno (descrita en la revisión):
 *  1. La mano derecha tapa el ombligo y la izquierda va encima; presionan un poco el cuerpo.
 *  2. La lengua se pega al paladar de arriba (una tarjeta con un dibujo lo muestra junto a la cabeza).
 *  3. Se inhala, se aguanta la respiración 30 s y se exhala suave.
 *  4. Termina con las manos a los costados (sin «Expandir y contraer»).
 */

/** El ombligo y la piel del vientre ahí (medida sobre la malla, de pie: z 0,078 en el centro). */
export const OMBLIGO: V3 = [0, 1.04, 0.078];
/** Luz de la palma con la piel: apoyada (2 mm) y presionando (2 mm adentro: se hunde un poco). */
export const APOYADA = 0.002;
export const PRESIONA = -0.002;
/** Grosor de la mano derecha a la altura de la palma: la izquierda se apoya en su dorso. */
export const GROSOR_MANO = 0.026;

/**
 * Las palmas miran al cuerpo, giradas 6° siguiendo la curva del vientre: los dedos de la derecha
 * se apoyan hacia la izquierda y su muñeca queda levantada (plana, el antebrazo rozaría el costado).
 */
const GIRO = (6 * Math.PI) / 180;
const PALMAS: V3 = [-Math.sin(GIRO), 0, -Math.cos(GIRO)];
/** El dorso de la derecha (donde se apoya la izquierda). */
const DORSO: V3 = [Math.sin(GIRO), 0, Math.cos(GIRO)];

/** La derecha tapa el ombligo: la palma sobre él, los dedos hacia la izquierda. */
function derecha(luz: number): Mano {
  return { ...sostener([OMBLIGO[0], OMBLIGO[1], OMBLIGO[2] + luz], 0, PALMAS, ortogonal([1, 0, 0], PALMAS), 0, [-1, -0.7, -0.2]), apoyar: 1 };
}
/** La izquierda encima, apoyada en el dorso de la derecha, con los dedos hacia la derecha. */
function izquierda(luz: number): Mano {
  const palma = sumaV([OMBLIGO[0], OMBLIGO[1] + 0.006, OMBLIGO[2] + luz], escalaV(DORSO, GROSOR_MANO + 0.001));
  return { ...sostener(palma, 0, PALMAS, ortogonal([-1, 0, 0], PALMAS), 0, [1, -0.6, -0.2]), apoyar: 1 };
}
/** La pose con las dos manos en el ombligo (`luz` de la palma derecha con la piel). */
export const enElOmbligo = (luz: number, cabeza = 0.18) => armar({ D: derecha(luz), I: izquierda(luz) }, cabeza);

/** Una mano `dz` adelante de su lugar: llega por delante del vientre, sin rozar la cadera. */
const adelante = (m: Mano, dz: number): Mano => ({ ...m, mano: [m.mano[0], m.mano[1], m.mano[2] + dz] });

/**
 * Las manos camino del ombligo (`k` de 0 a 1): la derecha llega primero a taparlo; la izquierda
 * se pone adelante y recién después baja encima. Al volver (`k` de 1 a 0), al revés.
 */
function hacia(k: number, luz: number, cabeza: number) {
  const d1 = mezclarMano(suelta('D'), adelante(derecha(luz), 0.08), entraSaleSeno(tramo(k, 0, 0.35)));
  const d = mezclarMano(d1, derecha(luz), entraSaleSeno(tramo(k, 0.28, 0.55)));
  const i1 = mezclarMano(suelta('I'), adelante(izquierda(luz), 0.06), entraSaleSeno(tramo(k, 0.38, 0.78)));
  const i = mezclarMano(i1, izquierda(luz), entraSaleSeno(tramo(k, 0.74, 1)));
  return armar({ D: d, I: i }, cabeza);
}

/** El dibujo de la lengua en el paladar se ancla junto a la boca, del lado derecho de la figura. */
const JUNTO_A_LA_BOCA: V3 = [-0.1, 1.56, 0.06];
function tarjetaLengua(e: Estado, opacidad: number) {
  if (opacidad > 0.005) e.marcas.push({ pos: enMundo(e, 0, JUNTO_A_LA_BOCA), texto: 'lengua-paladar', opacidad, tipo: 'imagen' });
}

// ── Paso 1 · Las manos en el ombligo ────────────────────────────────────

type IdManos = 'llevar' | 'presionar' | 'sostener';
const FASES_MANOS: Fase<IdManos>[] = [
  { id: 'llevar', dur: 3.2 },
  { id: 'presionar', dur: 1.2 },
  { id: 'sostener', dur: 2.6 },
];

function manos(e: Estado, seg: number) {
  const { id, k } = enFase(FASES_MANOS, seg);
  if (id === 'llevar') {
    e.figuras[0].pose = hacia(k, APOYADA, lerp(SERENA.cabezaPitch, 0.18, entraSaleSeno(k)));
    e.hud.aviso = 'La mano derecha tapa el ombligo y la izquierda va encima';
    e.centros.ombligo = 0.3 * tramo(k, 0.6, 1);
    return;
  }
  const presion = id === 'presionar' ? entraSaleSeno(k) : 1;
  e.figuras[0].pose = enElOmbligo(lerp(APOYADA, PRESIONA, presion));
  e.centros.ombligo = 0.3 + 0.4 * presion;
  if (id === 'presionar') pulso(e, enMundo(e, 0, OMBLIGO), tramo(k, 0.3, 1), 0.1, 'violeta');
  e.hud.aviso = 'Presionan un poco el cuerpo';
  const ver = id === 'sostener' ? 1 - tramo(k, 0.85, 1) : tramo(k, 0, 0.4);
  e.marcas.push({ pos: enMundo(e, 0, [-0.2, 0.98, 0.16]), texto: 'derecha · tapa el ombligo', opacidad: ver, tipo: 'nombre' });
  e.marcas.push({ pos: enMundo(e, 0, [0.22, 1.11, 0.18]), texto: 'izquierda · encima', opacidad: ver, tipo: 'nombre' });
}

// ── Paso 2 · La lengua al paladar ───────────────────────────────────────

const SEG_LENGUA = 7;

function lengua(e: Estado, seg: number) {
  const k = seg / SEG_LENGUA;
  e.figuras[0].pose = enElOmbligo(PRESIONA, lerp(0.18, 0.05, entraSaleSeno(tramo(k, 0, 0.3))));
  e.centros.ombligo = 0.7;
  tarjetaLengua(e, tramo(k, 0.05, 0.25));
  e.hud.aviso = 'Pega la punta de la lengua al paladar, detrás de los dientes de arriba';
}

// ── Paso 3 · Aguantar la respiración 30 s ───────────────────────────────

export const SEG_RETENER = 30;
type IdRespirar = 'inhalar' | 'retener' | 'exhalar' | 'quieto';
const FASES_RESPIRAR: Fase<IdRespirar>[] = [
  { id: 'inhalar', dur: 4 },
  { id: 'retener', dur: SEG_RETENER },
  { id: 'exhalar', dur: 5 },
  { id: 'quieto', dur: 1 },
];

function respirar(e: Estado, seg: number) {
  const { id, k } = enFase(FASES_RESPIRAR, seg);
  e.figuras[0].pose = enElOmbligo(PRESIONA, 0.05);
  e.centros.ombligo = 0.7;
  tarjetaLengua(e, id === 'quieto' ? 1 - k : 1);
  if (id === 'inhalar') {
    e.hud.respiracion = { fase: 'Inhala', k, ciclo: 1, total: 1, etiqueta: 'inhala profundo' };
    e.hud.aviso = 'Inhala profundo';
    return;
  }
  if (id === 'retener') {
    // Un latido lento por segundo bajo las manos: la carga queda sellada.
    const s = k * SEG_RETENER;
    const n = Math.min(SEG_RETENER, Math.floor(s + 1e-6));
    e.hud.respiracion = { fase: 'Retén', k, ciclo: 1, total: 1, etiqueta: `${n} / ${SEG_RETENER} s` };
    e.hud.aviso = 'Aguanta la respiración, con la lengua en el paladar y las manos en el ombligo';
    pulso(e, enMundo(e, 0, OMBLIGO), s % 1, 0.1, 'violeta');
    e.penumbra = 0.22 * tramo(k, 0, 0.05) * (1 - tramo(k, 0.97, 1));
    return;
  }
  if (id === 'exhalar') {
    e.hud.respiracion = { fase: 'Exhala', k, ciclo: 1, total: 1, etiqueta: 'exhala suave' };
    e.hud.aviso = 'Exhala suave';
    return;
  }
  e.hud.aviso = null;
}

// ── Paso 4 · Las manos a los costados ───────────────────────────────────

const SEG_COSTADOS = 4;

function costados(e: Estado, seg: number) {
  const k = clamp(seg / SEG_COSTADOS);
  // La izquierda se levanta primero y la derecha sale después; al final, la postura de pie.
  const vuelta = hacia(1 - tramo(k, 0, 0.85), PRESIONA, lerp(0.05, SERENA.cabezaPitch, tramo(k, 0, 0.85)));
  e.figuras[0].pose = mezclarPose(vuelta, SERENA, tramo(k, 0.85, 1), 0);
  e.centros.ombligo = 0.7 * (1 - 0.3 * tramo(k, 0, 1));
  e.hud.aviso = k < 0.9 ? 'Las manos vuelven a los costados' : null;
}

// ── Pasos ───────────────────────────────────────────────────────────────

/** Las manos en el vientre, de cerca y de tres cuartos. */
const CAM_MANOS = encuadre([0, 1.06, 0.1], 0.75, -0.55, 0.12);
/** De la cabeza al ombligo: se ven las manos y queda lugar para el dibujo junto a la boca. */
const CAM_SELLO = encuadre([-0.05, 1.33, 0.05], 1.1, -0.3, 0.06);

function paso<T extends string>(fases: Fase<T>[] | number, aplicar: (e: Estado, seg: number) => void, camara: (e: Estado, t: number) => void) {
  const dur = typeof fases === 'number' ? fases : duracion(fases);
  return {
    dur,
    aplicar: (e: Estado, t: number) => {
      camara(e, t);
      aplicar(e, t * dur);
    },
  };
}

export const selladoOmbligo: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · La derecha tapa el ombligo, la izquierda encima, y presionan un poco
    paso(FASES_MANOS, manos, (e, t) => toma(e, CAM_MANOS, t, 0, 0.35)),
    // 2 · La lengua al paladar (con el dibujo)
    paso(SEG_LENGUA, lengua, (e, t) => toma(e, CAM_SELLO, t, 0, 0.3)),
    // 3 · Inhalar, aguantar 30 s y exhalar
    paso(FASES_RESPIRAR, respirar, (e, t) => toma(e, CAM_SELLO, t, 0, 0.05)),
    // 4 · Las manos a los costados
    paso(SEG_COSTADOS, costados, (e, t) => toma(e, TOMAS.general, t, 0, 0.6)),
  ],
};

export const selladoInterno = { FASES_MANOS, FASES_RESPIRAR, SEG_LENGUA, SEG_COSTADOS, derecha, izquierda };
