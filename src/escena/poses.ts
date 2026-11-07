import { type Pose, NEUTRA, POS_ORGANOS, PUNTOS, type PuntoCuerpo, pose } from './cuerpo';
import { type V3, normV, sumaV } from './mate';

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
  manoD: [-0.03, 1.225, 0.138],
  codoD: [-0.45, -1, 0.1],
  palmaD: ATRAS,
  dedosD: normV([0.45, 0.88, 0]),
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
