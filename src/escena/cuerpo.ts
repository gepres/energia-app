import {
  type V3,
  clamp,
  cruzV,
  escalaV,
  largoV,
  lerp,
  lerpV,
  normV,
  puntoV,
  restaV,
  rotarX,
  sumaV,
} from './mate';

/**
 * Maniquí procedural.
 * Espacio local del cuerpo: origen en el piso entre los pies, Y arriba y la
 * figura mirando a +Z. Su lado DERECHO queda en −X y el IZQUIERDO en +X.
 * Altura total ≈ 1,70.
 */
export const PROP = {
  hombroY: 1.415,
  hombroX: 0.182,
  cuelloY: 1.47,
  cabezaY: 1.59,
  pivoteY: 1.02, // cintura: el torso se inclina alrededor de este punto
  caderaY: 0.92,
  caderaX: 0.088,
  tobilloY: 0.075,
  tobilloX: 0.1,
  brazo: 0.29,
  antebrazo: 0.255,
  muslo: 0.42,
  pierna: 0.425,
  mano: 0.17,
} as const;

export type PuntoCuerpo =
  | 'coronilla'
  | 'tercerOjo'
  | 'frente'
  | 'boca'
  | 'garganta'
  | 'corazon'
  | 'ombligo'
  | 'genital'
  | 'coxis'
  | 'omoplatos'
  | 'nuca'
  | 'pelvis'
  | 'pies';

/** Centros energéticos y referencias del cuerpo (postura erguida). */
export const PUNTOS: Record<PuntoCuerpo, V3> = {
  coronilla: [0, 1.715, 0],
  tercerOjo: [0, 1.62, 0.1],
  /** Centro de la frente, unos centímetros sobre el entrecejo (sobre la piel). */
  frente: [0, 1.66, 0.085],
  boca: [0, 1.545, 0.1],
  garganta: [0, 1.455, 0.065],
  corazon: [0, 1.3, 0.125],
  ombligo: [0, 1.04, 0.115],
  genital: [0, 0.875, 0.1],
  coxis: [0, 0.9, -0.105],
  omoplatos: [0, 1.33, -0.115],
  nuca: [0, 1.52, -0.075],
  pelvis: [0, 0.88, 0],
  pies: [0, 0, 0],
};

/** Posición aproximada de cada órgano del apunte (postura erguida). */
export const POS_ORGANOS: Record<string, V3[]> = {
  cerebro: [
    [0, 1.635, 0.005],
    [0, 1.5, -0.05],
    [0, 1.36, -0.07],
    [0, 1.2, -0.07],
    [0, 1.04, -0.06],
  ],
  tiroides: [[0, 1.455, 0.045]],
  pulmones: [
    [-0.075, 1.31, 0.005],
    [0.075, 1.31, 0.005],
  ],
  corazon: [[0.032, 1.28, 0.045]],
  higado: [[-0.065, 1.165, 0.035]],
  estomago: [[0.06, 1.155, 0.045]],
  pancreas: [[0.005, 1.12, 0.01]],
  bazo: [[0.105, 1.145, -0.02]],
  rinones: [
    [-0.062, 1.085, -0.06],
    [0.062, 1.085, -0.06],
  ],
  vejiga: [[0, 0.9, 0.055]],
  reproductor: [[0, 0.865, 0.035]],
};

export interface Pose {
  /** Objetivo de la muñeca derecha / izquierda (espacio del cuerpo erguido). */
  manoD: V3;
  manoI: V3;
  /** Hacia dónde apunta el codo (dirección, no punto). */
  codoD: V3;
  codoI: V3;
  /** Normal de la palma. */
  palmaD: V3;
  palmaI: V3;
  /** Dirección de los dedos; si es nula se sigue el antebrazo. */
  dedosD: V3 | null;
  dedosI: V3 | null;
  /** Cierre de los dedos: 0 mano plana, ~0,3 relajada, 1 puño. */
  cierreD: number;
  cierreI: number;
  /** Pinza de masaje (0–1): el pulgar se arquea sobre la falange proximal del índice. */
  pinzaD: number;
  pinzaI: number;
  /** Tipo de pinza: 0 sostiene la palma de la otra mano, 1 toma un dedo de canto. */
  tipoPinzaD: number;
  tipoPinzaI: number;
  /**
   * Dedo aislado (0 índice … 3 meñique; −1 ninguno) y cuánto (0–1): ese dedo
   * queda estirado y los demás se recogen hacia la palma (para masajearlo).
   */
  aisladoD: number;
  aisladoI: number;
  aislarD: number;
  aislarI: number;
  /** Descenso de la pelvis (m): 0 de pie, ~0,6 en cuclillas. */
  agachar: number;
  /** Inclinación del torso hacia delante (rad). */
  inclinar: number;
  cabezaPitch: number;
  cabezaYaw: number;
}

export const NEUTRA: Pose = {
  manoD: [-0.215, 0.865, 0.02],
  manoI: [0.215, 0.865, 0.02],
  codoD: [-0.6, 0, -0.8],
  codoI: [0.6, 0, -0.8],
  palmaD: [0.9, 0, 0.1],
  palmaI: [-0.9, 0, 0.1],
  dedosD: [-0.05, -1, 0.02],
  dedosI: [0.05, -1, 0.02],
  cierreD: 0.3,
  cierreI: 0.3,
  pinzaD: 0,
  pinzaI: 0,
  tipoPinzaD: 0,
  tipoPinzaI: 0,
  aisladoD: -1,
  aisladoI: -1,
  aislarD: 0,
  aislarI: 0,
  agachar: 0,
  inclinar: 0,
  cabezaPitch: 0,
  cabezaYaw: 0,
};

export function pose(sobre: Partial<Pose>): Pose {
  return { ...NEUTRA, ...sobre };
}

function mezclarDir(a: V3 | null, b: V3 | null, k: number): V3 | null {
  if (!a && !b) return null;
  if (!a) return k < 0.5 ? null : b;
  if (!b) return k < 0.5 ? a : null;
  return normV(lerpV(a, b, k));
}

/** Mezcla dos poses. `arcoManos` separa las manos del cuerpo a mitad de camino. */
export function mezclarPose(a: Pose, b: Pose, k: number, arcoManos = 0.06): Pose {
  // Siempre devuelve una pose nueva: las poses de la biblioteca son constantes
  // compartidas y la coreografía puede retocar el resultado.
  if (k <= 0) return copiarPose(a);
  if (k >= 1) return copiarPose(b);
  const empuje = Math.sin(Math.PI * k) * arcoManos;
  const manoD = lerpV(a.manoD, b.manoD, k);
  const manoI = lerpV(a.manoI, b.manoI, k);
  manoD[2] += empuje;
  manoI[2] += empuje;
  return {
    manoD,
    manoI,
    codoD: normV(lerpV(a.codoD, b.codoD, k)),
    codoI: normV(lerpV(a.codoI, b.codoI, k)),
    palmaD: normV(lerpV(a.palmaD, b.palmaD, k)),
    palmaI: normV(lerpV(a.palmaI, b.palmaI, k)),
    dedosD: mezclarDir(a.dedosD, b.dedosD, k),
    dedosI: mezclarDir(a.dedosI, b.dedosI, k),
    cierreD: lerp(a.cierreD, b.cierreD, k),
    cierreI: lerp(a.cierreI, b.cierreI, k),
    pinzaD: lerp(a.pinzaD, b.pinzaD, k),
    pinzaI: lerp(a.pinzaI, b.pinzaI, k),
    tipoPinzaD: lerp(a.tipoPinzaD, b.tipoPinzaD, k),
    tipoPinzaI: lerp(a.tipoPinzaI, b.tipoPinzaI, k),
    // El dedo aislado cambia a mitad de camino; la cantidad se mezcla.
    aisladoD: k < 0.5 ? a.aisladoD : b.aisladoD,
    aisladoI: k < 0.5 ? a.aisladoI : b.aisladoI,
    aislarD: lerp(a.aislarD, b.aislarD, k),
    aislarI: lerp(a.aislarI, b.aislarI, k),
    agachar: lerp(a.agachar, b.agachar, k),
    inclinar: lerp(a.inclinar, b.inclinar, k),
    cabezaPitch: lerp(a.cabezaPitch, b.cabezaPitch, k),
    cabezaYaw: lerp(a.cabezaYaw, b.cabezaYaw, k),
  };
}

export function copiarPose(p: Pose): Pose {
  return {
    ...p,
    manoD: [...p.manoD],
    manoI: [...p.manoI],
    codoD: [...p.codoD],
    codoI: [...p.codoI],
    palmaD: [...p.palmaD],
    palmaI: [...p.palmaI],
    dedosD: p.dedosD ? [...p.dedosD] : null,
    dedosI: p.dedosI ? [...p.dedosI] : null,
  };
}

// ── IK de dos huesos ────────────────────────────────────────────────────

function perpendicular(d: V3): V3 {
  const ref: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return normV(cruzV(d, ref));
}

/**
 * Resuelve una cadena de dos segmentos (hombro-codo-muñeca, cadera-rodilla-tobillo).
 * Si el objetivo queda fuera de alcance, la cadena se estira hacia él.
 */
export function ik2(raiz: V3, objetivo: V3, a: number, b: number, polo: V3): { medio: V3; fin: V3 } {
  const d = restaV(objetivo, raiz);
  const dist = largoV(d);
  const dir = dist > 1e-6 ? escalaV(d, 1 / dist) : ([0, -1, 0] as V3);
  const r = clamp(dist, Math.abs(a - b) + 1e-4, a + b - 1e-4);
  const cosA = clamp((a * a + r * r - b * b) / (2 * a * r), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  let n = restaV(polo, escalaV(dir, puntoV(polo, dir)));
  if (largoV(n) < 1e-5) n = perpendicular(dir);
  n = normV(n);
  const medio = sumaV(raiz, sumaV(escalaV(dir, a * cosA), escalaV(n, a * sinA)));
  const fin = sumaV(raiz, escalaV(dir, r));
  return { medio, fin };
}

// ── Esqueleto resuelto ──────────────────────────────────────────────────

export interface Esqueleto {
  pelvis: V3;
  pivote: V3;
  inclinar: number;
  cuello: V3;
  cabeza: V3;
  cabezaPitch: number;
  cabezaYaw: number;
  hombroD: V3;
  hombroI: V3;
  codoD: V3;
  codoI: V3;
  munecaD: V3;
  munecaI: V3;
  /** Centro de la palma y su sistema (dedos, normal). */
  palmaD: { centro: V3; dedos: V3; normal: V3 };
  palmaI: { centro: V3; dedos: V3; normal: V3 };
  caderaD: V3;
  caderaI: V3;
  rodillaD: V3;
  rodillaI: V3;
  tobilloD: V3;
  tobilloI: V3;
}

/** Desplazamiento de la pelvis según cuánto se agacha (hacia atrás para equilibrar). */
function desplazamientoPelvis(agachar: number): V3 {
  return [0, -agachar, -0.36 * agachar];
}

/**
 * Lleva un punto del cuerpo erguido a la postura actual: baja con la pelvis y,
 * si está por encima de la cintura, rota con la inclinación del torso.
 */
export function transformarPunto(p: V3, agachar: number, inclinar: number): V3 {
  const off = desplazamientoPelvis(agachar);
  const pivote: V3 = [0, PROP.pivoteY + off[1], off[2]];
  const q = sumaV(p, off);
  if (p[1] < PROP.pivoteY - 0.04) return q;
  // Mezcla suave cerca de la cintura para que no haya un salto.
  const k = clamp((p[1] - (PROP.pivoteY - 0.04)) / 0.08);
  return rotarX(q, inclinar * k, pivote);
}

function marcoPalma(muneca: V3, antebrazo: V3, dedos: V3 | null, palma: V3) {
  const d = dedos ? normV(dedos) : antebrazo;
  // Ortogonaliza la normal de la palma respecto de los dedos.
  let n = restaV(palma, escalaV(d, puntoV(palma, d)));
  if (largoV(n) < 1e-4) n = perpendicular(d);
  n = normV(n);
  const centro = sumaV(muneca, escalaV(d, PROP.mano * 0.45));
  return { centro, dedos: d, normal: n };
}

export function resolverEsqueleto(p: Pose): Esqueleto {
  const off = desplazamientoPelvis(p.agachar);
  const T = (q: V3) => transformarPunto(q, p.agachar, p.inclinar);
  const rotarDir = (d: V3) => rotarX(d, p.inclinar, [0, 0, 0]);

  const pelvis = sumaV([0, PROP.caderaY, 0], off);
  const pivote: V3 = [0, PROP.pivoteY + off[1], off[2]];
  const cuello = T([0, PROP.cuelloY, -0.005]);
  const cabeza = T([0, PROP.cabezaY, 0.005]);
  const hombroD = T([-PROP.hombroX, PROP.hombroY, -0.01]);
  const hombroI = T([PROP.hombroX, PROP.hombroY, -0.01]);

  const bD = ik2(hombroD, p.manoD, PROP.brazo, PROP.antebrazo, rotarDir(p.codoD));
  const bI = ik2(hombroI, p.manoI, PROP.brazo, PROP.antebrazo, rotarDir(p.codoI));

  const caderaD = sumaV([-PROP.caderaX, PROP.caderaY, 0], off);
  const caderaI = sumaV([PROP.caderaX, PROP.caderaY, 0], off);
  const tobD: V3 = [-PROP.tobilloX, PROP.tobilloY, 0];
  const tobI: V3 = [PROP.tobilloX, PROP.tobilloY, 0];
  const pD = ik2(caderaD, tobD, PROP.muslo, PROP.pierna, [-0.18, 0, 1]);
  const pI = ik2(caderaI, tobI, PROP.muslo, PROP.pierna, [0.18, 0, 1]);

  const antD = normV(restaV(bD.fin, bD.medio));
  const antI = normV(restaV(bI.fin, bI.medio));

  return {
    pelvis,
    pivote,
    inclinar: p.inclinar,
    cuello,
    cabeza,
    cabezaPitch: p.cabezaPitch + p.inclinar,
    cabezaYaw: p.cabezaYaw,
    hombroD,
    hombroI,
    codoD: bD.medio,
    codoI: bI.medio,
    munecaD: bD.fin,
    munecaI: bI.fin,
    palmaD: marcoPalma(bD.fin, antD, p.dedosD, p.palmaD),
    palmaI: marcoPalma(bI.fin, antI, p.dedosI, p.palmaI),
    caderaD,
    caderaI,
    rodillaD: pD.medio,
    rodillaI: pI.medio,
    tobilloD: pD.fin,
    tobilloI: pI.fin,
  };
}
