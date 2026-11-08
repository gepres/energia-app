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
import type { Esqueleto } from './cuerpo';
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
 * Pinza de masaje (medidas sin escala, en el marco de la mano): la falange
 * proximal del índice queda abajo y la yema del pulgar arriba; entre ellas,
 * en `HUECO_PINZA`, cabe una falange (o el canto de la palma) de la otra mano.
 */
const HUECO_PINZA: V3 = [0.0265, 0.105, 0.0185];
const PULGAR_PINZA: V3 = [0.0265, 0.106, 0.036];

/**
 * Cinemática de una mano: las 16 piezas (palma, 4 dedos × 3 falanges y las 3
 * del pulgar) en el espacio de la figura. `s` = +1 derecha, −1 izquierda.
 * `pinza` (0–1) lleva el pulgar a la pinza de masaje.
 */
export function segmentosMano(muneca: V3, F: V3, N: V3, s: number, cierre: number, pinza = 0): Segmento[] {
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

  DEDOS.forEach((d) => {
    const c = clamp(cierre + d.cascada * (0.5 + 0.5 * cierre));
    const phi = d.abre * (1.15 - 0.55 * cierre);
    const d0: V3 = normV([
      F[0] * Math.cos(phi) + T[0] * Math.sin(phi),
      F[1] * Math.cos(phi) + T[1] * Math.sin(phi),
      F[2] * Math.cos(phi) + T[2] * Math.sin(phi),
    ]);
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
  if (pinza > 0) {
    // En pinza: el pulgar se arquea por encima y su yema baja sobre el hueco de la pinza.
    const B = PULGAR.base;
    const u = normV([PULGAR_PINZA[0] - B[0], PULGAR_PINZA[1] - B[1], PULGAR_PINZA[2] - B[2]]);
    const [l1, l2, l3] = PULGAR.largos;
    const d1 = normV([u[0] + 0.1, u[1], u[2] + 0.25]);
    const d3 = normV([u[0], u[1], u[2] - 0.35]);
    const resto: V3 = [
      PULGAR_PINZA[0] - B[0] - d1[0] * l1 - d3[0] * l3,
      PULGAR_PINZA[1] - B[1] - d1[1] * l1 - d3[1] * l3,
      PULGAR_PINZA[2] - B[2] - d1[2] * l1 - d3[2] * l3,
    ];
    const d2 = normV(resto);
    void l2;
    const q = clamp(pinza);
    metaD = normV(lerpV(metaD, dir(d1[0], d1[1], d1[2]), q));
    proxD = normV(lerpV(proxD, dir(d2[0], d2[1], d2[2]), q));
    distD = normV(lerpV(distD, dir(d3[0], d3[1], d3[2]), q));
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

/** Índices de las falanges en `segmentosMano`: pulgar (proximal, distal) e índice → meñique (3 cada uno). */
export const FALANGES: { dedo: string; falange: number; i: number }[] = [
  { dedo: 'pulgar', falange: 1, i: 14 },
  { dedo: 'pulgar', falange: 2, i: 15 },
  ...['índice', 'medio', 'anular', 'meñique'].flatMap((dedo, n) => [1, 2, 3].map((f) => ({ dedo, falange: f, i: 1 + n * 3 + (f - 1) }))),
];

/**
 * Dónde poner la mano que masajea para que su pinza tome algo en `C`: `d` es
 * el eje de lo que toma (la falange) y `n` su lado de arriba (el pulgar va de
 * ese lado y el índice del otro). Devuelve la muñeca y el marco de la palma.
 */
export function manoEnPinza(C: V3, d: V3, n: V3, s: number): { muneca: V3; dedos: V3; palma: V3 } {
  const N = normV(n);
  const c = normV(cruzV(N, d));
  const F: V3 = [c[0] * s, c[1] * s, c[2] * s];
  const X = cruzV(F, N);
  const T: V3 = [X[0] * s, X[1] * s, X[2] * s];
  const [a, b, cc] = HUECO_PINZA;
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
  actualizar: (e: Esqueleto, cierreD: number, cierreI: number, pinzaD?: number, pinzaI?: number) => void;
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

  function mano(h0: number, s: number, muneca: V3, F: V3, N: V3, cierre: number, pinza: number) {
    segmentosMano(muneca, F, N, s, cierre, pinza).forEach((g, j) => colocar(huesos[h0 + j], g.pos, g.dir, g.z));
  }

  return {
    malla,
    raiz,
    actualizar(e, cierreD, cierreI, pinzaD = 0, pinzaI = 0) {
      mano(LADOS[0].h0, LADOS[0].s, e.munecaD, e.palmaD.dedos, e.palmaD.normal, cierreD, pinzaD);
      mano(LADOS[1].h0, LADOS[1].s, e.munecaI, e.palmaI.dedos, e.palmaI.normal, cierreI, pinzaI);
    },
  };
}
