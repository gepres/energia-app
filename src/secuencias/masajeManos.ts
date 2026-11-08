import { type Pose, copiarPose, mezclarPose, pose, resolverEsqueleto } from '../escena/cuerpo';
import type { Estado } from '../escena/estado';
import { FALANGES, manoEnPinza, segmentosMano } from '../escena/manos';
import { type V3, clamp, cruzV, entraSaleSeno, lerpV, normV } from '../escena/mate';
import { SERENA } from '../escena/poses';
import { TOMAS, esfera } from './comunes';
import { type Secuencia, encuadre, fijarPose, toma } from './motor';

/**
 * «Masaje de manos y dedos», tal como lo describió el taller: con una mano se
 * masajea la otra, primero la palma y después dedo por dedo, falange por
 * falange; después se cambia de mano. Primero la derecha masajea la izquierda.
 * La palma: la mano que masajea la sostiene por debajo y su pulgar hace
 * círculos. Cada falange: el pulgar (arriba) y el índice (abajo) la toman como
 * una pinza y hacen 3 círculos. Del pulgar al meñique.
 */

type Lado = 'D' | 'I';
const SIGNO: Record<Lado, number> = { D: 1, I: -1 };

/** Segundos para pasar de una parada a la siguiente y de cada círculo. */
const SEG_MOVER = 0.4;
const SEG_CIRCULO = 0.45;
const CIRCULOS_FALANGE = 3;
const CIRCULOS_PALMA = 2;
/** Radio de los círculos sobre una falange y sobre la palma (m). */
const RADIO_FALANGE = 0.004;
const RADIO_PALMA = 0.008;
/** Mano masajeada: abierta, con la palma hacia arriba, delante del abdomen. */
const CIERRE_MASAJEADA = 0.06;
const CIERRE_MASAJEA = 0.12;

/** Zonas de la palma que recorre el pulgar (sin escala; a hacia el pulgar, b hacia los dedos). */
const ZONAS_PALMA: [number, number][] = [
  [0, 0.03],
  [0.018, 0.045],
  [0, 0.055],
  [-0.018, 0.05],
  [0, 0.078],
];

/** Pose de la mano masajeada (la otra queda serena). */
function poseMasajeada(lado: Lado): Pose {
  const s = lado === 'D' ? -1 : 1; // en x del cuerpo: derecha en −X
  const p = copiarPose(SERENA);
  // A 23 cm del cuerpo: así la otra mano llega con el brazo cómodo hasta la punta de cada dedo.
  const mano: V3 = [s * 0.09, 1.08, 0.23];
  const dedos = normV([-s * 0.3, 0.04, 1]);
  if (lado === 'I') {
    Object.assign(p, { manoI: mano, palmaI: [0, 1, 0], dedosI: dedos, codoI: normV([1, -0.7, -0.2]), cierreI: CIERRE_MASAJEADA });
  } else {
    Object.assign(p, { manoD: mano, palmaD: [0, 1, 0], dedosD: dedos, codoD: normV([-1, -0.7, -0.2]), cierreD: CIERRE_MASAJEADA });
  }
  return p;
}

interface Parada {
  /** Centro de lo que toma la pinza, su eje y su lado de arriba. */
  C: V3;
  d: V3;
  n: V3;
  circulos: number;
  radio: number;
  tipo: 'palma' | 'falange';
  dedo?: string;
  falange?: number;
  numDedo?: number;
}

/** Recorrido de la mano que masajea sobre la mano `masajeada`: palma y luego cada falange. */
function recorrido(masajeada: Lado): Parada[] {
  const esq = resolverEsqueleto(poseMasajeada(masajeada));
  const pm = masajeada === 'I' ? esq.palmaI : esq.palmaD;
  const muneca = masajeada === 'I' ? esq.munecaI : esq.munecaD;
  const s = SIGNO[masajeada];
  const F = pm.dedos;
  const N = pm.normal;
  const X = normV(cruzV(F, N));
  const T: V3 = [X[0] * s, X[1] * s, X[2] * s];
  const K = 0.94;
  const paradas: Parada[] = ZONAS_PALMA.map(([a, b]) => ({
    C: [muneca[0] + (T[0] * a + F[0] * b) * K, muneca[1] + (T[1] * a + F[1] * b) * K, muneca[2] + (T[2] * a + F[2] * b) * K],
    d: F,
    n: N,
    circulos: CIRCULOS_PALMA,
    radio: RADIO_PALMA,
    tipo: 'palma',
  }));
  const segs = segmentosMano(muneca, F, N, s, CIERRE_MASAJEADA, 0);
  const nombres = ['pulgar', 'índice', 'medio', 'anular', 'meñique'];
  for (const f of FALANGES) {
    const g = segs[f.i];
    paradas.push({
      C: [g.pos[0] + (g.dir[0] * g.largo) / 2, g.pos[1] + (g.dir[1] * g.largo) / 2, g.pos[2] + (g.dir[2] * g.largo) / 2],
      d: g.dir,
      // Lado de arriba de la falange (el de la palma, que mira hacia arriba).
      n: normV(g.z),
      circulos: CIRCULOS_FALANGE,
      radio: RADIO_FALANGE,
      tipo: 'falange',
      dedo: f.dedo,
      falange: f.falange,
      numDedo: nombres.indexOf(f.dedo) + 1,
    });
  }
  return paradas;
}

const RECORRIDO: Record<Lado, Parada[]> = { I: recorrido('I'), D: recorrido('D') };
const HOMBRO: Record<Lado, V3> = { D: [-0.182, 1.415, -0.01], I: [0.182, 1.415, -0.01] };

/**
 * Mano que masajea tomando la parada: de las dos maneras de tomarla (pulgar
 * hacia la punta o hacia la base), la que deja la muñeca más cerca de su hombro.
 */
function tomar(masajea: Lado, p: Parada, offset: V3 = [0, 0, 0]) {
  const s = SIGNO[masajea];
  const C: V3 = [p.C[0] + offset[0], p.C[1] + offset[1], p.C[2] + offset[2]];
  const a = manoEnPinza(C, p.d, p.n, s);
  const b = manoEnPinza(C, [-p.d[0], -p.d[1], -p.d[2]], p.n, s);
  const h = HOMBRO[masajea];
  const dist = (m: V3) => Math.hypot(m[0] - h[0], m[1] - h[1], m[2] - h[2]);
  return dist(a.muneca) <= dist(b.muneca) ? a : b;
}

/** Pose completa: la mano masajeada quieta y la otra en pinza sobre `m`. */
function poseMasaje(masajeada: Lado, m: { muneca: V3; dedos: V3; palma: V3 }): Pose {
  const p = poseMasajeada(masajeada);
  if (masajeada === 'I') {
    Object.assign(p, { manoD: m.muneca, dedosD: m.dedos, palmaD: m.palma, codoD: normV([-1, -0.8, -0.1]), cierreD: CIERRE_MASAJEA, pinzaD: 1 });
  } else {
    Object.assign(p, { manoI: m.muneca, dedosI: m.dedos, palmaI: m.palma, codoI: normV([1, -0.8, -0.1]), cierreI: CIERRE_MASAJEA, pinzaI: 1 });
  }
  p.cabezaPitch = 0.42;
  return p;
}

function mezclaToma(a: ReturnType<typeof tomar>, b: ReturnType<typeof tomar>, k: number) {
  return { muneca: lerpV(a.muneca, b.muneca, k), dedos: normV(lerpV(a.dedos, b.dedos, k)), palma: normV(lerpV(a.palma, b.palma, k)) };
}

const durParada = (p: Parada) => SEG_MOVER + p.circulos * SEG_CIRCULO;
function durTramo(paradas: Parada[]) {
  return paradas.reduce((a, p) => a + durParada(p), 0);
}

/**
 * Pose a los `seg` segundos de recorrer `paradas` (sobre la mano `masajeada`).
 * Devuelve también la parada en curso.
 */
function masajeEn(masajeada: Lado, paradas: Parada[], seg: number, previa: Parada | null) {
  const masajea: Lado = masajeada === 'I' ? 'D' : 'I';
  let x = Math.max(0, seg);
  let i = 0;
  while (i < paradas.length - 1 && x >= durParada(paradas[i])) {
    x -= durParada(paradas[i]);
    i++;
  }
  const p = paradas[i];
  const antes = i > 0 ? paradas[i - 1] : previa;
  let m: ReturnType<typeof tomar>;
  if (x < SEG_MOVER && antes) {
    // Se traslada a la parada siguiente.
    m = mezclaToma(tomar(masajea, antes), tomar(masajea, p), entraSaleSeno(x / SEG_MOVER));
  } else {
    // Círculos pequeños sobre lo que toma, en el plano de su superficie.
    const k = clamp((x - SEG_MOVER) / (p.circulos * SEG_CIRCULO));
    const ang = 2 * Math.PI * p.circulos * k;
    const lado = normV(cruzV(p.d, p.n));
    // Entra y sale suave: sin saltos al llegar ni al irse de la parada.
    const r = p.radio * Math.min(1, 4 * k, 4 * (1 - k));
    const off: V3 = [
      (p.d[0] * Math.cos(ang) + lado[0] * Math.sin(ang)) * r,
      (p.d[1] * Math.cos(ang) + lado[1] * Math.sin(ang)) * r,
      (p.d[2] * Math.cos(ang) + lado[2] * Math.sin(ang)) * r,
    ];
    m = tomar(masajea, p, off);
  }
  return { pose: poseMasaje(masajeada, m), parada: p, indice: i, enCirculos: x >= SEG_MOVER };
}

/** Pequeña luz rosada en el punto que se masajea (se enciende mientras se hacen los círculos). */
function luzMasaje(e: Estado, p: Parada, encendida: number) {
  esfera(e, 1, {
    activa: encendida > 0.01,
    ref: null,
    pegado: 0,
    pos: [p.C[0] + p.n[0] * 0.01, p.C[1] + p.n[1] * 0.01, p.C[2] + p.n[2] * 0.01],
    radio: (p.tipo === 'palma' ? 0.012 : 0.008) * encendida,
    brillo: 1.1,
    color: 'rosa',
    color2: 'blanco',
    mezcla: 0.3,
    opacidad: 0.9,
    ilumina: false,
  });
}

const PALMAS: Record<Lado, Parada[]> = { I: RECORRIDO.I.filter((p) => p.tipo === 'palma'), D: RECORRIDO.D.filter((p) => p.tipo === 'palma') };
const DEDOS: Record<Lado, Parada[]> = { I: RECORRIDO.I.filter((p) => p.tipo === 'falange'), D: RECORRIDO.D.filter((p) => p.tipo === 'falange') };

/** Manos sueltas al frente, para pasar de una mano a la otra sin cruzarse. */
const CAMBIO = pose({
  manoD: [-0.2, 1.1, 0.28],
  manoI: [0.2, 1.1, 0.28],
  codoD: normV([-1, -0.7, -0.2]),
  codoI: normV([1, -0.7, -0.2]),
  palmaD: [1, 0.3, 0],
  palmaI: [-1, 0.3, 0],
  dedosD: normV([0.2, 0.2, 1]),
  dedosI: normV([-0.2, 0.2, 1]),
  cierreD: 0.2,
  cierreI: 0.2,
  cabezaPitch: 0.35,
});

const SEG_EMPEZAR = 2.5;
const SEG_CAMBIAR = 3;
const SEG_TERMINAR = 2.5;
const DUR_PALMA_I = SEG_EMPEZAR + durTramo(PALMAS.I);
const DUR_DEDOS = durTramo(DEDOS.I);
const DUR_PALMA_D = SEG_CAMBIAR + durTramo(PALMAS.D);
const DUR_DEDOS_D = durTramo(DEDOS.D) + SEG_TERMINAR;

/**
 * Vista de la persona: por encima del hombro de la mano masajeada, mirando las
 * manos desde arriba, como uno las ve al hacerse el masaje.
 */
const ENCUADRE: Record<Lado, ReturnType<typeof encuadre>> = {
  I: encuadre([0.04, 1.09, 0.3], 0.46, Math.PI - 0.5, 1.2),
  D: encuadre([-0.04, 1.09, 0.3], 0.46, -(Math.PI - 0.5), 1.2),
};
/**
 * Toma de frente para pasar de un hombro al otro: la cámara rodea por los
 * costados en vez de pasar por detrás de la cabeza.
 */
const FRENTE_MANOS = encuadre([0, 1.12, 0.25], 0.62, 0, 0.7);

function hudDedos(e: Estado, p: Parada, masajeada: Lado) {
  e.hud.contador = { valor: p.numDedo ?? 0, total: 5, etiqueta: `${p.dedo} · falange ${p.falange}` };
  e.hud.aviso = `Dedo por dedo: ${masajeada === 'I' ? 'mano izquierda' : 'mano derecha'}, 3 círculos por falange`;
}

/** Inicio de un tramo de palma: desde `desde` se acomodan las dos manos sobre la primera zona. */
function tramoPalma(e: Estado, t: number, masajeada: Lado, dur: number, preparar: number, desde: Pose, porCambio: boolean) {
  const seg = t * dur;
  const primera = masajeEn(masajeada, PALMAS[masajeada], 0, null).pose;
  if (seg < preparar) {
    e.esferas[1].activa = false;
    const k = entraSaleSeno(seg / preparar);
    e.figuras[0].pose = porCambio
      ? k < 0.5
        ? mezclarPose(desde, CAMBIO, k * 2, 0.04)
        : mezclarPose(CAMBIO, primera, (k - 0.5) * 2, 0.04)
      : mezclarPose(desde, primera, k, 0.06);
  } else {
    const r = masajeEn(masajeada, PALMAS[masajeada], seg - preparar, null);
    e.figuras[0].pose = r.pose;
    luzMasaje(e, r.parada, r.enCirculos ? 1 : 0.4);
  }
  e.hud.aviso =
    masajeada === 'I'
      ? 'La derecha sostiene la mano izquierda y su pulgar hace círculos por la palma'
      : 'Ahora la izquierda sostiene la mano derecha y su pulgar hace círculos por la palma';
}

function tramoDedos(e: Estado, t: number, masajeada: Lado, durDedos: number, terminar: number) {
  const seg = t * (durDedos + terminar);
  const ultimaPalma = PALMAS[masajeada][PALMAS[masajeada].length - 1];
  // Sin tramo de cierre (la mano izquierda), el paso termina en la última falange.
  if (seg < durDedos || terminar <= 0) {
    const r = masajeEn(masajeada, DEDOS[masajeada], Math.min(seg, durDedos), ultimaPalma);
    e.figuras[0].pose = r.pose;
    luzMasaje(e, r.parada, r.enCirculos ? 1 : 0.4);
    hudDedos(e, r.parada, masajeada);
  } else {
    // Al terminar, las manos se sueltan a los costados.
    e.esferas[1].activa = false;
    const fin = masajeEn(masajeada, DEDOS[masajeada], durDedos, ultimaPalma).pose;
    e.figuras[0].pose = mezclarPose(fin, SERENA, entraSaleSeno((seg - durDedos) / terminar), 0.04);
    e.hud.contador = { valor: 5, total: 5, etiqueta: 'dedos' };
    e.hud.aviso = 'Las dos manos masajeadas, palma y dedos';
  }
}

export const masajeManos: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · La derecha masajea la palma izquierda
    {
      dur: DUR_PALMA_I,
      aplicar: (e, t) => {
        toma(e, ENCUADRE.I, t, 0, 0.25);
        tramoPalma(e, t, 'I', DUR_PALMA_I, SEG_EMPEZAR, SERENA, false);
      },
    },
    // 2 · Dedo por dedo, mano izquierda
    {
      dur: DUR_DEDOS,
      aplicar: (e, t) => {
        toma(e, ENCUADRE.I, t, 0, 0.02);
        tramoDedos(e, t, 'I', DUR_DEDOS, 0);
      },
    },
    // 3 · Cambio: la izquierda masajea la palma derecha
    {
      dur: DUR_PALMA_D,
      aplicar: (e, t) => {
        // Al cambiar de mano, la cámara pasa al otro hombro rodeando por delante.
        const cambio = SEG_CAMBIAR / DUR_PALMA_D;
        toma(e, FRENTE_MANOS, t, 0, cambio * 0.45);
        toma(e, ENCUADRE.D, t, cambio * 0.5, cambio);
        const fin = masajeEn('I', DEDOS.I, DUR_DEDOS, PALMAS.I[PALMAS.I.length - 1]).pose;
        tramoPalma(e, t, 'D', DUR_PALMA_D, SEG_CAMBIAR, fin, true);
      },
    },
    // 4 · Dedo por dedo, mano derecha; al final se sueltan
    {
      dur: DUR_DEDOS_D,
      aplicar: (e, t) => {
        toma(e, ENCUADRE.D, t, 0, 0.02);
        // Al soltar las manos, la cámara se aleja para ver a la persona entera.
        toma(e, TOMAS.general, t, durTramo(DEDOS.D) / DUR_DEDOS_D, 1);
        tramoDedos(e, t, 'D', durTramo(DEDOS.D), SEG_TERMINAR);
      },
    },
  ],
};

/** Para las pruebas: recorrido y toma de cada parada. */
export const masajeInterno = { RECORRIDO, tomar, poseMasajeada, durParada, SEG_MOVER };
