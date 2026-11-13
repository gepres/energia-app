import type { PostHog } from 'posthog-js';
import type { Props } from './eventos';

/**
 * El punto de envío: lo que la app quiere registrar llega aquí. PostHog se carga aparte (después
 * de pintar), así que lo que pasa antes espera en una cola con su hora real. Si no se mide, no
 * hace nada. Este archivo no importa nada pesado: lo usan los componentes.
 */

let activa = false;
let ph: PostHog | null = null;
let contexto: () => Props = () => ({});
const cola: { nombre: string; props: Props; momento: Date }[] = [];
const fijas: Props = {};
const MAX_COLA = 200;

export function registrar(nombre: string, props: Props = {}) {
  if (!activa) return;
  const completo = { ...contexto(), ...props };
  if (ph) ph.capture(nombre, completo);
  else if (cola.length < MAX_COLA) cola.push({ nombre, props: completo, momento: new Date() });
}

/** Propiedades que van con todos los eventos desde ahora (p. ej. el tema o si la app está instalada). */
export function fijar(props: Props) {
  if (!activa) return;
  Object.assign(fijas, props);
  ph?.register(props);
}

export const midiendo = () => activa;

// ── Para analitica/index.ts ─────────────────────────────────────────────

export function activar(ctx: () => Props) {
  activa = true;
  contexto = ctx;
}

/** PostHog ya cargó: recibe lo que estaba en la cola. */
export function conectar(posthog: PostHog) {
  ph = posthog;
  ph.register(fijas);
  for (const { nombre, props, momento } of cola.splice(0)) ph.capture(nombre, props, { timestamp: momento });
}

/** Deja de registrar (la persona lo desactivó o PostHog no pudo cargar). */
export function desactivar() {
  activa = false;
  cola.length = 0;
}

export const posthogCargado = () => ph;
