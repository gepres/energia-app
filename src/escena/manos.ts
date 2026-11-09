import {
  Bone,
  type BufferGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  type Material,
  Matrix4,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  Uint16BufferAttribute,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Esqueleto, Pose } from './cuerpo';
import { type V3, clamp, cruzV, lerp, lerpV, normV, puntoV, suave } from './mate';

/**
 * Manos articuladas: palma esculpida y cinco dedos con falanges. Todas las
 * piezas de las dos manos son una sola malla con huesos rígidos (un hueso por
 * pieza), así que cuestan un único draw call y no se sube geometría por fotograma.
 *
 * Marco de cada mano (espacio de la figura): origen en la muñeca, F = dedos,
 * N = normal de la palma (hacia donde mira la palma), X = F × N. El pulgar
 * queda del lado `s·X` (s = +1 en la derecha, −1 en la izquierda). Comprobado
 * con la posición anatómica: palmas al frente (N = +Z), dedos abajo (F = −Y) →
 * X = −X del mundo, que es el lado de afuera de la mano derecha.
 * Las medidas de abajo están en metros con la mano a escala 1; K la ajusta
 * a la figura (muñeca–punta del dedo medio ≈ 0,185 m).
 */
const K = 0.94;

interface Dedo {
  /** Nudillo en coordenadas de la mano: [hacia el pulgar, hacia los dedos, hacia la palma]. */
  base: V3;
  largos: [number, number, number];
  radio: number;
  /** Abertura en el plano de la palma (rad, + hacia el pulgar). */
  abre: number;
  /** Cuánto más se cierra que el índice (los dedos de afuera se curvan más). */
  cascada: number;
}

const DEDOS: Dedo[] = [
  { base: [0.0265, 0.094, -0.002], largos: [0.04, 0.024, 0.019], radio: 0.0091, abre: 0.07, cascada: 0 },
  { base: [0.0088, 0.098, -0.002], largos: [0.044, 0.027, 0.02], radio: 0.0094, abre: 0, cascada: 0.04 },
  { base: [-0.0088, 0.0945, -0.002], largos: [0.041, 0.026, 0.019], radio: 0.0089, abre: -0.07, cascada: 0.08 },
  { base: [-0.0255, 0.0855, -0.002], largos: [0.032, 0.0195, 0.017], radio: 0.0079, abre: -0.15, cascada: 0.13 },
];

const PULGAR = {
  base: [0.021, 0.017, 0.004] as V3,
  largos: [0.04, 0.031, 0.026] as [number, number, number],
  radios: [0.0142, 0.0108, 0.0096, 0.0084],
};

/** Huesos por mano: palma + 4 dedos × 3 falanges + 3 piezas del pulgar. */
const HUESOS_MANO = 1 + DEDOS.length * 3 + 3;

/** Lado del pulgar (`s`) de cada mano: la derecha usa los primeros huesos. */
const LADOS = [
  { s: 1, h0: 0 },
  { s: -1, h0: HUESOS_MANO },
] as const;

// ── Agarre de una barra ─────────────────────────────────────────────────

/** Radio aproximado del eje de un dedo (escalado), para rodear una barra sin atravesarla. */
const RADIO_DEDO = 0.0085;
/** Dónde arrancan las falanges proximales (sin escala): b del nudillo hundido y c del eje del dedo. */
const AGARRE_B = 0.09;
const AGARRE_C = -0.002;

/**
 * Eje de una barra vertical sostenida en el puño: queda sobre las falanges
 * proximales, del lado de la palma, a (radio de la barra + radio del dedo) del
 * eje de los dedos. `F` y `N` son los del marco de la palma.
 */
export function centroAgarre(muneca: V3, F: V3, N: V3, radio: number): V3 {
  const b = AGARRE_B * K;
  const c = AGARRE_C * K + radio + RADIO_DEDO;
  return [muneca[0] + F[0] * b + N[0] * c, muneca[1] + F[1] * b + N[1] * c, muneca[2] + F[2] * b + N[2] * c];
}

/**
 * Cierre que hace que el dedo medio rodee una barra de ese radio: cada falange
 * es una cuerda del círculo que recorre el eje del dedo (radio barra + dedo).
 * Se promedian las tres articulaciones (MCP, PIP y DIP) del modelo de cierre.
 */
export function cierreParaBarra(radio: number): number {
  const rho = radio + RADIO_DEDO;
  const [l1, l2, l3] = DEDOS[1].largos.map((l) => Math.asin(Math.min(1, (l * K) / (2 * rho))));
  const estimados = [l1 / 1.2, (l1 + l2) / 1.55, (l2 + l3) / 1.05];
  return clamp((estimados[0] + estimados[1] + estimados[2]) / 3);
}

/**
 * Hueco de la palma: punto frente a su superficie, en el centro de la palma y
 * algo hacia los dedos, a `separacion` de la piel (se mueve con la normal de la
 * palma). Una esfera sostenida en la mano va aquí con separacion ≈ su radio.
 */
export function huecoPalma(muneca: V3, F: V3, N: V3, separacion: number): V3 {
  const b = 0.06 * K;
  const c = 0.0105 * K + separacion;
  return [muneca[0] + F[0] * b + N[0] * c, muneca[1] + F[1] * b + N[1] * c, muneca[2] + F[2] * b + N[2] * c];
}

// ── Geometría ───────────────────────────────────────────────────────────

/** Falange: segmento ahusado a lo largo de +Y con puntas redondas, algo más ancho que alto. */
function falange(largo: number, r0: number, r1: number, punta = false) {
  const pts: Vector2[] = [];
  const nCap = 5;
  for (let i = 0; i <= nCap; i++) {
    const a = -Math.PI / 2 + (i / nCap) * (Math.PI / 2);
    pts.push(new Vector2(Math.max(1e-4, r0 * Math.cos(a)), r0 * Math.sin(a)));
  }
  for (let j = 1; j < 4; j++) {
    const k = j / 4;
    // Leve ensanche cerca de la articulación de abajo (el nudillo).
    pts.push(new Vector2(lerp(r0, r1, k) * (1 + 0.04 * Math.sin(Math.PI * k)), k * largo));
  }
  // La yema del último segmento es más larga y achatada que una media esfera.
  const alto = punta ? r1 * 1.25 : r1;
  for (let i = 0; i <= nCap; i++) {
    const a = (i / nCap) * (Math.PI / 2);
    pts.push(new Vector2(Math.max(1e-4, r1 * Math.cos(a)), largo + alto * Math.sin(a)));
  }
  const g = new LatheGeometry(pts, 12);
  g.scale(1.08 * K, K, 0.88 * K);
  return g;
}

/**
 * Palma: superelipsoide (más blanda que una caja redondeada) que se angosta
 * hacia la muñeca, con el dorso abombado, la palma apenas ahuecada y la línea
 * de nudillos en arco (más baja del lado del meñique). `s` pone el pulgar en
 * +X (s = 1) o en −X (s = −1) del marco de la mano.
 */
function palma(s: number) {
  let g: BufferGeometry = new SphereGeometry(1, 28, 20);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.getAttribute('position');
  const sup = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < p.count; i++) {
    // Superelipsoide: exponentes < 1 cuadran la forma sin aristas.
    const a = sup(p.getX(i), 0.62) * 0.04; // hacia el pulgar
    let y = sup(p.getY(i), 0.7) * 0.05;
    let z = sup(p.getZ(i), 0.8) * 0.0135;
    const t = clamp((y + 0.05) / 0.1); // 0 muñeca → 1 nudillos
    const u = clamp(Math.abs(a) / 0.04);
    let x = a * lerp(0.74, 1, suave(clamp(t * 1.3)));
    // Carpo más grueso junto a la muñeca; dorso abombado; palma algo hueca.
    z *= lerp(1.25, 1, suave(clamp(t * 2)));
    if (z < 0) z -= 0.0032 * (1 - u * u);
    else z -= 0.0016 * (1 - u * u) * Math.sin(Math.PI * t);
    // Nudillos en arco y el lado del meñique más corto.
    if (t > 0.6) y -= (0.008 * u * u + 0.006 * clamp(-a / 0.04)) * Math.pow((t - 0.6) / 0.4, 2);
    // Eminencia del pulgar: la palma se ensancha abajo, del lado del pulgar, hacia la palma.
    if (a > 0 && t < 0.6) {
      const b = Math.sin((Math.PI * t) / 0.6) * u;
      x += 0.005 * b;
      if (z > 0) z += 0.003 * b;
    }
    p.setXYZ(i, x * s, y + 0.05, z - 0.001);
  }
  // Al espejar en X se invierte el sentido de los triángulos: hay que darlos vuelta.
  if (s < 0) {
    const idx = g.getIndex()!;
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, b);
    }
  }
  g.computeVertexNormals();
  g.scale(K, K, K);
  return g;
}

function conHueso(g: BufferGeometry, hueso: number) {
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  const n = g.getAttribute('position').count;
  const idx = new Uint16Array(n * 4);
  const w = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    idx[i * 4] = hueso;
    w[i * 4] = 1;
  }
  g.setAttribute('skinIndex', new Uint16BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new Float32BufferAttribute(w, 4));
  // Oclusión por vértice (ver materiales.ts): las manos van sin oscurecer.
  g.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  return g;
}

function geometriaManos() {
  const piezas: BufferGeometry[] = [];
  LADOS.forEach(({ s, h0 }) => {
    piezas.push(conHueso(palma(s), h0));
    DEDOS.forEach((d, i) => {
      const r = [d.radio, d.radio * 0.93, d.radio * 0.86, d.radio * 0.78];
      d.largos.forEach((l, j) => piezas.push(conHueso(falange(l, r[j], r[j + 1], j === 2), h0 + 1 + i * 3 + j)));
    });
    PULGAR.largos.forEach((l, j) =>
      piezas.push(conHueso(falange(l, PULGAR.radios[j], PULGAR.radios[j + 1], j === 2), h0 + 1 + DEDOS.length * 3 + j)),
    );
  });
  return mergeGeometries(piezas);
}

// ── Pose de los dedos ───────────────────────────────────────────────────

const _m = new Matrix4();
const _x = new Vector3();
const _y = new Vector3();
const _z = new Vector3();

function colocar(h: Bone, pos: V3, y: V3, zRef: V3) {
  // Base ortonormal con Y = eje de la pieza y Z lo más cerca posible de zRef.
  _y.set(y[0], y[1], y[2]).normalize();
  _z.set(zRef[0], zRef[1], zRef[2]);
  _z.addScaledVector(_y, -_z.dot(_y));
  if (_z.lengthSq() < 1e-8) _z.set(_y.y, _y.z, _y.x).cross(_y);
  _z.normalize();
  _x.crossVectors(_y, _z);
  _m.makeBasis(_x, _y, _z);
  h.quaternion.setFromRotationMatrix(_m);
  h.position.set(pos[0], pos[1], pos[2]);
}

/** Una pieza de la mano: dónde empieza, hacia dónde va, su eje Z (lado de la palma) y medidas (escaladas). */
export interface Segmento {
  pos: V3;
  dir: V3;
  z: V3;
  largo: number;
  radio: number;
}

/**
 * Pinzas de masaje (medidas sin escala, en el marco de la mano: a hacia el
 * pulgar, b hacia los dedos, c hacia la palma). Entre la yema del pulgar y el
 * índice queda el `hueco`, donde cabe lo que se toma de la otra mano.
 * - palma: la mano va plana por debajo de la otra (sostiene su palma) y el
 *   pulgar se arquea por encima.
 * - dedo: la mano va de canto, a lo largo del dedo que toma: el pulgar arriba,
 *   el índice abajo y los demás dedos recogidos para no tocar a los vecinos.
 */
const PINZAS = {
  // Dedos estirados por debajo: si se curvan, rozan la base del pulgar de la otra mano.
  palma: { hueco: [0.0265, 0.105, 0.022] as V3, pulgar: [0.0265, 0.104, 0.04] as V3, cierres: [0.02, 0.03, 0.04, 0.05] },
  dedo: { hueco: [0.052, 0.105, 0.004] as V3, pulgar: [0.069, 0.105, 0.006] as V3, cierres: [0.1, 0.72, 0.82, 0.88] },
};

/**
 * Cinemática de una mano: las 16 piezas (palma, 4 dedos × 3 falanges y las 3
 * del pulgar) en el espacio de la figura. `s` = +1 derecha, −1 izquierda.
 * `pinza` (0–1) lleva la mano a la pinza de masaje; `tipo` mezcla la pinza de
 * palma (0) con la de dedo (1).
 */
export function segmentosMano(
  muneca: V3,
  F: V3,
  N: V3,
  s: number,
  cierre: number,
  pinza = 0,
  tipo = 0,
  aislado = -1,
  aislar = 0,
  separar = 0,
  apoyar = 0,
): Segmento[] {
  const X = normV(cruzV(F, N));
  const T: V3 = [X[0] * s, X[1] * s, X[2] * s];
  const local = (a: number, b: number, c: number): V3 => [
    muneca[0] + (T[0] * a + F[0] * b + N[0] * c) * K,
    muneca[1] + (T[1] * a + F[1] * b + N[1] * c) * K,
    muneca[2] + (T[2] * a + F[2] * b + N[2] * c) * K,
  ];
  const dir = (a: number, b: number, c: number): V3 =>
    normV([T[0] * a + F[0] * b + N[0] * c, T[1] * a + F[1] * b + N[1] * c, T[2] * a + F[2] * b + N[2] * c]);
  const avanzar = (p: V3, d: V3, l: number): V3 => [p[0] + d[0] * l * K, p[1] + d[1] * l * K, p[2] + d[2] * l * K];
  const out: Segmento[] = [{ pos: muneca, dir: F, z: N, largo: 0.1 * K, radio: 0.04 * K }];
  const q = clamp(pinza);
  const tp = clamp(tipo);

  DEDOS.forEach((d, i) => {
    const libre = clamp(cierre + d.cascada * (0.5 + 0.5 * cierre));
    // En la pinza de dedo, el índice va casi recto y los demás se recogen.
    let c = lerp(libre, lerp(PINZAS.palma.cierres[i], PINZAS.dedo.cierres[i], tp), q);
    // Dedo aislado: ese queda estirado y los demás se recogen hacia la palma, según cuál sea:
    // con el medio o el anular solo un poco (cerrar los otros del todo sería un gesto ofensivo,
    // o imposible para el anular); con el índice o el meñique, más.
    if (aislado >= 0 && aislar > 0) c = lerp(c, i === aislado ? 0 : RECOGER_OTROS[aislado], clamp(aislar));
    // Sin pinza, la abertura es la de siempre (según el cierre general).
    let phi = d.abre * (1.15 - 0.55 * lerp(cierre, c, q));
    // Separar el dedo aislado: sus vecinos se abren hacia los costados, alejándose de él (los del
    // lado del pulgar, hacia el pulgar; los del lado del meñique, hacia afuera). Con el pulgar
    // aislado (4), los cuatro dedos se apartan de él.
    if (aislado >= 0 && separar > 0 && i !== aislado) phi += (i < aislado ? 1 : -1) * SEPARAR_DEDOS * clamp(separar);
    let d0: V3 = normV([
      F[0] * Math.cos(phi) + T[0] * Math.sin(phi),
      F[1] * Math.cos(phi) + T[1] * Math.sin(phi),
      F[2] * Math.cos(phi) + T[2] * Math.sin(phi),
    ]);
    // Al separarlo, el dedo aislado además se levanta un poco desde el nudillo, recto, hacia el lado de la palma.
    if (aislado >= 0 && separar > 0 && i === aislado) {
      const b = LEVANTAR_DEDO * clamp(separar);
      d0 = normV([d0[0] * Math.cos(b) + N[0] * Math.sin(b), d0[1] * Math.cos(b) + N[1] * Math.sin(b), d0[2] * Math.cos(b) + N[2] * Math.sin(b)]);
    }
    // Eje de flexión: los dedos se curvan hacia la palma (N).
    const L = normV(cruzV(d0, N));
    const angulos = [c * 1.2, c * 1.55, c * 1.05];
    const radios = [d.radio, d.radio * 0.93, d.radio * 0.86];
    let p = local(d.base[0], d.base[1] - 0.006, d.base[2]);
    let th = 0;
    for (let j = 0; j < 3; j++) {
      th += angulos[j];
      const dj: V3 = normV([
        d0[0] * Math.cos(th) + N[0] * Math.sin(th),
        d0[1] * Math.cos(th) + N[1] * Math.sin(th),
        d0[2] * Math.cos(th) + N[2] * Math.sin(th),
      ]);
      out.push({ pos: p, dir: dj, z: cruzV(L, dj), largo: d.largos[j] * K, radio: radios[j] * K });
      p = avanzar(p, dj, d.largos[j]);
    }
  });

  // Pulgar: al cerrar la mano cruza por delante de la palma.
  const k = clamp(cierre);
  let metaD = dir(lerp(0.62, 0.36, k * 0.7), lerp(0.66, 0.62, k), lerp(0.42, 0.68, k * 0.7));
  let proxD = dir(lerp(0.42, -0.25, k * 0.8), lerp(0.84, 0.6, k * 0.8), lerp(0.36, 0.75, k * 0.8));
  const kd = 0.2 + 0.6 * k;
  const haciaPalma = dir(-0.55, 0.35, 0.75);
  let distD = normV(lerpV(proxD, haciaPalma, kd));
  if (q > 0) {
    // En pinza: el pulgar se arquea por encima de lo que toma y su yema baja sobre el hueco.
    const B = PULGAR.base;
    const P = lerpV(PINZAS.palma.pulgar, PINZAS.dedo.pulgar, tp);
    const u = normV([P[0] - B[0], P[1] - B[1], P[2] - B[2]]);
    const [l1, , l3] = PULGAR.largos;
    // Arco y presión: en la de palma, por el lado de la palma (c); en la de dedo, por el del pulgar (a).
    // En la de dedo el pulgar sube alto antes de bajar: así su base pasa por encima del dedo y sus vecinos.
    const arco: V3 = [lerp(0.1, 0.55, tp), 0, lerp(0.25, -0.05, tp)];
    const presion: V3 = [lerp(0, -0.35, tp), 0, lerp(-0.35, 0, tp)];
    const d1 = normV([u[0] + arco[0], u[1], u[2] + arco[2]]);
    const d3 = normV([u[0] + presion[0], u[1], u[2] + presion[2]]);
    const d2 = normV([P[0] - B[0] - d1[0] * l1 - d3[0] * l3, P[1] - B[1] - d1[1] * l1 - d3[1] * l3, P[2] - B[2] - d1[2] * l1 - d3[2] * l3]);
    metaD = normV(lerpV(metaD, dir(d1[0], d1[1], d1[2]), q));
    proxD = normV(lerpV(proxD, dir(d2[0], d2[1], d2[2]), q));
    distD = normV(lerpV(distD, dir(d3[0], d3[1], d3[2]), q));
  }
  if (apoyar > 0) {
    // Mano apoyada: el pulgar queda en el plano de la palma (apenas hacia el dorso), sin hundirse.
    const a = clamp(apoyar);
    const aplanar = (v: V3): V3 => {
      const n = puntoV(v, N) + 0.06;
      return normV([v[0] - N[0] * n * a, v[1] - N[1] * n * a, v[2] - N[2] * n * a]);
    };
    metaD = aplanar(metaD);
    proxD = aplanar(proxD);
    distD = aplanar(distD);
  }
  let p = local(PULGAR.base[0], PULGAR.base[1], PULGAR.base[2]);
  [metaD, proxD, distD].forEach((dj, j) => {
    // La uña mira hacia afuera de la palma: Z de la pieza ≈ −N girado hacia el pulgar.
    const zRef: V3 = puntoV(dj, N) > 0.9 ? T : N;
    out.push({ pos: p, dir: dj, z: zRef, largo: PULGAR.largos[j] * K, radio: PULGAR.radios[j + 1] * K });
    p = avanzar(p, dj, PULGAR.largos[j]);
  });
  return out;
}

/**
 * Orden del masaje de dedos (descrito en el taller): del meñique al índice,
 * falange por falange de la base a la punta, y al final el pulgar. `i` es la
 * pieza en `segmentosMano` (índice 1–3, medio 4–6, anular 7–9, meñique 10–12).
 */
const DEDOS_EN_PIEZAS = ['índice', 'medio', 'anular', 'meñique'];
/** Cuánto se recogen los demás dedos cuando se aísla cada uno (índice, medio, anular, meñique y pulgar). */
const RECOGER_OTROS = [0.62, 0.3, 0.38, 0.58, 0.45];
/** Cuánto se abren hacia los costados los vecinos del dedo aislado al separarlo (rad, ≈ 15°). */
const SEPARAR_DEDOS = 0.26;
/** Cuánto se levanta desde el nudillo el dedo aislado al separarlo (rad): queda un poco por encima de los demás. */
const LEVANTAR_DEDO = 0.35;
export const FALANGES: { dedo: string; falange: number; i: number }[] = [
  ...['meñique', 'anular', 'medio', 'índice'].flatMap((dedo) =>
    [1, 2, 3].map((f) => ({ dedo, falange: f, i: 1 + DEDOS_EN_PIEZAS.indexOf(dedo) * 3 + (f - 1) })),
  ),
  { dedo: 'pulgar', falange: 1, i: 14 },
  { dedo: 'pulgar', falange: 2, i: 15 },
];

/**
 * Dónde poner la mano que masajea para que su pinza tome algo en `C`: `d` es
 * el eje de lo que toma y `n` su lado de arriba (ahí va el pulgar; el índice,
 * del otro lado). `sentido` (±1) elige desde qué lado se toma.
 * - palma: la mano pasa por debajo, cruzada respecto de `d`.
 * - dedo: la mano va de canto a lo largo de `d` (con sentido +1 entra desde la punta).
 */
export function manoEnPinza(
  C: V3,
  d: V3,
  n: V3,
  s: number,
  tipo: 'palma' | 'dedo' = 'palma',
  sentido = 1,
  giro = 0,
): { muneca: V3; dedos: V3; palma: V3 } {
  const up = normV(n);
  let F: V3;
  let N: V3;
  if (tipo === 'palma') {
    N = up;
    const c = normV(cruzV(up, d));
    F = [c[0] * s * sentido, c[1] * s * sentido, c[2] * s * sentido];
  } else {
    F = normV([-d[0] * sentido, -d[1] * sentido, -d[2] * sentido]);
    // El lado del pulgar mira hacia `n`: N = s · (n × F).
    const c = cruzV(up, F);
    N = normV([c[0] * s, c[1] * s, c[2] * s]);
  }
  let X = cruzV(F, N);
  let T: V3 = [X[0] * s, X[1] * s, X[2] * s];
  if (giro !== 0) {
    // Gira la mano sin soltar lo que toma: en la de palma, alrededor de su normal;
    // en la de dedo, alrededor del eje pulgar–índice (la toma de costado se abre en abanico).
    const cg = Math.cos(giro);
    const sg = Math.sin(giro);
    if (tipo === 'palma') {
      F = normV([F[0] * cg + T[0] * sg, F[1] * cg + T[1] * sg, F[2] * cg + T[2] * sg]);
    } else {
      const F2 = normV([F[0] * cg + N[0] * sg, F[1] * cg + N[1] * sg, F[2] * cg + N[2] * sg]);
      N = normV([N[0] * cg - F[0] * sg, N[1] * cg - F[1] * sg, N[2] * cg - F[2] * sg]);
      F = F2;
    }
    X = cruzV(F, N);
    T = [X[0] * s, X[1] * s, X[2] * s];
  }
  const [a, b, cc] = PINZAS[tipo].hueco;
  return {
    muneca: [
      C[0] - (T[0] * a + F[0] * b + N[0] * cc) * K,
      C[1] - (T[1] * a + F[1] * b + N[1] * cc) * K,
      C[2] - (T[2] * a + F[2] * b + N[2] * cc) * K,
    ],
    dedos: F,
    palma: N,
  };
}

export interface Manos {
  malla: SkinnedMesh;
  raiz: Bone;
  actualizar: (e: Esqueleto, p: Pose) => void;
}

export function crearManos(material: Material): Manos {
  const raiz = new Bone();
  const huesos = Array.from({ length: HUESOS_MANO * 2 }, () => {
    const h = new Bone();
    raiz.add(h);
    return h;
  });
  // Los huesos están en la identidad al enlazar: sus inversas son la identidad
  // y cada pieza se modela en el espacio local de su hueso.
  const esqueleto = new Skeleton(huesos);
  const malla = new SkinnedMesh(geometriaManos(), material);
  malla.bind(esqueleto, new Matrix4());
  malla.frustumCulled = false;

  function mano(h0: number, s: number, muneca: V3, F: V3, N: V3, cierre: number, pinza: number, tipo: number, aislado: number, aislar: number, separar: number, apoyar: number) {
    segmentosMano(muneca, F, N, s, cierre, pinza, tipo, aislado, aislar, separar, apoyar).forEach((g, j) => colocar(huesos[h0 + j], g.pos, g.dir, g.z));
  }

  return {
    malla,
    raiz,
    actualizar(e, p) {
      mano(LADOS[0].h0, LADOS[0].s, e.munecaD, e.palmaD.dedos, e.palmaD.normal, p.cierreD, p.pinzaD, p.tipoPinzaD, p.aisladoD, p.aislarD, p.separarD, p.apoyarD);
      mano(LADOS[1].h0, LADOS[1].s, e.munecaI, e.palmaI.dedos, e.palmaI.normal, p.cierreI, p.pinzaI, p.tipoPinzaI, p.aisladoI, p.aislarI, p.separarI, p.apoyarI);
    },
  };
}
