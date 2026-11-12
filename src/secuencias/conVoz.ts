import { RESPIRO_VOZ, clipVoz } from '../contenido/voz';
import type { Ejercicio } from '../contenido/tipos';
import { type Opciones, type Secuencia, durPaso } from './motor';

/**
 * La secuencia de un ejercicio con su narración: con la voz activa, cada paso dura lo que lo
 * más largo entre su animación y su voz (más una pausa corta). La animación corre a su
 * velocidad de siempre; si la voz sigue, la escena se queda quieta en el final del paso hasta
 * que termina. Con la voz apagada, la secuencia es exactamente la misma.
 */
export function conVoz(sec: Secuencia, ej: Ejercicio): Secuencia {
  const voz = sec.pasos.map((_, i) => {
    const c = clipVoz(ej.id, ej.pasos[i]?.id);
    return c?.segundos ? c.segundos + RESPIRO_VOZ : 0;
  });
  if (!voz.some((v) => v > 0)) return sec;
  return {
    inicial: sec.inicial,
    pasos: sec.pasos.map((p, i) => {
      const base = (o: Opciones) => durPaso(p, o);
      const total = (o: Opciones) => (o.voz ? Math.max(base(o), voz[i]) : base(o));
      return {
        dur: p.dur,
        durCon: total,
        aplicar: (e, t, o) => {
          const b = base(o);
          const d = total(o);
          p.aplicar(e, d > b ? Math.min(1, (t * d) / b) : t, o);
        },
      };
    }),
  };
}
