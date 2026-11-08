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
import { type V3, clamp, cruzV, lerp, normV, puntoV, suave } from './mate';

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

export interface Manos {
  malla: SkinnedMesh;
  raiz: Bone;
  actualizar: (e: Esqueleto, cierreD: number, cierreI: number) => void;
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

  function mano(h0: number, s: number, muneca: V3, F: V3, N: V3, cierre: number) {
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

    colocar(huesos[h0], muneca, F, N);

    DEDOS.forEach((d, i) => {
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
      let p = local(d.base[0], d.base[1] - 0.006, d.base[2]);
      let th = 0;
      for (let j = 0; j < 3; j++) {
        th += angulos[j];
        const dj: V3 = normV([
          d0[0] * Math.cos(th) + N[0] * Math.sin(th),
          d0[1] * Math.cos(th) + N[1] * Math.sin(th),
          d0[2] * Math.cos(th) + N[2] * Math.sin(th),
        ]);
        colocar(huesos[h0 + 1 + i * 3 + j], p, dj, cruzV(L, dj));
        p = avanzar(p, dj, d.largos[j]);
      }
    });

    // Pulgar: al cerrar la mano cruza por delante de la palma.
    const k = clamp(cierre);
    const metaD = dir(lerp(0.62, 0.36, k * 0.7), lerp(0.66, 0.62, k), lerp(0.42, 0.68, k * 0.7));
    const proxD = dir(lerp(0.42, -0.25, k * 0.8), lerp(0.84, 0.6, k * 0.8), lerp(0.36, 0.75, k * 0.8));
    const kd = 0.2 + 0.6 * k;
    const distD = normV([
      proxD[0] + (dir(-0.55, 0.35, 0.75)[0] - proxD[0]) * kd,
      proxD[1] + (dir(-0.55, 0.35, 0.75)[1] - proxD[1]) * kd,
      proxD[2] + (dir(-0.55, 0.35, 0.75)[2] - proxD[2]) * kd,
    ]);
    const hp = h0 + 1 + DEDOS.length * 3;
    let p = local(PULGAR.base[0], PULGAR.base[1], PULGAR.base[2]);
    [metaD, proxD, distD].forEach((dj, j) => {
      // La uña mira hacia afuera de la palma: Z de la pieza ≈ −N girado hacia el pulgar.
      const zRef: V3 = puntoV(dj, N) > 0.9 ? T : N;
      colocar(huesos[hp + j], p, dj, zRef);
      p = avanzar(p, dj, PULGAR.largos[j]);
    });
  }

  return {
    malla,
    raiz,
    actualizar(e, cierreD, cierreI) {
      mano(LADOS[0].h0, LADOS[0].s, e.munecaD, e.palmaD.dedos, e.palmaD.normal, cierreD);
      mano(LADOS[1].h0, LADOS[1].s, e.munecaI, e.palmaI.dedos, e.palmaI.normal, cierreI);
    },
  };
}
