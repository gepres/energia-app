import { EJERCICIOS } from '../contenido/ejercicios';
import type { Ejercicio } from '../contenido/tipos';
import { SERENA } from '../escena/poses';
import { TOMAS } from './comunes';
import { liberarCreencias } from './liberar';
import { type Secuencia, fijarPose, toma } from './motor';

/** Secuencia mínima para un ejercicio aún sin coreografía propia. */
function generica(ej: Ejercicio): Secuencia {
  return {
    inicial: (e) => {
      fijarPose(e, 0, SERENA);
      e.camara = { ...TOMAS.general };
    },
    pasos: ej.pasos.map(() => ({
      dur: 5,
      aplicar: (e, t) => toma(e, TOMAS.general, t),
    })),
  };
}

const PROPIAS: Record<string, Secuencia> = {
  'liberar-creencias': liberarCreencias,
};

export const SECUENCIAS: Record<string, Secuencia> = Object.fromEntries(
  EJERCICIOS.map((ej) => [ej.id, PROPIAS[ej.id] ?? generica(ej)]),
);
