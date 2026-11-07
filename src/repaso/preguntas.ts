import { EJERCICIOS, ORGANOS, fraseOrgano } from '../contenido/ejercicios';
import type { Ejercicio } from '../contenido/tipos';

/** Pregunta de opción única. */
export interface PreguntaOpcion {
  tipo: 'frase' | 'cantidad' | 'polaridad' | 'siguiente' | 'dato';
  ejercicioId: string;
  /** Paso (índice) que se puede ver en 3D para repasar la respuesta. */
  paso: number;
  enunciado: string;
  /** Texto con hueco para las preguntas de frase. */
  contexto?: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
}

/** Pregunta de ordenar pasos. */
export interface PreguntaOrden {
  tipo: 'orden';
  ejercicioId: string;
  paso: number;
  enunciado: string;
  /** Títulos de los pasos en orden correcto. */
  correcto: string[];
  /** Los mismos títulos, mezclados. */
  mezclado: string[];
  explicacion: string;
}

export type Pregunta = PreguntaOpcion | PreguntaOrden;

export type Azar = () => number;

/** Generador pseudoaleatorio con semilla (mulberry32): repasos reproducibles en tests. */
export function crearAzar(semilla: number): Azar {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mezclar<T>(lista: T[], azar: Azar): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Arma opciones con la correcta en una posición al azar. */
function opciones(correcta: string, distractores: string[], azar: Azar, n = 4) {
  const unicos = [...new Set(distractores.filter((d) => d !== correcta))];
  const elegidos = mezclar(unicos, azar).slice(0, n - 1);
  const todas = mezclar([correcta, ...elegidos], azar);
  return { opciones: todas, correcta: todas.indexOf(correcta) };
}

const PALABRAS_VACIAS = new Set(['QUE', 'LA', 'EL', 'DE', 'EN', 'MI', 'Y', 'TE', 'SUS', 'LAS', 'DEL', 'MÍ', 'ESTA', 'TODA', 'HAYA', 'SALGA', 'CAIGA', 'DENTRO']);

function limpiar(p: string) {
  return p.replace(/[,.]/g, '');
}

/** Todas las palabras «con peso» de las frases del apunte (para distractores). */
function vocabulario(): string[] {
  const v = new Set<string>();
  for (const e of EJERCICIOS) for (const p of e.pasos) for (const w of (p.frase ?? '').split(/\s+/)) {
    const l = limpiar(w);
    if (l.length > 3 && !PALABRAS_VACIAS.has(l) && !l.includes('_')) v.add(l);
  }
  return [...v];
}

function preguntasFrase(ej: Ejercicio, azar: Azar): PreguntaOpcion[] {
  const vocab = vocabulario();
  const r: PreguntaOpcion[] = [];
  ej.pasos.forEach((p, i) => {
    if (!p.frase || p.frase.includes('/')) return;
    const palabras = p.frase.split(/\s+/);
    const candidatas = palabras.map((w, k) => ({ w: limpiar(w), k })).filter(({ w }) => w.length > 3 && !PALABRAS_VACIAS.has(w) && !w.includes('_'));
    if (candidatas.length === 0) return;
    const { w, k } = candidatas[Math.floor(azar() * candidatas.length)];
    const contexto = palabras.map((x, j) => (j === k ? x.replace(limpiar(x), '______') : x)).join(' ');
    const o = opciones(w, vocab, azar);
    r.push({
      tipo: 'frase',
      ejercicioId: ej.id,
      paso: i,
      enunciado: `Completa la frase de «${p.titulo}»`,
      contexto,
      ...o,
      explicacion: p.frase,
    });
  });
  return r;
}

function preguntasCantidad(ej: Ejercicio, azar: Azar): PreguntaOpcion[] {
  const todas = EJERCICIOS.flatMap((e) => e.pasos.map((p) => p.cantidad?.valor).filter((v): v is number => v !== undefined));
  return ej.pasos.flatMap((p, i) => {
    if (!p.cantidad) return [];
    const c = p.cantidad;
    const cerca = [c.valor * 2, Math.max(1, Math.round(c.valor / 2)), c.valor + 1, c.valor + 5, ...todas];
    const fmt = (v: number) => String(v).replace('.', ',');
    const o = opciones(fmt(c.valor), cerca.map(fmt), azar);
    return [
      {
        tipo: 'cantidad' as const,
        ejercicioId: ej.id,
        paso: i,
        enunciado: c.pregunta,
        ...o,
        explicacion: `${c.valor} ${c.unidad} — «${p.texto}»`,
      },
    ];
  });
}

function preguntasSiguiente(ej: Ejercicio, azar: Azar): PreguntaOpcion[] {
  if (ej.pasos.length < 3) return [];
  return ej.pasos.slice(0, -1).map((p, i) => {
    const sig = ej.pasos[i + 1].titulo;
    const otros = ej.pasos.filter((_, j) => j !== i + 1 && j !== i).map((x) => x.titulo);
    const o = opciones(sig, otros, azar);
    return {
      tipo: 'siguiente' as const,
      ejercicioId: ej.id,
      paso: i + 1,
      enunciado: `En «${ej.titulo}», después de «${p.titulo}», ¿qué sigue?`,
      ...o,
      explicacion: `${i + 2}. ${ej.pasos[i + 1].texto}`,
    };
  });
}

function preguntaOrden(ej: Ejercicio, azar: Azar): PreguntaOrden | null {
  if (ej.pasos.length < 3) return null;
  const correcto = ej.pasos.map((p) => p.titulo);
  let mezclado = mezclar(correcto, azar);
  // Que no salga ya ordenado.
  if (mezclado.every((x, i) => x === correcto[i])) mezclado = [...mezclado.slice(1), mezclado[0]];
  return {
    tipo: 'orden',
    ejercicioId: ej.id,
    paso: 0,
    enunciado: `Ordena los pasos de «${ej.titulo}»`,
    correcto,
    mezclado,
    explicacion: correcto.map((t, i) => `${i + 1}. ${t}`).join(' · '),
  };
}

/** Datos concretos del apunte que conviene recordar (redactados a mano, literales del contenido). */
const DATOS: { ejercicioId: string; paso: number; enunciado: string; correcta: string; otras: string[]; explicacion: string }[] = [
  {
    ejercicioId: 'liberar-creencias',
    paso: 1,
    enunciado: '¿Cómo se sella desde el cielo?',
    correcta: 'Tomando la energía de arriba de la cabeza y bajando la mano, como cubriendo el cuerpo con un velo',
    otras: [
      'Subiendo la energía desde los pies hasta la coronilla',
      'Disparando una esfera hacia arriba',
      'Juntando las manos frente al pecho',
    ],
    explicacion: 'Aclaración del taller: se toma la energía de arriba de la cabeza y se baja la mano, como un velo que cubre el cuerpo.',
  },
  {
    ejercicioId: 'sanar-otra-persona',
    paso: 3,
    enunciado: '¿Qué es la «columna izquierda» de la que se toma energía?',
    correcta: 'La barra de energía izquierda de las dos que hay a la altura de las manos estiradas al frente',
    otras: ['La arista izquierda del cubo', 'El brazo izquierdo de la persona', 'La columna vertebral de quien sana'],
    explicacion: 'Aclaración del taller: hay 2 barras verticales, del tamaño del cuerpo, a la altura de las manos estiradas al frente.',
  },
  {
    ejercicioId: 'liberar-creencias',
    paso: 3,
    enunciado: '¿Con qué mano se sostiene la bolsa negra?',
    correcta: 'Con la mano izquierda',
    otras: ['Con la mano derecha', 'Con las dos manos'],
    explicacion: 'Sostener una bolsa negra con la mano izquierda.',
  },
  {
    ejercicioId: 'liberar-creencias',
    paso: 7,
    enunciado: '¿Qué se hace con la bolsa al final?',
    correcta: 'Amarrarla y dejarla en un tacho lejano',
    otras: ['Quemarla', 'Enterrarla', 'Devolverla al pecho'],
    explicacion: 'Amarrar la bolsa y dejarla en un tacho lejano.',
  },
  {
    ejercicioId: 'sanar-otra-persona',
    paso: 1,
    enunciado: '¿Hacia dónde se orienta a la persona en la columna?',
    correcta: 'Al norte',
    otras: ['Al sur', 'Al este', 'Al oeste'],
    explicacion: 'Colocar a la persona en la columna orientada al N.',
  },
  {
    ejercicioId: 'sanar-otra-persona',
    paso: 4,
    enunciado: 'Al sanar, ¿qué mano queda conectada hacia la tierra?',
    correcta: 'La izquierda',
    otras: ['La derecha', 'Ninguna'],
    explicacion: 'Manteniendo la mano izquierda conectada hacia la tierra, con la mano derecha pasar energía o peinar.',
  },
  {
    ejercicioId: 'separar-otra-persona',
    paso: 7,
    enunciado: '¿Qué rosa se sella primero?',
    correcta: 'La segunda (a 1 m de la otra persona)',
    otras: ['La primera (a 1,5 m)', 'Las dos a la vez'],
    explicacion: 'Primero se dispara sobre la segunda rosa; luego sobre la primera.',
  },
  {
    ejercicioId: 'separar-ex-pareja',
    paso: 6,
    enunciado: '¿Qué se hace al final con la foto o el dibujo de la ex pareja?',
    correcta: 'Quemarla',
    otras: ['Guardarla en el pecho', 'Dejarla en un tacho lejano', 'Devolverla a su dueño'],
    explicacion: 'Quemar la foto / dibujo. Si explota, hubo algo feo.',
  },
  {
    ejercicioId: 'sensibilizar-manos',
    paso: 2,
    enunciado: '¿Por dónde se desliza la esfera?',
    correcta: 'Por la muñeca, el antebrazo y el codo',
    otras: ['Por los dedos y la palma', 'Por el hombro y el cuello', 'Por el pecho'],
    explicacion: 'Deslizar por la muñeca, el antebrazo y el codo.',
  },
  {
    ejercicioId: 'activar-centros',
    paso: 2,
    enunciado: '¿Qué frase corresponde a la garganta?',
    correcta: 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DE LA PALABRA QUE RADICA EN MI VOZ',
    otras: ['CON ESTA ESFERA DE LUZ ACTIVO EL PODER DE LA CLARIVIDENCIA EN MÍ', 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DEL AMOR QUE RADICA EN MÍ'],
    explicacion: 'Garganta: «Con esta esfera de luz activo el poder de la palabra que radica en mi voz».',
  },
  {
    ejercicioId: 'recorrido-chakras',
    paso: 2,
    enunciado: 'Después de la zona genital, ¿por dónde vuelve la esfera?',
    correcta: 'Por la espalda: coxis, omóplatos y nuca',
    otras: ['Por el frente: ombligo, corazón y garganta', 'Por los brazos', 'Baja a los pies'],
    explicacion: 'Coxis, omóplatos, nuca y regresa a la coronilla para absorberse.',
  },
  {
    ejercicioId: 'sellado-final',
    paso: 0,
    enunciado: 'En el sellado final, ¿qué mano va debajo?',
    correcta: 'La derecha',
    otras: ['La izquierda'],
    explicacion: 'Mano derecha debajo, mano izquierda encima.',
  },
  {
    ejercicioId: 'sellado-final',
    paso: 1,
    enunciado: 'En el sellado final, ¿dónde va la lengua?',
    correcta: 'Pegada al paladar de arriba',
    otras: ['Entre los dientes', 'Fuera de la boca', 'Relajada abajo'],
    explicacion: 'Con la lengua pegada al paladar de arriba, aguantar la respiración 30 segundos.',
  },
  {
    ejercicioId: 'sellado-final',
    paso: 2,
    enunciado: '¿Qué se hace con la esfera de carga al sellar?',
    correcta: 'Expandirla y contraerla',
    otras: ['Dispararla', 'Llevarla a la coronilla', 'Hacerle un agujero'],
    explicacion: 'Expandir y contraer la esfera de carga.',
  },
  {
    ejercicioId: 'enraizar',
    paso: 1,
    enunciado: 'Al enraizar, ¿dónde va el agujero de la esfera?',
    correcta: 'En la ingle',
    otras: ['En la coronilla', 'En el pecho', 'En la palma de la mano'],
    explicacion: 'El agujero va en la ingle y queda conectado con la tierra, el piso de tus pies.',
  },
  {
    ejercicioId: 'sanar-otra-persona',
    paso: 2,
    enunciado: '¿Cómo se cierra tu campo energético?',
    correcta: 'Atrayendo la energía esparcida: con la mano, como agarrándolo, lo acercas a ti',
    otras: ['Soplando hacia fuera', 'Disparando una esfera al cielo', 'Tocando el piso con las dos manos'],
    explicacion: 'Es como si tu campo te estuviera cubriendo y con la mano lo atraes más cerca de ti.',
  },
  {
    ejercicioId: 'enraizar',
    paso: 2,
    enunciado: 'Al enraizar, ¿desde dónde se conecta al piso?',
    correcta: 'Desde la pelvis',
    otras: ['Desde las manos', 'Desde el corazón', 'Desde la coronilla'],
    explicacion: 'Conectar desde la pelvis al piso (tocar el piso).',
  },
];

function preguntasDato(lista: Ejercicio[], azar: Azar): PreguntaOpcion[] {
  const ids = new Set(lista.map((e) => e.id));
  return DATOS.filter((d) => ids.has(d.ejercicioId)).map((d) => ({
    tipo: 'dato' as const,
    ejercicioId: d.ejercicioId,
    paso: d.paso,
    enunciado: d.enunciado,
    ...opciones(d.correcta, d.otras, azar),
    explicacion: d.explicacion,
  }));
}

function preguntasPolaridad(azar: Azar): PreguntaOpcion[] {
  return mezclar(ORGANOS, azar).map((o) => ({
    tipo: 'polaridad' as const,
    ejercicioId: 'equilibrar-organos',
    paso: 2,
    enunciado: `¿Qué energía recibe: ${o.nombre.toLowerCase()}?`,
    opciones: ['Energía de tierra (−)', 'Energía del cielo (+)'],
    correcta: o.polaridad === 'tierra' ? 0 : 1,
    explicacion: fraseOrgano(o),
  }));
}

/**
 * Repaso de un ejercicio (o de todos si no se indica). Mezcla tipos y prioriza
 * ordenar los pasos y las frases, que es lo que más se olvida.
 */
export function crearRepaso(ejercicioId: string | undefined, azar: Azar, cuantas = 8): Pregunta[] {
  const lista = ejercicioId ? EJERCICIOS.filter((e) => e.id === ejercicioId) : EJERCICIOS;
  const orden = lista.map((e) => preguntaOrden(e, azar)).filter((p): p is PreguntaOrden => !!p);
  const frases = lista.flatMap((e) => preguntasFrase(e, azar));
  const cantidades = lista.flatMap((e) => preguntasCantidad(e, azar));
  const siguientes = lista.flatMap((e) => preguntasSiguiente(e, azar));
  const polaridad = !ejercicioId || ejercicioId === 'equilibrar-organos' ? preguntasPolaridad(azar).slice(0, ejercicioId ? 4 : 2) : [];
  const datos = preguntasDato(lista, azar);

  const elegidas: Pregunta[] = [];
  const tomar = (fuente: Pregunta[], n: number) => {
    for (const p of mezclar(fuente, azar).slice(0, n)) elegidas.push(p);
  };
  tomar(orden, ejercicioId ? 1 : 2);
  tomar(frases, ejercicioId ? 2 : 3);
  tomar(cantidades, ejercicioId ? 2 : 2);
  tomar(polaridad, polaridad.length);
  tomar(datos, ejercicioId ? 2 : 2);
  const resto = cuantas - elegidas.length;
  if (resto > 0) tomar(siguientes, resto);
  return mezclar(elegidas.slice(0, Math.max(cuantas, elegidas.length)), azar).slice(0, cuantas);
}
