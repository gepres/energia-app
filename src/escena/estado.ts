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
    barras: { activa: false, izq: [0, 0, 0], der: [0, 0, 0], alto: 1.75, opacidad: 0, resalte: 0, resalteDer: 0 },
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
