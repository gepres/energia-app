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
  saleAtras,
  sumaV,
  tramo,
  ventana,
} from '../escena/mate';
import { HUECO, SERENA } from '../escena/poses';
import { TOMAS, esfera, pulso } from './comunes';
import { type Secuencia, encuadre, fijarPose, puntoMundo, toma } from './motor';

/**
 * «Sensibilización de manos» (enseñado por Víctor), pulida con el taller:
 *  - se toman dos esferas y se juntan;
 *  - la esfera pasa de mano en mano **sin soltarla nunca**: la otra mano la
 *    toma y la sostienen entre las dos; recién entonces la primera la suelta;
 *  - la otra mano palpa la energía de los dedos, como quien toca la tela de un
 *    poncho, y la estira como goma;
 *  - la esfera se desliza por el brazo y la mano la acompaña, haciendo de goma
 *    en la muñeca, el antebrazo y el codo: por delante (palma arriba) y, con el
 *    brazo girado, por atrás;
 *  - la mano recorre el brazo sin tocarlo, a 5–10 cm, desde los dedos hasta el hombro;
 *  - después, lo mismo con el otro brazo.
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

/** Las dos palmas enfrentadas a los costados de `c`, con los dedos al frente. */
function frenteAFrente(c: V3, sep: number): Manos {
  const m = (l: Lado): Mano => {
    const s = SIGNO[l];
    const dedos = normV([0, 0.06, 1]);
    return sostener(c, sep, [-s, 0, 0], dedos, 0.25, normV([s, -0.6, -0.35]));
  };
  return { D: m('D'), I: m('I') };
}

/**
 * La mano `rec` termina de recibir la esfera: la tiene tomada de costado (palma
 * hacia `hacia`, inclinada `theta0` desde arriba) y gira por debajo de ella hasta
 * sostenerla en la palma, ya en su lugar de reposo. Nunca la suelta.
 */
function recibir(rec: Lado, c0: V3, hacia: number, theta0: number, k: number): { mano: Mano; c: V3 } {
  const fin = reposo(rec);
  const c1 = enPalma(fin, R);
  const s = entraSaleSeno(k);
  const c = sumaV(lerpV(c0, c1, s), [0, 0.015 * Math.sin(Math.PI * s), 0]);
  const th = theta0 * (1 - s);
  const palma: V3 = [hacia * Math.sin(th), Math.cos(th), 0];
  const dedos = ortogonal(normV(lerpV(normV([0, 0.06, 1]), fin.dedos, s)), palma);
  const codo = mezclarDir(normV([SIGNO[rec], -0.5, -0.3]), fin.codo, s);
  return { mano: sostener(c, R, palma, dedos, lerp(0.28, fin.cierre, s), codo), c };
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
  /** Recorrido de la mano por atrás, desde las yemas hasta el hombro. */
  recorrido: PuntoPiel[];
}

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
  return { A, B, s, palpado, puntos, recorrido };
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
function encima(b: Brazo, pp: PuntoPiel, alza: number, extra: Partial<Mano> = {}): Mano {
  const hueco = sumaV(pp.piel, escalaV(pp.normal, DIST + alza));
  const palma = escalaV(pp.normal, -1);
  const dedos = ortogonal(normV([b.s * 0.7, 0, 0.7]), palma);
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

function esferaEn(e: Estado, c: V3, r = R, brillo = 1.25) {
  esfera(e, 0, { ref: null, pegado: 0, pos: puntoMundo(e, 0, c), radio: r, estirar: 1, eje: null, brillo, color: 'oro', color2: 'blanco', mezcla: 0.3, opacidad: 1 });
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

// ── Paso 1 · Tomar dos esferas y juntarlas ──────────────────────────────

const C0: V3 = [0, 1.21, 0.33];
const SEP_ABIERTA = 0.075;
const FASES_TOMAR: Fase<'aparecen' | 'acercan' | 'unen' | 'recibe'>[] = [
  { id: 'aparecen', dur: 2.2 },
  { id: 'acercan', dur: 2 },
  { id: 'unen', dur: 1.1 },
  { id: 'recibe', dur: 1.8 },
];
const DUR_TOMAR = duracion(FASES_TOMAR);
const REPOSO: Manos = { D: reposo('D'), I: reposo('I') };

function esferasDePalmas(e: Estado, r: number) {
  for (const [i, ancla] of [
    [1, 'manoD'],
    [2, 'manoI'],
  ] as const) {
    esfera(e, i, { activa: r > 0.001, ref: enPalmaRef(ancla, r * 0.92 + 0.002), pegado: 1, radio: r, estirar: 1, eje: null, brillo: 1.15, color: 'oro', color2: 'blanco', mezcla: 0.3, opacidad: 1 });
  }
}

function tomarEsferas(e: Estado, seg: number) {
  const { id, k } = enFase(FASES_TOMAR, seg);
  const s = entraSaleSeno(k);
  if (id === 'aparecen') {
    e.figuras[0].pose = mezclarPose(SERENA, armar(REPOSO), tramo(k, 0, 0.6), 0.04);
    esferasDePalmas(e, R_MANO * saleAtras(tramo(k, 0.45, 0.9)));
    e.hud.aviso = 'Una esfera en cada palma';
  } else if (id === 'acercan') {
    e.figuras[0].pose = mezclarPose(armar(REPOSO), armar(frenteAFrente(C0, SEP_ABIERTA)), s, 0);
    esferasDePalmas(e, R_MANO);
    e.hud.aviso = 'Acercar las manos con las esferas';
  } else if (id === 'unen') {
    e.figuras[0].pose = armar(frenteAFrente(C0, lerp(SEP_ABIERTA, R, s)));
    esferasDePalmas(e, R_MANO * (1 - tramo(k, 0.55, 1)));
    const crece = saleAtras(tramo(k, 0.5, 1));
    if (crece > 0) esferaEn(e, C0, R * crece);
    pulso(e, puntoMundo(e, 0, C0), tramo(k, 0.45, 1), 0.1, 'oro');
    e.hud.aviso = 'Las dos esferas se juntan en una';
  } else {
    // La derecha gira por debajo y se queda con la esfera; la izquierda la suelta recién entonces.
    esferasDePalmas(e, 0);
    const r = recibir('D', C0, 1, Math.PI / 2, k);
    const ini = frenteAFrente(C0, R).I;
    e.figuras[0].pose = armar({ D: r.mano, I: mezclarMano(ini, reposo('I'), tramo(k, 0.35, 1)) });
    esferaEn(e, r.c);
    e.hud.aviso = 'La derecha se queda con la esfera';
  }
}

// ── Paso 2 · Pasar de mano en mano, sin soltarla ────────────────────────

const SEG_TRASPASO = 2.6;
/** Dar → tomarla de costado, sostenerla entre las dos y recién entonces soltarla. */
const ORDEN_TRASPASOS: Lado[] = ['D', 'I', 'D'];
/** Inclinación de la mano que recibe al tomarla de costado y por arriba (desde la vertical). */
const THETA_TOMA = (127 * Math.PI) / 180;
const PAUSA_TRASPASO = 0.3;
const DUR_PASAR = ORDEN_TRASPASOS.length * SEG_TRASPASO + (ORDEN_TRASPASOS.length - 1) * PAUSA_TRASPASO;

/** Un traspaso: la mano `da` tiene la esfera en la palma y la otra la recibe. */
function traspaso(da: Lado, k: number): { manos: Manos; c: V3; ambas: boolean } {
  const rec = OTRO[da];
  const sg = SIGNO[da];
  const cDa = enPalma(reposo(da), R);
  const nToma: V3 = [sg * Math.sin(THETA_TOMA), Math.cos(THETA_TOMA), 0];
  const toma = sostener(cDa, R, nToma, ortogonal(normV([0, 0.06, 1]), nToma), 0.28, normV([SIGNO[rec], -0.4, -0.3]));
  if (k < 0.35) {
    // La otra mano se acerca y la toma de costado, desde arriba.
    return { manos: manos(da, reposo(da), mezclarMano(reposo(rec), toma, entraSaleSeno(k / 0.35))), c: cDa, ambas: k > 0.3 };
  }
  if (k < 0.5) return { manos: manos(da, reposo(da), toma), c: cDa, ambas: true };
  // Recién ahora la primera la suelta: la otra gira por debajo y se la lleva a su palma.
  const kk = (k - 0.5) / 0.5;
  const r = recibir(rec, cDa, sg, THETA_TOMA, kk);
  const baja = 0.025 * Math.sin(Math.PI * clamp(kk / 0.6));
  const da2 = { ...reposo(da), mano: sumaV(reposo(da).mano, [sg * 0.01 * baja, -baja, 0]) };
  return { manos: manos(da, da2, r.mano), c: r.c, ambas: kk < 0.15 };
}

function pasar(e: Estado, seg: number) {
  const ciclo = SEG_TRASPASO + PAUSA_TRASPASO;
  const n = Math.min(ORDEN_TRASPASOS.length - 1, Math.floor(seg / ciclo));
  const k = clamp((seg - n * ciclo) / SEG_TRASPASO);
  const t = traspaso(ORDEN_TRASPASOS[n], k);
  e.figuras[0].pose = armar(t.manos);
  esferaEn(e, t.c);
  e.hud.contador = { valor: n + (k >= 1 ? 1 : 0), total: ORDEN_TRASPASOS.length, etiqueta: 'traspasos' };
  e.hud.aviso = t.ambas ? 'La sostienen entre las dos manos' : k < 0.5 ? 'La otra mano se acerca y la toma' : 'Recién entonces la primera la suelta';
}

// ── Pasos 3–6 · Cada brazo ──────────────────────────────────────────────

const NOMBRES = { dedos: 'dedos', muneca: 'muñeca', antebrazo: 'antebrazo', codo: 'codo' } as const;
type Punto = keyof typeof NOMBRES;

function rotulo(e: Estado, b: Brazo, pp: PuntoPiel, texto: string, opacidad: number, tipo: 'nombre' | 'distancia' = 'nombre') {
  if (opacidad <= 0) return;
  e.marcas.push({ pos: puntoMundo(e, 0, sumaV(pp.piel, [b.s * 0.1, 0.03, 0])), texto, opacidad, tipo });
}

/** Palpar en un punto: la mano encima, la esfera estirándose como goma; en los dedos, el pulgar frota los dedos. */
function palparEn(e: Estado, b: Brazo, giro: number, pp: PuntoPiel, k: number, frotar: boolean): Mano {
  const alza = goma(k);
  const extra: Partial<Mano> = frotar
    ? { pinza: 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 5 * k)), tipoPinza: 1, cierre: 0.25 }
    : {};
  const mb = encima(b, pp, alza, extra);
  e.figuras[0].pose = armar(manos(b.A, b.palpado(giro), mb));
  esferaGoma(e, pp, alza, 1.25 + 0.25 * (alza / GOMA));
  return mb;
}

/** La esfera se desliza de un punto a otro y la mano la acompaña. */
function deslizar(e: Estado, b: Brazo, giro: number, de: PuntoPiel, a: PuntoPiel, k: number, pinzaInicial = 0) {
  const pp = mezclarPunto(de, a, entraSaleSeno(k));
  const mb = encima(b, pp, 0, { pinza: pinzaInicial * (1 - tramo(k, 0, 0.4)), tipoPinza: 1 });
  e.figuras[0].pose = armar(manos(b.A, b.palpado(giro), mb));
  esferaGoma(e, pp, 0);
}

type IdDelante = 'preparar' | 'dedos' | 'aMuneca' | 'muneca' | 'aAntebrazo' | 'antebrazo' | 'aCodo' | 'codo';
const fasesDelante = (preparar: number): Fase<IdDelante>[] => [
  { id: 'preparar', dur: preparar },
  { id: 'dedos', dur: 4 },
  { id: 'aMuneca', dur: 0.9 },
  { id: 'muneca', dur: 2.2 },
  { id: 'aAntebrazo', dur: 0.8 },
  { id: 'antebrazo', dur: 2.2 },
  { id: 'aCodo', dur: 0.8 },
  { id: 'codo', dur: 2.2 },
];
const FASES_DELANTE: Record<Lado, Fase<IdDelante>[]> = { I: fasesDelante(1.8), D: fasesDelante(3.4) };

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
const FASES_ATRAS: Record<Lado, Fase<IdAtras>[]> = { I: fasesAtras(0), D: fasesAtras(4.2) };

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

/** Mano apartada, arriba y afuera, con la palma hacia abajo: deja lugar mientras la otra trae la esfera. */
function espera(l: Lado): Mano {
  const s = SIGNO[l];
  const palma: V3 = [0, -1, 0];
  return { mano: [s * 0.22, 1.3, 0.24], palma, dedos: ortogonal(normV([-s * 0.3, 0, 1]), palma), cierre: 0.15, codo: normV([s * 0.9, -0.4, -0.2]) };
}

/** Mano suelta al costado, como en la postura de escucha. */
function suelta(l: Lado): Mano {
  const mano = l === 'D' ? SERENA.manoD : SERENA.manoI;
  const palma = normV(l === 'D' ? SERENA.palmaD : SERENA.palmaI);
  return { mano, palma, dedos: ortogonal([0, -1, 0.1], palma), cierre: SERENA.cierreD, codo: normV(l === 'D' ? SERENA.codoD : SERENA.codoI) };
}

/** Centro de la esfera debajo de la palma de una mano (palma hacia la esfera). */
const bajoPalma = (m: Mano): V3 => enPalma(m, R + LUZ_PALMA);

function delante(e: Estado, A: Lado, seg: number) {
  const b = BRAZOS[A];
  const P = b.puntos;
  const { id, k } = enFase(FASES_DELANTE[A], seg);
  const frotar = { pinza: 0.55, tipoPinza: 1, cierre: 0.25 };
  if (id === 'preparar') {
    const destino = manos(A, b.palpado(0), encima(b, P.dedos, 0, frotar));
    const cDedos = sumaV(P.dedos.piel, escalaV(P.dedos.normal, LUZ_PIEL + R));
    if (A === 'I') {
      // La izquierda, con la esfera en la palma, se extiende; la esfera pasa a los dedos y la derecha llega encima.
      const s = entraSaleSeno(k);
      const mA = mezclarMano(reposo(A), b.palpado(0), s);
      const mB = mezclarMano(reposo(b.B), destino[b.B], s, [-SIGNO[b.B], 0, 0]);
      e.figuras[0].pose = armar(manos(A, mA, mB));
      esferaEn(e, lerpV(enPalma(mA, R), cDedos, tramo(k, 0.35, 1)));
    } else {
      // Se sigue con la otra mano, por turnos para que las manos no se crucen:
      // 1) el brazo izquierdo se aparta; 2) la derecha trae la esfera al frente, de su lado;
      // 3) gira por debajo de ella, sin soltarla; 4) se extiende y la izquierda llega encima de los dedos.
      const bPrevio = BRAZOS[b.B];
      const finRecorrido = encima(bPrevio, bPrevio.recorrido[bPrevio.recorrido.length - 1], 0);
      const lleva = frenteLlevando(bPrevio);
      let mLleva: Mano;
      let c: V3;
      if (k < 0.25) {
        mLleva = finRecorrido;
        c = bajoPalma(mLleva);
      } else if (k < 0.5) {
        mLleva = mezclarMano(finRecorrido, lleva, entraSaleSeno((k - 0.25) / 0.25));
        c = bajoPalma(mLleva);
      } else {
        c = bajoPalma(lleva);
        // Gira la mano por debajo de la esfera, por afuera: la esfera queda en la palma.
        const palma = mezclarDir([0, -1, 0], ARRIBA, entraSaleSeno(clamp((k - 0.5) / 0.22)), [-SIGNO[A], 0, 0]);
        mLleva = sostener(c, R + LUZ_PALMA, palma, ortogonal(lleva.dedos, palma), 0.15, lleva.codo);
        if (k > 0.72) {
          const s = entraSaleSeno((k - 0.72) / 0.28);
          mLleva = mezclarMano(mLleva, b.palpado(0), s);
          c = lerpV(enPalma(mLleva, R + LUZ_PALMA), cDedos, tramo(s, 0.3, 1));
        }
      }
      const mOtra =
        k < 0.72
          ? mezclarMano(bPrevio.palpado(1), espera(b.B), entraSaleSeno(clamp(k / 0.25)))
          : mezclarMano(espera(b.B), destino[b.B], entraSaleSeno((k - 0.72) / 0.28));
      e.figuras[0].pose = armar(manos(A, mLleva, mOtra));
      esferaEn(e, c);
      e.hud.aviso = 'Se sigue con la otra mano, sin soltar la esfera';
      return;
    }
    e.hud.aviso = 'La esfera pasa a los dedos';
    return;
  }
  if (id === 'dedos') {
    palparEn(e, b, 0, P.dedos, k, true);
    rotulo(e, b, P.dedos, NOMBRES.dedos, ventana(k, 0, 1, 0.1));
    e.hud.aviso = 'Palpa la energía de los dedos, como quien toca la tela de un poncho';
    return;
  }
  const orden: Punto[] = ['muneca', 'antebrazo', 'codo'];
  const hechos = id === 'aMuneca' || id === 'muneca' ? 0 : id === 'aAntebrazo' || id === 'antebrazo' ? 1 : 2;
  e.hud.contador = { valor: hechos + (k >= 1 && !id.startsWith('a') ? 1 : 0), total: 3, etiqueta: 'puntos · por delante' };
  if (id.startsWith('a')) {
    const a = orden[hechos];
    const de = hechos === 0 ? P.dedos : P[orden[hechos - 1]];
    deslizar(e, b, 0, de, P[a], k, hechos === 0 ? 0.55 : 0);
    e.hud.aviso = `La mano acompaña a la esfera hasta ${a === 'muneca' ? 'la muñeca' : a === 'antebrazo' ? 'el antebrazo' : 'el codo'}`;
  } else {
    const pto = id as Punto;
    palparEn(e, b, 0, P[pto], k, false);
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
      palparEn(e, b, 1, P[pto], k, false);
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
  // Final (después del segundo brazo), por turnos: el brazo palpado se suelta al costado; la izquierda
  // trae la esfera al frente, gira por debajo sin soltarla y la esfera se absorbe en la palma; las manos se sueltan.
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

function pasoAtras(A: Lado) {
  const fases = FASES_ATRAS[A];
  const dur = duracion(fases);
  const inicioRecorrer = fases.slice(0, fases.findIndex((f) => f.id === 'recorrer')).reduce((a, f) => a + f.dur, 0) / dur;
  const finQuieto = fases.slice(0, fases.findIndex((f) => f.id === 'quieto') + 1).reduce((a, f) => a + f.dur, 0) / dur;
  return {
    dur,
    aplicar: (e: Estado, t: number) => {
      toma(e, camHombro(A), t, inicioRecorrer - 0.04, inicioRecorrer + 0.08);
      if (A === 'D') toma(e, TOMAS.general, t, finQuieto + 0.05, 0.97);
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
    // 1 · Tomar dos esferas y juntarlas
    {
      dur: DUR_TOMAR,
      aplicar: (e, t) => {
        toma(e, CAM_MANOS, t, 0, 0.3);
        tomarEsferas(e, t * DUR_TOMAR);
      },
    },
    // 2 · Pasar de mano en mano, sin soltarla
    {
      dur: DUR_PASAR,
      aplicar: (e, t) => {
        e.esferas[1].activa = false;
        e.esferas[2].activa = false;
        pasar(e, t * DUR_PASAR);
      },
    },
    // 3 · Brazo izquierdo: dedos y por delante
    {
      dur: duracion(FASES_DELANTE.I),
      aplicar: (e, t) => {
        toma(e, camDelante('I'), t, 0, 0.12);
        delante(e, 'I', t * duracion(FASES_DELANTE.I));
      },
    },
    // 4 · Brazo izquierdo: por atrás y recorrido hasta el hombro
    pasoAtras('I'),
    // 5 · Brazo derecho: dedos y por delante
    {
      dur: duracion(FASES_DELANTE.D),
      aplicar: (e, t) => {
        toma(e, camDelante('D'), t, 0.02, 0.2);
        delante(e, 'D', t * duracion(FASES_DELANTE.D));
      },
    },
    // 6 · Brazo derecho: por atrás, recorrido hasta el hombro y final
    pasoAtras('D'),
  ],
};

export const sensibilizarInterno = { BRAZOS, R, DIST, GOMA, traspaso, enPalma, reposo, ORDEN_TRASPASOS, FASES_DELANTE, FASES_ATRAS, aLoLargo };
