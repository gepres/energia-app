import { EJERCICIOS } from '../contenido/ejercicios';
import { SECUENCIAS } from '../secuencias';
import { OPCIONES_INICIALES, type Opciones, cicloRespiracion, duracionTotal } from '../secuencias/motor';

/** Lo que va en una rutina: un ejercicio, o un bloque de respiraciones conscientes. */
export type ItemRutina = { tipo: 'ejercicio'; id: string } | { tipo: 'respiracion'; total: 15 | 30 };

export interface Rutina {
  id: string;
  nombre: string;
  items: ItemRutina[];
}

/**
 * La rutina por defecto, en el orden pedido en la revisión (2026-11-09): los ejercicios uno por
 * uno, de las manos al sellado.
 */
export const RUTINA_POR_DEFECTO: Rutina = {
  id: 'completa',
  nombre: 'Rutina completa',
  items: [
    'masaje-manos',
    'cargar-ombligo',
    'colocar-tres-puntos',
    'sensibilizacion-manos',
    'recorrido-por-chakras',
    'cargar-ingles',
    'sensibilizacion-piernas',
    'enraizar-material',
    'activacion-centros',
    'sellar-cielo',
    'sellado-ombligo',
  ].map((id) => ({ tipo: 'ejercicio', id })),
};

/** Los ejercicios que se pueden poner en una rutina: los de uno por uno. */
export const EJERCICIOS_RUTINA = EJERCICIOS.filter((e) => e.origen === 'revision');

const CLAVE = 'repaso-energetico:rutinas';

/** Las rutinas propias guardadas en este navegador (vacío si no hay o no se puede leer). */
export function leerRutinas(almacen: Pick<Storage, 'getItem'> | undefined = guardado()): Rutina[] {
  try {
    const crudo = almacen?.getItem(CLAVE);
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    return Array.isArray(datos) ? datos.filter(esRutina).map(limpiar) : [];
  } catch {
    return [];
  }
}

/** Guarda (crea o reemplaza) una rutina propia. Devuelve si se pudo guardar. */
export function guardarRutina(r: Rutina, almacen: Pick<Storage, 'getItem' | 'setItem'> | undefined = guardado()): boolean {
  try {
    const otras = leerRutinas(almacen).filter((x) => x.id !== r.id);
    almacen?.setItem(CLAVE, JSON.stringify([...otras, limpiar(r)]));
    avisar();
    return !!almacen;
  } catch {
    return false;
  }
}

/** Borra una rutina propia. */
export function borrarRutina(id: string, almacen: Pick<Storage, 'getItem' | 'setItem'> | undefined = guardado()): void {
  try {
    almacen?.setItem(CLAVE, JSON.stringify(leerRutinas(almacen).filter((x) => x.id !== id)));
    avisar();
  } catch {
    /* sin almacenamiento: no hay nada que borrar */
  }
}

/** La rutina con ese id: la por defecto o una propia. */
export function buscarRutina(id: string, almacen: Pick<Storage, 'getItem'> | undefined = guardado()): Rutina | undefined {
  if (id === RUTINA_POR_DEFECTO.id) return RUTINA_POR_DEFECTO;
  return leerRutinas(almacen).find((r) => r.id === id);
}

/** Un id nuevo para una rutina propia. */
export const nuevoId = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Nombre de un ítem para mostrar. */
export function nombreItem(it: ItemRutina): string {
  if (it.tipo === 'respiracion') return `Respiraciones conscientes · ${it.total}`;
  const ej = EJERCICIOS.find((e) => e.id === it.id);
  return ej ? `${ej.titulo}${ej.subtitulo ? ` · ${ej.subtitulo}` : ''}` : it.id;
}

/** Duración aproximada de un ítem (s): el ejercicio a 1×, o las respiraciones con el ritmo elegido. */
export function duracionItem(it: ItemRutina, o: Opciones = OPCIONES_INICIALES): number {
  if (it.tipo === 'respiracion') return it.total * cicloRespiracion(o.ritmo);
  const sec = SECUENCIAS[it.id];
  return sec ? duracionTotal(sec, o) : 0;
}

export const duracionRutina = (r: Rutina, o: Opciones = OPCIONES_INICIALES) => r.items.reduce((a, it) => a + duracionItem(it, o), 0);

/** «12 min», «1 h 5 min». */
export function minutos(seg: number): string {
  const m = Math.max(1, Math.round(seg / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

// ── Guardado y avisos ──────────────────────────────────────────────────

function guardado(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

const IDS = new Set(EJERCICIOS.map((e) => e.id));

function esItem(x: unknown): x is ItemRutina {
  if (!x || typeof x !== 'object') return false;
  const it = x as Record<string, unknown>;
  if (it.tipo === 'ejercicio') return typeof it.id === 'string' && IDS.has(it.id);
  if (it.tipo === 'respiracion') return it.total === 15 || it.total === 30;
  return false;
}

function esRutina(x: unknown): x is Rutina {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.nombre === 'string' && Array.isArray(r.items);
}

/** Solo lo que se entiende: ítems válidos y un nombre. */
function limpiar(r: Rutina): Rutina {
  return { id: r.id, nombre: r.nombre.trim().slice(0, 60) || 'Mi rutina', items: r.items.filter(esItem) };
}

const oyentes = new Set<() => void>();
/** Para que la portada se actualice al guardar o borrar. */
export function alCambiarRutinas(f: () => void) {
  oyentes.add(f);
  return () => void oyentes.delete(f);
}
function avisar() {
  oyentes.forEach((f) => f());
}

/** Lo que el visor o la página de respiración necesitan saber cuando son parte de una rutina. */
export interface EnRutina {
  nombre: string;
  /** Desde 1. */
  indice: number;
  total: number;
  /** Nombre de lo que sigue, si hay. */
  siguiente?: string;
  irSiguiente?: () => void;
  irAnterior?: () => void;
  salir: () => void;
}
