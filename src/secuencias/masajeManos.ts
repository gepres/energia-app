import { type Pose, copiarPose, mezclarPose, pose, resolverEsqueleto } from '../escena/cuerpo';
import type { Estado } from '../escena/estado';
import { FALANGES, type Segmento, manoEnPinza, segmentosMano } from '../escena/manos';
import { type V3, clamp, cruzV, entraSaleSeno, normV } from '../escena/mate';
import { SERENA } from '../escena/poses';
import { TOMAS, esfera } from './comunes';
import { type Secuencia, encuadre, fijarPose, toma } from './motor';

/**
 * «Masaje de manos y dedos», tal como lo describió el taller: con una mano se
 * masajea la otra, primero la palma y después dedo por dedo, falange por
 * falange; después se cambia de mano. Primero la derecha masajea la izquierda.
 * - La palma: la mano que masajea la sostiene por debajo y su pulgar hace círculos.
 * - Cada falange: el pulgar (arriba) y el índice (abajo) la toman como una pinza
 *   y hacen 3 círculos. Se empieza por el meñique: meñique, anular, medio,
 *   índice y, al final, el pulgar.
 *
 * Para que se vea real (sin que una mano atraviese a la otra):
 * - la mano masajeada se abre con la palma arriba y los dedos hacia el centro
 *   del cuerpo; cada dedo se toma de canto, desde la punta, con los otros
 *   dedos de la mano que masajea recogidos;
 * - para el pulgar, la mano masajeada gira la palma hacia abajo: el pulgar
 *   apunta a la otra mano, que lo toma con su pulgar arriba y el índice abajo.
 */

type Lado = 'D' | 'I';
const SIGNO: Record<Lado, number> = { D: 1, I: -1 };
type Forma = 'arriba' | 'canto';
type TipoPinza = 'palma' | 'dedo';

/** Segundos para pasar de una parada a la siguiente y de cada círculo. */
const SEG_MOVER = 0.45;
/** Para el pulgar la mano masajeada gira de canto: el paso es más largo. */
const SEG_GIRAR = 1.3;
const SEG_CIRCULO = 0.45;
const CIRCULOS_FALANGE = 3;
const CIRCULOS_PALMA = 2;
/** Radio de los círculos sobre una falange y sobre la palma (m). */
const RADIO_FALANGE = 0.004;
const RADIO_PALMA = 0.008;
const CIERRE_MASAJEA = 0.12;

/** Zonas de la palma que recorre el pulgar (sin escala; a hacia el pulgar, b hacia los dedos). */
const ZONAS_PALMA: [number, number][] = [
  [0, 0.03],
  [0.018, 0.045],
  [0, 0.055],
  [-0.018, 0.05],
  [0, 0.078],
];

/**
 * Pose de la mano masajeada (la otra queda serena).
 * - arriba: palma hacia arriba, abierta, con los dedos hacia el centro del cuerpo.
 * - canto: palma hacia abajo y dedos al frente, con el pulgar hacia el centro (para masajearlo).
 */
function poseMasajeada(lado: Lado, forma: Forma = 'arriba'): Pose {
  const s = lado === 'D' ? -1 : 1; // en x del cuerpo: derecha en −X
  const p = copiarPose(SERENA);
  const m =
    forma === 'arriba'
      ? { mano: [s * 0.15, 1.08, 0.22] as V3, palma: [0, 1, 0] as V3, dedos: normV([-s, 0.03, 0.45]), cierre: 0.05 }
      : // Palma hacia abajo y dedos al frente: el pulgar apunta hacia el centro, hacia la otra mano.
        { mano: [s * 0.13, 1.08, 0.2] as V3, palma: [0, -1, 0] as V3, dedos: normV([-s * 0.15, 0, 1]), cierre: 0.22 };
  if (lado === 'I') {
    Object.assign(p, { manoI: m.mano, palmaI: m.palma, dedosI: m.dedos, codoI: normV([1, -0.6, -0.3]), cierreI: m.cierre });
  } else {
    Object.assign(p, { manoD: m.mano, palmaD: m.palma, dedosD: m.dedos, codoD: normV([-1, -0.6, -0.3]), cierreD: m.cierre });
  }
  return p;
}

interface Parada {
  /** Centro de lo que toma la pinza, su eje y su lado de arriba. */
  C: V3;
  d: V3;
  n: V3;
  forma: Forma;
  pinza: TipoPinza;
  circulos: number;
  radio: number;
  /** Segundos para llegar a esta parada desde la anterior. */
  mover: number;
  tipo: 'palma' | 'falange';
  dedo?: string;
  falange?: number;
  numDedo?: number;
  /** Pieza de la mano masajeada que se toma (en `segmentosMano`); −1 en la palma. */
  pieza: number;
  /** Dedo de la mano masajeada que queda aislado (estirado; los demás recogidos), −1 ninguno. */
  aislado: number;
  /** Cómo la toma la otra mano: desde qué lado y con qué giro (elegido al cargar, ver `elegirToma`). */
  sentido: number;
  giro: number;
}

function marco(masajeada: Lado, forma: Forma) {
  const esq = resolverEsqueleto(poseMasajeada(masajeada, forma));
  const pm = masajeada === 'I' ? esq.palmaI : esq.palmaD;
  const muneca = masajeada === 'I' ? esq.munecaI : esq.munecaD;
  const cierre = poseMasajeada(masajeada, forma)[masajeada === 'I' ? 'cierreI' : 'cierreD'];
  return { muneca, F: pm.dedos, N: pm.normal, cierre };
}

/** Recorrido de la mano que masajea sobre la mano `masajeada`: palma y luego cada falange. */
function recorrido(masajeada: Lado): Parada[] {
  const s = SIGNO[masajeada];
  const K = 0.94;
  const arriba = marco(masajeada, 'arriba');
  const X = normV(cruzV(arriba.F, arriba.N));
  const T: V3 = [X[0] * s, X[1] * s, X[2] * s];
  const { muneca: w, F, N } = arriba;
  const paradas: Parada[] = ZONAS_PALMA.map(([a, b]) => ({
    C: [w[0] + (T[0] * a + F[0] * b) * K, w[1] + (T[1] * a + F[1] * b) * K, w[2] + (T[2] * a + F[2] * b) * K],
    d: F,
    n: N,
    forma: 'arriba',
    pinza: 'palma',
    circulos: CIRCULOS_PALMA,
    radio: RADIO_PALMA,
    mover: SEG_MOVER,
    tipo: 'palma',
    pieza: -1,
    aislado: -1,
    sentido: 1,
    giro: 0,
  }));
  const canto = marco(masajeada, 'canto');
  /** Piezas de la mano masajeada en su forma, con el dedo `aislado` estirado y los demás recogidos. */
  const piezas = (forma: Forma, aislado: number) =>
    forma === 'canto'
      ? segmentosMano(canto.muneca, canto.F, canto.N, s, canto.cierre, 0)
      : segmentosMano(arriba.muneca, arriba.F, arriba.N, s, arriba.cierre, 0, 0, aislado, aislado >= 0 ? 1 : 0);
  const orden = ['meñique', 'anular', 'medio', 'índice', 'pulgar'];
  FALANGES.forEach((f, n) => {
    const forma: Forma = f.dedo === 'pulgar' ? 'canto' : 'arriba';
    const aislado = forma === 'arriba' ? Math.floor((f.i - 1) / 3) : -1;
    const g = piezas(forma, aislado)[f.i];
    // «Arriba» es arriba: en los dedos coincide con el lado de la palma; en el pulgar (palma abajo), con la uña.
    const sube = 1 - g.dir[1] * g.dir[1];
    const lado: V3 = forma === 'canto' ? normV([-g.dir[0] * g.dir[1], sube, -g.dir[2] * g.dir[1]]) : normV(g.z);
    const anterior = n > 0 ? FALANGES[n - 1].dedo : 'palma';
    paradas.push({
      C: [g.pos[0] + (g.dir[0] * g.largo) / 2, g.pos[1] + (g.dir[1] * g.largo) / 2, g.pos[2] + (g.dir[2] * g.largo) / 2],
      d: g.dir,
      n: lado,
      forma,
      pinza: 'dedo',
      circulos: CIRCULOS_FALANGE,
      radio: RADIO_FALANGE,
      mover: forma === 'canto' && anterior !== 'pulgar' ? SEG_GIRAR : SEG_MOVER,
      tipo: 'falange',
      dedo: f.dedo,
      falange: f.falange,
      numDedo: orden.indexOf(f.dedo) + 1,
      pieza: f.i,
      aislado,
      sentido: 1,
      giro: 0,
    });
  });
  // Para cada parada, la manera de tomarla que no atraviesa la otra mano.
  const masajea: Lado = masajeada === 'I' ? 'D' : 'I';
  for (const p of paradas) Object.assign(p, elegirToma(masajea, p, piezas(p.forma, p.aislado)));
  return paradas;
}

/** Distancia libre entre dos piezas (cilindros), por muestreo de sus ejes. */
function holgura(A: Segmento, B: Segmento) {
  let m = Infinity;
  for (let i = 0; i <= 4; i++) {
    const a = [A.pos[0] + A.dir[0] * A.largo * (i / 4), A.pos[1] + A.dir[1] * A.largo * (i / 4), A.pos[2] + A.dir[2] * A.largo * (i / 4)];
    for (let j = 0; j <= 4; j++) {
      const b = [B.pos[0] + B.dir[0] * B.largo * (j / 4), B.pos[1] + B.dir[1] * B.largo * (j / 4), B.pos[2] + B.dir[2] * B.largo * (j / 4)];
      m = Math.min(m, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
    }
  }
  return m - A.radio - B.radio;
}

/**
 * La palma es una losa (≈ 8 × 2,7 cm), no un cilindro: se mide como tres
 * piezas finas lado a lado, a lo largo de los dedos.
 */
function losaPalma(palma: Segmento): Segmento[] {
  // El lado de la mano (pulgar ↔ meñique) es perpendicular a los dedos y a la normal (`z`).
  const lado = normV(cruzV(palma.dir, palma.z));
  return [-0.022, 0, 0.022].map((a) => ({
    pos: [palma.pos[0] + lado[0] * a, palma.pos[1] + lado[1] * a, palma.pos[2] + lado[2] * a] as V3,
    dir: palma.dir,
    z: palma.z,
    largo: 0.085,
    radio: 0.0135,
  }));
}

/** Holgura mínima entre la mano que masajea y la masajeada (sin contar lo que se toma). */
function holguraManos(masajea: Segmento[], masajeada: Segmento[], p: Parada) {
  let m = Infinity;
  const piezasDe = (segs: Segmento[], i: number) => (i === 0 ? losaPalma(segs[0]) : [segs[i]]);
  for (let a = 0; a < 16; a++) {
    for (let b = 0; b < 16; b++) {
      // En la palma se sostiene la palma: esa pieza se toca a propósito.
      if (b === p.pieza || (b === 0 && p.tipo === 'palma')) continue;
      for (const A of piezasDe(masajea, a)) for (const B of piezasDe(masajeada, b)) m = Math.min(m, holgura(A, B));
    }
  }
  return m;
}

/**
 * Prueba desde dónde tomar la parada (desde la punta o desde la base) y con
 * qué giro (hasta ≈ 50° a cada lado), y se queda con la que deja más espacio
 * entre las manos (lo que pasa de 6 mm ya es «libre»); a igualdad, con menos
 * giro y la muñeca más cerca del hombro. Solo cuentan las que el brazo alcanza.
 */
function elegirToma(masajea: Lado, p: Parada, masajeada: Segmento[]) {
  const s = SIGNO[masajea];
  const h = HOMBRO[masajea];
  const tipo = p.pinza === 'dedo' ? 1 : 0;
  let mejor = { sentido: 1, giro: 0 };
  let puntaje = -Infinity;
  for (const sentido of [1, -1]) {
    for (const giro of [0, 0.3, -0.3, 0.55, -0.55, 0.8, -0.8]) {
      const m = manoEnPinza(p.C, p.d, p.n, s, p.pinza, sentido, giro);
      const alcance = Math.hypot(m.muneca[0] - h[0], m.muneca[1] - h[1], m.muneca[2] - h[2]);
      if (alcance > 0.53) continue;
      const segs = segmentosMano(m.muneca, m.dedos, m.palma, s, CIERRE_MASAJEA, 1, tipo);
      const libre = Math.min(0.006, holguraManos(segs, masajeada, p));
      const valor = libre - 0.0015 * Math.abs(giro) - 0.002 * alcance;
      if (valor > puntaje) {
        puntaje = valor;
        mejor = { sentido, giro };
      }
    }
  }
  return mejor;
}

const HOMBRO: Record<Lado, V3> = { D: [-0.182, 1.415, -0.01], I: [0.182, 1.415, -0.01] };
const RECORRIDO: Record<Lado, Parada[]> = { I: recorrido('I'), D: recorrido('D') };

/** Mano que masajea tomando la parada, de la manera elegida al cargar (`elegirToma`). */
function tomar(masajea: Lado, p: Parada, offset: V3 = [0, 0, 0]) {
  const C: V3 = [p.C[0] + offset[0], p.C[1] + offset[1], p.C[2] + offset[2]];
  return manoEnPinza(C, p.d, p.n, SIGNO[masajea], p.pinza, p.sentido, p.giro);
}

/** Pose completa: la mano masajeada en su forma y la otra en pinza sobre `m`. */
function poseMasaje(masajeada: Lado, p: Parada, m: { muneca: V3; dedos: V3; palma: V3 }): Pose {
  const pose = poseMasajeada(masajeada, p.forma);
  // El dedo que se masajea queda estirado y los demás, recogidos.
  if (masajeada === 'I') Object.assign(pose, { aisladoI: p.aislado, aislarI: p.aislado >= 0 ? 1 : 0 });
  else Object.assign(pose, { aisladoD: p.aislado, aislarD: p.aislado >= 0 ? 1 : 0 });
  const tipo = p.pinza === 'dedo' ? 1 : 0;
  if (masajeada === 'I') {
    Object.assign(pose, { manoD: m.muneca, dedosD: m.dedos, palmaD: m.palma, codoD: normV([-1, -0.8, -0.1]), cierreD: CIERRE_MASAJEA, pinzaD: 1, tipoPinzaD: tipo });
  } else {
    Object.assign(pose, { manoI: m.muneca, dedosI: m.dedos, palmaI: m.palma, codoI: normV([1, -0.8, -0.1]), cierreI: CIERRE_MASAJEA, pinzaI: 1, tipoPinzaI: tipo });
  }
  pose.cabezaPitch = 0.42;
  return pose;
}

const durParada = (p: Parada) => p.mover + p.circulos * SEG_CIRCULO;
function durTramo(paradas: Parada[]) {
  return paradas.reduce((a, p) => a + durParada(p), 0);
}

/** Círculos pequeños sobre lo que se toma, en el plano de su superficie; entran y salen suaves. */
function circulo(p: Parada, k: number): V3 {
  const ang = 2 * Math.PI * p.circulos * k;
  const lado = normV(cruzV(p.d, p.n));
  const r = p.radio * Math.min(1, 4 * k, 4 * (1 - k));
  return [
    (p.d[0] * Math.cos(ang) + lado[0] * Math.sin(ang)) * r,
    (p.d[1] * Math.cos(ang) + lado[1] * Math.sin(ang)) * r,
    (p.d[2] * Math.cos(ang) + lado[2] * Math.sin(ang)) * r,
  ];
}

/** Pose a los `seg` segundos de recorrer `paradas` (sobre la mano `masajeada`). */
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
  let resultado: Pose;
  if (x < p.mover && antes) {
    // Se traslada a la parada siguiente (y, si cambia, la mano masajeada gira de forma).
    const a = poseMasaje(masajeada, antes, tomar(masajea, antes));
    const b = poseMasaje(masajeada, p, tomar(masajea, p));
    resultado = mezclarPose(a, b, entraSaleSeno(x / p.mover), p.forma !== antes.forma ? 0.05 : 0);
  } else {
    const k = clamp((x - p.mover) / (p.circulos * SEG_CIRCULO));
    resultado = poseMasaje(masajeada, p, tomar(masajea, p, circulo(p, k)));
  }
  return { pose: resultado, parada: p, indice: i, enCirculos: x >= p.mover };
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
  I: encuadre([0.06, 1.09, 0.28], 0.46, Math.PI - 0.5, 1.2),
  D: encuadre([-0.06, 1.09, 0.28], 0.46, -(Math.PI - 0.5), 1.2),
};
/**
 * Toma de frente para pasar de un hombro al otro: la cámara rodea por los
 * costados en vez de pasar por detrás de la cabeza.
 */
const FRENTE_MANOS = encuadre([0, 1.12, 0.25], 0.62, 0, 0.7);

function hudDedos(e: Estado, p: Parada, masajeada: Lado) {
  e.hud.contador = { valor: p.numDedo ?? 0, total: 5, etiqueta: `${p.dedo} · falange ${p.falange}` };
  e.hud.aviso =
    p.forma === 'canto'
      ? 'Al final el pulgar: la mano gira la palma hacia abajo y la otra lo toma'
      : `Dedo por dedo, desde el meñique: ${masajeada === 'I' ? 'mano izquierda' : 'mano derecha'}, 3 círculos por falange`;
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
    // 2 · Dedo por dedo, mano izquierda (del índice al meñique y al final el pulgar)
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

/** Para las pruebas: recorrido, toma de cada parada y pose completa. */
export const masajeInterno = { RECORRIDO, tomar, poseMasajeada, poseMasaje, durParada, holguraManos };
