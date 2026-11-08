import { EJERCICIOS } from '../contenido/ejercicios';
import type { Ejercicio } from '../contenido/tipos';
import { SERENA } from '../escena/poses';
import { TOMAS } from './comunes';
import { cargarOmbligo } from './cargarOmbligo';
import { sellarCielo } from './sellarCielo';
import { enraizar } from './enraizar';
import { liberarCreencias } from './liberar';
import { activarCentros, cargaYSellado, recorridoChakras, selladoFinal, sensibilizarManos } from './notas';
import { equilibrarOrganos } from './organos';
import { sanarOtraPersona } from './sanar';
import { separarExPareja, separarOtraPersona, separarSangre } from './separar';
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
  'cargar-ombligo': cargarOmbligo,
  'sellar-cielo': sellarCielo,
  'liberar-creencias': liberarCreencias,
  'equilibrar-organos': equilibrarOrganos,
  'sanar-otra-persona': sanarOtraPersona,
  enraizar,
  'separar-otra-persona': separarOtraPersona,
  'separar-sangre': separarSangre,
  'separar-ex-pareja': separarExPareja,
  'carga-y-sellado': cargaYSellado,
  'sensibilizar-manos': sensibilizarManos,
  'activar-centros': activarCentros,
  'recorrido-chakras': recorridoChakras,
  'sellado-final': selladoFinal,
};

export const SECUENCIAS: Record<string, Secuencia> = Object.fromEntries(
  EJERCICIOS.map((ej) => [ej.id, PROPIAS[ej.id] ?? generica(ej)]),
);
