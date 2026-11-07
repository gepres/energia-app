import { type Estado, crearEstado } from './estado';

export type Calidad = 'alta' | 'media' | 'baja';

/**
 * Estado mutable compartido por los componentes de la escena. Se escribe una vez
 * por fotograma (Director) y se lee en los `useFrame` de cada pieza: así la
 * animación no provoca renders de React.
 */
export const escena = {
  estado: crearEstado() as Estado,
  /** Cambia cuando el estado se reevalúa (para saltar trabajo si está quieto). */
  version: 0,
  /** Este fotograma es un corte (cambio de ejercicio): cámara y poses sin transición. */
  corte: true,
  /** Pide un corte para el próximo fotograma. */
  cortePendiente: true,
  reducido: false,
  /**
   * Desplazamiento de lente (fracción del lienzo) para dejar sitio a la UI:
   * x > 0 mueve el contenido a la izquierda, y > 0 lo sube.
   */
  lente: { x: 0, y: 0 },
  calidad: 'alta' as Calidad,
};
