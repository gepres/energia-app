import { useSyncExternalStore } from 'react';

/** Progreso local (solo en este dispositivo): ejercicios vistos y aciertos del repaso. */
interface Progreso {
  vistos: Record<string, number>;
  repaso: Record<string, { aciertos: number; intentos: number; fecha: number }>;
}

const CLAVE = 'repaso-energetico:progreso:v1';
let cache: Progreso = leer();
const oyentes = new Set<() => void>();

function leer(): Progreso {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const p = JSON.parse(crudo) as Partial<Progreso>;
      return { vistos: p.vistos ?? {}, repaso: p.repaso ?? {} };
    }
  } catch {
    /* almacenamiento no disponible: se usa memoria */
  }
  return { vistos: {}, repaso: {} };
}

function guardar(p: Progreso) {
  cache = p;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    /* sin persistencia */
  }
  oyentes.forEach((o) => o());
}

export function marcarVisto(id: string) {
  if (cache.vistos[id]) return;
  guardar({ ...cache, vistos: { ...cache.vistos, [id]: Date.now() } });
}

export function registrarRepaso(id: string, aciertos: number, intentos: number) {
  guardar({ ...cache, repaso: { ...cache.repaso, [id]: { aciertos, intentos, fecha: Date.now() } } });
}

export function useProgreso(): Progreso {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => cache,
  );
}
