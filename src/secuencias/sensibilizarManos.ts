import { type Pose, mezclarPose, pose, resolverEsqueleto } from '../escena/cuerpo';
import { type Camara, type Estado, enPalma as enPalmaRef } from '../escena/estado';
import {
  type V3,
  clamp,
  entraSaleSeno,
  escalaV,
  largoV,
  lerp,
  lerpV,
  normV,
  puntoV,
  restaV,
  sumaV,
  tramo,
  ventana,
} from '../escena/mate';
import { segmentosMano } from '../escena/manos';
import { HUECO, SERENA, apoyoAcunado, esferaEntrePalmas } from '../escena/poses';
import { barrasEnPuno } from './barras';
import { TOMAS, esfera, pulso } from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';
import {
  type FaseFormar,
  type MedidasFormar,
  ENCUADRE as ENCUADRE_BARRAS,
  JUNTAR,
  SEG as SEG_FORMAR,
  agarre,
  flujosDeBarras,
  formarEsfera,
  separacionGoma,
} from './unirBarras';

/**
 * «Sensibilización de manos» (enseñado por Víctor), pulida con el taller:
 *  - primero se carga de las barras, como en los demás ejercicios: cada mano
 *    toma energía de su barra, las dos esferas se juntan en una y se juega con
 *    ella como goma;
 *  - la esfera pasa de mano en mano, lentamente y **sin soltarla nunca**, con
 *    una mano arriba y otra abajo: la que la tiene la da vuelta y la pone
 *    arriba, la otra la recibe por abajo, juegan con ella como si fuera de goma
 *    y recién entonces la de arriba la suelta: queda en la mano de abajo;
 *  - empieza la mano izquierda con la mano derecha: un poco cerrada, con la
 *    energía de la esfera dentro, cubre los dedos de la otra mano uno por uno,
 *    lentamente y sin tocarlos (del meñique al pulgar);
 *  - la esfera se desliza por el brazo y la mano la acompaña, haciendo de goma
 *    en la muñeca, el antebrazo y el codo: por delante (palma arriba) y, con el
 *    brazo girado, por atrás;
 *  - la mano recorre el brazo sin tocarlo, a 5–10 cm, desde los dedos hasta el hombro;
 *  - después, lo mismo con el otro brazo (la derecha cubre los dedos de la izquierda).
 */

type Lado = 'D' | 'I';
const SIGNO: Record<Lado, number> = { D: -1, I: 1 };
const OTRO: Record<Lado, Lado> = { D: 'I', I: 'D' };
const ARRIBA: V3 = [0, 1, 0];

/** Esfera de cada palma al empezar y esfera unida (la que recorre los brazos). */
const R_MANO = 0.026;
const R = 0.035;
/** Luz entre la esfera y la piel, y entre la esfera y la palma que palpa. */
const LUZ_PIEL = 0.003;
const LUZ_PALMA = 0.002;
/** Distancia de la palma que palpa a la piel: 7,5 cm (dentro de los 5–10 cm). */
export const DIST = LUZ_PIEL + 2 * R + LUZ_PALMA;
/** Cuánto sube la mano al hacer de goma: la esfera se estira con ella. */
const GOMA = 0.045;

interface Mano {
  mano: V3;
  palma: V3;
  dedos: V3;
  cierre: number;
  codo: V3;
  pinza?: number;
  tipoPinza?: number;
}
type Manos = Record<Lado, Mano>;

// ── Vectores ────────────────────────────────────────────────────────────

const ortogonal = (d: V3, n: V3): V3 => normV(restaV(d, escalaV(n, puntoV(d, n))));

/** Mezcla de direcciones; si son casi opuestas, pasa por `via` (sin cruzar por cero). */
function mezclarDir(a: V3, b: V3, k: number, via?: V3): V3 {
  if (puntoV(a, b) > -0.5 || !via) return normV(lerpV(a, b, k));
  return k < 0.5 ? normV(lerpV(a, via, k * 2)) : normV(lerpV(via, b, k * 2 - 1));
}

function mezclarMano(a: Mano, b: Mano, k: number, via?: V3): Mano {
  const palma = mezclarDir(a.palma, b.palma, k, via);
  return {
    mano: lerpV(a.mano, b.mano, k),
    palma,
    dedos: ortogonal(mezclarDir(a.dedos, b.dedos, k), palma),
    cierre: lerp(a.cierre, b.cierre, k),
    codo: mezclarDir(a.codo, b.codo, k),
    pinza: lerp(a.pinza ?? 0, b.pinza ?? 0, k),
    tipoPinza: (b.pinza ?? 0) > 0 ? (b.tipoPinza ?? 0) : (a.tipoPinza ?? 0),
  };
}

function armar(m: Manos, cabezaPitch = 0.38): Pose {
  return pose({
    manoD: m.D.mano,
    manoI: m.I.mano,
    codoD: m.D.codo,
    codoI: m.I.codo,
    palmaD: m.D.palma,
    palmaI: m.I.palma,
    dedosD: m.D.dedos,
    dedosI: m.I.dedos,
    cierreD: m.D.cierre,
    cierreI: m.I.cierre,
    pinzaD: m.D.pinza ?? 0,
    pinzaI: m.I.pinza ?? 0,
    tipoPinzaD: m.D.tipoPinza ?? 0,
    tipoPinzaI: m.I.tipoPinza ?? 0,
    cabezaPitch,
  });
}

const manos = (l: Lado, a: Mano, b: Mano): Manos => (l === 'D' ? { D: a, I: b } : { D: b, I: a });

// ── Manos con la esfera ─────────────────────────────────────────────────

/** Manos al frente, palmas hacia arriba (donde descansa la esfera). */
function reposo(l: Lado): Mano {
  const s = SIGNO[l];
  return { mano: [s * 0.11, 1.16, 0.3], palma: ARRIBA, dedos: normV([-s * 0.2, 0, 1]), cierre: 0.12, codo: normV([s * 0.6, -0.6, -0.5]) };
}

/** Centro de una esfera de radio `r` apoyada en la palma. */
function enPalma(m: Mano, r: number): V3 {
  return sumaV(sumaV(m.mano, escalaV(m.dedos, HUECO.dedos)), escalaV(m.palma, HUECO.piel + r));
}

/** Mano que sostiene con la palma la esfera de centro `c`. */
function sostener(c: V3, r: number, palma: V3, dedos: V3, cierre: number, codo: V3): Mano {
  return { mano: restaV(restaV(c, escalaV(palma, HUECO.piel + r)), escalaV(dedos, HUECO.dedos)), palma, dedos, cierre, codo };
}

/**
 * Al sostener la esfera entre las dos manos: dedos al frente y casi estirados, y
 * las palmas inclinadas 22° hacia arriba, acunándola. Con una esfera de 7 cm, las
 * palmas verticales juntarían las puntas de los pulgares; más inclinadas, los meñiques.
 */
const DEDOS_FRENTE = normV([0, 0.06, 1]);
const CIERRE_SOSTENER = 0.08;
const CUNA = (22 * Math.PI) / 180;

/** Las dos palmas acunando la esfera de centro `c`, a los costados; `estirar` > 1 la alarga a lo ancho (goma). */
function frenteAFrente(c: V3, estirar = 1): Manos {
  const apoyo = apoyoAcunado(R * estirar, CUNA, estirar);
  const m = (l: Lado): Mano => {
    const s = SIGNO[l];
    const palma: V3 = [-s * Math.cos(CUNA), Math.sin(CUNA), 0];
    return sostener(c, apoyo, palma, DEDOS_FRENTE, CIERRE_SOSTENER, normV([s, -0.6, -0.35]));
  };
  return { D: m('D'), I: m('I') };
}

/**
 * La mano `rec` termina de recibir la esfera: la tiene acunada de costado (palma
 * hacia `hacia`, inclinada CUNA hacia arriba) y gira por debajo de ella hasta
 * sostenerla en la palma, ya en su lugar de reposo. Nunca la suelta.
 */
function recibir(rec: Lado, c0: V3, hacia: number, k: number): { mano: Mano; c: V3 } {
  const fin = reposo(rec);
  const c1 = enPalma(fin, R);
  const s = entraSaleSeno(k);
  const c = sumaV(lerpV(c0, c1, s), [0, 0.015 * Math.sin(Math.PI * s), 0]);
  const th = (Math.PI / 2 - CUNA) * (1 - s);
  const palma: V3 = [hacia * Math.sin(th), Math.cos(th), 0];
  const dedos = ortogonal(normV(lerpV(DEDOS_FRENTE, fin.dedos, s)), palma);
  const codo = mezclarDir(normV([SIGNO[rec], -0.6, -0.35]), fin.codo, s);
  return { mano: sostener(c, R, palma, dedos, lerp(CIERRE_SOSTENER, fin.cierre, s), codo), c };
}

// ── El brazo que se palpa ───────────────────────────────────────────────

/** Punto de la piel y su normal hacia afuera (de donde viene la mano que palpa). */
interface PuntoPiel {
  piel: V3;
  normal: V3;
}

interface Brazo {
  A: Lado;
  B: Lado;
  s: number;
  /** El brazo extendido al frente; `giro` 0 = palma arriba (por delante), 1 = palma abajo (por atrás). */
  palpado: (giro: number) => Mano;
  puntos: Record<'dedos' | 'muneca' | 'antebrazo' | 'codo', PuntoPiel>;
  /**
   * Dedos que cubre la otra mano, en orden: `cubre` es donde va la esfera (envolviendo
   * el dedo, sin que la mano lo toque) y `sobre`, la piel de encima del dedo.
   */
  cubrir: { nombre: string; cubre: PuntoPiel; sobre: PuntoPiel; rotulo: V3 }[];
  /** Recorrido de la mano por atrás, desde las yemas hasta el hombro. */
  recorrido: PuntoPiel[];
}

/**
 * Del meñique al pulgar, como en el masaje de manos (elegido por el usuario). `i` es la
 * falange media de cada dedo en `segmentosMano` (índice 1–3, medio 4–6, anular 7–9,
 * meñique 10–12, pulgar 13–15).
 */
const DEDOS_CUBRIR = [
  { nombre: 'meñique', i: 11 },
  { nombre: 'anular', i: 8 },
  { nombre: 'medio', i: 5 },
  { nombre: 'índice', i: 2 },
  { nombre: 'pulgar', i: 14 },
] as const;
/** Al cubrir un dedo, la esfera queda 3,2 cm por encima de su eje: lo envuelve y la mano no lo toca. */
const ALTO_CUBRIR = 0.032;
/** La mano que cubre va un poco más cerrada (0,25; al palpar, 0,15), ahuecada sobre la esfera. */
const CIERRE_CUBRIR = 0.25;
/**
 * Hacia dónde apuntan los dedos de la mano que cubre (grados desde el frente; 45 = al
 * palpar el brazo, cruzados). Al cubrir van al frente y un poco hacia afuera, casi a lo
 * largo de los dedos cubiertos: así ni sus yemas ni su pulgar rozan los dedos vecinos.
 */
const PHI_PALPAR = 45;
const PHI_CUBRIR = -15;

function brazo(A: Lado): Brazo {
  const s = SIGNO[A];
  const B = OTRO[A];
  // El antebrazo cruza por delante del cuerpo, a la altura de la cintura: se ve a lo largo.
  const dedos = normV([-s * 0.72, 0, 0.69]);
  const medial = ortogonal([-s, 0, 0], dedos);
  const palpado = (giro: number): Mano => ({
    mano: [s * 0.05, 1.2, 0.34],
    palma: normV(sumaV(escalaV(ARRIBA, Math.cos(Math.PI * giro)), escalaV(medial, Math.sin(Math.PI * giro)))),
    dedos,
    cierre: 0.1,
    codo: normV([s * 0.6, -0.6, -0.3]),
  });
  const esq = resolverEsqueleto(armar(manos(A, palpado(0), reposo(B))));
  const W = A === 'D' ? esq.munecaD : esq.munecaI;
  const pal = A === 'D' ? esq.palmaD : esq.palmaI;
  const seg = segmentosMano(W, pal.dedos, pal.normal, A === 'D' ? 1 : -1, palpado(0).cierre);
  const cubrir = DEDOS_CUBRIR.map(({ nombre, i }) => {
    const medio = sumaV(seg[i].pos, escalaV(seg[i].dir, seg[i].largo / 2));
    const n = pal.normal as V3;
    const punta = sumaV(seg[i + 1].pos, escalaV(seg[i + 1].dir, seg[i + 1].largo));
    return {
      nombre,
      // La esfera envuelve el dedo: su centro, ALTO_CUBRIR por encima del eje del dedo.
      cubre: { piel: sumaV(medio, escalaV(n, ALTO_CUBRIR - LUZ_PIEL - R)), normal: n },
      sobre: { piel: sumaV(medio, escalaV(n, seg[i].radio)), normal: n },
      // El nombre del dedo, junto a su punta.
      rotulo: sumaV(sumaV(punta, escalaV(seg[i + 1].dir, 0.02)), escalaV(n, 0.012)),
    };
  });
  const E = A === 'D' ? esq.codoD : esq.codoI;
  const H = A === 'D' ? esq.hombroD : esq.hombroI;
  const arribaAnte = ortogonal(ARRIBA, normV(restaV(W, E)));
  const p = (c: V3, n: V3, r: number): PuntoPiel => ({ piel: sumaV(c, escalaV(n, r)), normal: n });
  const puntos = {
    // Sobre las falanges medias (palma arriba).
    dedos: p(sumaV(W, escalaV(dedos, 0.118)), ARRIBA, 0.012),
    muneca: p(W, arribaAnte, 0.024),
    antebrazo: p(lerpV(E, W, 0.5), arribaAnte, 0.034),
    // Junto al codo, sobre el antebrazo: encima del codo mismo la esfera rozaría el brazo que sube.
    codo: p(lerpV(E, W, 0.24), arribaAnte, 0.037),
  };
  // Del codo al hombro, la mano pasa por delante del brazo (por el pliegue del codo), sin rozarlo.
  const nBrazo = ortogonal(normV([-s * 0.2, 0.3, 1]), normV(restaV(H, E)));
  const nPliegue = normV(sumaV(arribaAnte, nBrazo));
  const recorrido = [
    p(sumaV(W, escalaV(dedos, 0.165)), ARRIBA, 0.01),
    p(sumaV(W, escalaV(dedos, 0.085)), ARRIBA, 0.016),
    puntos.muneca,
    puntos.antebrazo,
    puntos.codo,
    p(E, nPliegue, 0.036 + DIST * 0.35),
    p(lerpV(E, H, 0.5), nBrazo, 0.046),
    p(H, normV([s * 0.3, 1, 0.25]), 0.06),
  ];
  return { A, B, s, palpado, puntos, cubrir, recorrido };
}

const BRAZOS: Record<Lado, Brazo> = { I: brazo('I'), D: brazo('D') };

function mezclarPunto(a: PuntoPiel, b: PuntoPiel, k: number): PuntoPiel {
  return { piel: lerpV(a.piel, b.piel, k), normal: normV(lerpV(a.normal, b.normal, k)) };
}

/** Punto a una fracción `u` (0–1, por largo) de una lista de puntos. */
function aLoLargo(lista: PuntoPiel[], u: number): PuntoPiel {
  const largos = [0];
  for (let i = 1; i < lista.length; i++) largos.push(largos[i - 1] + largoV(restaV(lista[i].piel, lista[i - 1].piel)));
  const x = clamp(u) * largos[largos.length - 1];
  let i = 1;
  while (i < lista.length - 1 && largos[i] < x) i++;
  return mezclarPunto(lista[i - 1], lista[i], (x - largos[i - 1]) / Math.max(1e-9, largos[i] - largos[i - 1]));
}

/** La mano que palpa, encima del punto, a DIST + `alza` de la piel, con la palma hacia el brazo. */
function encima(b: Brazo, pp: PuntoPiel, alza: number, extra: Partial<Mano> = {}, phi = PHI_PALPAR): Mano {
  const hueco = sumaV(pp.piel, escalaV(pp.normal, DIST + alza));
  const palma = escalaV(pp.normal, -1);
  const f = (phi * Math.PI) / 180;
  const dedos = ortogonal(normV([b.s * Math.sin(f), 0, Math.cos(f)]), palma);
  return {
    mano: restaV(restaV(hueco, escalaV(dedos, HUECO.dedos)), escalaV(palma, HUECO.piel)),
    palma,
    dedos,
    cierre: 0.15,
    codo: normV([-b.s * 0.8, -0.5, -0.2]),
    ...extra,
  };
}

/** Esfera entre la piel y la palma: se estira (goma) cuando la mano sube. */
function esferaGoma(e: Estado, pp: PuntoPiel, alza: number, brillo = 1.25) {
  const alto = 2 * R + alza;
  esfera(e, 0, {
    ref: null,
    pegado: 0,
    pos: puntoMundo(e, 0, sumaV(pp.piel, escalaV(pp.normal, LUZ_PIEL + alto / 2))),
    radio: R,
    estirar: alto / (2 * R),
    eje: pp.normal,
    brillo,
    color: 'oro',
    color2: 'blanco',
    mezcla: 0.3,
    opacidad: 1,
  });
}

/** La esfera en `c`; `estirar` la alarga como goma a lo largo de `eje` (sin eje, a lo ancho). */
function esferaEn(e: Estado, c: V3, r = R, brillo = 1.25, estirar = 1, eje: V3 | null = null) {
  esfera(e, 0, { ref: null, pegado: 0, pos: puntoMundo(e, 0, c), radio: r, estirar, eje, brillo, color: 'oro', color2: 'blanco', mezcla: 0.3, opacidad: 1 });
}

/** Dos idas y vueltas de goma en `k` ∈ [0, 1]. */
const goma = (k: number) => GOMA * (0.5 - 0.5 * Math.cos(2 * Math.PI * 2 * clamp(k)));

// ── Fases ───────────────────────────────────────────────────────────────

type Fase<T extends string> = { id: T; dur: number };
function enFase<T extends string>(fases: Fase<T>[], seg: number): { id: T; k: number; i: number } {
  let x = Math.max(0, seg);
  for (let i = 0; i < fases.length; i++) {
    if (x < fases[i].dur || i === fases.length - 1) return { id: fases[i].id, k: clamp(x / fases[i].dur), i };
    x -= fases[i].dur;
  }
  return { id: fases[0].id, k: 0, i: 0 };
}
const duracion = (fases: Fase<string>[]) => fases.reduce((a, f) => a + f.dur, 0);

// ── Paso 1 · Cargar de las barras y formar la esfera ────────────────────

/**
 * La esfera se forma como en los demás ejercicios (barras, una esfera en cada
 * mano, se unen y se juega con ella como goma), pero del tamaño con que después
 * se palpan los brazos: así la mano que palpa queda a 7,5 cm de la piel. Como es
 * más chica, las palmas quedan más cerca y se juntan 1,5 cm más atrás (los
 * brazos llegan estirados).
 */
const MEDIDAS: MedidasFormar = {
  centro: sumaV(JUNTAR, [0, 0, -0.015]),
  rMano: R_MANO,
  rUnida: R,
  sepAbiertas: 0.075,
  gomaAfuera: 0.022,
  gomaAdentro: 0.006,
  cierre: CIERRE_SOSTENER,
  cuna: CUNA,
};
/** Donde la sostienen entre las dos manos para pasarla: al frente, a la altura de la cintura. */
const CM: V3 = [0, 1.22, 0.34];

type IdTomar = 'agarrar' | FaseFormar | 'bajar' | 'quedarse';
const FASES_TOMAR: Fase<IdTomar>[] = [
  { id: 'agarrar', dur: 3.5 },
  { id: 'tomar', dur: SEG_FORMAR.tomar },
  { id: 'juntar', dur: SEG_FORMAR.juntar },
  { id: 'unir', dur: SEG_FORMAR.unir },
  { id: 'jugar', dur: SEG_FORMAR.jugar },
  { id: 'bajar', dur: 2.4 },
  { id: 'quedarse', dur: 2.4 },
];
const DUR_TOMAR = duracion(FASES_TOMAR);
/** Fracción del paso 1 en que empieza cada fase (para las tomas de cámara). */
const inicioTomar = (id: IdTomar) => duracion(FASES_TOMAR.slice(0, FASES_TOMAR.findIndex((f) => f.id === id))) / DUR_TOMAR;
const T_JUNTAR = inicioTomar('juntar');
const T_BAJAR = inicioTomar('bajar');
/** Al juntar las manos, la cámara se acerca: la esfera es chica y así se ve el juego de goma. */
const CAM_JUNTAR = encuadre([0, 1.38, 0.45], 0.75, 0.15, 0.35);

function esferasDePalmas(e: Estado, r: number) {
  for (const [i, ancla] of [
    [1, 'manoD'],
    [2, 'manoI'],
  ] as const) {
    esfera(e, i, { activa: r > 0.001, ref: enPalmaRef(ancla, r * 0.92 + 0.002), pegado: 1, radio: r, estirar: 1, eje: null, brillo: 1.15, color: 'oro', color2: 'blanco', mezcla: 0.3, opacidad: 1 });
  }
}

/**
 * La mano `rec` se queda con la esfera que sostenían entre las dos (palmas
 * enfrentadas en CM): gira por debajo y la lleva a su palma. Recién entonces la
 * otra la suelta y vuelve a su lugar con la palma vacía.
 */
function quedarse(da: Lado, k: number): { manos: Manos; c: V3; ambas: boolean } {
  const rec = OTRO[da];
  const ini = frenteAFrente(CM);
  const r = recibir(rec, CM, SIGNO[da], k);
  const mDa = mezclarMano(ini[da], reposo(da), entraSaleSeno(clamp(k / 0.5)));
  return { manos: manos(da, mDa, r.mano), c: r.c, ambas: k < 0.08 };
}

function tomarEsferas(e: Estado, seg: number) {
  const { id, k } = enFase(FASES_TOMAR, seg);
  const s = entraSaleSeno(k);
  if (id === 'agarrar') {
    barrasEnPuno(e, tramo(k, 0.05, 0.45), 0.3, 0.3);
    posar(e, 0, agarre(), k, 0.2, 0.75, 0.02);
    e.hud.aviso = k > 0.2 ? 'Cada mano agarra su barra, con los brazos estirados' : null;
    return;
  }
  if (id === 'bajar') {
    // La bajan entre las dos palmas hasta el frente de la cintura; las barras se desvanecen.
    const c = lerpV(MEDIDAS.centro, CM, s);
    e.figuras[0].pose = mezclarPose(esferaEntrePalmas(c, R, 0, CIERRE_SOSTENER, 1, CUNA), armar(frenteAFrente(c)), s, 0);
    esferaEn(e, c);
    barrasEnPuno(e, 1 - tramo(k, 0, 0.7), 0.3, 0.3);
    e.hud.aviso = 'Bajar la esfera al frente, entre las dos manos';
    return;
  }
  if (id === 'quedarse') {
    const q = quedarse('I', k);
    e.figuras[0].pose = armar(q.manos);
    esferaEn(e, q.c);
    barrasEnPuno(e, 0, 0.3, 0.3);
    e.hud.aviso = 'La derecha se queda con la esfera';
    return;
  }
  // Tomar energía de las barras, juntar las manos al frente, unir las esferas y jugar con ella.
  const f = formarEsfera(id, k, MEDIDAS);
  e.figuras[0].pose = f.pose;
  esferasDePalmas(e, f.rMano);
  if (f.unida) esferaEn(e, f.unida.c, f.unida.r, 1.25, f.unida.estirar);
  if (id === 'tomar') flujosDeBarras(e, f.flujos);
  if (id === 'unir') pulso(e, puntoMundo(e, 0, MEDIDAS.centro), tramo(k, 0.45, 1), 0.12, 'oro');
  barrasEnPuno(e, 1, f.resalte, f.resalte);
  e.hud.aviso = id === 'jugar' ? 'Alejar y acercar las manos, como una esfera de goma' : 'Tomar energía de las dos barras y unirla en una esfera';
}

// ── Paso 2 · De mano en mano, lentamente y jugando como goma ────────────

/**
 * Cada traspaso es con una mano arriba y la otra abajo, no de costado (descrito
 * en el taller): las dos manos van al mismo tiempo al medio; la que tiene la
 * esfera la da vuelta y la pone arriba, sin soltarla (queda pegada a su palma),
 * y la otra se pone abajo y la recibe; juegan con ella como goma (se estira
 * hacia arriba y se aplasta) y recién entonces la de arriba la suelta: la
 * esfera termina en la mano de abajo.
 */
const TRASPASO = { juntar: 2.6, goma: 4, quedarse: 2.2 };
type IdTraspaso = keyof typeof TRASPASO;
const FASES_TRASPASO: Fase<IdTraspaso>[] = (Object.keys(TRASPASO) as IdTraspaso[]).map((id) => ({ id, dur: TRASPASO[id] }));
const SEG_TRASPASO = duracion(FASES_TRASPASO);
/** Quién la da en cada traspaso: derecha → izquierda → derecha → izquierda. */
const ORDEN_TRASPASOS: Lado[] = ['D', 'I', 'D'];
const PAUSA_TRASPASO = 0.4;
const DUR_PASAR = ORDEN_TRASPASOS.length * SEG_TRASPASO + (ORDEN_TRASPASOS.length - 1) * PAUSA_TRASPASO;
const ABAJO: V3 = [0, -1, 0];

interface Traspaso {
  manos: Manos;
  c: V3;
  /** Estiramiento de la esfera hacia arriba (goma). */
  estirar: number;
  fase: IdTraspaso;
  ambas: boolean;
}

/**
 * Mano arriba (palma hacia abajo) o abajo (palma hacia arriba) de la esfera de
 * centro `c`, con la palma a `apoyo` del centro. Los dedos van al frente y un poco
 * hacia el otro lado: las manos se cruzan en diagonal y los pulgares no se encuentran.
 */
function vertical(l: Lado, c: V3, arriba: boolean, apoyo = R): Mano {
  const s = SIGNO[l];
  const codo = arriba ? normV([s, -0.4, -0.35]) : normV([s * 0.6, -0.6, -0.5]);
  return sostener(c, apoyo, arriba ? ABAJO : ARRIBA, normV([-s * 0.35, 0, 1]), CIERRE_SOSTENER, codo);
}

/** Un traspaso a los `seg` segundos: la mano `da` tiene la esfera en la palma y la otra se queda con ella. */
function traspaso(da: Lado, seg: number): Traspaso {
  const { id: fase, k } = enFase(FASES_TRASPASO, seg);
  const rec = OTRO[da];
  const sg = SIGNO[da];
  const s = entraSaleSeno(k);
  const arriba = vertical(da, CM, true);
  const abajo = vertical(rec, CM, false);
  if (fase === 'juntar') {
    // Las dos manos van al medio al mismo tiempo. La que la tiene la da vuelta sin soltarla (la
    // esfera sigue pegada a su palma) y la pone arriba: gira como quien da vuelta la mano, la palma
    // pasa por mirar hacia adentro. La otra, con la palma hacia arriba, se pone abajo y la recibe.
    const ini = reposo(da);
    const c = sumaV(lerpV(enPalma(ini, R), CM, s), [0, 0.03 * Math.sin(Math.PI * s), 0]);
    const palma = mezclarDir(ARRIBA, ABAJO, s, [-sg, 0, 0]);
    const dedos = ortogonal(mezclarDir(ini.dedos, arriba.dedos, s), palma);
    const mDa = sostener(c, R, palma, dedos, lerp(ini.cierre, arriba.cierre, s), mezclarDir(ini.codo, arriba.codo, s));
    const m = mezclarMano(reposo(rec), abajo, s);
    const mRec = { ...m, mano: sumaV(m.mano, [0, -0.02 * Math.sin(Math.PI * s), 0]) };
    return { manos: manos(da, mDa, mRec), c, estirar: 1, fase, ambas: k > 0.95 };
  }
  if (fase === 'goma') {
    // Juegan con ella como goma: las manos se alejan (se estira hacia arriba) y se acercan (se aplasta).
    const estirar = separacionGoma(k, MEDIDAS) / R;
    return { manos: manos(da, vertical(da, CM, true, R * estirar), vertical(rec, CM, false, R * estirar)), c: CM, estirar, fase, ambas: true };
  }
  // La de arriba la suelta: sube y vuelve a su lugar con la palma otra vez hacia arriba.
  // La esfera queda en la mano de abajo, que la lleva a su lugar.
  const sube = { ...arriba, mano: sumaV(arriba.mano, [0, 0.05 * entraSaleSeno(clamp(k / 0.35)), 0]) };
  const mDa = mezclarMano(sube, reposo(da), entraSaleSeno(tramo(k, 0.3, 1)), [-sg, 0, 0]);
  const mRec = mezclarMano(abajo, reposo(rec), entraSaleSeno(tramo(k, 0.2, 1)));
  return { manos: manos(da, mDa, mRec), c: enPalma(mRec, R), estirar: 1, fase, ambas: k < 0.05 };
}

const AVISO_TRASPASO: Record<IdTraspaso, string> = {
  juntar: 'Las dos a la vez: una la pone arriba y la otra la recibe abajo',
  goma: 'Una mano arriba y otra abajo: juegan con ella como goma',
  quedarse: 'La de arriba la suelta: queda en la mano de abajo',
};

function pasar(e: Estado, seg: number) {
  const ciclo = SEG_TRASPASO + PAUSA_TRASPASO;
  const n = Math.min(ORDEN_TRASPASOS.length - 1, Math.floor(seg / ciclo));
  const x = Math.min(seg - n * ciclo, SEG_TRASPASO);
  const t = traspaso(ORDEN_TRASPASOS[n], x);
  e.figuras[0].pose = armar(t.manos);
  esferaEn(e, t.c, R, 1.25 + 0.4 * Math.abs(t.estirar - 1), t.estirar, t.fase === 'goma' ? ARRIBA : null);
  e.hud.contador = { valor: n + (x >= SEG_TRASPASO ? 1 : 0), total: ORDEN_TRASPASOS.length, etiqueta: 'traspasos' };
  e.hud.aviso = AVISO_TRASPASO[t.fase];
}

// ── Pasos 3–6 · Cada brazo ──────────────────────────────────────────────

const NOMBRES = { dedos: 'dedos', muneca: 'muñeca', antebrazo: 'antebrazo', codo: 'codo' } as const;
type Punto = keyof typeof NOMBRES;

function rotulo(e: Estado, b: Brazo, pp: PuntoPiel, texto: string, opacidad: number, tipo: 'nombre' | 'distancia' = 'nombre') {
  if (opacidad <= 0) return;
  e.marcas.push({ pos: puntoMundo(e, 0, sumaV(pp.piel, [b.s * 0.1, 0.03, 0])), texto, opacidad, tipo });
}

/** Palpar en un punto: la mano encima y la esfera estirándose como goma. */
function palparEn(e: Estado, b: Brazo, giro: number, pp: PuntoPiel, k: number): Mano {
  const alza = goma(k);
  const mb = encima(b, pp, alza);
  e.figuras[0].pose = armar(manos(b.A, b.palpado(giro), mb));
  esferaGoma(e, pp, alza, 1.25 + 0.25 * (alza / GOMA));
  return mb;
}

/** La esfera se desliza de un punto a otro y la mano la acompaña (si venía cubriendo los dedos, se abre y gira). */
function deslizar(e: Estado, b: Brazo, giro: number, de: PuntoPiel, a: PuntoPiel, k: number, desdeDedos = false) {
  const pp = mezclarPunto(de, a, entraSaleSeno(k));
  const w = desdeDedos ? 1 - tramo(k, 0, 0.6, entraSaleSeno) : 0;
  const mb = encima(b, pp, 0, { cierre: lerp(0.15, CIERRE_CUBRIR, w) }, lerp(PHI_PALPAR, PHI_CUBRIR, w));
  e.figuras[0].pose = armar(manos(b.A, b.palpado(giro), mb));
  esferaGoma(e, pp, 0);
}

const NOMBRE_MANO: Record<Lado, string> = { D: 'derecha', I: 'izquierda' };

/**
 * La mano `b.B`, ahuecada y con la energía de la esfera dentro, cubre los dedos de la
 * otra uno por uno, lentamente y sin tocarlos: llega a cada dedo, se queda cubriéndolo
 * y pasa al siguiente, un poco más arriba. Al terminar, con el pulgar, sube hasta
 * quedar encima de la piel para seguir hacia la muñeca.
 */
function cubrirDedos(e: Estado, b: Brazo, k: number) {
  const n = b.cubrir.length;
  const x = clamp(k) * n;
  const j = Math.min(n - 1, Math.floor(x));
  const kj = x - j;
  const dedo = b.cubrir[j];
  let pp = dedo.cubre;
  let alza = 0;
  if (j > 0 && kj < 0.35) {
    const u = entraSaleSeno(kj / 0.35);
    pp = mezclarPunto(b.cubrir[j - 1].cubre, dedo.cubre, u);
    alza = 0.015 * Math.sin(Math.PI * u);
  }
  // Después del pulgar, la mano sube un poco y queda sobre la piel, como en el resto del brazo.
  if (j === n - 1) pp = mezclarPunto(pp, dedo.sobre, tramo(kj, 0.85, 1, entraSaleSeno));
  const mb = encima(b, pp, alza, { cierre: CIERRE_CUBRIR }, PHI_CUBRIR);
  e.figuras[0].pose = armar(manos(b.A, b.palpado(0), mb));
  const cubriendo = j === 0 ? Math.sin(Math.PI * clamp(kj / 0.85)) : Math.sin(Math.PI * tramo(kj, 0.35, 0.85));
  esferaEn(e, bajoPalma(mb), R, 1.25 + 0.35 * cubriendo);
  const op = ventana(kj, j === 0 ? 0 : 0.3, 0.9, 0.08);
  if (op > 0) e.marcas.push({ pos: puntoMundo(e, 0, dedo.rotulo), texto: dedo.nombre, opacidad: op, tipo: 'nombre' });
  e.hud.contador = { valor: j + (kj >= 0.85 ? 1 : 0), total: n, etiqueta: 'dedos' };
  e.hud.aviso = `La mano ${NOMBRE_MANO[b.B]}, ahuecada y con la energía dentro, cubre el ${dedo.nombre}`;
}

/**
 * El brazo `b.A` se extiende con la palma hacia arriba y la mano `b.B`, que tiene la
 * esfera en la palma, la da vuelta sin soltarla (queda pegada a su palma) y, ahuecada,
 * va a cubrir el primer dedo. Pasa por arriba de los dedos para no rozarlos.
 */
function prepararCubrir(b: Brazo, k: number): { manos: Manos; c: V3 } {
  const s = entraSaleSeno(k);
  const mA = mezclarMano(reposo(b.A), b.palpado(0), s);
  const ini = reposo(b.B);
  const fin = encima(b, b.cubrir[0].cubre, 0, { cierre: CIERRE_CUBRIR }, PHI_CUBRIR);
  const c = sumaV(lerpV(enPalma(ini, R), bajoPalma(fin), s), [0, 0.08 * Math.sin(Math.PI * s), 0]);
  const palma = mezclarDir(ini.palma, fin.palma, s, [-SIGNO[b.B], 0, 0]);
  const dedos = ortogonal(mezclarDir(ini.dedos, fin.dedos, s), palma);
  const mB = sostener(c, R + LUZ_PALMA * s, palma, dedos, lerp(ini.cierre, fin.cierre, s), mezclarDir(ini.codo, fin.codo, s));
  return { manos: manos(b.A, mA, mB), c };
}

type IdDelante = 'preparar' | 'dedos' | 'aMuneca' | 'muneca' | 'aAntebrazo' | 'antebrazo' | 'aCodo' | 'codo';
const fasesDelante = (preparar: number): Fase<IdDelante>[] => [
  { id: 'preparar', dur: preparar },
  // Cinco dedos, 1,8 s cada uno: lento.
  { id: 'dedos', dur: 9 },
  { id: 'aMuneca', dur: 0.9 },
  { id: 'muneca', dur: 2.2 },
  { id: 'aAntebrazo', dur: 0.8 },
  { id: 'antebrazo', dur: 2.2 },
  { id: 'aCodo', dur: 0.8 },
  { id: 'codo', dur: 2.2 },
];
/** Primero se palpa el brazo derecho (con la mano izquierda) y después el izquierdo (descrito en el taller). */
const PRIMERO: Lado = 'D';
const SEGUNDO: Lado = 'I';
/** Cambio de brazo: llevar la esfera al medio, pasarla (una mano arriba y otra abajo) y preparar a cubrir. */
const CAMBIO = { llevar: 2.4, pasar: 1.8, preparar: 2.6 };
const DUR_CAMBIO = CAMBIO.llevar + CAMBIO.pasar + CAMBIO.preparar;
const FASES_DELANTE: Record<Lado, Fase<IdDelante>[]> = { [PRIMERO]: fasesDelante(CAMBIO.preparar), [SEGUNDO]: fasesDelante(DUR_CAMBIO) } as Record<Lado, Fase<IdDelante>[]>;

type IdAtras = 'girar' | 'codo' | 'aAntebrazo' | 'antebrazo' | 'aMuneca' | 'muneca' | 'aYemas' | 'recorrer' | 'quieto' | 'final';
const fasesAtras = (final: number): Fase<IdAtras>[] => [
  { id: 'girar', dur: 1.4 },
  { id: 'codo', dur: 2.2 },
  { id: 'aAntebrazo', dur: 0.8 },
  { id: 'antebrazo', dur: 2.2 },
  { id: 'aMuneca', dur: 0.8 },
  { id: 'muneca', dur: 2.2 },
  { id: 'aYemas', dur: 0.9 },
  { id: 'recorrer', dur: 4.6 },
  { id: 'quieto', dur: 0.6 },
  ...(final > 0 ? [{ id: 'final' as const, dur: final }] : []),
];
const FASES_ATRAS: Record<Lado, Fase<IdAtras>[]> = { [PRIMERO]: fasesAtras(0), [SEGUNDO]: fasesAtras(4.2) } as Record<Lado, Fase<IdAtras>[]>;

/** Dónde lleva la esfera la mano que acaba de recorrer el brazo `b` (debajo de su palma, al frente). */
function frenteLlevando(b: Brazo): Mano {
  const sB = SIGNO[b.B];
  const palma: V3 = [0, -1, 0];
  const hueco: V3 = [sB * 0.12, 1.27, 0.33];
  const dedos = ortogonal(normV([b.s * 0.7, 0, 0.7]), palma);
  return {
    mano: restaV(restaV(hueco, escalaV(dedos, HUECO.dedos)), escalaV(palma, HUECO.piel)),
    palma,
    dedos,
    cierre: 0.15,
    codo: normV([sB * 0.8, -0.5, -0.2]),
  };
}

/** Mano suelta al costado, como en la postura de escucha. */
function suelta(l: Lado): Mano {
  const mano = l === 'D' ? SERENA.manoD : SERENA.manoI;
  const palma = normV(l === 'D' ? SERENA.palmaD : SERENA.palmaI);
  return { mano, palma, dedos: ortogonal([0, -1, 0.1], palma), cierre: SERENA.cierreD, codo: normV(l === 'D' ? SERENA.codoD : SERENA.codoI) };
}

/** Centro de la esfera debajo de la palma de una mano (palma hacia la esfera). */
const bajoPalma = (m: Mano): V3 => enPalma(m, R + LUZ_PALMA);

/**
 * Cambio de brazo (antes del segundo): la mano que recorrió el primer brazo lleva la
 * esfera al medio, arriba; la del brazo ya palpado se pone abajo y la recibe, como en
 * los traspasos (queda en la mano de abajo); después esa mano la da vuelta y cubre los
 * dedos del segundo brazo.
 */
function cambiarDeBrazo(b: Brazo, seg: number): { manos: Manos; c: V3; aviso: string } {
  const previo = BRAZOS[b.B];
  if (seg < CAMBIO.llevar) {
    const k = seg / CAMBIO.llevar;
    // Lleva: la mano con la esfera debajo de la palma (b.A) va al medio, arriba, pasando por delante.
    const finRecorrido = encima(previo, previo.recorrido[previo.recorrido.length - 1], 0);
    const arriba = vertical(b.A, CM, true);
    const s = entraSaleSeno(k);
    const lleva = mezclarMano(finRecorrido, arriba, s);
    const mLleva = { ...lleva, mano: sumaV(lleva.mano, [0, 0.03 * Math.sin(Math.PI * s), 0.06 * Math.sin(Math.PI * s)]) };
    const c = enPalma(mLleva, R + LUZ_PALMA * (1 - s));
    // Recibe: el brazo palpado gira la palma hacia arriba y se pone abajo, antes de que llegue la esfera.
    const sr = entraSaleSeno(tramo(k, 0, 0.7));
    const recibe = mezclarMano(previo.palpado(1), vertical(b.B, CM, false), sr, [-SIGNO[b.B], 0, 0]);
    return { manos: manos(b.A, mLleva, recibe), c, aviso: 'Se sigue con la otra mano: la esfera va al medio, sin soltarla' };
  }
  if (seg < CAMBIO.llevar + CAMBIO.pasar) {
    // La de arriba la suelta y queda en la de abajo (como en los traspasos).
    const k = (seg - CAMBIO.llevar) / CAMBIO.pasar;
    const t = traspaso(b.A, TRASPASO.juntar + TRASPASO.goma + k * TRASPASO.quedarse);
    return { manos: t.manos, c: t.c, aviso: 'La de arriba la suelta: queda en la mano de abajo' };
  }
  const p = prepararCubrir(b, (seg - CAMBIO.llevar - CAMBIO.pasar) / CAMBIO.preparar);
  return { ...p, aviso: `La mano ${NOMBRE_MANO[b.B]} da vuelta la esfera sin soltarla y va a cubrir los dedos` };
}

function delante(e: Estado, A: Lado, seg: number) {
  const b = BRAZOS[A];
  const P = b.puntos;
  const { id, k } = enFase(FASES_DELANTE[A], seg);
  if (id === 'preparar') {
    if (A === PRIMERO) {
      const p = prepararCubrir(b, k);
      e.figuras[0].pose = armar(p.manos);
      esferaEn(e, p.c);
      e.hud.aviso = `La mano ${NOMBRE_MANO[b.B]} da vuelta la esfera sin soltarla y va a cubrir los dedos`;
    } else {
      const p = cambiarDeBrazo(b, k * DUR_CAMBIO);
      e.figuras[0].pose = armar(p.manos);
      esferaEn(e, p.c);
      e.hud.aviso = p.aviso;
    }
    return;
  }
  if (id === 'dedos') {
    cubrirDedos(e, b, k);
    return;
  }
  const orden: Punto[] = ['muneca', 'antebrazo', 'codo'];
  const hechos = id === 'aMuneca' || id === 'muneca' ? 0 : id === 'aAntebrazo' || id === 'antebrazo' ? 1 : 2;
  e.hud.contador = { valor: hechos + (k >= 1 && !id.startsWith('a') ? 1 : 0), total: 3, etiqueta: 'puntos · por delante' };
  if (id.startsWith('a')) {
    const a = orden[hechos];
    // Desde el último dedo (el pulgar), la mano se abre y acompaña a la esfera.
    const de = hechos === 0 ? b.cubrir[b.cubrir.length - 1].sobre : P[orden[hechos - 1]];
    deslizar(e, b, 0, de, P[a], k, hechos === 0);
    e.hud.aviso = `La mano acompaña a la esfera hasta ${a === 'muneca' ? 'la muñeca' : a === 'antebrazo' ? 'el antebrazo' : 'el codo'}`;
  } else {
    const pto = id as Punto;
    palparEn(e, b, 0, P[pto], k);
    rotulo(e, b, P[pto], NOMBRES[pto], ventana(k, 0, 1, 0.1));
    e.hud.aviso = `Por delante: como goma en ${pto === 'muneca' ? 'la muñeca' : pto === 'antebrazo' ? 'el antebrazo' : 'el codo'}`;
  }
}

function atras(e: Estado, A: Lado, seg: number) {
  const b = BRAZOS[A];
  const P = b.puntos;
  const { id, k } = enFase(FASES_ATRAS[A], seg);
  if (id === 'girar') {
    // El brazo gira con la palma hacia abajo; la esfera sigue sobre el codo.
    const giro = entraSaleSeno(k);
    e.figuras[0].pose = armar(manos(A, b.palpado(giro), encima(b, P.codo, 0)));
    esferaGoma(e, P.codo, 0);
    e.hud.aviso = 'El brazo gira: ahora por atrás';
    return;
  }
  const orden: Punto[] = ['codo', 'antebrazo', 'muneca'];
  if (id === 'codo' || id === 'antebrazo' || id === 'muneca' || id === 'aAntebrazo' || id === 'aMuneca') {
    const hechos = id === 'codo' ? 0 : id === 'aAntebrazo' || id === 'antebrazo' ? 1 : 2;
    e.hud.contador = { valor: hechos + (k >= 1 && !id.startsWith('a') ? 1 : 0), total: 3, etiqueta: 'puntos · por atrás' };
    if (id.startsWith('a')) {
      deslizar(e, b, 1, P[orden[hechos - 1]], P[orden[hechos]], k);
      e.hud.aviso = 'La mano acompaña a la esfera, por atrás';
    } else {
      const pto = id as Punto;
      palparEn(e, b, 1, P[pto], k);
      rotulo(e, b, P[pto], NOMBRES[pto], ventana(k, 0, 1, 0.1));
      e.hud.aviso = `Por atrás: como goma en ${pto === 'muneca' ? 'la muñeca' : pto === 'antebrazo' ? 'el antebrazo' : 'el codo'}`;
    }
    return;
  }
  e.hud.contador = { valor: 3, total: 3, etiqueta: 'puntos · por atrás' };
  if (id === 'aYemas') {
    // La esfera va con la mano hasta la punta de los dedos, para empezar el recorrido.
    deslizar(e, b, 1, P.muneca, b.recorrido[0], k);
    e.hud.aviso = 'Hasta la punta de los dedos';
    return;
  }
  if (id === 'recorrer' || id === 'quieto') {
    const u = id === 'recorrer' ? entraSaleSeno(k) : 1;
    const pp = aLoLargo(b.recorrido, u);
    const mb = encima(b, pp, 0);
    e.figuras[0].pose = armar(manos(A, b.palpado(1), mb));
    esferaGoma(e, pp, 0);
    rotulo(e, b, pp, '5–10 cm', id === 'recorrer' ? ventana(k, 0, 1, 0.08) : 1 - k, 'distancia');
    e.hud.aviso = 'La mano recorre el brazo sin tocarlo, a 5–10 cm, hasta el hombro';
    return;
  }
  e.hud.contador = null;
  // Final (después del segundo brazo), por turnos: el brazo palpado se suelta al costado; la otra
  // mano trae la esfera al frente, gira por debajo sin soltarla y la esfera se absorbe en la palma; las manos se sueltan.
  const finRecorrido = encima(b, b.recorrido[b.recorrido.length - 1], 0);
  const lleva = frenteLlevando(b);
  const sB = SIGNO[b.B];
  const mA = mezclarMano(b.palpado(1), suelta(A), entraSaleSeno(clamp(k / 0.22)));
  let mB: Mano;
  let c: V3;
  let r = R;
  if (k < 0.22) {
    mB = finRecorrido;
    c = bajoPalma(mB);
  } else if (k < 0.47) {
    mB = mezclarMano(finRecorrido, lleva, entraSaleSeno((k - 0.22) / 0.25));
    c = bajoPalma(mB);
  } else {
    c = bajoPalma(lleva);
    const palma = mezclarDir([0, -1, 0], ARRIBA, entraSaleSeno(clamp((k - 0.47) / 0.2)), [-sB, 0, 0]);
    mB = sostener(c, R + LUZ_PALMA, palma, ortogonal(lleva.dedos, palma), 0.15, lleva.codo);
    r = R * (1 - tramo(k, 0.68, 0.82));
  }
  let pose = armar(manos(A, mA, mB));
  if (k > 0.82) pose = mezclarPose(pose, SERENA, entraSaleSeno((k - 0.82) / 0.18), 0.04);
  e.figuras[0].pose = pose;
  if (r > 0.001) esferaEn(e, c, r);
  else e.esferas[0].activa = false;
  pulso(e, puntoMundo(e, 0, c), tramo(k, 0.68, 0.88), 0.2, 'oro');
  e.hud.aviso = k < 0.22 ? 'El brazo se suelta' : k < 0.68 ? 'La esfera vuelve a la palma' : 'Sensaciones: calor, presión, hormigueo, electricidad';
}

// ── Cámaras ─────────────────────────────────────────────────────────────

const CAM_MANOS = encuadre([0, 1.2, 0.32], 0.5, 0.25, 0.22);
const camDelante = (A: Lado): Camara => encuadre([SIGNO[A] * 0.07, 1.25, 0.27], 0.56, SIGNO[A] * 0.25, 0.22);
const camHombro = (A: Lado): Camara => encuadre([SIGNO[A] * 0.12, 1.32, 0.15], 0.85, SIGNO[A] * 0.6, 0.2);
/** De cerca y desde el lado del pulgar, un poco por encima: se ve la mano ahuecada sobre cada dedo, sin tocarlo. */
const camDedos = (A: Lado): Camara => encuadre(sumaV(BRAZOS[A].puntos.dedos.piel, [0, 0.01, 0]), 0.27, SIGNO[A] * 0.77, 0.22);

function pasoDelante(A: Lado) {
  const fases = FASES_DELANTE[A];
  const dur = duracion(fases);
  const inicio = (id: IdDelante) => duracion(fases.slice(0, fases.findIndex((f) => f.id === id))) / dur;
  const tDedos = inicio('dedos');
  const tMuneca = inicio('aMuneca');
  return {
    dur,
    aplicar: (e: Estado, t: number) => {
      toma(e, A === PRIMERO ? camDelante(A) : CAM_MANOS, t, 0, 0.1);
      if (A === SEGUNDO) toma(e, camDelante(A), t, tDedos - 0.12, tDedos - 0.02);
      toma(e, camDedos(A), t, tDedos - 0.04, tDedos + 0.04);
      toma(e, camDelante(A), t, tMuneca - 0.02, tMuneca + 0.06);
      delante(e, A, t * dur);
    },
  };
}

function pasoAtras(A: Lado) {
  const fases = FASES_ATRAS[A];
  const dur = duracion(fases);
  const inicioRecorrer = fases.slice(0, fases.findIndex((f) => f.id === 'recorrer')).reduce((a, f) => a + f.dur, 0) / dur;
  const finQuieto = fases.slice(0, fases.findIndex((f) => f.id === 'quieto') + 1).reduce((a, f) => a + f.dur, 0) / dur;
  return {
    dur,
    aplicar: (e: Estado, t: number) => {
      toma(e, camHombro(A), t, inicioRecorrer - 0.04, inicioRecorrer + 0.08);
      if (A === SEGUNDO) toma(e, TOMAS.general, t, finQuieto + 0.05, 0.97);
      atras(e, A, t * dur);
    },
  };
}

export const sensibilizacionManos: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Cargar de las barras y formar la esfera
    {
      dur: DUR_TOMAR,
      aplicar: (e, t) => {
        toma(e, ENCUADRE_BARRAS, t, 0, 0.15);
        toma(e, CAM_JUNTAR, t, T_JUNTAR, T_JUNTAR + 0.12);
        toma(e, CAM_MANOS, t, T_BAJAR, T_BAJAR + 0.12);
        tomarEsferas(e, t * DUR_TOMAR);
      },
    },
    // 2 · Pasar de mano en mano, lentamente, jugando como goma y sin soltarla
    {
      dur: DUR_PASAR,
      aplicar: (e, t) => {
        e.esferas[1].activa = false;
        e.esferas[2].activa = false;
        pasar(e, t * DUR_PASAR);
      },
    },
    // 3 · Brazo derecho: la mano izquierda cubre los dedos y sigue por delante
    pasoDelante(PRIMERO),
    // 4 · Brazo derecho: por atrás y recorrido hasta el hombro
    pasoAtras(PRIMERO),
    // 5 · Brazo izquierdo: cambio de brazo, la derecha cubre los dedos y sigue por delante
    pasoDelante(SEGUNDO),
    // 6 · Brazo izquierdo: por atrás, recorrido hasta el hombro y final
    pasoAtras(SEGUNDO),
  ],
};

export const sensibilizarInterno = {
  BRAZOS,
  R,
  DIST,
  GOMA,
  traspaso,
  enPalma,
  reposo,
  ORDEN_TRASPASOS,
  FASES_TOMAR,
  FASES_TRASPASO,
  SEG_TRASPASO,
  PAUSA_TRASPASO,
  FASES_DELANTE,
  FASES_ATRAS,
  PRIMERO,
  SEGUNDO,
  CIERRE_CUBRIR,
  aLoLargo,
};
