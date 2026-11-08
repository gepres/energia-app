import { resolverEsqueleto } from '../escena/cuerpo';
import type { Estado } from '../escena/estado';
import { centroAgarre } from '../escena/manos';
import type { V3 } from '../escena/mate';
import { RADIO_BARRA, poseCargaBarras } from '../escena/poses';

/**
 * Las dos barras verticales de energía a la altura de las manos estiradas al
 * frente (las mismas en todos los ejercicios del taller que las usan). Cada
 * barra pasa justo por el puño de la mano que la agarra con el brazo estirado.
 */
const AGARRE = resolverEsqueleto(poseCargaBarras(null, null));
function barraEnElPuno(p: { dedos: V3; normal: V3 }, muneca: V3): V3 {
  const c = centroAgarre(muneca, p.dedos, p.normal, RADIO_BARRA);
  return [c[0], 0, c[2]];
}
export const BARRA_DER = barraEnElPuno(AGARRE.palmaD, AGARRE.munecaD);
export const BARRA_IZQ = barraEnElPuno(AGARRE.palmaI, AGARRE.munecaI);

export function barrasEnPuno(e: Estado, opacidad: number, resalteDer = 0, resalteIzq = 0) {
  Object.assign(e.barras, {
    activa: true,
    izq: [...BARRA_IZQ],
    der: [...BARRA_DER],
    alto: 1.75,
    opacidad,
    resalte: resalteIzq,
    resalteDer,
    radio: RADIO_BARRA,
    // Brilla más al tomar energía, pero casi no se ensancha: si no, se tragaría la mano.
    crece: 0.12,
  });
}
