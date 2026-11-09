import { type Pose, transformarPunto, PUNTOS, type PuntoCuerpo, mezclarPose, copiarPose } from '../escena/cuerpo';
import { type Camara, type Estado, crearEstado } from '../escena/estado';
import { type V3, lerp, lerpV, rotarY, sumaV, tramo, entraSaleCubica } from '../escena/mate';

/** Ritmo de las respiraciones conscientes: inhalar · retener · exhalar (aclarado en la revisión). */
export type Ritmo = '4-3-4' | '3-3-3' | '5-5-5';
export const RITMOS: Record<Ritmo, readonly [number, number, number]> = {
  '4-3-4': [4, 3, 4],
  '3-3-3': [3, 3, 3],
  '5-5-5': [5, 5, 5],
};
/** La pausa después de exhalar es de 3 s en todos los ritmos (aclarado en la revisión). */
export const PAUSA_RESPIRACION = 3;
/** Lo que dura una respiración completa con un ritmo, pausa incluida. */
export const cicloRespiracion = (r: Ritmo) => RITMOS[r][0] + RITMOS[r][1] + RITMOS[r][2] + PAUSA_RESPIRACION;

export interface Opciones {
  /** Órgano elegido en «Equilibrar la energía de los órganos». */
  organo: string;
  /** Ritmo elegido para las respiraciones conscientes. */
  ritmo: Ritmo;
  /** Acompañar las respiraciones con el video del taller: el paso dura todas, no una de muestra. */
  video: boolean;
}

export const OPCIONES_INICIALES: Opciones = { organo: 'corazon', ritmo: '4-3-4', video: false };

export interface Tiempo3D {
  /** Duración del paso en segundos (a velocidad normal), con las opciones iniciales. */
  dur: number;
  /** Si la duración depende de las opciones (p. ej. el ritmo de respiración), la da esta función. */
  durCon?: (o: Opciones) => number;
  aplicar: (e: Estado, t: number, o: Opciones) => void;
}

/** Duración de un paso con estas opciones. */
export const durPaso = (p: Tiempo3D, o: Opciones = OPCIONES_INICIALES) => (p.durCon ? p.durCon(o) : p.dur);

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
  e.cotas = [];
  e.marcas = e.marcas.filter((m) => m.tipo === 'brujula');
  e.hud = { contador: null, respiracion: null, aviso: null, frase: null };
}

export function duracionTotal(sec: Secuencia, o: Opciones = OPCIONES_INICIALES) {
  return sec.pasos.reduce((s, p) => s + durPaso(p, o), 0);
}

export function inicios(sec: Secuencia, o: Opciones = OPCIONES_INICIALES): number[] {
  const r: number[] = [];
  let acc = 0;
  for (const p of sec.pasos) {
    r.push(acc);
    acc += durPaso(p, o);
  }
  return r;
}

/** Tiempo global (s) → paso y progreso dentro del paso. */
export function ubicar(sec: Secuencia, tiempo: number, o: Opciones = OPCIONES_INICIALES): { paso: number; t: number } {
  let acc = 0;
  for (let i = 0; i < sec.pasos.length; i++) {
    const d = durPaso(sec.pasos[i], o);
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
  const miraFinal = c.mira ?? cam.mira;
  if (c.pos) cam.pos = orbitar(cam.pos, cam.mira, c.pos, miraFinal, k);
  cam.mira = lerpV(cam.mira, miraFinal, k);
  if (c.fov) cam.fov = lerp(cam.fov, c.fov, k);
}

/**
 * Interpola la cámara orbitando alrededor del punto que mira (radio, azimut y
 * elevación) en vez de en línea recta: así no «corta por dentro» y se acerca
 * de más cuando cambia mucho el ángulo entre dos tomas.
 */
function orbitar(posA: V3, miraA: V3, posB: V3, miraB: V3, k: number): V3 {
  const esf = (p: V3, m: V3) => {
    const d: V3 = [p[0] - m[0], p[1] - m[1], p[2] - m[2]];
    const r = Math.hypot(d[0], d[1], d[2]) || 1e-6;
    return { r, az: Math.atan2(d[0], d[2]), el: Math.asin(Math.max(-1, Math.min(1, d[1] / r))) };
  };
  const A = esf(posA, miraA);
  const B = esf(posB, miraB);
  let dAz = B.az - A.az;
  dAz -= Math.round(dAz / (2 * Math.PI)) * 2 * Math.PI;
  const r = lerp(A.r, B.r, k);
  const az = A.az + dAz * k;
  const el = lerp(A.el, B.el, k);
  const m = lerpV(miraA, miraB, k);
  return [m[0] + r * Math.cos(el) * Math.sin(az), m[1] + r * Math.sin(el), m[2] + r * Math.cos(el) * Math.cos(az)];
}

/** Punto del cuerpo de una figura en coordenadas del mundo, según su pose objetivo. */
export function puntoMundo(e: Estado, fig: 0 | 1, punto: PuntoCuerpo | V3): V3 {
  const f = e.figuras[fig];
  const local = Array.isArray(punto) ? punto : PUNTOS[punto];
  return enMundo(e, fig, transformarPunto(local, f.pose.agachar, f.pose.inclinar, f.pose.girar, f.pose.atrasar));
}

/**
 * Un punto que ya está en la postura de la figura (p. ej. medido sobre su esqueleto: la piel de
 * una pierna doblada, la palma de una mano), en coordenadas del mundo. A diferencia de
 * `puntoMundo`, no lo vuelve a mover con la postura.
 */
export function enMundo(e: Estado, fig: 0 | 1, p: V3): V3 {
  const f = e.figuras[fig];
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
