import { type Pose, NEUTRA, POS_ORGANOS, PUNTOS, type PuntoCuerpo, pose } from './cuerpo';
import { cierreParaBarra } from './manos';
import { type V3, clamp, entraSaleSeno, lerpV, normV, suave, sumaV } from './mate';

/**
 * Biblioteca de poses. Coordenadas del cuerpo erguido (mirando a +Z;
 * derecha = −X). Las manos son objetivos de muñeca: el IK coloca el brazo.
 */

const ARRIBA: V3 = [0, 1, 0];
const ABAJO: V3 = [0, -1, 0];
const ATRAS: V3 = [0, 0, -1];
const DELANTE: V3 = [0, 0, 1];

export { NEUTRA };

/** De pie, manos sueltas y un poco por delante: postura de escucha. */
export const SERENA = pose({
  manoD: [-0.19, 0.9, 0.08],
  manoI: [0.19, 0.9, 0.08],
  codoD: [-0.5, -0.2, -0.85],
  codoI: [0.5, -0.2, -0.85],
  palmaD: [0.7, 0, 0.3],
  palmaI: [-0.7, 0, 0.3],
});

/** Manos frente a un punto, palmas hacia el cuerpo (cargar). */
function cargarEn(y: number, z: number): Pose {
  return pose({
    manoD: [-0.115, y - 0.035, z],
    manoI: [0.115, y - 0.035, z],
    codoD: [-0.8, -0.5, -0.3],
    codoI: [0.8, -0.5, -0.3],
    palmaD: ATRAS,
    palmaI: ATRAS,
    dedosD: normV([0.85, 0.5, 0]),
    dedosI: normV([-0.85, 0.5, 0]),
    cierreD: 0.14,
    cierreI: 0.14,
  });
}
export const CARGA_OMBLIGO = cargarEn(1.04, 0.25);
export const CARGA_PECHO = cargarEn(1.29, 0.27);

/** Brazos en alto, palmas al frente: inicio del sellado desde el cielo. */
export const BRAZOS_CIELO = pose({
  manoD: [-0.2, 1.9, 0.14],
  manoI: [0.2, 1.9, 0.14],
  codoD: [-1, 0.1, -0.2],
  codoI: [1, 0.1, -0.2],
  palmaD: normV([0.4, 0.2, 0.9]),
  palmaI: normV([-0.4, 0.2, 0.9]),
  dedosD: ARRIBA,
  dedosI: ARRIBA,
  cabezaPitch: -0.18,
});

/** Palmas hacia abajo por delante del cuerpo, a una altura dada (sellar). */
export function palmasAbajo(y: number, z = 0.34, ancho = 0.2): Pose {
  return pose({
    manoD: [-ancho, y, z],
    manoI: [ancho, y, z],
    codoD: [-1, -0.3, -0.3],
    codoI: [1, -0.3, -0.3],
    palmaD: ABAJO,
    palmaI: ABAJO,
    dedosD: normV([-0.2, 0, 1]),
    dedosI: normV([0.2, 0, 1]),
  });
}

/** Mano derecha sobre el corazón. */
export const MANO_CORAZON = pose({
  // La palma apoyada sobre el pecho (superficie a z ≈ 0,10).
  manoD: [-0.03, 1.225, 0.12],
  codoD: [-0.45, -1, 0.1],
  palmaD: ATRAS,
  dedosD: normV([0.45, 0.88, 0]),
  cierreD: 0.06,
  manoI: [0.2, 0.885, 0.05],
  cabezaPitch: 0.12,
});

/** Esfera entre las palmas, frente al pecho. `sep` = distancia entre muñecas. */
export function esferaEnManos(y = 1.2, z = 0.3, sep = 0.25): Pose {
  return pose({
    manoD: [-sep / 2, y - 0.04, z],
    manoI: [sep / 2, y - 0.04, z],
    codoD: [-1, -0.6, -0.2],
    codoI: [1, -0.6, -0.2],
    palmaD: [1, 0, 0],
    palmaI: [-1, 0, 0],
    dedosD: normV([0.1, 0.55, 0.85]),
    dedosI: normV([-0.1, 0.55, 0.85]),
    cabezaPitch: 0.22,
  });
}

/** Mano izquierda sostiene la bolsa por el cuello. */
export const BOLSA_IZQUIERDA = pose({
  manoI: [0.17, 1.2, 0.33],
  codoI: [0.8, -0.6, -0.2],
  palmaI: [-1, 0, 0],
  dedosI: normV([-0.2, 0, 1]),
  manoD: [-0.2, 0.885, 0.05],
  cabezaPitch: 0.1,
});

/** Bolsa a la boca para soplar. */
export const SOPLAR = pose({
  manoI: [0.075, 1.4, 0.25],
  codoI: [0.9, -0.5, 0],
  palmaI: [-1, 0, 0],
  dedosI: normV([-0.3, 0.3, 0.9]),
  manoD: [-0.08, 1.33, 0.27],
  codoD: [-0.9, -0.5, 0],
  palmaD: [1, 0, 0],
  dedosD: normV([0.3, 0.3, 0.9]),
  cabezaPitch: 0.18,
});

/** Las dos manos juntas al frente (atar). */
export const ATAR = pose({
  manoD: [-0.06, 1.12, 0.31],
  manoI: [0.06, 1.15, 0.31],
  codoD: [-1, -0.6, -0.2],
  codoI: [1, -0.6, -0.2],
  palmaD: normV([0.6, 0.6, 0]),
  palmaI: normV([-0.6, -0.4, 0]),
  dedosD: DELANTE,
  dedosI: DELANTE,
  cabezaPitch: 0.35,
});

/** Brazo derecho extendido señalando/lanzando hacia delante. */
export function brazoExtendidoD(dir: V3 = [-0.25, 0.05, 1], palma: V3 = DELANTE): Pose {
  const d = normV(dir);
  return pose({
    manoD: sumaV([-0.182, 1.38, 0], [d[0] * 0.53, d[1] * 0.53, d[2] * 0.53]),
    codoD: [-0.6, -1, 0],
    palmaD: palma,
    dedosD: normV([d[0], d[1] + 0.35, d[2]]),
    manoI: [0.2, 0.885, 0.05],
  });
}

/** Disparar una esfera: brazo derecho extendido, palma al frente. */
export const DISPARAR = brazoExtendidoD([-0.05, 0.02, 1], DELANTE);

/** Mano extendida a `dist` de un punto del cuerpo, palma hacia él. */
export function manoHaciaPunto(p: V3, dist = 0.16, lado: 'D' | 'I' = 'D'): Pose {
  const palma = sumaV(p, [0, 0, dist]);
  const muneca = sumaV(palma, [lado === 'D' ? -0.01 : 0.01, -0.075, 0]);
  if (lado === 'D') {
    return pose({
      manoD: muneca,
      codoD: [-0.9, -0.8, 0],
      palmaD: ATRAS,
      dedosD: normV([0.12, 1, 0]),
      manoI: [0.2, 0.885, 0.05],
    });
  }
  return pose({
    manoI: muneca,
    codoI: [0.9, -0.8, 0],
    palmaI: ATRAS,
    dedosI: normV([-0.12, 1, 0]),
    manoD: [-0.2, 0.885, 0.05],
  });
}

/** Las dos manos empujan algo hacia un punto del cuerpo desde delante. */
export function empujarHacia(p: V3, dist = 0.12): Pose {
  const c = sumaV(p, [0, 0, dist + 0.07]);
  return pose({
    manoD: [c[0] - 0.085, c[1] - 0.06, c[2] + 0.01],
    manoI: [c[0] + 0.085, c[1] - 0.06, c[2] + 0.01],
    codoD: [-1, -0.7, 0],
    codoI: [1, -0.7, 0],
    palmaD: normV([0.7, 0, -0.7]),
    palmaI: normV([-0.7, 0, -0.7]),
    dedosD: normV([0.15, 1, 0.1]),
    dedosI: normV([-0.15, 1, 0.1]),
    cabezaPitch: p[1] > 1.5 ? -0.05 : 0.2,
  });
}

export function manoAOrgano(organo: string, dist = 0.18): Pose {
  const p = POS_ORGANOS[organo]?.[0] ?? PUNTOS.corazon;
  const frente: V3 = [p[0], p[1], Math.max(p[2], 0.08)];
  return manoHaciaPunto(frente, dist, 'D');
}

/** En cuclillas tocando el piso con las dos manos (enraizar). */
export const TOCAR_PISO = pose({
  agachar: 0.56,
  inclinar: 0.95,
  manoD: [-0.13, 0.13, 0.33],
  manoI: [0.13, 0.13, 0.33],
  codoD: [-0.6, 0, -0.4],
  codoI: [0.6, 0, -0.4],
  palmaD: ABAJO,
  palmaI: ABAJO,
  dedosD: normV([0, -0.35, 1]),
  dedosI: normV([0, -0.35, 1]),
  cabezaPitch: 0.1,
});

/** Agachado dejando algo en el piso delante. */
export const DEJAR_EN_PISO = pose({
  agachar: 0.32,
  inclinar: 0.62,
  manoD: [-0.07, 0.42, 0.52],
  manoI: [0.07, 0.42, 0.52],
  codoD: [-0.8, -0.3, -0.3],
  codoI: [0.8, -0.3, -0.3],
  palmaD: normV([0.2, 1, 0]),
  palmaI: normV([-0.2, 1, 0]),
  dedosD: DELANTE,
  dedosI: DELANTE,
  cabezaPitch: 0.25,
});

/** Manos ahuecadas frente al pecho (sacar la rosa). */
export const MANOS_PECHO = pose({
  manoD: [-0.07, 1.22, 0.22],
  manoI: [0.07, 1.22, 0.22],
  codoD: [-1, -0.8, 0],
  codoI: [1, -0.8, 0],
  palmaD: normV([0.5, 1, 0]),
  palmaI: normV([-0.5, 1, 0]),
  dedosD: normV([0.2, 0.2, 1]),
  dedosI: normV([-0.2, 0.2, 1]),
  cabezaPitch: 0.25,
});

/** Ofrecer con las dos manos hacia delante (palmas arriba). */
export const OFRECER = pose({
  manoD: [-0.1, 1.15, 0.42],
  manoI: [0.1, 1.15, 0.42],
  codoD: [-0.8, -0.8, 0],
  codoI: [0.8, -0.8, 0],
  palmaD: ARRIBA,
  palmaI: ARRIBA,
  dedosD: DELANTE,
  dedosI: DELANTE,
});

/** Sanar: mano izquierda hacia la tierra, derecha al frente. */
export function sanar(yD = 1.25, zD = 0.46): Pose {
  return pose({
    manoI: [0.32, 0.78, 0.08],
    codoI: [1, 0, -0.4],
    palmaI: ABAJO,
    dedosI: normV([0.3, -1, 0.2]),
    manoD: [-0.1, yD, zD],
    codoD: [-0.8, -1, 0],
    palmaD: DELANTE,
    dedosD: normV([0.05, 1, 0.15]),
  });
}

/** Mano izquierda tomando de una columna a la izquierda. */
export const TOMAR_IZQUIERDA = pose({
  manoI: [0.62, 1.32, 0.06],
  codoI: [0, -1, -0.3],
  palmaI: [1, 0, 0],
  dedosI: normV([0.6, 0.6, 0.2]),
  manoD: [-0.16, 1.15, 0.3],
  codoD: [-1, -0.5, -0.2],
  palmaD: ARRIBA,
  dedosD: normV([0.4, 0, 1]),
  cabezaYaw: 0.5,
});

/** Sensibilización: antebrazo izquierdo al frente, palma arriba; la derecha palpa encima. */
export const SENSIBILIZAR = pose({
  manoI: [0.07, 1.12, 0.36],
  codoI: [0.7, -0.7, -0.3],
  palmaI: ARRIBA,
  dedosI: normV([-0.35, 0, 1]),
  manoD: [-0.14, 1.25, 0.32],
  codoD: [-1, -0.4, -0.2],
  palmaD: ABAJO,
  dedosD: normV([0.4, 0, 1]),
  cabezaPitch: 0.32,
});

/** Sellado final: derecha debajo (palma arriba), izquierda encima (palma abajo). */
export function sellarCarga(sep = 0.13): Pose {
  return pose({
    manoD: [-0.06, 1.0, 0.26],
    manoI: [0.06, 1.0 + sep, 0.27],
    codoD: [-1, -0.7, -0.1],
    codoI: [1, -0.4, -0.1],
    palmaD: ARRIBA,
    palmaI: ABAJO,
    dedosD: normV([0.9, 0, 0.4]),
    dedosI: normV([-0.9, 0, 0.4]),
    cabezaPitch: 0.2,
  });
}

/** Ojos hacia arriba, manos sueltas: visualizar. */
export const VISUALIZAR = pose({ ...SERENA, cabezaPitch: -0.08 });

export function puntoCuerpo(nombre: PuntoCuerpo): V3 {
  return PUNTOS[nombre];
}

/** Esfera entre las palmas centrada en un punto del cuerpo (x, y, z). */
export function esferaEnManosEn(c: V3, sep = 0.24): Pose {
  return pose({
    manoD: [c[0] - sep / 2, c[1] - 0.045, c[2] - 0.035],
    manoI: [c[0] + sep / 2, c[1] - 0.045, c[2] - 0.035],
    codoD: [-1, -0.6, -0.2],
    codoI: [1, -0.6, -0.2],
    palmaD: [1, 0, 0],
    palmaI: [-1, 0, 0],
    dedosD: normV([0.1, 0.55, 0.85]),
    dedosI: normV([-0.1, 0.55, 0.85]),
    cabezaPitch: c[1] > 1.5 ? -0.25 : c[1] < 0.95 ? 0.45 : 0.22,
    inclinar: c[1] < 0.9 ? 0.25 : 0,
    agachar: c[1] < 0.9 ? 0.08 : 0,
  });
}

/** Dos palmas abiertas hacia arriba, separadas (una esfera en cada mano). */
export function palmasArriba(sep = 0.42, y = 1.08, z = 0.34): Pose {
  return pose({
    manoD: [-sep / 2, y, z],
    manoI: [sep / 2, y, z],
    codoD: [-0.8, -0.8, -0.1],
    codoI: [0.8, -0.8, -0.1],
    palmaD: ARRIBA,
    palmaI: ARRIBA,
    dedosD: normV([0.15, 0, 1]),
    dedosI: normV([-0.15, 0, 1]),
    cabezaPitch: 0.3,
  });
}

/** Sellar desde el cielo: la mano derecha toma la energía por encima de la cabeza. */
export const TOMAR_ARRIBA = pose({
  manoD: [-0.05, 1.92, 0.13],
  codoD: [-1, 0.2, -0.1],
  palmaD: normV([0.1, -0.35, -0.93]),
  dedosD: normV([0.25, 1, 0.1]),
  manoI: [0.2, 0.885, 0.05],
  cabezaPitch: -0.12,
});

/** La mano derecha baja por delante, palma hacia el cuerpo, como un velo. */
export function veloMano(y: number): Pose {
  const z = 0.3 + 0.04 * Math.sin(Math.PI * Math.min(1, Math.max(0, (1.9 - y) / 1.1)));
  return pose({
    manoD: [-0.04, y, z],
    codoD: [-1, -0.25, 0],
    palmaD: ATRAS,
    dedosD: normV([0.75, y > 1.3 ? 0.55 : -0.2, 0]),
    manoI: [0.2, 0.885, 0.05],
    cabezaPitch: y > 1.5 ? -0.05 : 0.15,
  });
}

/** Las dos manos estiradas al frente: la izquierda toma de su barra, la derecha recibe. */
export const TOMAR_BARRA_IZQUIERDA = pose({
  manoI: [0.15, 1.27, 0.45],
  codoI: [0.6, -1, -0.2],
  palmaI: [1, 0, 0],
  dedosI: normV([0, 0.25, 1]),
  manoD: [-0.13, 1.17, 0.36],
  codoD: [-1, -0.6, -0.1],
  palmaD: ARRIBA,
  dedosD: normV([0.35, 0, 1]),
});

/** Sellado final: la derecha tapa el ombligo y la izquierda va encima de ella. */
export const CUBRIR_OMBLIGO = pose({
  // Palma derecha sobre el ombligo, dedos hacia la izquierda del cuerpo.
  manoD: [-0.072, 1.035, 0.1],
  codoD: [-1, -0.7, -0.2],
  palmaD: ATRAS,
  dedosD: [1, 0, 0],
  cierreD: 0.05,
  // Palma izquierda encima de la derecha, dedos hacia la derecha del cuerpo.
  manoI: [0.072, 1.05, 0.127],
  codoI: [1, -0.6, -0.2],
  palmaI: ATRAS,
  dedosI: [-1, 0, 0],
  cierreI: 0.05,
  cabezaPitch: 0.18,
});

/**
 * Cerrar el campo: la mano derecha sale a buscar la energía esparcida (k = 0)
 * y la trae hacia el cuerpo (k = 1). `dir` es hacia dónde se estira.
 */
export function atraerCampo(dir: V3, k: number): Pose {
  const d = normV(dir);
  const lejos: V3 = [-0.182 + d[0] * 0.52, 1.36 + d[1] * 0.52, d[2] * 0.52];
  const cerca: V3 = [-0.1, 1.22, 0.2];
  const m: V3 = [lejos[0] + (cerca[0] - lejos[0]) * k, lejos[1] + (cerca[1] - lejos[1]) * k, lejos[2] + (cerca[2] - lejos[2]) * k];
  return pose({
    manoD: m,
    codoD: [-0.8, -0.8, -0.2],
    // Palma hacia el cuerpo: «como agarrándolo» para acercarlo.
    palmaD: normV([-d[0] * 0.6, 0.1, -Math.abs(d[2]) - 0.3]),
    dedosD: normV([d[0] * 0.5, 0.6, d[2] * 0.5 + 0.3]),
    manoI: [0.2, 0.885, 0.05],
    cabezaYaw: -0.25 * (1 - k),
  });
}

// ── Cargar el ombligo desde las barras (descrito en el taller) ──────────

/** Muñeca con el brazo bien estirado al frente, a la altura del hombro (alcance máximo 0,545). */
export const MUNECA_BARRA = { x: 0.182, y: 1.41, z: 0.525 };
/** Radio de cada barra de energía: lo justo para que el puño la rodee. */
export const RADIO_BARRA = 0.022;
/** Cierre de los dedos que rodea la barra (≈ 0,6). */
const CIERRE_BARRA = cierreParaBarra(RADIO_BARRA);

type Lado = 'D' | 'I';
interface Mano {
  mano: V3;
  codo: V3;
  palma: V3;
  dedos: V3;
  /** Cierre de los dedos (0 plana, 1 puño). */
  cierre: number;
}

/**
 * Mano agarrando su barra: brazo estirado al frente a la altura del hombro,
 * pulgar arriba y palma hacia dentro; los dedos rodean la barra vertical, que
 * pasa por el puño (ver `centroAgarre`).
 */
function agarre(lado: Lado): Mano {
  const s = lado === 'D' ? -1 : 1;
  return {
    mano: [s * MUNECA_BARRA.x, MUNECA_BARRA.y, MUNECA_BARRA.z],
    codo: [s * 1, -0.4, 0],
    palma: [-s, 0, 0],
    // Dedos horizontales: así el eje del puño queda vertical, como la barra.
    dedos: normV([-s * 0.1, 0, 1]),
    cierre: CIERRE_BARRA,
  };
}

/** Mano frente al ombligo entregando la esfera (palma hacia el cuerpo). */
function entrega(lado: Lado): Mano {
  const s = lado === 'D' ? -1 : 1;
  return {
    mano: [s * 0.065, 0.995, 0.215],
    codo: [s * 1, -0.8, -0.2],
    palma: ATRAS,
    dedos: normV([-s * 0.6, 0.55, 0]),
    // Palma abierta apoyando la esfera en el ombligo.
    cierre: 0.1,
  };
}

function mezclaV(a: V3, b: V3, k: number): V3 {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** Curva cuadrática de Bézier (la mano baja en arco y no en línea recta). */
function bezier(a: V3, c: V3, b: V3, k: number): V3 {
  const u = 1 - k;
  return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1], u * u * a[2] + 2 * u * k * c[2] + k * k * b[2]];
}

/**
 * Posición de una mano en su ciclo de carga, `u` ∈ [0, 1]:
 *   0–0,18 agarra energía en la barra · 0,18–0,78 la lleva despacio al ombligo
 *   0,78–0,86 la entrega · 0,86–1 vuelve a su barra.
 */
function cicloMano(lado: Lado, u: number): Mano {
  const a = agarre(lado);
  const b = entrega(lado);
  const s = lado === 'D' ? -1 : 1;
  // El arco pasa por afuera de la barra: la mano se suelta hacia el costado y vuelve a tomarla desde ahí.
  const control: V3 = [s * 0.235, 1.3, 0.44];
  const arriba: V3 = [0, 1, 0];
  if (u < 0.18) {
    const apriete = Math.sin((u / 0.18) * Math.PI);
    // Aprieta la barra un instante para tomar la energía.
    return { ...a, cierre: a.cierre + 0.07 * apriete };
  }
  if (u < 0.78) {
    const k = entraSaleSeno((u - 0.18) / 0.6);
    // A mitad de camino la palma mira hacia arriba: lleva la esfera.
    const palma = k < 0.5 ? normV(mezclaV(a.palma, arriba, k * 2)) : normV(mezclaV(arriba, b.palma, (k - 0.5) * 2));
    // Suelta la barra (se abre rápido), se ahueca para llevar la esfera y se abre al llegar.
    const cierre = k < 0.12 ? a.cierre + (0.2 - a.cierre) * (k / 0.12) : k < 0.5 ? 0.2 + 0.14 * ((k - 0.12) / 0.38) : 0.34 + (b.cierre - 0.34) * (k - 0.5) * 2;
    return { mano: bezier(a.mano, control, b.mano, k), codo: normV(mezclaV(a.codo, b.codo, k)), palma, dedos: normV(mezclaV(a.dedos, b.dedos, k)), cierre };
  }
  if (u < 0.86) {
    const empuje = Math.sin(((u - 0.78) / 0.08) * Math.PI) * 0.025;
    return { ...b, mano: [b.mano[0], b.mano[1], b.mano[2] - empuje] };
  }
  const k = entraSaleSeno((u - 0.86) / 0.14);
  return {
    mano: bezier(b.mano, control, a.mano, k),
    codo: normV(mezclaV(b.codo, a.codo, k)),
    palma: normV(mezclaV(b.palma, a.palma, k)),
    dedos: normV(mezclaV(b.dedos, a.dedos, k)),
    // Llega abierta y cierra los dedos alrededor de la barra al final del camino.
    cierre: b.cierre + (a.cierre - b.cierre) * entraSaleSeno(Math.max(0, (k - 0.72) / 0.28)),
  };
}

/**
 * Pose del gesto de carga. `uD` / `uI` son las fases del ciclo de cada mano;
 * `null` deja esa mano agarrando su barra con el brazo estirado.
 */
export function poseCargaBarras(uD: number | null, uI: number | null): Pose {
  const D = uD === null ? agarre('D') : cicloMano('D', uD);
  const I = uI === null ? agarre('I') : cicloMano('I', uI);
  return pose({
    manoD: D.mano,
    codoD: D.codo,
    palmaD: D.palma,
    dedosD: D.dedos,
    cierreD: D.cierre,
    manoI: I.mano,
    codoI: I.codo,
    palmaI: I.palma,
    dedosI: I.dedos,
    cierreI: I.cierre,
    cabezaPitch: uD !== null || uI !== null ? 0.1 : 0.02,
  });
}

// ── Sellar desde el cielo (descrito en el taller) ───────────────────────

/** Nube luminosa por encima de la cabeza, apenas al frente: las manos estiradas llegan a su base. */
export const NUBE_CIELO = { centro: [0, 2.16, 0.07] as V3, radio: 0.4 };

/** Hombro (alto y separación) y distancia hombro–muñeca con el brazo casi recto. */
const HOMBRO = { x: 0.182, y: 1.415, z: -0.01 };
const BRAZO_RECTO = 0.535;
/** Ángulo final de la bajada: las manos quedan junto a los muslos. */
export const THETA_ABAJO = 2.93;
/** Codo apenas hacia atrás: con el brazo casi recto, el mismo en todo el gesto (sin saltos). */
const CODO_ATRAS = (s: number): V3 => normV([s * 0.6, 0, -1]);

/**
 * Las dos manos estiradas hacia arriba tocando la nube: dedos hacia arriba
 * (entran en la base de la nube), palmas al frente. `cierre` las cierra al agarrarla.
 */
export function manosALaNube(cierre = 0.22): Pose {
  return bajarPorLosCostados(-0.04, cierre);
}

/**
 * Bajada abriendo por los costados: cada brazo, casi recto, describe un arco en
 * el plano del cuerpo. `theta` es el ángulo desde arriba (0 = brazo hacia
 * arriba, π/2 = en cruz, ≈ 2,93 = abajo, junto al muslo).
 * Las palmas, que arriba miran al frente (hacia la nube), van girando poco a
 * poco hasta mirar al piso (del todo un poco después de la cruz). Pasada la
 * cruz, la muñeca se dobla para que los dedos sigan hacia afuera y la palma
 * siga mirando abajo, como apoyando el velo.
 */
export function bajarPorLosCostados(theta: number, cierre: number): Pose {
  const brazo = (s: number) => {
    const z = HOMBRO.z + 0.087 * Math.pow(Math.max(0, 1 - theta / Math.PI), 2);
    const mano: V3 = [s * (HOMBRO.x + BRAZO_RECTO * Math.sin(theta)), HOMBRO.y + BRAZO_RECTO * Math.cos(theta), z];
    const aLoLargo: V3 = [s * Math.sin(theta), Math.cos(theta), 0.06 * Math.cos(theta)];
    const palmaArriba = normV([-s * 0.15 * Math.cos(theta), 0.3 * Math.max(0, Math.cos(theta)), 1]);
    const gira = suave(clamp(theta / 2.0));
    const palma = normV(lerpV(palmaArriba, [0, -1, 0], gira));
    // Dedos hacia afuera con la muñeca doblada ≈ 55° al final (no más: sería forzado).
    const doblar = suave(clamp((theta - Math.PI / 2) / (THETA_ABAJO - Math.PI / 2)));
    const afuera = normV(sumaV([s, 0, 0.08], [aLoLargo[0] * 0.45, aLoLargo[1] * 0.45, aLoLargo[2] * 0.45]));
    const dedos = normV(lerpV(aLoLargo, afuera, doblar));
    return { mano, palma, dedos };
  };
  const D = brazo(-1);
  const I = brazo(1);
  return pose({
    manoD: D.mano,
    manoI: I.mano,
    codoD: CODO_ATRAS(-1),
    codoI: CODO_ATRAS(1),
    palmaD: D.palma,
    palmaI: I.palma,
    dedosD: D.dedos,
    dedosI: I.dedos,
    cierreD: cierre,
    cierreI: cierre,
    // Mira la nube arriba y vuelve a mirar al frente mientras baja.
    cabezaPitch: -0.3 * Math.max(0, Math.cos(theta)) + 0.06 * Math.max(0, -Math.cos(theta)),
  });
}


