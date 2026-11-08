import type { Duda, Ejercicio, Organo } from './tipos';

/**
 * Contenido de los apuntes de la carpeta:
 *  - «MANEJO DE ENERGÍA SET 2026.docx» → ejercicios 1–7 (origen `set2026`).
 *  - «notas-1.txt» (repaso de ejercicios energéticos) → ejercicios 8–12 (origen `notas`).
 *
 * Regla: los textos y las frases se conservan literales. Lo que el apunte no
 * precisa no se inventa: se marca con una duda y la animación lo dibuja como
 * «lectura ilustrativa».
 */

export const ORGANOS: Organo[] = [
  { id: 'vejiga', nombre: 'Vejiga', polaridad: 'tierra' },
  { id: 'rinones', nombre: 'Riñones', polaridad: 'tierra' },
  { id: 'reproductor', nombre: 'Aparato reproductor', polaridad: 'tierra' },
  { id: 'bazo', nombre: 'Bazo', polaridad: 'tierra' },
  { id: 'corazon', nombre: 'Corazón', polaridad: 'cielo' },
  { id: 'higado', nombre: 'Hígado', polaridad: 'cielo' },
  { id: 'pancreas', nombre: 'Páncreas', polaridad: 'cielo' },
  { id: 'pulmones', nombre: 'Pulmones', polaridad: 'cielo' },
  { id: 'estomago', nombre: 'Estómago', polaridad: 'cielo' },
  { id: 'cerebro', nombre: 'Cerebro y columna vertebral', polaridad: 'cielo' },
  { id: 'tiroides', nombre: 'Tiroides', polaridad: 'cielo' },
];

/** Frase del ejercicio de órganos con el órgano y la polaridad ya resueltos. */
export function fraseOrgano(organo: Organo): string {
  const verbo = organo.polaridad === 'cielo' ? 'BAJE' : 'SUBA';
  const signo = organo.polaridad === 'cielo' ? '+' : '−';
  return `QUE ${verbo} LA ENERGÍA ${signo} SUFICIENTE PARA SANAR MI ${organo.nombre.toUpperCase()} Y SUS FUNCIONES`;
}

export const DUDAS: Duda[] = [
  {
    id: 'cubo-ex-pareja',
    titulo: '¿Se construye el cubo para el ejercicio de la ex pareja?',
    detalle: 'Se coloca el recipiente «en la columna del cubo», pero el ejercicio no dice «hacer cubo».',
    lectura: 'Se muestra el cubo ya construido (como en «Sanar a otra persona»).',
    fuente: 'MANEJO DE ENERGÍA SET 2026.docx',
  },
];

export const EJERCICIOS: Ejercicio[] = [
  // ───────────────────────── UNO POR UNO (descritos en el taller) ─────────────────────────
  {
    id: 'cargar-ombligo',
    numero: 1,
    titulo: 'Cargar el ombligo',
    subtitulo: '15 por cada mano',
    origen: 'revision',
    resumen:
      'Brazos bien estirados al frente, a la altura de los hombros, tomando la energía de dos barras verticales; las manos, intercaladas, llevan lentamente 15 esferas cada una al ombligo.',
    acento: 'oro',
    pasos: [
      {
        id: 'brazos-barras',
        titulo: 'Brazos al frente',
        texto:
          'Estirar bien los brazos al frente, a la altura de los hombros (90°), y agarrar la energía que está a la altura de las manos, como barras de energía verticales.',
        aclaracion: 'Descrito en el taller.',
      },
      {
        id: 'cargas-intercaladas',
        titulo: 'Cargas intercaladas · 15 por mano',
        texto:
          'Después de un momento, las manos se dirigen lentamente al ombligo llevando una bola o esfera de energía, intercaladas: derecha, izquierda, derecha… 15 por cada mano.',
        cantidad: { valor: 15, unidad: 'por cada mano (30 en total)', pregunta: '¿Cuántas cargas al ombligo se hacen con cada mano?' },
        aclaracion: 'Descrito en el taller: manos intercaladas y bien estiradas, 15 por cada mano, de forma lenta.',
        lectura: 'Empieza la derecha. Mientras una mano vuelve a su barra, la otra ya toma energía de la suya.',
      },
    ],
  },
  {
    id: 'sellar-cielo',
    numero: 2,
    titulo: 'Sellar desde el cielo',
    subtitulo: '3 veces',
    origen: 'revision',
    resumen:
      'Las dos manos estiradas hacia arriba tocan una nube luminosa de energía; se la agarra y, bajando los brazos abiertos por los costados, la energía cubre el cuerpo como un velo. Tres veces.',
    acento: 'violeta',
    pasos: [
      {
        id: 'tocar-nube',
        titulo: 'Manos a la nube',
        texto: 'Subir las dos manos por los costados y estirarlas hacia arriba hasta tocar una nube luminosa de energía.',
        aclaracion: 'Descrito en el taller.',
      },
      {
        id: 'bajar-velo',
        titulo: 'Agarrar y bajar el velo · 3 veces',
        texto:
          'Agarrar la nube y bajar los brazos por los costados: las manos van girando poco a poco hacia abajo y soltándose hasta quedar del todo abiertas, mientras la energía cubre el cuerpo como un velo. Al final, las manos quedan sueltas a los costados.',
        cantidad: { valor: 3, unidad: 'veces', pregunta: '¿Cuántas veces se sella desde el cielo?' },
        aclaracion:
          'Descrito en el taller: las dos manos arriba tocando una nube luminosa, se la agarra y se baja por los costados, con las palmas girando hacia abajo y las manos abriéndose poco a poco; entre una vez y otra las manos vuelven a subir por los costados; 3 veces; las manos terminan sueltas a los costados.',
      },
    ],
  },
  {
    id: 'colocar-tres-puntos',
    numero: 3,
    titulo: 'Colocar energía en los 3 puntos',
    subtitulo: 'ombligo, pecho y frente',
    origen: 'revision',
    resumen:
      'Cada mano toma energía de su barra y forma una esfera; las manos se juntan al frente y las dos esferas se unen en una más grande, que las manos llevan y entran: primero al ombligo, después al centro del pecho y después a la frente.',
    acento: 'jade',
    pasos: [
      {
        id: 'agarrar-barras',
        titulo: 'Agarrar las barras',
        texto: 'Estirar los brazos al frente y agarrar con cada mano su barra de energía.',
        aclaracion: 'Descrito en el taller.',
      },
      {
        id: 'unir-ombligo',
        titulo: 'Unir y llevar al ombligo',
        texto:
          'Juntar la energía de las 2 barras: cada mano toma de su barra y forma una esfera; las manos se juntan al frente y las dos esferas se unen en una más grande. Las manos la llevan al ombligo y la entran.',
        aclaracion:
          'Descrito en el taller: cada mano toma de su barra, las esferas se unen en una más grande entre las palmas y las manos la llevan y la entran; una vez en cada centro.',
      },
      {
        id: 'unir-pecho',
        titulo: 'Unir y llevar al centro del pecho',
        texto: 'Hacer lo mismo y llevar la energía al centro del pecho.',
        aclaracion: 'Descrito en el taller.',
      },
      {
        id: 'unir-frente',
        titulo: 'Unir y llevar a la frente',
        texto: 'Hacer lo mismo y llevar la energía al centro de la frente.',
        aclaracion: 'Descrito en el taller: al centro de la frente, no entre las cejas; al terminar, las manos se sueltan a los costados.',
      },
    ],
  },
  {
    id: 'masaje-manos',
    numero: 4,
    titulo: 'Masaje de manos y dedos',
    subtitulo: 'palma y falange por falange',
    origen: 'revision',
    resumen:
      'Con una mano se masajea la otra: primero la palma, con el pulgar en círculos, y después dedo por dedo, cada falange entre el pulgar y el índice, empezando por el meñique y terminando en el pulgar. Después se cambia de mano.',
    acento: 'rosa',
    pasos: [
      {
        id: 'palma-izquierda',
        titulo: 'La derecha masajea la palma izquierda',
        texto: 'Con la mano derecha, sostener la izquierda por debajo y hacer círculos con el pulgar por toda la palma.',
        aclaracion: 'Descrito en el taller: primero la derecha masajea la izquierda; el pulgar hace círculos por la palma.',
      },
      {
        id: 'dedos-izquierda',
        titulo: 'Dedo por dedo · mano izquierda',
        texto:
          'Masajear la mano izquierda dedo por dedo, empezando por el meñique (meñique, anular, medio, índice y al final el pulgar): cada falange se toma entre el pulgar (arriba) y el índice (abajo) y se hacen 3 círculos.',
        cantidad: { valor: 3, unidad: 'círculos por falange', pregunta: '¿Cuántos círculos se hacen en cada falange?' },
        aclaracion: 'Descrito en el taller: dedo por dedo, por cada falange, con pulgar e índice en círculos; empezando por el meñique.',
        lectura:
          'Mientras se masajea un dedo, los otros se recogen un poco y ese queda estirado. Para el pulgar, la mano gira la palma hacia abajo y el pulgar apunta a la otra mano.',
      },
      {
        id: 'palma-derecha',
        titulo: 'La izquierda masajea la palma derecha',
        texto: 'Cambiar de mano: con la izquierda, sostener la derecha por debajo y hacer círculos con el pulgar por toda la palma.',
        aclaracion: 'Descrito en el taller.',
      },
      {
        id: 'dedos-derecha',
        titulo: 'Dedo por dedo · mano derecha',
        texto: 'Masajear la mano derecha dedo por dedo, empezando por el meñique y terminando en el pulgar, con 3 círculos en cada falange.',
        aclaracion: 'Descrito en el taller.',
        lectura: 'Al terminar, las manos se sueltan a los costados.',
      },
    ],
  },

  // ───────────────────────── VERSIÓN DE REFERENCIA ─────────────────────────
  // ───────────────────────── MANEJO DE ENERGÍA · SET 2026 ─────────────────────────
  {
    id: 'liberar-creencias',
    numero: 1,
    titulo: 'Liberación de creencias negativas',
    origen: 'set2026',
    resumen: 'Cargar, sellar y respirar; luego soltar la creencia soplándola en una bolsa negra que se amarra y se deja lejos.',
    acento: 'violeta',
    pasos: [
      {
        id: 'cargar-ombligo',
        titulo: 'Cargar el ombligo',
        texto: 'Cargar en el ombligo 30 veces.',
        cantidad: { valor: 15, unidad: 'por lado (30 en total)', pregunta: '¿Cuántas cargas por lado se hacen en el ombligo?' },
        aclaracion: 'Confirmado en el taller: son 15 por lado (30 en total).',
      },
      {
        id: 'sellar-cielo',
        titulo: 'Sellar desde el cielo',
        texto: 'Sellar desde el cielo.',
        aclaracion: 'Confirmado en el taller: se toma la energía de arriba de la cabeza y se baja la mano, como cubriendo el cuerpo con un velo.',
      },
      {
        id: 'respirar-corazon',
        titulo: 'Mano en el corazón',
        texto: 'Colocar la mano sobre el corazón y hacer 15 respiraciones conscientes (4,3,4,4).',
        cantidad: { valor: 15, unidad: 'respiraciones', pregunta: '¿Cuántas respiraciones conscientes con la mano en el corazón?' },
        aclaracion: 'Confirmado en el taller: inhalar 4 · retener 3 · exhalar 4 · pausa 4.',
      },
      {
        id: 'sostener-bolsa',
        titulo: 'Bolsa en la mano izquierda',
        texto: 'Sostener una bolsa negra con la mano izquierda.',
      },
      {
        id: 'pensar-creencia',
        titulo: 'Pensar la creencia',
        texto: 'Pensar la creencia negativa.',
      },
      {
        id: 'decir-gracias',
        titulo: 'Decir la frase',
        texto: 'Decir la frase de liberación.',
        frase: 'GRACIAS, TE LIBERO, TE DEJO IR',
      },
      {
        id: 'soplar',
        titulo: 'Soplar 3 veces',
        texto: 'Soplar con toda la fuerza 3 veces dentro de la bolsa.',
        cantidad: { valor: 3, unidad: 'soplidos', pregunta: '¿Cuántas veces se sopla dentro de la bolsa?' },
      },
      {
        id: 'amarrar-dejar',
        titulo: 'Amarrar y dejar lejos',
        texto: 'Amarrar la bolsa y dejarla en un tacho lejano.',
      },
    ],
  },
  {
    id: 'equilibrar-organos',
    numero: 2,
    titulo: 'Equilibrar la energía de los órganos',
    origen: 'set2026',
    resumen: 'Cada órgano recibe energía de tierra (−) o de cielo (+). Se forma una esfera, se le pide la energía y se hace ingresar con la mano extendida.',
    acento: 'cielo',
    bloques: [
      { titulo: 'Energía de tierra (−)', items: ['Vejiga', 'Riñones', 'Aparato reproductor', 'Bazo'] },
      {
        titulo: 'Energía del cielo (+)',
        items: ['Corazón', 'Hígado', 'Páncreas', 'Pulmones', 'Estómago', 'Cerebro y columna vertebral', 'Tiroides'],
      },
    ],
    pasos: [
      {
        id: 'respirar-30',
        titulo: '30 respiraciones',
        texto: '30 respiraciones conscientes.',
        cantidad: { valor: 30, unidad: 'respiraciones', pregunta: '¿Cuántas respiraciones conscientes antes de equilibrar un órgano?' },
      },
      {
        id: 'unir-bolsas',
        titulo: 'Unir dos bolsas de energía',
        texto: 'Tomar dos bolsas de energía, unirlas y darle forma.',
        lectura: 'Se conserva el término «bolsas de energía» del apunte; se dibujan como dos esferas que se funden en una.',
      },
      {
        id: 'dirigir-pedir',
        titulo: 'Dirigir y pedir',
        texto: 'Dirigir hacia el lugar que corresponde y decir la frase.',
        frase: 'QUE BAJE/SUBA LA ENERGÍA +/- SUFICIENTE PARA SANAR MI ________ Y SUS FUNCIONES',
        aclaracion:
          'Confirmado en el taller: para los órganos de cielo (+) la esfera se dirige hacia arriba y se pide que BAJE la energía +; para los de tierra (−), hacia el piso y que SUBA la energía −.',
      },
      {
        id: 'llevar-organo',
        titulo: 'Llevar al órgano',
        texto: 'Llevar la energía al órgano correspondiente, alejar y acercar la energía.',
      },
      {
        id: 'hacer-ingresar',
        titulo: 'Hacer ingresar',
        texto: 'Con la mano extendida hacer ingresar la energía diciendo la frase.',
        frase: 'TE AMO, SÁNATE',
      },
      {
        id: 'retirar-mano',
        titulo: 'Retirar la mano',
        texto: 'Retirar lentamente la mano.',
      },
      {
        id: 'repetir',
        titulo: 'Repetir',
        texto: 'Repetir al menos 2 veces.',
        cantidad: { valor: 2, unidad: 'veces como mínimo', pregunta: '¿Cuántas veces, como mínimo, se repite con cada órgano?' },
      },
    ],
  },
  {
    id: 'sanar-otra-persona',
    numero: 3,
    titulo: 'Sanar a otra persona',
    origen: 'set2026',
    resumen: 'Con el cubo hecho y la persona en la columna mirando al norte, se toma energía de la columna izquierda y con la mano derecha se pasa energía o se peina.',
    acento: 'jade',
    pasos: [
      {
        id: 'hacer-cubo',
        titulo: 'Hacer cubo',
        texto: 'Hacer cubo.',
        lectura: 'Versión resumida de la construcción de «mejorar-apuntes»: 32 esferas, cuadrado inferior, superior, verticales y columna central.',
      },
      {
        id: 'persona-columna',
        titulo: 'Persona en la columna',
        texto: 'Colocar a la persona en la columna orientada al N.',
      },
      {
        id: 'cerrar-campo',
        titulo: 'Cerrar tu campo',
        texto: 'Cierras tu campo energético.',
        aclaracion:
          'Confirmado en el taller: se atrae la energía esparcida. Es como si tu campo energético te estuviera cubriendo y tú, con la mano, como agarrándolo, lo atraes más cerca de ti.',
      },
      {
        id: 'tomar-columna',
        titulo: 'Tomar de la columna izquierda',
        texto: 'Tomar energía de la columna izquierda y pasar a la mano derecha.',
        aclaracion: 'Confirmado en el taller: hay 2 barras de energía verticales, del tamaño del cuerpo, a la altura de las manos estiradas al frente. La «columna izquierda» es la barra de la izquierda.',
      },
      {
        id: 'pasar-peinar',
        titulo: 'Pasar energía o peinar',
        texto:
          'Manteniendo la mano izquierda conectada hacia la tierra, con la mano derecha pasar energía o peinar (según lo que necesite la persona).',
      },
    ],
  },
  {
    id: 'enraizar',
    numero: 4,
    titulo: 'Enraizar',
    subtitulo: 'generar lo material',
    origen: 'set2026',
    resumen: 'Una esfera cargada con − y +, abierta por un agujero, conecta la pelvis con el piso.',
    acento: 'tierra',
    pasos: [
      {
        id: 'esfera-cargar',
        titulo: 'Esfera con − y +',
        texto: 'Hacer una esfera, cargar – y +.',
      },
      {
        id: 'agujero',
        titulo: 'Agujero en la esfera',
        texto: 'Hacer un agujero en la esfera.',
        aclaracion: 'Confirmado en el taller: el agujero va en la ingle y queda conectado con la tierra, el piso de tus pies.',
      },
      {
        id: 'pelvis-piso',
        titulo: 'Pelvis al piso',
        texto: 'Conectar desde la pelvis al piso (tocar el piso).',
      },
      {
        id: 'decir-conectate',
        titulo: 'Decir la frase',
        texto: 'Decir la frase.',
        frase: 'SÁNATE, CONÉCTATE HASTA SANAR',
      },
    ],
  },
  {
    id: 'separar-otra-persona',
    numero: 5,
    titulo: 'Separar tu energía de la de otra persona',
    origen: 'set2026',
    resumen: 'Dos rosas entre tú y la otra persona recogen la energía cruzada; se sellan con esferas y cada rosa vuelve a su dueño.',
    acento: 'rosa',
    pasos: [
      {
        id: 'foto-2m',
        titulo: 'Foto a 2 m',
        texto: 'Colocar una foto o dibujo o nombre de la otra persona a 2 m de distancia.',
        cantidad: { valor: 2, unidad: 'm', pregunta: '¿A qué distancia se coloca la foto, dibujo o nombre de la otra persona?' },
      },
      {
        id: 'visualizar',
        titulo: 'Visualizar',
        texto: 'Visualizar a esa persona.',
      },
      {
        id: 'rosa-1',
        titulo: 'Primera rosa',
        texto: 'Sacar del pecho una rosa y colocarla en el piso, entre tú y la otra persona.',
        cantidad: { valor: 1.5, unidad: 'm', pregunta: '¿A qué distancia se coloca la primera rosa?' },
        aclaracion: 'Confirmado en el taller: la primera rosa va a 1,5 m.',
        lectura: 'Se mide desde ti, igual que la foto (a 2 m).',
      },
      {
        id: 'frase-rosa-1',
        titulo: 'Tu energía a la rosa',
        texto: 'Pedir que tu energía vuelva a la primera rosa.',
        frase: 'TODA MI ENERGÍA QUE HAYA QUEDADO EN EL CAMPO ENERGÉTICO DE _______, QUE SALGA Y CAIGA DENTRO DE ESTA ROSA',
      },
      {
        id: 'rosa-2',
        titulo: 'Segunda rosa a 1 m',
        texto: 'Sacar una segunda rosa y colocarla a 1 m de la otra persona.',
        cantidad: { valor: 1, unidad: 'm', pregunta: '¿A qué distancia de la otra persona va la segunda rosa?' },
      },
      {
        id: 'frase-rosa-2',
        titulo: 'Su energía a la rosa',
        texto: 'Pedir que la energía de la otra persona salga de tu campo hacia la segunda rosa.',
        frase: 'TODA LA ENERGÍA DE _______ QUE ESTÉ EN MI CAMPO ENERGÉTICO, QUE SALGA Y CAIGA DENTRO DE ESTA ROSA',
      },
      {
        id: 'describir',
        titulo: 'Describir diferencias',
        texto:
          'Describir a la persona en aquello que la diferencia de ti y con un gesto de tu mano colocar todas esas características dentro de esa rosa.',
      },
      {
        id: 'sellar-rosa-2',
        titulo: 'Sellar la segunda rosa',
        texto: 'Tomar una esfera de energía y dispararla sobre la segunda rosa para sellar.',
      },
      {
        id: 'sellar-rosa-1',
        titulo: 'Sellar la primera rosa',
        texto: 'Luego tomar otra esfera de energía y dispararla sobre la primera rosa para sellar.',
      },
      {
        id: 'devolver',
        titulo: 'Devolver cada rosa',
        texto: 'Devolver cada rosa a su dueño.',
      },
    ],
  },
  {
    id: 'separar-sangre',
    numero: 6,
    titulo: 'Separar tu energía de la sangre que donas',
    origen: 'set2026',
    resumen: 'Una rosa entre tú y el dibujo de la bolsa de sangre recoge tu energía; nombras 5 rasgos tuyos, la sellas y vuelve a tu pecho.',
    acento: 'rosa',
    pasos: [
      {
        id: 'dibujo-bolsa',
        titulo: 'Dibujo de la bolsa',
        texto:
          'Colocar un dibujo de la bolsa de sangre que donaste, que representa a todos los desconocidos a los que puede llegar tu sangre.',
      },
      {
        id: 'rosa',
        titulo: 'Rosa entre ambos',
        texto: 'Colocar una rosa entre ambos.',
      },
      {
        id: 'frase-rosa',
        titulo: 'Tu energía a la rosa',
        texto: 'Pedir que tu energía vuelva a la rosa.',
        frase:
          'TODA MI ENERGÍA QUE HAYA QUEDADO EN EL CAMPO ENERGÉTICO DE LAS PERSONAS QUE RECIBIERON MI SANGRE, QUE SALGA Y CAIGA DENTRO DE ESTA ROSA',
      },
      {
        id: 'cinco-rasgos',
        titulo: '5 características tuyas',
        texto: 'Mencionar 5 características tuyas que te diferencian (tu nombre, un lunar, una cicatriz, etc.).',
        cantidad: { valor: 5, unidad: 'características', pregunta: '¿Cuántas características tuyas se mencionan?' },
      },
      {
        id: 'sellar',
        titulo: 'Sellar la rosa',
        texto: 'Hacer esfera de energía y disparar sobre la rosa para sellarla.',
      },
      {
        id: 'devolver-pecho',
        titulo: 'Rosa al pecho',
        texto: 'Devolver la rosa a tu pecho.',
      },
    ],
  },
  {
    id: 'separar-ex-pareja',
    numero: 7,
    titulo: 'Separar la energía de una ex pareja',
    origen: 'set2026',
    resumen: 'El nombre o la foto va en un recipiente en la columna del cubo; la rosa recoge tu energía, se sella, vuelve a tu pecho y se quema la foto.',
    acento: 'oro',
    pasos: [
      {
        id: 'recipiente-columna',
        titulo: 'Recipiente en la columna',
        texto: 'Colocar un recipiente en la columna del cubo con la foto, dibujo o nombre de la ex pareja.',
        dudas: ['cubo-ex-pareja'],
      },
      {
        id: 'rosa',
        titulo: 'Rosa entre ambos',
        texto: 'Colocar una rosa entre ambos.',
      },
      {
        id: 'frase-rosa',
        titulo: 'Tu energía a la rosa',
        texto: 'Pedir que tu energía vuelva a la rosa.',
        frase: 'TODA MI ENERGÍA QUE HAYA QUEDADO EN EL CAMPO ENERGÉTICO DE ________, QUE SALGA Y CAIGA DENTRO DE ESTA ROSA',
      },
      {
        id: 'cinco-rasgos',
        titulo: '5 características tuyas',
        texto: 'Mencionar 5 características tuyas que te diferencian (tu nombre, un lunar, una cicatriz, etc.).',
        cantidad: { valor: 5, unidad: 'características', pregunta: '¿Cuántas características tuyas se mencionan con la ex pareja?' },
      },
      {
        id: 'sellar',
        titulo: 'Sellar la rosa',
        texto: 'Hacer esfera de energía y disparar sobre la rosa para sellarla.',
      },
      {
        id: 'devolver-pecho',
        titulo: 'Rosa al pecho',
        texto: 'Devolver la rosa a tu pecho.',
      },
      {
        id: 'quemar',
        titulo: 'Quemar la foto',
        texto: 'Quemar la foto / dibujo. Si explota, hubo algo feo.',
      },
    ],
  },

  // ───────────────────────── NOTAS DEL REPASO ─────────────────────────
  {
    id: 'carga-y-sellado',
    numero: 8,
    titulo: 'Carga del ombligo y del pecho',
    origen: 'notas',
    resumen: 'La carga breve de quienes ya traen carga previa: 30 en el ombligo (15 por lado), 30 en el pecho y sellar.',
    acento: 'oro',
    bloques: [
      {
        titulo: 'Desde cero, la secuencia completa incluye',
        items: [
          'Activación de 3 puntos',
          'Carga de manos',
          'Limpieza de canales',
          'Garganta',
          'Tercer ojo',
          'Ingles',
          'Cola',
          'Pies',
        ],
      },
    ],
    pasos: [
      {
        id: 'ombligo-30',
        titulo: '15 por lado en el ombligo',
        texto: 'Cargar el ombligo 30 veces.',
        cantidad: { valor: 15, unidad: 'por lado (30 en total)', pregunta: '¿Cuántas cargas por lado en el ombligo hacían quienes ya traían carga previa?' },
        aclaracion: 'Confirmado en el taller: son 15 por lado (30 en total).',
      },
      {
        id: 'pecho-30',
        titulo: '30 en el pecho',
        texto: 'Cargar el pecho 30 veces.',
        cantidad: { valor: 30, unidad: 'veces', pregunta: '¿Cuántas cargas en el pecho?' },
      },
      {
        id: 'sellar',
        titulo: 'Sellar',
        texto: 'Sellar.',
        aclaracion: 'Confirmado en el taller: se toma la energía de arriba de la cabeza y se baja la mano, como cubriendo el cuerpo con un velo.',
      },
    ],
  },
  {
    id: 'sensibilizar-manos',
    numero: 9,
    titulo: 'Sensibilización de manos',
    subtitulo: 'enseñado por Víctor',
    origen: 'notas',
    resumen: 'Dos esferas que se juntan, pasan de mano en mano y se deslizan por el brazo mientras la otra mano palpa a distancia.',
    acento: 'oro',
    bloques: [{ titulo: 'Sensaciones reportadas', items: ['Calor', 'Presión', 'Hormigueo', 'Electricidad'] }],
    pasos: [
      { id: 'dos-esferas', titulo: 'Tomar dos esferas', texto: 'Tomar dos esferas y juntarlas.' },
      { id: 'mano-a-mano', titulo: 'De mano en mano', texto: 'Pasar la esfera de mano en mano.' },
      {
        id: 'deslizar',
        titulo: 'Muñeca, antebrazo, codo',
        texto: 'Deslizar por la muñeca, el antebrazo y el codo.',
      },
      { id: 'palpar', titulo: 'Palpar a distancia', texto: 'Palpar a distancia con la otra mano.' },
    ],
  },
  {
    id: 'activar-centros',
    numero: 10,
    titulo: 'Activación de centros energéticos',
    origen: 'notas',
    resumen: 'Hacer chicle con la esfera y empujarla a 5–10 cm del corazón, la garganta y el tercer ojo, diciendo la frase de cada centro.',
    acento: 'jade',
    pasos: [
      {
        id: 'chicle',
        titulo: 'Hacer chicle',
        texto: 'Hacer chicle con la esfera de luz.',
      },
      {
        id: 'corazon',
        titulo: 'Corazón',
        texto: 'Empujar la bolita a 5–10 cm del corazón.',
        frase: 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DEL AMOR QUE RADICA EN MÍ',
        cantidad: { valor: 10, unidad: 'cm como máximo (5–10 cm)', pregunta: '¿A cuántos centímetros del centro se empuja la bolita? (máximo)' },
        aclaracion: 'Confirmado en el taller: «con esta esfera de luz» va en las tres frases.',
      },
      {
        id: 'garganta',
        titulo: 'Garganta',
        texto: 'Empujar la bolita a 5–10 cm de la garganta.',
        frase: 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DE LA PALABRA QUE RADICA EN MI VOZ',
      },
      {
        id: 'tercer-ojo',
        titulo: 'Tercer ojo',
        texto: 'Empujar la bolita a 5–10 cm del tercer ojo.',
        frase: 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DE LA CLARIVIDENCIA EN MÍ',
      },
    ],
  },
  {
    id: 'recorrido-chakras',
    numero: 11,
    titulo: 'Recorrido por chakras',
    origen: 'notas',
    resumen: 'Una esfera baja desde la coronilla por el frente, sube por la espalda y vuelve a la coronilla para absorberse.',
    acento: 'violeta',
    bloques: [{ titulo: 'Sensación descrita', items: ['«Como un gorrito con punta que daba vueltas» en la coronilla'] }],
    pasos: [
      { id: 'coronilla', titulo: 'Esfera en la coronilla', texto: 'La esfera empieza en la coronilla.' },
      {
        id: 'frente',
        titulo: 'Bajar por el frente',
        texto: 'Bajar por la frente, la garganta, el corazón, el ombligo y la zona genital.',
      },
      {
        id: 'espalda',
        titulo: 'Subir por la espalda',
        texto: 'Pasar por el coxis, los omóplatos y la nuca.',
      },
      {
        id: 'absorber',
        titulo: 'Volver y absorber',
        texto: 'Regresar a la coronilla para absorberse.',
      },
    ],
  },
  {
    id: 'sellado-final',
    numero: 12,
    titulo: 'Sellado final',
    origen: 'notas',
    resumen:
      'A la altura del ombligo: mano derecha debajo, tapándolo, y la izquierda encima; lengua al paladar aguantando la respiración 30 s; luego expandir y contraer la esfera de carga.',
    acento: 'violeta',
    pasos: [
      {
        id: 'manos',
        titulo: 'Derecha debajo, izquierda encima',
        texto: 'Mano derecha debajo, mano izquierda encima.',
        aclaracion:
          'Confirmado en el taller: se sella a la altura del ombligo, tapándolo con la mano derecha y la izquierda encima.',
      },
      {
        id: 'lengua-aguantar',
        titulo: 'Lengua al paladar · 30 s',
        texto: 'Con la lengua pegada al paladar de arriba, aguantar la respiración 30 segundos.',
        cantidad: { valor: 30, unidad: 'segundos', pregunta: '¿Cuántos segundos se aguanta la respiración en el sellado final?' },
        aclaracion: 'Indicado en el taller (no figuraba en las notas).',
      },
      {
        id: 'expandir-contraer',
        titulo: 'Expandir y contraer',
        texto: 'Expandir y contraer la esfera de carga.',
        aclaracion: 'Confirmado en el taller: la esfera de carga está a la altura del ombligo.',
      },
    ],
  },
];

export function buscarEjercicio(id: string): Ejercicio | undefined {
  return EJERCICIOS.find((e) => e.id === id);
}

export function buscarDuda(id: string): Duda | undefined {
  return DUDAS.find((d) => d.id === id);
}
