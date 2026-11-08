import { type Esqueleto, PUNTOS, type Pose, resolverEsqueleto, transformarPunto } from './cuerpo';
import type { Punto, Ref } from './estado';
import { esRef } from './estado';
import { huecoPalma } from './manos';
import { type V3, lerpV, rotarY, sumaV } from './mate';
import { NEUTRA } from './poses';

/**
 * Registro de la pose DIBUJADA de cada figura (ya amortiguada). Los objetos que
 * se sostienen con la mano se resuelven contra ella, así nunca se separan de
 * la mano aunque la pose esté en transición.
 */
interface Registro {
  pos: V3;
  rotY: number;
  pose: Pose;
  esq: Esqueleto;
}

const inicial = (): Registro => ({ pos: [0, 0, 0], rotY: 0, pose: NEUTRA, esq: resolverEsqueleto(NEUTRA) });

export const registro: [Registro, Registro] = [inicial(), inicial()];

export function publicarFigura(i: 0 | 1, pos: V3, rotY: number, pose: Pose, esq: Esqueleto) {
  const r = registro[i];
  r.pos = pos;
  r.rotY = rotY;
  r.pose = pose;
  r.esq = esq;
}

/** Punto del cuerpo (espacio local) → mundo. */
export function aMundo(i: 0 | 1, local: V3): V3 {
  const r = registro[i];
  return sumaV(rotarY(local, r.rotY), r.pos);
}

export function anclaLocal(ref: Ref): V3 {
  const r = registro[ref.figura];
  let p: V3;
  switch (ref.ancla) {
    case 'manoD':
    case 'manoI': {
      const pm = ref.ancla === 'manoD' ? r.esq.palmaD : r.esq.palmaI;
      const muneca = ref.ancla === 'manoD' ? r.esq.munecaD : r.esq.munecaI;
      p = ref.palma === undefined ? pm.centro : huecoPalma(muneca, pm.dedos, pm.normal, ref.palma);
      break;
    }
    case 'manos':
      p = lerpV(r.esq.palmaD.centro, r.esq.palmaI.centro, 0.5);
      break;
    case 'munecaD':
      p = r.esq.munecaD;
      break;
    case 'munecaI':
      p = r.esq.munecaI;
      break;
    case 'codoD':
      p = r.esq.codoD;
      break;
    case 'codoI':
      p = r.esq.codoI;
      break;
    default:
      p = transformarPunto(PUNTOS[ref.ancla], r.pose.agachar, r.pose.inclinar, r.pose.girar);
  }
  return ref.off ? sumaV(p, ref.off) : p;
}

export function resolver(p: Punto): V3 {
  if (!esRef(p)) return p;
  return aMundo(p.figura, anclaLocal(p));
}

/** Posición final de algo que puede estar parcialmente pegado a un ancla. */
export function posicionPegada(pos: V3, ref: Ref | null, pegado: number): V3 {
  if (!ref || pegado <= 0) return pos;
  const a = resolver(ref);
  return pegado >= 1 ? a : lerpV(pos, a, pegado);
}
