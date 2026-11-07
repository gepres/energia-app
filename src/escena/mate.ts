/** Utilidades numéricas sin dependencias de three (se usan también en tests). */

export type V3 = [number, number, number];

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const v3 = (x = 0, y = 0, z = 0): V3 => [x, y, z];

export function lerpV(a: V3, b: V3, k: number): V3 {
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}
export const sumaV = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const restaV = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const escalaV = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const largoV = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const normV = (a: V3): V3 => {
  const l = largoV(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const puntoV = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cruzV = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Rota un punto alrededor del eje Y. */
export function rotarY(p: V3, ang: number): V3 {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

/** Rota un punto alrededor del eje X que pasa por `pivote`. */
export function rotarX(p: V3, ang: number, pivote: V3): V3 {
  const y = p[1] - pivote[1];
  const z = p[2] - pivote[2];
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [p[0], pivote[1] + y * c - z * s, pivote[2] + y * s + z * c];
}

// ── Curvas de aceleración ──────────────────────────────────────────────
export const suave = (t: number) => t * t * (3 - 2 * t);
export const masSuave = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const entraCubica = (t: number) => t * t * t;
export const saleCubica = (t: number) => 1 - Math.pow(1 - t, 3);
export const entraSaleCubica = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const saleExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const entraSaleSeno = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
/** Sale con un ligero rebote hacia atrás: para «asentar» objetos. */
export const saleAtras = (t: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Progreso local de un tramo [a, b] dentro de t ∈ [0, 1], ya acotado y con curva.
 * Es la pieza básica de toda la coreografía: `tramo(t, 0.2, 0.6)`.
 */
export function tramo(t: number, a: number, b: number, curva: (x: number) => number = entraSaleCubica) {
  if (b <= a) return t >= b ? 1 : 0;
  return curva(clamp((t - a) / (b - a)));
}

/** Campana 0→1→0 dentro de [a, b] (para destellos y pulsos). */
export function campana(t: number, a: number, b: number) {
  const k = clamp((t - a) / (b - a));
  return Math.sin(Math.PI * k);
}

/** Aparece en [a, a+f] y desaparece en [b-f, b]. */
export function ventana(t: number, a: number, b: number, f = 0.08) {
  return Math.min(tramo(t, a, a + f, suave), 1 - tramo(t, b - f, b, suave));
}

/** Arco: interpola entre a y b levantando el punto medio `altura` sobre la recta. */
export function arco(a: V3, b: V3, k: number, altura: number, dir: V3 = [0, 1, 0]): V3 {
  const p = lerpV(a, b, k);
  const h = Math.sin(Math.PI * k) * altura;
  return [p[0] + dir[0] * h, p[1] + dir[1] * h, p[2] + dir[2] * h];
}

/** Amortiguación exponencial independiente de la tasa de fotogramas. */
export function amortiguar(actual: number, objetivo: number, lambda: number, dt: number) {
  return lerp(actual, objetivo, 1 - Math.exp(-lambda * dt));
}

/** Pseudoaleatorio determinista a partir de un entero. */
export function azar(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
