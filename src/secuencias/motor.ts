import { type Pose, transformarPunto, PUNTOS, type PuntoCuerpo, mezclarPose, copiarPose } from '../escena/cuerpo';
import { type Camara, type Estado, crearEstado } from '../escena/estado';
import { type V3, lerp, lerpV, rotarY, sumaV, tramo, entraSaleCubica } from '../escena/mate';

export interface Opciones {
  /** Órgano elegido en «Equilibrar la energía de los órganos». */
  organo: string;
}

export const OPCIONES_INICIALES: Opciones = { organo: 'corazon' };

export interface Tiempo3D {
  /** Duración del paso en segundos (a velocidad normal). */
  dur: number;
  aplicar: (e: Estado, t: number, o: Opciones) => void;
}

export interface Secuencia {
  inicial: (e: Estado, o: Opciones) => void;
  pasos: Tiempo3D[];
}

/**
 * Estado de la escena en (paso, t). Los pasos anteriores se aplican completos y
 * el actual en t: el resultado no depende de cómo se llegó hasta ahí.
 */
export function evaluar(sec: Secuencia, paso: number, t: number, o: Opciones): Estado {
  const e = crearEstado();
  sec.inicial(e, o);
  const n = Math.min(paso, sec.pasos.length - 1);
  for (let i = 0; i < n; i++) {
    limpiarTransitorios(e);
    sec.pasos[i].aplicar(e, 1, o);
  }
  limpiarTransitorios(e);
  sec.pasos[n].aplicar(e, Math.max(0, Math.min(1, t)), o);
  return e;
}

/** Lo que sólo vive dentro de un paso (contadores, pulsos, rótulos de cota). */
function limpiarTransitorios(e: Estado) {
  e.pulsos = [];
  e.hud = { contador: null, respiracion: null, aviso: null };
}

export function duracionTotal(sec: Secuencia) {
  return sec.pasos.reduce((s, p) => s + p.dur, 0);
}

export function inicios(sec: Secuencia): number[] {
  const r: number[] = [];
  let acc = 0;
  for (const p of sec.pasos) {
    r.push(acc);
    acc += p.dur;
  }
  return r;
}

/** Tiempo global (s) → paso y progreso dentro del paso. */
export function ubicar(sec: Secuencia, tiempo: number): { paso: number; t: number } {
  let acc = 0;
  for (let i = 0; i < sec.pasos.length; i++) {
    const d = sec.pasos[i].dur;
    if (tiempo < acc + d || i === sec.pasos.length - 1) {
      return { paso: i, t: Math.max(0, Math.min(1, (tiempo - acc) / d)) };
    }
    acc += d;
  }
  return { paso: 0, t: 0 };
}

// ── Ayudas de coreografía ───────────────────────────────────────────────

/** Lleva la pose de una figura hacia `objetivo` durante [a, b] del paso. */
export function posar(e: Estado, fig: 0 | 1, objetivo: Pose, t: number, a = 0, b = 0.3, arco = 0.06) {
  const k = tramo(t, a, b, entraSaleCubica);
  if (k <= 0) return;
  e.figuras[fig].pose = mezclarPose(e.figuras[fig].pose, objetivo, k, arco);
}

/** Fija una pose sin transición. */
export function fijarPose(e: Estado, fig: 0 | 1, p: Pose) {
  e.figuras[fig].pose = copiarPose(p);
}

/** Mueve la cámara hacia una toma durante [a, b] del paso. */
export function toma(e: Estado, c: Partial<Camara>, t: number, a = 0, b = 0.4) {
  const k = tramo(t, a, b, entraSaleCubica);
  if (k <= 0) return;
  const cam = e.camara;
  if (c.pos) cam.pos = lerpV(cam.pos, c.pos, k);
  if (c.mira) cam.mira = lerpV(cam.mira, c.mira, k);
  if (c.fov) cam.fov = lerp(cam.fov, c.fov, k);
}

/** Punto del cuerpo de una figura en coordenadas del mundo, según su pose objetivo. */
export function puntoMundo(e: Estado, fig: 0 | 1, punto: PuntoCuerpo | V3): V3 {
  const f = e.figuras[fig];
  const local = Array.isArray(punto) ? punto : PUNTOS[punto];
  const p = transformarPunto(local, f.pose.agachar, f.pose.inclinar);
  return sumaV(rotarY(p, f.rotY), f.pos);
}

/**
 * Toma definida por lo que se quiere ver: centro, altura visible (m), ángulo
 * horizontal (rad, 0 = de frente a +Z) y elevación (rad).
 */
export function encuadre(centro: V3, alto: number, ang = 0.3, elev = 0.12, fov = 32): Camara {
  const d = alto / 2 / Math.tan((fov * Math.PI) / 360);
  return {
    pos: [
      centro[0] + Math.sin(ang) * Math.cos(elev) * d,
      centro[1] + Math.sin(elev) * d,
      centro[2] + Math.cos(ang) * Math.cos(elev) * d,
    ],
    mira: centro,
    fov,
  };
}

/** Toma orbital alrededor de un punto: ángulo (rad, 0 = de frente), distancia y altura. */
export function orbita(mira: V3, ang: number, dist: number, alto: number, fov = 34): Camara {
  return {
    pos: [mira[0] + Math.sin(ang) * dist, mira[1] + alto, mira[2] + Math.cos(ang) * dist],
    mira,
    fov,
  };
}

/** Repetición periódica dentro de un tramo: devuelve la fase 0–1 del ciclo actual y su índice. */
export function ciclos(t: number, a: number, b: number, n: number) {
  const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
  const x = k * n;
  const i = Math.min(n - 1, Math.floor(x));
  return { fase: k >= 1 ? 1 : x - i, indice: k >= 1 ? n : i, k };
}
