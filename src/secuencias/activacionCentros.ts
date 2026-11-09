import { type PuntoCuerpo } from '../escena/cuerpo';
import type { Camara, ColorEnergia, Estado } from '../escena/estado';
import { type V3, entraSaleSeno, escalaV, lerp, normV, sumaV, tramo } from '../escena/mate';
import { SERENA } from '../escena/poses';
import { TOMAS, pulso } from './comunes';
import { type Secuencia, encuadre, enMundo, fijarPose, toma } from './motor';
import {
  type Fase,
  type Mano,
  LUZ_PALMA,
  R,
  armar,
  duracion,
  enFase,
  enPalma,
  esferaEn,
  mezclarMano,
  ortogonal,
  pasoCargar,
  reposo,
  sostener,
  suelta,
} from './sensibilizarManos';

/**
 * «Activación de centros energéticos», versión uno por uno (descrita en la revisión):
 *  1. Barras: se juntan las esferas, se forma una esfera de energía, se juega como goma y la
 *     sostiene la mano derecha (como en «Sensibilización de manos»).
 *  2. La esfera se acerca al pecho, con la mano mirando al pecho, y se hace goma al pecho
 *     durante 5 s: la esfera queda pegada al centro y se estira hacia la palma. Con la esfera
 *     quieta se dice la frase y la mano la introduce sin tocar el cuerpo, a 10 cm.
 *  3–6. Lo mismo para la garganta y la frente, empezando cada vez con las barras.
 */

/** Hacia afuera del cuerpo, por delante: la esfera se estira en esta dirección. */
const AFUERA: V3 = [0, 0, 1];
/** La palma mira al centro (hacia el cuerpo). */
const HACIA_CUERPO: V3 = [0, 0, -1];

export type IdCentro = 'pecho' | 'garganta' | 'frente';

interface Centro {
  /** Para los avisos: «al pecho», «en el pecho». */
  al: string;
  en: string;
  /** El centro que se enciende al entrar la esfera. */
  punto: PuntoCuerpo;
  /**
   * Donde la esfera toca el cuerpo, por detrás (medido sobre la malla, de pie): la esfera redonda
   * de radio R, con 3 mm de luz con la piel, tiene su centro en `base` + R hacia afuera.
   */
  base: V3;
  /** Profundidad (z) de la piel en el centro: desde ahí se mide la distancia de la palma. */
  piel: number;
  /** Hacia dónde apuntan los dedos (palma hacia el cuerpo): a la izquierda y algo arriba. */
  dedos: V3;
  /** Pista del codo derecho: afuera y abajo. */
  codo: V3;
  /** Inclinación de la cabeza (mira la mano en el pecho; derecha en la garganta y la frente). */
  cabeza: number;
  color: ColorEnergia;
  /** Casi de perfil, desde la izquierda: se ven el centro, la esfera y la palma (de frente, la mano la tapa). */
  camara: Camara;
}

/**
 * Medidas sobre la malla del maniquí de pie (plano medio):
 * - pecho: la piel en z 0,099 a la altura 1,30; la esfera toca ahí;
 * - garganta: a 1,45 la piel queda en z 0,047 y sube hacia el mentón; la esfera toca más abajo,
 *   donde el cuello se ensancha (1,43), y su centro queda en z 0,091;
 * - frente: a 1,66 la piel queda en z 0,081; la esfera toca en 1,65.
 */
export const CENTROS: Record<IdCentro, Centro> = {
  pecho: {
    al: 'al pecho',
    en: 'en el pecho',
    punto: 'corazon',
    base: [0, 1.3, 0.101],
    piel: 0.099,
    dedos: normV([0.85, 0.5, 0]),
    codo: normV([-1, -0.8, 0.1]),
    cabeza: 0.3,
    color: 'jade',
    camara: encuadre([0, 1.28, 0.16], 0.72, 1.3, 0.08),
  },
  garganta: {
    al: 'a la garganta',
    en: 'en la garganta',
    punto: 'garganta',
    base: [0, 1.45, 0.0563],
    piel: 0.047,
    dedos: normV([0.9, 0.4, 0]),
    codo: normV([-1, -0.6, 0.1]),
    cabeza: 0.05,
    color: 'cielo',
    camara: encuadre([0, 1.45, 0.14], 0.7, 1.3, 0.06),
  },
  frente: {
    al: 'a la frente',
    en: 'en la frente',
    punto: 'frente',
    base: [0, 1.66, 0.0838],
    piel: 0.081,
    dedos: normV([0.95, 0.3, 0]),
    codo: normV([-1, -0.35, 0.2]),
    cabeza: 0,
    color: 'violeta',
    camara: encuadre([0, 1.62, 0.15], 0.7, 1.3, 0.04),
  },
};

/** Las frases de cada centro (elegido en la revisión: las del ejercicio de referencia). */
export const FRASES: Record<IdCentro, string> = {
  pecho: 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DEL AMOR QUE RADICA EN MÍ',
  garganta: 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DE LA PALABRA QUE RADICA EN MI VOZ',
  frente: 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DE LA CLARIVIDENCIA EN MÍ',
};

/** La goma al centro dura 5 s (descrito en la revisión). */
export const SEG_GOMA = 5;
/** Cuántas veces se aleja la mano: dos veces y media (termina lejos, para empujar). */
export const VUELTAS_GOMA = 2.5;
/** Distancia de la palma a la piel del centro: lejos al hacer goma, y al introducirla (10 cm). */
export const D_LEJOS = 0.13;
export const D_ENTRA = 0.1;

type IdFase = 'acercar' | 'goma' | 'frase' | 'introducir' | 'volver';
const FASES_CENTRO: Fase<IdFase>[] = [
  { id: 'acercar', dur: 2.6 },
  { id: 'goma', dur: SEG_GOMA },
  { id: 'frase', dur: 4.5 },
  { id: 'introducir', dur: 2.8 },
  { id: 'volver', dur: 2.2 },
];

/** Largo de la esfera (pegada al centro y a la palma) con la palma a `d` de la piel. */
const largo = (c: Centro, d: number) => d - (c.base[2] - c.piel) - LUZ_PALMA;
/** Distancia de la palma con la esfera redonda, tocando el centro y la palma. */
export const dJunto = (c: Centro) => c.base[2] - c.piel + 2 * R + LUZ_PALMA;

/** La mano derecha frente al centro, con la palma hacia él y la esfera de largo `L` entre los dos. */
function manoEn(c: Centro, L: number): Mano {
  return sostener(sumaV(c.base, escalaV(AFUERA, L)), LUZ_PALMA, HACIA_CUERPO, ortogonal(c.dedos, HACIA_CUERPO), 0.12, c.codo);
}

/** La esfera pegada al centro y estirada hasta la palma (largo `L`); redonda con L = 2R. */
function esferaPegada(e: Estado, c: Centro, L: number, r = R, opacidad = 1) {
  esferaEn(e, sumaV(c.base, escalaV(AFUERA, L / 2)), r, 1.25, L / (2 * r), AFUERA);
  e.esferas[0].opacidad = opacidad;
}

/** Dónde termina la mano al cargar de las barras: con la esfera en la palma, al frente. */
const MANO_CARGADA = reposo('D');

function centro(e: Estado, id: IdCentro, seg: number) {
  const { id: fase, k } = enFase(FASES_CENTRO, seg);
  const c = CENTROS[id];
  const L0 = 2 * R;
  const Llejos = largo(c, D_LEJOS);
  const Lentra = largo(c, D_ENTRA);
  const izquierda = suelta('I');
  // La frase se dice después de la goma: antes no se ve, después queda entera.
  e.hud.frase = fase === 'acercar' || fase === 'goma' ? 0 : 1;
  if (fase === 'acercar') {
    // La derecha lleva la esfera al centro y da vuelta la mano sin soltarla: la palma mira al cuerpo.
    const s = entraSaleSeno(k);
    const m = mezclarMano(MANO_CARGADA, manoEn(c, L0), s);
    const i = mezclarMano(reposo('I'), izquierda, s);
    e.figuras[0].pose = armar({ D: m, I: i }, lerp(0.38, c.cabeza, s));
    esferaEn(e, enPalma(m, R + LUZ_PALMA * s), R);
    e.hud.aviso = `La mano derecha acerca la esfera ${c.al}, con la palma hacia el cuerpo`;
    return;
  }
  if (fase === 'goma') {
    // La mano se aleja y se acerca despacio; la esfera queda pegada al centro y se estira hacia la palma.
    const L = L0 + (Llejos - L0) * 0.5 * (1 - Math.cos(2 * Math.PI * VUELTAS_GOMA * k));
    e.figuras[0].pose = armar({ D: manoEn(c, L), I: izquierda }, c.cabeza);
    esferaPegada(e, c, L);
    e.hud.contador = { valor: Math.min(SEG_GOMA, Math.floor(k * SEG_GOMA + 1e-6)), total: SEG_GOMA, etiqueta: 's · como goma' };
    e.hud.aviso = `La esfera queda pegada ${c.al} y se estira hacia la mano, como goma`;
    return;
  }
  if (fase === 'frase') {
    // Quieta frente al centro mientras se dice la frase.
    e.figuras[0].pose = armar({ D: manoEn(c, Llejos), I: izquierda }, c.cabeza);
    esferaPegada(e, c, Llejos);
    e.hud.frase = tramo(k, 0.05, 0.85);
    e.hud.aviso = 'Con la esfera quieta, se dice la frase';
    return;
  }
  if (fase === 'introducir') {
    // La mano empuja hasta quedar a 10 cm, sin tocar el cuerpo; la esfera se suelta de la palma y entra.
    const Lh = lerp(Llejos, Lentra, entraSaleSeno(tramo(k, 0, 0.6)));
    e.figuras[0].pose = armar({ D: manoEn(c, Lh), I: izquierda }, c.cabeza);
    const suelta1 = tramo(k, 0.15, 0.5, entraSaleSeno);
    const entra = tramo(k, 0.45, 0.9, entraSaleSeno);
    if (k < 0.92) {
      const Ls = lerp(Math.min(Lh, Llejos), L0, suelta1);
      const r = R * (1 - 0.85 * entra);
      // Se hunde en el centro mientras se achica (su parte de atrás pasa la piel).
      const centroEsfera = sumaV(c.base, escalaV(AFUERA, (Ls / 2) * (1 - entra) - 0.012 * entra));
      esferaEn(e, centroEsfera, r, 1.25 + 0.5 * entra, lerp(Ls / (2 * R), 1, entra), AFUERA);
      e.esferas[0].opacidad = 1 - tramo(k, 0.75, 0.92);
    } else e.esferas[0].activa = false;
    pulso(e, enMundo(e, 0, c.base), tramo(k, 0.55, 1), 0.16, c.color);
    e.centros[c.punto] = 1.1 * tramo(k, 0.5, 0.8);
    const pielZ = c.piel;
    e.marcas.push({ pos: [0.13, c.base[1] + 0.07, pielZ + D_ENTRA / 2], texto: '10 cm', opacidad: tramo(k, 0.35, 0.6) * (1 - tramo(k, 0.9, 1)), tipo: 'distancia' });
    e.hud.aviso = `Con la mano a 10 cm, sin tocar el cuerpo, la esfera entra ${c.en}`;
    return;
  }
  // La mano vuelve a su costado; el centro queda encendido.
  const s = entraSaleSeno(k);
  e.esferas[0].activa = false;
  e.figuras[0].pose = armar({ D: mezclarMano(manoEn(c, Lentra), suelta('D'), s), I: izquierda }, lerp(c.cabeza, SERENA.cabezaPitch, s));
  e.centros[c.punto] = lerp(1.1, 0.8, s);
  e.hud.aviso = null;
}

/** Un centro: acercar, goma, la frase y la esfera que entra. */
function pasoCentro(id: IdCentro) {
  const dur = duracion(FASES_CENTRO);
  return {
    dur,
    aplicar: (e: Estado, t: number) => {
      toma(e, CENTROS[id].camara, t, 0, 0.14);
      toma(e, TOMAS.general, t, 0.9, 1);
      centro(e, id, t * dur);
    },
  };
}

export const activacionCentros: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Barras: se forma la esfera y la sostiene la derecha
    pasoCargar('D'),
    // 2 · El pecho
    pasoCentro('pecho'),
    // 3 · Otra vez las barras
    pasoCargar('D'),
    // 4 · La garganta
    pasoCentro('garganta'),
    // 5 · Otra vez las barras
    pasoCargar('D'),
    // 6 · La frente
    pasoCentro('frente'),
  ],
};

export const activacionInterno = { FASES_CENTRO, CENTROS, FRASES, largo, manoEn };
