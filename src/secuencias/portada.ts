import { crearEstado, type Estado } from '../escena/estado';
import { lerp } from '../escena/mate';
import { esferaEnManos } from '../escena/poses';
import { esfera, flujo } from './comunes';
import { ref } from '../escena/estado';
import { fijarPose, orbita, puntoMundo } from './motor';

/** Escena de la portada: una esfera que respira entre las manos y una cámara que orbita despacio. */
export function evaluarPortada(segundos: number, reducido: boolean): Estado {
  const e = crearEstado();
  const respiro = reducido ? 0.5 : 0.5 + 0.5 * Math.sin(segundos * 0.9);
  fijarPose(e, 0, esferaEnManos(1.2, 0.3, lerp(0.24, 0.29, respiro)));
  const ang = reducido ? 0.5 : 0.5 + Math.sin(segundos * 0.06) * 0.55;
  e.camara = orbita([0, 1.08, 0.1], ang, 3.6, 0.55, 30);
  const c = puntoMundo(e, 0, [0, 1.215, 0.36]);
  esfera(e, 0, { pos: c, radio: lerp(0.07, 0.085, respiro), brillo: 1.1 + 0.3 * respiro, color: 'oro', color2: 'cielo', mezcla: 0.35 });
  flujo(e, 0, [ref('manoD', 0), ref('manos', 0, [0, 0.02, 0.04]), ref('manoI', 0)], {
    cabeza: 1,
    cola: 1,
    color: 'oro',
    intensidad: 0.45,
    remolino: 0.035,
    ancho: 0.7,
  });
  e.centros.corazon = 0.35;
  return e;
}
