/**
 * Origen del ejercicio. `revision` es la pista nueva que se rehace uno por uno
 * con el taller; `set2026` y `notas` son la versión de referencia anterior.
 */
export type Origen = 'revision' | 'set2026' | 'notas';

/** Color de acento de cada ejercicio (se traduce a tokens de UI y de escena). */
export type Acento = 'oro' | 'cielo' | 'tierra' | 'rosa' | 'violeta' | 'jade';

/** Cantidad que conviene memorizar (alimenta el repaso de "¿cuántas?"). */
export interface Cantidad {
  valor: number;
  unidad: string;
  /** Pregunta con la que se repasa la cantidad. */
  pregunta: string;
}

export interface Paso {
  id: string;
  /** Etiqueta corta para la lista de pasos y la barra de progreso. */
  titulo: string;
  /** Instrucción tal como figura en el apunte (solo normalizada). */
  texto: string;
  /** Frase que se dice en voz alta, literal del apunte. */
  frase?: string;
  cantidad?: Cantidad;
  /** Ids de {@link DUDAS} que afectan a este paso. */
  dudas?: string[];
  /** Aclaración de cómo lo dibuja la animación cuando el apunte no lo detalla. */
  lectura?: string;
  /** Aclaración confirmada por el taller (resuelve una duda del apunte). */
  aclaracion?: string;
  /**
   * Paso de respiraciones conscientes: cuántas son. El panel muestra el selector de ritmo y la
   * opción de acompañar con el video del taller.
   */
  respiraciones?: number;
}

export interface Bloque {
  titulo: string;
  items: string[];
}

export interface Ejercicio {
  id: string;
  numero: number;
  titulo: string;
  /** Subtítulo del apunte, p. ej. «generar lo material». */
  subtitulo?: string;
  origen: Origen;
  resumen: string;
  acento: Acento;
  pasos: Paso[];
  /** Información complementaria que no es un paso (sensaciones, contexto). */
  bloques?: Bloque[];
}

export interface Duda {
  id: string;
  titulo: string;
  /** Qué dice (o no dice) el apunte. */
  detalle: string;
  /** Cómo lo representa la app mientras no se confirme. */
  lectura: string;
  fuente: 'MANEJO DE ENERGÍA SET 2026.docx' | 'notas-1.txt' | 'ambos';
}

export type Polaridad = 'tierra' | 'cielo';

export interface Organo {
  id: string;
  nombre: string;
  polaridad: Polaridad;
}
