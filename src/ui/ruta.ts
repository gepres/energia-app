import { useEffect, useState } from 'react';

export type Ruta =
  | { nombre: 'inicio' }
  | { nombre: 'ejercicio'; id: string }
  | { nombre: 'repaso'; id?: string }
  | { nombre: 'dudas' }
  | { nombre: 'respiracion' };

export function leerRuta(hash = window.location.hash): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (partes[0] === 'ejercicio' && partes[1]) return { nombre: 'ejercicio', id: decodeURIComponent(partes[1]) };
  if (partes[0] === 'repaso') return { nombre: 'repaso', id: partes[1] ? decodeURIComponent(partes[1]) : undefined };
  if (partes[0] === 'dudas') return { nombre: 'dudas' };
  if (partes[0] === 'respiracion') return { nombre: 'respiracion' };
  return { nombre: 'inicio' };
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
