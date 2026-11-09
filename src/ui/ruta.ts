import { useEffect, useState } from 'react';

export type Ruta =
  | { nombre: 'inicio' }
  | { nombre: 'ejercicio'; id: string; paso?: number }
  | { nombre: 'repaso'; id?: string }
  | { nombre: 'dudas' }
  | { nombre: 'respiracion' }
  /** Reproducir una rutina: el ítem `indice` (desde 1). */
  | { nombre: 'rutina'; id: string; indice: number }
  /** Crear una rutina (`id` vacío, opcionalmente copiando `base`) o editar una propia. */
  | { nombre: 'editar-rutina'; id?: string; base?: string };

export function leerRuta(hash = window.location.hash): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (partes[0] === 'ejercicio' && partes[1]) {
    const paso = Number(partes[2]);
    return { nombre: 'ejercicio', id: decodeURIComponent(partes[1]), paso: Number.isFinite(paso) && paso > 0 ? paso : undefined };
  }
  if (partes[0] === 'repaso') return { nombre: 'repaso', id: partes[1] ? decodeURIComponent(partes[1]) : undefined };
  if (partes[0] === 'dudas') return { nombre: 'dudas' };
  if (partes[0] === 'respiracion') return { nombre: 'respiracion' };
  if (partes[0] === 'rutina' && partes[1]) {
    const indice = Number(partes[2]);
    return { nombre: 'rutina', id: decodeURIComponent(partes[1]), indice: Number.isInteger(indice) && indice > 0 ? indice : 1 };
  }
  if (partes[0] === 'rutinas' && partes[1] === 'nueva') return { nombre: 'editar-rutina', base: partes[2] ? decodeURIComponent(partes[2]) : undefined };
  if (partes[0] === 'rutinas' && partes[1]) return { nombre: 'editar-rutina', id: decodeURIComponent(partes[1]) };
  return { nombre: 'inicio' };
}

/**
 * La versión de trabajo: el home anterior, con todos los ejercicios (también los de referencia),
 * el repaso de memoria y las dudas, para seguir revisando. Vive en /old; adentro las rutas son
 * las mismas (con #).
 */
export function esOld(pathname = typeof window === 'undefined' ? '/' : window.location.pathname): boolean {
  return /\/old\/?$/.test(pathname);
}

export function irA(hash: string) {
  if (window.location.hash !== hash) window.location.hash = hash;
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => leerRuta());
  useEffect(() => {
    const alCambiar = () => setRuta(leerRuta());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return ruta;
}
