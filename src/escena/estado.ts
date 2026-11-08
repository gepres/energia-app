import { type Pose, type PuntoCuerpo, copiarPose } from './cuerpo';
import type { V3 } from './mate';
import { NEUTRA } from './poses';

/**
 * Estado completo de la escena en un instante. Lo produce la coreografía a
 * partir de (paso, progreso) y lo dibuja el escenario. No contiene nada que
 * dependa del reloj real: mismo progreso → misma imagen.
 */

export type ColorEnergia = 'oro' | 'cielo' | 'tierra' | 'rosa' | 'violeta' | 'jade' | 'blanco' | 'sombra';

export type Ancla = 'manoD' | 'manoI' | 'manos' | 'munecaD' | 'munecaI' | 'codoD' | 'codoI' | PuntoCuerpo;

/** Referencia a un punto que se mueve con un cuerpo (se resuelve al dibujar). */
export interface Ref {
  ancla: Ancla;
  figura: 0 | 1;
  off?: V3;
  /**
   * Solo con manoD / manoI: el punto va en el hueco de la palma, a esta
   * distancia de la piel y siguiendo hacia dónde mira la palma (no el centro de la mano).
   */
  palma?: number;
}

export type Punto = V3 | Ref;

export const esRef = (p: Punto): p is Ref => !Array.isArray(p);

export interface Figura {
  activa: boolean;
  pos: V3;
  rotY: number;
  pose: Pose;
  /** 0 = sólida, 1 = translúcida para ver los órganos. */
  rayos: number;
  opacidad: number;
  /** Tono del material: quien practica, la otra persona o una visualización. */
  tono: 'yo' | 'otro' | 'vision';
  /** Velocidad a la que la pose dibujada sigue a la pose objetivo (1/s). */
  agilidad: number;
}

export interface Esfera {
  activa: boolean;
  pos: V3;
  ref: Ref | null;
  /** 0 = en `pos`, 1 = pegada a `ref`. */
  pegado: number;
  radio: number;
  brillo: number;
  color: ColorEnergia;
  /** Color secundario que se mezcla (p. ej. carga − y +). */
  color2: ColorEnergia | null;
  mezcla: number;
  /** Estiramiento horizontal (chicle): 1 = redonda. */
  estirar: number;
  /** Abertura del agujero inferior (0–1). */
  agujero: number;
  opacidad: number;
  /**
   * Si puede llevarse la luz que ilumina el cuerpo (una sola, para la esfera más
   * brillante). Las cargas que quedan quietas en los centros no la llevan: si no,
   * la que gane el empate alumbra el cuerpo más que las demás.
   */
  ilumina: boolean;
}

export interface Flujo {
  activo: boolean;
  puntos: Punto[];
  /** Posición de la cabeza del flujo a lo largo de la curva (0–1). */
  cabeza: number;
  /** Largo de la estela (fracción de la curva). */
  cola: number;
  color: ColorEnergia;
  ancho: number;
  intensidad: number;
  /** Remolino alrededor de la curva (radio). */
  remolino: number;
}

export interface Rosa {
  activa: boolean;
  pos: V3;
  ref: Ref | null;
  pegado: number;
  apertura: number;
  /** Sellado: anillo de luz violeta que la envuelve. */
  sello: number;
  escala: number;
  opacidad: number;
  /** Recoge energía: pulso interior. */
  recoge: number;
}

export interface Objeto {
  activo: boolean;
  pos: V3;
  rotY: number;
  ref: Ref | null;
  pegado: number;
  escala: number;
  opacidad: number;
  /** Parámetro propio: inflado de la bolsa, combustión de la foto, etc. */
  valor: number;
  valor2: number;
}

export type NombreObjeto = 'bolsa' | 'tacho' | 'foto' | 'dibujoSangre' | 'recipiente' | 'llama';

export interface Manto {
  activo: boolean;
  centro: V3;
  radio: number;
  alto: number;
  /** Cobertura vertical: 0 nada, 1 cubre todo. */
  cobertura: number;
  /** true: crece desde arriba; false: desde abajo. */
  desdeArriba: boolean;
  /** Banda de luz que recorre el manto (0 abajo – 1 arriba), < 0 sin banda. */
  banda: number;
  color: ColorEnergia;
  opacidad: number;
  /** Densidad de las líneas verticales: 1 cúpula marcada, ~0,3 velo suave. */
  lineas: number;
}

/**
 * Velo de tela (en «Sellar desde el cielo»): cuelga recogido desde arriba de la
 * cabeza y su borde (el ruedo) lo llevan las manos; entre ellas cae un poco más.
 */
export interface Tela {
  activa: boolean;
  /** Centro en el piso (mundo). */
  centro: V3;
  /** Altura desde donde cuelga, recogida. */
  arriba: number;
  /** Altura del ruedo a los costados (donde lo sostienen las manos). */
  borde: number;
  /** Semiancho del ruedo a los costados y semiprofundidad adelante y atrás. */
  ancho: number;
  fondo: number;
  /** Cuánto más cae el ruedo adelante y atrás, entre las manos (m). */
  caida: number;
  opacidad: number;
  /** Brillo del ruedo. */
  brillo: number;
  color: ColorEnergia;
}

/** Nube luminosa de energía (sobre la cabeza, en «Sellar desde el cielo»). */
export interface Nube {
  activa: boolean;
  /** Centro en el mundo. */
  centro: V3;
  /** Semiancho (m); el alto y la profundidad son proporcionales. */
  radio: number;
  /** Brillo general (0 apagada, 1 normal, > 1 destello). */
  intensidad: number;
  /** Color del borde y del corazón de la nube. */
  color: ColorEnergia;
  color2: ColorEnergia;
}

/** Dos barras verticales de energía frente a una figura (columna izquierda y derecha). */
export interface Barras {
  activa: boolean;
  izq: V3;
  der: V3;
  alto: number;
  opacidad: number;
  /** Brillo extra de la barra izquierda (de la que se toma energía). */
  resalte: number;
  /** Brillo extra de la barra derecha. */
  resalteDer: number;
  /** Radio de la barra (m). */
  radio: number;
  /** Cuánto se ensancha con el resalte (0,6 = 60 %). Si una mano la agarra, conviene poco. */
  crece: number;
}

export interface Cubo {
  activo: boolean;
  centro: V3;
  lado: number;
  /** Grupos de esferas colocados (0–8, fraccional). */
  grupos: number;
  inferior: number;
  superior: number;
  verticales: number;
  columna: number;
  /** Índice de la arista vertical resaltada (0–3) o −1. */
  resaltada: number;
  resalte: number;
  opacidad: number;
}

export interface Pulso {
  pos: V3;
  ref: Ref | null;
  k: number;
  radio: number;
  color: ColorEnergia;
}

export interface Marca {
  pos: V3;
  texto: string;
  opacidad: number;
  tipo: 'distancia' | 'nombre' | 'brujula';
}

export interface Cota {
  desde: V3;
  hasta: V3;
  texto: string;
  k: number;
}

export interface Hud {
  contador: { valor: number; total: number; etiqueta: string } | null;
  respiracion: { fase: 'Inhala' | 'Retén' | 'Exhala' | 'Pausa'; k: number; ciclo: number; total: number } | null;
  aviso: string | null;
}

export interface Camara {
  pos: V3;
  mira: V3;
  fov: number;
}

export interface Estado {
  camara: Camara;
  figuras: [Figura, Figura];
  esferas: Esfera[];
  flujos: Flujo[];
  rosas: Rosa[];
  objetos: Record<NombreObjeto, Objeto>;
  mantos: Manto[];
  cubo: Cubo;
  barras: Barras;
  nube: Nube;
  telas: Tela[];
  pulsos: Pulso[];
  marcas: Marca[];
  cotas: Cota[];
  organos: Record<string, number>;
  centros: Partial<Record<PuntoCuerpo, number>>;
  /** Columna de luz del cielo (+) o de la tierra (−) sobre la figura 0. */
  cielo: number;
  tierra: number;
  /** Atenuación general del escenario (0–1) para momentos íntimos. */
  penumbra: number;
  hud: Hud;
}

export const MAX_ESFERAS = 8;
export const MAX_FLUJOS = 6;
export const MAX_ROSAS = 2;
export const MAX_MANTOS = 2;
export const MAX_TELAS = 2;

const tela = (): Tela => ({
  activa: false,
  centro: [0, 0, 0],
  arriba: 2.08,
  borde: 2,
  ancho: 0.3,
  fondo: 0.3,
  caida: 0,
  opacidad: 0,
  brillo: 1,
  color: 'violeta',
});

const figura = (activa: boolean, tono: Figura['tono']): Figura => ({
  activa,
  pos: [0, 0, 0],
  rotY: 0,
  pose: copiarPose(NEUTRA),
  rayos: 0,
  opacidad: 1,
  tono,
  agilidad: 9,
});

const esfera = (): Esfera => ({
  activa: false,
  pos: [0, 1.2, 0.3],
  ref: null,
  pegado: 0,
  radio: 0.06,
  brillo: 1,
  color: 'oro',
  color2: null,
  mezcla: 0,
  estirar: 1,
  agujero: 0,
  opacidad: 1,
  ilumina: true,
});

const flujo = (): Flujo => ({
  activo: false,
  puntos: [],
  cabeza: 0,
  cola: 0.3,
  color: 'oro',
  ancho: 1,
  intensidad: 1,
  remolino: 0.02,
});

const rosa = (): Rosa => ({
  activa: false,
  pos: [0, 0, 0.6],
  ref: null,
  pegado: 0,
  apertura: 0,
  sello: 0,
  escala: 1,
  opacidad: 1,
  recoge: 0,
});

const objeto = (): Objeto => ({
  activo: false,
  pos: [0, 0, 0],
  rotY: 0,
  ref: null,
  pegado: 0,
  escala: 1,
  opacidad: 1,
  valor: 0,
  valor2: 0,
});

const manto = (): Manto => ({
  activo: false,
  centro: [0, 0, 0],
  radio: 0.62,
  alto: 2.0,
  cobertura: 0,
  desdeArriba: true,
  banda: -1,
  color: 'violeta',
  opacidad: 1,
  lineas: 1,
});

export function crearEstado(): Estado {
  return {
    camara: { pos: [0.9, 1.45, 3.4], mira: [0, 1.05, 0], fov: 34 },
    figuras: [figura(true, 'yo'), figura(false, 'otro')],
    esferas: Array.from({ length: MAX_ESFERAS }, esfera),
    flujos: Array.from({ length: MAX_FLUJOS }, flujo),
    rosas: Array.from({ length: MAX_ROSAS }, rosa),
    objetos: {
      bolsa: objeto(),
      tacho: objeto(),
      foto: objeto(),
      dibujoSangre: objeto(),
      recipiente: objeto(),
      llama: objeto(),
    },
    mantos: Array.from({ length: MAX_MANTOS }, manto),
    cubo: {
      activo: false,
      centro: [0, 0, 0],
      lado: 2.4,
      grupos: 0,
      inferior: 0,
      superior: 0,
      verticales: 0,
      columna: 0,
      resaltada: -1,
      resalte: 0,
      opacidad: 1,
    },
    barras: { activa: false, izq: [0, 0, 0], der: [0, 0, 0], alto: 1.75, opacidad: 0, resalte: 0, resalteDer: 0, radio: 0.035, crece: 0.6 },
    nube: { activa: false, centro: [0, 2.16, 0.07], radio: 0.4, intensidad: 0, color: 'violeta', color2: 'blanco' },
    telas: Array.from({ length: MAX_TELAS }, tela),
    pulsos: [],
    marcas: [],
    cotas: [],
    organos: {},
    centros: {},
    cielo: 0,
    tierra: 0,
    penumbra: 0,
    hud: { contador: null, respiracion: null, aviso: null },
  };
}

/** Referencia a un ancla de un cuerpo. */
export const ref = (ancla: Ancla, figura: 0 | 1 = 0, off?: V3): Ref => ({ ancla, figura, off });
/** Punto en el hueco de la palma de una mano, a `separacion` de la piel (p. ej. el radio de una esfera). */
export const enPalma = (ancla: 'manoD' | 'manoI', separacion: number, figura: 0 | 1 = 0): Ref => ({ ancla, figura, palma: separacion });
