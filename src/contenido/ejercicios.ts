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

/**
 * El video del taller para las respiraciones conscientes (aclarado en la revisión): se respira
 * viéndolo y escuchándolo, desde el minuto 5:18.
 */
export const VIDEO_RESPIRACION = { id: 'wzBk2_A8_zc', inicio: 318, titulo: 'Ejercicio Energético uno - Pre Taller' };

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
          'Juntar la energía de las 2 barras: cada mano toma de su barra y forma una esfera; las manos se juntan al frente y las dos esferas se unen en una más grande. Las manos la llevan al ombligo y la entran, sin tocar el cuerpo: se acercan hasta quedar a 5–10 cm y desde ahí la energía entra.',
        cantidad: {
          valor: 10,
          unidad: 'cm del cuerpo como máximo (5–10 cm)',
          pregunta: '¿A qué distancia del cuerpo quedan las manos cuando entra la energía? (máximo)',
        },
        aclaracion:
          'Descrito en el taller: cada mano toma de su barra, las esferas se unen en una más grande entre las palmas y las manos la llevan y la entran; una vez en cada centro. Las manos quedan a 5–10 cm del cuerpo, como en «Activación de centros energéticos».',
      },
      {
        id: 'unir-pecho',
        titulo: 'Unir y llevar al centro del pecho',
        texto: 'Hacer lo mismo y llevar la energía al centro del pecho, con las manos a 5–10 cm del cuerpo.',
        aclaracion: 'Descrito en el taller.',
      },
      {
        id: 'unir-frente',
        titulo: 'Unir y llevar a la frente',
        texto: 'Hacer lo mismo y llevar la energía al centro de la frente, con las manos a 5–10 cm del cuerpo.',
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
        aclaracion:
          'Descrito en el taller: dedo por dedo, por cada falange, con pulgar e índice en círculos; empezando por el meñique. Para el pulgar, la mano gira la palma hacia abajo y el pulgar apunta a la otra mano.',
        lectura: 'Mientras se masajea un dedo, los otros se recogen un poco y ese queda estirado.',
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
        aclaracion: 'Descrito en el taller: al terminar, las manos se sueltan a los costados.',
      },
    ],
  },
  {
    id: 'recorrido-por-chakras',
    numero: 5,
    titulo: 'Recorrido por chakras',
    subtitulo: 'baja por la espalda, sube por el frente',
    origen: 'revision',
    resumen:
      'Se une la energía de las dos barras en una esfera y se coloca sobre la coronilla. La esfera va sola: baja por detrás de la cabeza y por la espalda, pasa por debajo, entre las piernas, sale por la ingle, sube por el frente y vuelve a la coronilla, deteniéndose unos segundos en cada punto importante. Al final, las dos manos la bajan entre las palmas y ayudan a introducirla por la coronilla.',
    acento: 'cielo',
    pasos: [
      {
        id: 'unir-barras',
        titulo: 'Unir la energía de las barras',
        texto:
          'Agarrar con cada mano su barra y tomar su energía; juntar las manos al frente con los brazos estirados y unir las dos esferas en una más grande. Jugar un poco con ella, alejando y acercando las manos, como una esfera de goma.',
        aclaracion: 'Descrito en el taller: la esfera se forma como en los ejercicios anteriores.',
        lectura: 'Se forma igual que en «Colocar energía en los 3 puntos», con el juego de la esfera de goma (4 s).',
      },
      {
        id: 'coronilla',
        titulo: 'La esfera sobre la coronilla',
        texto: 'Llevar la esfera entre las palmas arriba de la cabeza y dejarla sobre la coronilla. Desde aquí la esfera va sola, guiada con la mente, y las manos se sueltan a los costados.',
        aclaracion: 'Descrito en el taller: la esfera se coloca arriba y recorre el cuerpo sola.',
        lectura: 'Las manos bajan abriéndose por los costados, como en «Sellar desde el cielo».',
      },
      {
        id: 'espalda',
        titulo: 'Bajar por la espalda',
        texto:
          'La esfera baja por detrás de la cabeza y se desliza por la espalda. Se detiene unos segundos en cada punto para recalcarlo: detrás de la frente, detrás de la garganta, detrás del pecho, detrás del ombligo y detrás de la ingle.',
        cantidad: { valor: 2, unidad: 'segundos en cada punto', pregunta: '¿Cuántos segundos se detiene la esfera en cada punto del recorrido?' },
        aclaracion:
          'Descrito en el taller: baja desde la parte de atrás de la cabeza y se detiene en cada punto importante (el apunte lo tenía al revés: bajar por el frente y subir por la espalda).',
      },
      {
        id: 'frente',
        titulo: 'Por abajo y subir por el frente',
        texto:
          'Pasa por debajo y se detiene en el centro de abajo, entre las piernas, en la misma línea que la coronilla. Sale por delante y se detiene en la ingle. Después sube y se detiene en el ombligo, el centro del pecho, la garganta y el centro de la frente.',
        aclaracion:
          'Descrito en el taller: también se detiene en el centro de abajo y da la vuelta por el frente; adelante se detiene en la ingle, el ombligo, el pecho, la garganta y la frente.',
        lectura: 'Como las piernas están juntas, en el centro de abajo la esfera se ve a través de ellas.',
      },
      {
        id: 'introducir',
        titulo: 'Introducir por la coronilla',
        texto:
          'La esfera vuelve arriba de la cabeza. Las dos manos suben por los costados, la toman entre las palmas y la bajan sobre la coronilla; después ayudan a introducirla, acompañándola hacia adentro hasta quedar sobre la coronilla con las palmas hacia abajo.',
        aclaracion: 'Descrito en el taller: regresa a la coronilla y las dos manos ayudan a introducirla.',
        lectura: 'Al terminar, las manos se sueltan a los costados.',
      },
    ],
  },
  {
    id: 'sensibilizacion-manos',
    numero: 6,
    titulo: 'Sensibilización de manos',
    subtitulo: 'sin soltar la esfera, palpando dedos y brazos',
    origen: 'revision',
    resumen:
      'Primero se carga de las barras: una esfera en cada mano, se juntan en una y se juega con ella como goma. La esfera pasa de mano en mano, lentamente y sin soltarla nunca: una mano arriba y otra abajo, jugando con ella como goma. Después la mano izquierda, con forma de agarrar y con la energía de la esfera dentro, cubre los dedos de la derecha uno por uno, lentamente y sin tocarlos, con la yema de cada dedo en el centro de la esfera y ese dedo un poco separado de los demás, y en cada uno hace goma; acompaña a la esfera por el brazo, de la muñeca al codo en 4 tramos iguales, haciendo goma en cada punto de forma continua, como una ola, por delante y por atrás, y recorre el brazo y la mano sin tocarlos, a 5–10 cm, como cubriéndolos, hasta el hombro y de vuelta a los dedos; la esfera vuelve a la palma y se absorbe. Luego, lo mismo con el otro brazo, empezando otra vez desde las barras.',
    acento: 'oro',
    bloques: [{ titulo: 'Sensaciones reportadas', items: ['Calor', 'Presión', 'Hormigueo', 'Electricidad'] }],
    pasos: [
      {
        id: 'tomar-esferas',
        titulo: 'Cargar de las barras y juntar las dos esferas',
        texto:
          'Cada mano agarra su barra, con los brazos estirados, y toma energía: se forma una esfera en cada mano. Las manos se juntan al frente, las dos esferas se unen en una y se juega con ella como si fuera de goma. Después se baja al frente, entre las dos manos, y la derecha se queda con ella.',
        aclaracion:
          'Descrito en el taller: primero se carga desde las barras de energía, como en los demás ejercicios. Del apunte (enseñado por Víctor): tomar dos esferas y juntarlas.',
        lectura:
          'La esfera es más chica que en «Colocar energía en los 3 puntos», para que al palpar la mano quede a 7,5 cm del brazo; por eso las manos la acunan, con las palmas un poco hacia arriba.',
      },
      {
        id: 'mano-a-mano',
        titulo: 'De mano en mano, lentamente y como goma',
        texto:
          'Pasar la esfera de una mano a la otra lentamente, sin soltarla nunca, con una mano arriba y la otra abajo: las dos manos van al medio al mismo tiempo, la que la tiene la da vuelta y la pone arriba y la otra se pone abajo y la recibe; juegan con ella como si fuera de goma (alejan y acercan las manos: se estira hacia arriba y se aplasta), y recién entonces la de arriba la suelta: la esfera queda en la mano de abajo.',
        aclaracion:
          'Descrito en el taller: en ningún momento la mano suelta la esfera mientras se la pasa a la otra; se la pasa lentamente, jugando con ella como si fuera de goma, con una mano arriba y otra abajo (no de costado), y termina en la mano de abajo.',
        lectura:
          'La que la tiene la da vuelta con la esfera pegada a la palma para ponerla arriba. Tres traspasos (derecha → izquierda → derecha → izquierda), de unos 9 s cada uno; en cada uno, dos idas y vueltas de goma.',
      },
      {
        id: 'derecho-delante',
        titulo: 'Brazo derecho: la izquierda cubre los dedos',
        texto:
          'Empieza la mano izquierda con la mano derecha. La derecha se extiende con la palma hacia arriba; la izquierda da vuelta la esfera sin soltarla y, con forma de agarrar y la energía de la esfera dentro, cubre los dedos de la derecha uno por uno, lentamente y sin tocarlos: meñique, anular, medio, índice y pulgar. En cada dedo, ese dedo se separa un poco de los demás, la yema queda en el centro de la esfera y la mano hace goma: sube y baja, y la esfera se estira con ella. Después acompaña a la esfera por delante del brazo, de la muñeca al codo: la distancia dividida en 4, y en cada punto (muñeca, ¼, ½, ¾ y codo) hace goma: la mano sube, con la muñeca un poco doblada y los dedos que se cierran como tirando de la goma, y baja mientras sigue al punto siguiente, sin detenerse, como una ola.',
        aclaracion:
          'Descrito en el taller: empieza la mano izquierda tocando la mano derecha, primero los dedos: la mano izquierda, un poco más cerrada y con la energía de la esfera dentro, intenta cubrir los dedos de la otra mano uno por uno, de forma lenta. En la revisión: del meñique al pulgar, sin tocarlos, la mano con forma de agarrar algo, haciendo goma en cada dedo, con la yema del dedo en el centro de la esfera, la esfera de su tamaño de siempre y ese dedo un poco separado de los demás. Después, al palpar a distancia, la mano acompaña a la esfera y hace como goma en los puntos del brazo; en la revisión: de la muñeca al codo, la distancia dividida en 4, con goma en cada punto, recorridos de forma continua (unos 2 s por punto).',
        lectura:
          'Para cubrir los dedos, la izquierda da vuelta la esfera con la palma hacia abajo. Para separar el dedo, se levanta un poco desde el nudillo y sus vecinos se abren hacia los costados; así la mano que agarra no los toca.',
      },
      {
        id: 'derecho-atras',
        titulo: 'Brazo derecho: por atrás, ida y vuelta',
        texto:
          'El brazo derecho gira con la palma hacia abajo y se palpa por atrás de la misma forma: del codo a la muñeca, en los mismos 5 puntos, con goma en cada uno, de forma continua. Después la mano izquierda, ahuecada, recorre el brazo y la mano suavemente, como cubriéndolos y sin tocarlos, a 5–10 cm de la piel: de los dedos hasta el hombro (llega por delante) y de vuelta hasta los dedos. Al terminar, la esfera vuelve a la palma y se absorbe.',
        cantidad: {
          valor: 10,
          unidad: 'cm de la piel como máximo (5–10 cm)',
          pregunta: '¿A qué distancia de la piel recorre la mano el brazo hasta el hombro? (máximo)',
        },
        aclaracion:
          'Descrito en el taller: el brazo se palpa a distancia por delante y por atrás (el brazo gira); después la mano lo recorre sin tocarlo, a 5–10 cm, hasta el hombro. En la revisión: el recorrido es de ida y vuelta (dedos → hombro → dedos), cubriendo el brazo y la mano, y al terminar la esfera vuelve a la palma y se absorbe.',
        lectura: 'La mano llega al hombro por delante, con los dedos hacia arriba: así el otro brazo cruza por delante del pecho.',
      },
      {
        id: 'otra-mano-barras',
        titulo: 'Con el otro brazo: otra vez desde las barras',
        texto:
          'Para seguir con el otro brazo se empieza otra vez desde las barras: cada mano toma energía de su barra, las dos esferas se unen en una y se juega con ella como goma; después se baja al frente y la izquierda se queda con ella.',
        aclaracion: 'Descrito en el taller: cuando se comienza con la otra mano, se comienza desde las barras de energía. En la revisión: también los traspasos.',
        lectura: 'En espejo con el primer brazo: ahora se queda con la esfera la izquierda.',
      },
      {
        id: 'otra-mano-pasar',
        titulo: 'De mano en mano, otra vez',
        texto:
          'Otra vez de mano en mano, lentamente y sin soltarla, con una mano arriba y la otra abajo y jugando como goma: izquierda → derecha → izquierda → derecha. Queda en la derecha, que es la que cubre los dedos de la izquierda.',
        aclaracion: 'Descrito en el taller (como en el paso 2).',
      },
      {
        id: 'izquierdo-delante',
        titulo: 'Brazo izquierdo: la derecha cubre los dedos',
        texto:
          'La izquierda se extiende con la palma hacia arriba; la derecha da vuelta la esfera sin soltarla y, con forma de agarrar, cubre los dedos de la izquierda uno por uno, lentamente y sin tocarlos, con cada dedo un poco separado de los demás, la yema en el centro de la esfera y haciendo goma en cada uno. Después acompaña a la esfera por delante del brazo izquierdo, de la muñeca al codo en 4 tramos iguales, con goma en cada punto, de forma continua.',
        aclaracion: 'Descrito en el taller: después se sigue con la otra mano.',
      },
      {
        id: 'izquierdo-atras',
        titulo: 'Brazo izquierdo: por atrás, ida y vuelta',
        texto:
          'El brazo izquierdo gira y se palpa por atrás; después la mano derecha, ahuecada, lo recorre como cubriéndolo y sin tocarlo, a 5–10 cm de la piel, de los dedos hasta el hombro y de vuelta. Al terminar, la esfera vuelve a la palma y se absorbe, y las manos se sueltan a los costados.',
        aclaracion: 'Descrito en el taller.',
      },
    ],
  },
  {
    id: 'cargar-ingles',
    numero: 7,
    titulo: 'Cargar las ingles',
    subtitulo: 'cruzadas, 15 por cada mano',
    origen: 'revision',
    resumen:
      'Como «Cargar el ombligo»: brazos bien estirados al frente, tomando la energía de dos barras verticales; las manos, intercaladas, llevan lentamente una esfera cada vez, pero cruzadas: la mano derecha a la ingle izquierda y la izquierda a la ingle derecha. 15 por cada mano.',
    acento: 'tierra',
    pasos: [
      {
        id: 'brazos-barras',
        titulo: 'Brazos al frente',
        texto:
          'Estirar bien los brazos al frente, a la altura de los hombros (90°), y agarrar la energía que está a la altura de las manos, como barras de energía verticales.',
        aclaracion: 'Descrito en el taller: como en «Cargar el ombligo».',
      },
      {
        id: 'cargas-cruzadas',
        titulo: 'Cargas cruzadas · 15 por mano',
        texto:
          'Después de un momento, las manos se dirigen lentamente a las ingles llevando una esfera de energía, cruzadas: la mano derecha a la ingle izquierda y la izquierda a la ingle derecha, colocando la esfera en cada una. Intercaladas: derecha, izquierda, derecha… 15 por cada mano.',
        cantidad: { valor: 15, unidad: 'por cada mano (30 en total)', pregunta: '¿Cuántas cargas a las ingles se hacen con cada mano?' },
        aclaracion:
          'Descrito en el taller: parecido a «Cargar el ombligo», pero la mano derecha va a la ingle izquierda y la izquierda a la ingle derecha, colocando las esferas en esas partes. Elegido en la revisión: intercaladas, 15 por mano.',
        lectura:
          'Empieza la derecha. La espalda queda recta: para llegar a la ingle del otro lado, el hombro de esa mano se adelanta y el torso gira un poco hacia esa ingle mientras la mano lleva la esfera. Cada esfera se acumula en su ingle.',
      },
    ],
  },
  {
    id: 'sensibilizacion-piernas',
    numero: 8,
    titulo: 'Sensibilización de piernas',
    subtitulo: 'como goma, de la pierna al pie',
    origen: 'revision',
    resumen:
      'Como «Sensibilización de manos», pero con las piernas: se generan las esferas con las manos desde las barras, se juntan en una y se pasa de una mano a otra jugando como goma. La pierna que se va a tocar se pone estirada hacia adelante, a 45° y un poco abierta hacia su lado, pisando el piso, y la otra rodilla se dobla. Con la mano que tiene la esfera se pasa por la pierna, la rodilla, el tobillo y la parte alta del pie, en 6 puntos, jugando como goma en cada uno, y se regresa de la misma forma; el cuerpo se inclina a medida que la mano baja. Después la mano pasa a 5–10 cm, sin tocar, por toda la pierna y el pie, de ida y vuelta, y la esfera se introduce en el muslo. Luego, lo mismo con la otra pierna, empezando otra vez desde las barras.',
    acento: 'oro',
    pasos: [
      {
        id: 'tomar-esferas',
        titulo: 'Cargar de las barras y juntar las dos esferas',
        texto:
          'Cada mano agarra su barra, con los brazos estirados, y toma energía: se forma una esfera en cada mano. Las manos se juntan al frente, las dos esferas se unen en una y se juega con ella como si fuera de goma. Después se baja al frente, entre las dos manos, y la derecha se queda con ella.',
        aclaracion: 'Descrito en el taller: se generan las esferas de energía con las manos y se juntan, igual que en «Sensibilización de manos».',
        lectura: 'La misma esfera que en «Sensibilización de manos»: así la mano que pasa por la pierna queda a 7,5 cm de la piel.',
      },
      {
        id: 'mano-a-mano',
        titulo: 'De mano en mano, lentamente y como goma',
        texto:
          'Pasar la esfera de una mano a la otra lentamente, sin soltarla nunca, con una mano arriba y la otra abajo: las dos manos van al medio al mismo tiempo, la que la tiene la da vuelta y la pone arriba y la otra se pone abajo y la recibe; juegan con ella como si fuera de goma, y recién entonces la de arriba la suelta: la esfera queda en la mano de abajo.',
        aclaracion: 'Descrito en el taller: se pasa de una mano a otra como si fuera goma, igual que en «Sensibilización de manos».',
        lectura: 'Tres traspasos (derecha → izquierda → derecha → izquierda): queda en la izquierda, que es la que pasa por la pierna derecha.',
      },
      {
        id: 'derecha-puntos',
        titulo: 'Pierna derecha: goma en 6 puntos, de ida y vuelta',
        texto:
          'La pierna derecha da un paso y queda estirada hacia adelante, a 45° y un poco abierta hacia la derecha, con el pie estirado, pisando el piso; la otra rodilla se dobla. La mano izquierda da vuelta la esfera sin soltarla y la lleva a la pierna derecha. Pasa por la pierna en 6 puntos (arriba del muslo, mitad del muslo, rodilla, mitad de la canilla, tobillo y empeine, la parte alta del pie) y en cada uno juega como goma: la mano sube y baja, y la esfera se estira con ella. Después regresa de la misma forma, del empeine al muslo. A medida que la mano baja, el cuerpo se inclina hacia la pierna.',
        cantidad: { valor: 6, unidad: 'puntos en cada pierna, al bajar y al volver', pregunta: '¿En cuántos puntos de la pierna se juega como goma?' },
        aclaracion:
          'Descrito en el taller: con la mano que tiene la esfera se pasa por la pierna, la rodilla, el tobillo y la parte alta del pie, y se regresa de la misma forma; la pierna y el pie se dividen en varios puntos y en cada uno se juega como goma, como en «Sensibilización de manos». En la revisión: la pierna que se toca se pone a 45° hacia adelante con el pie estirado, un poco abierta hacia su lado, sin levantarla (sigue pisando el piso) y con la otra rodilla doblada; 6 puntos; primero la pierna derecha, con la mano izquierda.',
        lectura:
          'La mano pasa por encima de la pierna, con la palma hacia ella, a 7,5 cm de la piel; de la canilla al pie, sus dedos van a lo largo de la pierna. Con la pierna abierta, para llegar al empeine el torso se dobla mucho y gira hacia la pierna (unos 40°). La otra mano cuelga relajada.',
      },
      {
        id: 'derecha-recorrido',
        titulo: 'Pierna derecha: a 5–10 cm, ida y vuelta, y la esfera entra en el muslo',
        texto:
          'Después la mano, ahuecada, pasa por toda la pierna y el pie sin tocarlos, a 5–10 cm de la piel, como cubriéndolos: del muslo hasta la parte delantera del pie y de vuelta al muslo. Al terminar, la esfera se introduce en el muslo, el cuerpo se endereza y la pierna vuelve a su lugar.',
        cantidad: {
          valor: 10,
          unidad: 'cm de la piel como máximo (5–10 cm)',
          pregunta: '¿A qué distancia de la piel pasa la mano por la pierna y el pie? (máximo)',
        },
        aclaracion: 'Descrito en el taller: después se pasa la mano a 5–10 cm, como en «Sensibilización de manos»; al terminar, se introduce la esfera en la pierna. Elegido en la revisión: en el muslo.',
        lectura:
          'El recorrido va por toda la pierna y el pie, de ida y vuelta, como en «Sensibilización de manos». Llega justo pasando el empeine: con la pierna a 45° y abierta, los dedos quedan fuera del alcance de la mano sin apoyar el pecho en la pierna.',
      },
      {
        id: 'otra-pierna-barras',
        titulo: 'Con la otra pierna: otra vez desde las barras',
        texto:
          'Para seguir con la otra pierna se empieza otra vez desde las barras: cada mano toma energía de su barra, las dos esferas se unen en una y se juega con ella como goma; después se baja al frente y la izquierda se queda con ella.',
        aclaracion: 'Descrito en el taller: se comienza con el otro pie desde las barras de energía.',
        lectura: 'Como en «Sensibilización de manos», también se repiten los traspasos.',
      },
      {
        id: 'otra-pierna-pasar',
        titulo: 'De mano en mano, otra vez',
        texto:
          'Otra vez de mano en mano, lentamente y sin soltarla, con una mano arriba y la otra abajo y jugando como goma: izquierda → derecha → izquierda → derecha. Queda en la derecha, que es la que pasa por la pierna izquierda.',
        aclaracion: 'Descrito en el taller (como en el paso 2).',
      },
      {
        id: 'izquierda-puntos',
        titulo: 'Pierna izquierda: goma en 6 puntos, de ida y vuelta',
        texto:
          'La pierna izquierda se estira hacia adelante a 45°, un poco abierta hacia la izquierda, pisando el piso, y la mano derecha lleva la esfera por los mismos 6 puntos, jugando como goma en cada uno, hasta el empeine y de vuelta al muslo, inclinándose a medida que baja.',
        aclaracion: 'Descrito en el taller: lo mismo con la otra pierna.',
      },
      {
        id: 'izquierda-recorrido',
        titulo: 'Pierna izquierda: a 5–10 cm y la esfera entra en el muslo',
        texto:
          'La mano pasa a 5–10 cm por toda la pierna y el pie, sin tocarlos, de ida y vuelta; al terminar, la esfera se introduce en el muslo, el cuerpo se endereza y la pierna vuelve a su lugar.',
        aclaracion: 'Descrito en el taller.',
      },
    ],
  },
  {
    id: 'enraizar-material',
    numero: 9,
    titulo: 'Enraizar',
    subtitulo: 'generar lo material',
    origen: 'revision',
    resumen:
      'La mano derecha, estirada hacia abajo, agarra energía − de la tierra durante 5 s y se forma una esfera; estirada hacia arriba, agarra energía + del cielo durante 5 s y la esfera se fortalece. Al frente del pecho, la mano izquierda le hace un hueco: queda en forma de dona. En cuclillas, la esfera hueca arranca pegada al perineo y la mano la baja hasta el piso: se forma un tubo de energía, recto, del perineo al piso, y la dona desaparece. Al final se dice la frase y, de pie, el tubo sigue conectado al suelo.',
    acento: 'tierra',
    pasos: [
      {
        id: 'abajo-tierra',
        titulo: 'Abajo: energía − de la tierra',
        texto:
          'Estirar la mano derecha hacia abajo, con la mano en forma de agarrar algo, y durante 5 segundos ir haciendo el movimiento de agarrar: se toma energía − de la tierra y se forma una esfera de energía en la mano.',
        cantidad: { valor: 5, unidad: 's', pregunta: '¿Cuántos segundos se agarra energía con la mano abajo?' },
        aclaracion:
          'Descrito en la revisión: la mano derecha, estirada hacia abajo y con forma de agarrar algo, forma una esfera de energía en la mano durante 5 s. Elegido en la revisión: abajo se toma energía − (de la tierra), como en el ejercicio de referencia.',
        lectura: 'La palma mira al piso y los dedos al frente; un agarre por segundo, y en cada uno la esfera crece.',
      },
      {
        id: 'arriba-cielo',
        titulo: 'Arriba: energía + del cielo',
        texto:
          'Después levantar la mano derecha y estirarla hacia arriba: la mano hace el efecto de agarrar algo durante 5 segundos, fortaleciendo o recargando la esfera con energía + del cielo.',
        cantidad: { valor: 5, unidad: 's', pregunta: '¿Cuántos segundos se agarra energía con la mano arriba?' },
        aclaracion: 'Descrito en la revisión: la mano estirada hacia arriba agarra durante 5 s, fortaleciendo o recargando la esfera. Elegido en la revisión: arriba, energía + del cielo.',
        lectura: 'La mano sube por delante, con la esfera; arriba la palma mira al cielo.',
      },
      {
        id: 'dona',
        titulo: 'Un hueco en la esfera: una dona',
        texto: 'Con la otra mano (la izquierda) le haces un hueco a la esfera, en forma de dona.',
        aclaracion: 'Descrito en la revisión. Elegido en la revisión: al frente del pecho (la derecha baja la esfera desde arriba).',
        lectura: 'La izquierda la atraviesa con el índice, de arriba abajo: el hueco queda vertical.',
      },
      {
        id: 'tubo-piso',
        titulo: 'En cuclillas: un tubo de energía al piso',
        texto:
          'Ponerse en cuclillas y, con la mano derecha que tiene la esfera hueca, acercar la esfera a la parte baja de la ingle, el perineo; con la mano ir bajando la esfera hasta conectar con el piso: se forma un tubo de energía del perineo al piso, por el hueco de la esfera.',
        aclaracion:
          'Descrito en la revisión: el tubo nace en el perineo y baja recto al piso; la esfera hueca arranca pegada al perineo y baja con la mano hasta el piso, y el tubo pasa por el agujero de la dona. Cuando el tubo queda formado, la dona desaparece y el tubo se mantiene. Del taller (en el ejercicio de referencia): el agujero va en la ingle y queda conectado con la tierra, el piso de tus pies.',
        lectura:
          'La mano lleva la dona tomándola por el borde y la izquierda se apoya en la rodilla. El tubo toca el piso justo debajo del perineo. La dona se desvanece en el piso, en un segundo.',
      },
      {
        id: 'decir-conectate',
        titulo: 'Decir la frase',
        texto: 'Decir la frase.',
        frase: 'SÁNATE, CONÉCTATE HASTA SANAR',
        aclaracion: 'Del ejercicio de referencia; se mantiene al final (elegido en la revisión). Descrito en la revisión: al ponerse de pie, el tubo sigue conectado al suelo.',
        lectura: 'Al ponerse de pie, la boca del tubo acompaña al perineo y el tubo sigue recto hasta el piso.',
      },
    ],
  },

  {
    id: 'activacion-centros',
    numero: 10,
    titulo: 'Activación de centros energéticos',
    origen: 'revision',
    resumen:
      'Se empieza con las barras de energía: se juntan las esferas, se forma una esfera de energía, se juega como goma y la sostiene la mano derecha. La mano la acerca al pecho, con la palma hacia él, y durante 5 s hace goma: la esfera queda pegada al centro y se estira hacia la palma. Con la esfera quieta se dice la frase y la mano la introduce sin tocar el cuerpo, a unos 10 cm. Lo mismo para la garganta y la frente, empezando cada vez con las barras.',
    acento: 'jade',
    pasos: [
      {
        id: 'barras-pecho',
        titulo: 'Barras: formar la esfera',
        texto:
          'Empezar con las barras de energía: juntar las esferas y formar una esfera de energía, jugar con ella como goma y sostenerla con la mano derecha.',
        aclaracion: 'Descrito en la revisión.',
        lectura:
          'Igual que el paso 1 de «Sensibilización de manos»: cada mano toma energía de su barra, las esferas se unen en una, se juega como goma, se baja al frente y la derecha se queda con ella.',
      },
      {
        id: 'pecho',
        titulo: 'Pecho: goma, la frase y la esfera entra',
        texto:
          'Acercar la esfera al pecho, con la mano mirando al pecho, y junto con la esfera hacer goma al pecho. Después de 5 segundos, decir la frase y, con ayuda de la mano, introducir la esfera sin tocar el cuerpo, con la mano a unos 10 cm.',
        frase: 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DEL AMOR QUE RADICA EN MÍ',
        cantidad: { valor: 10, unidad: 'cm de la mano al cuerpo al introducirla', pregunta: '¿A qué distancia del cuerpo queda la mano al introducir la esfera?' },
        aclaracion:
          'Descrito en la revisión: goma al pecho durante 5 s, la frase y la esfera entra sin tocar el cuerpo, con la mano a unos 10 cm. Elegido en la revisión: la esfera queda pegada al centro y se estira hacia la palma, y mientras se dice la frase la mano la sostiene quieta frente al centro.',
        lectura:
          'La palma mira al pecho, con los dedos hacia la izquierda. La mano se aleja hasta 13 cm dos veces y media y termina lejos; después empuja hasta quedar a 10 cm, la esfera se suelta de la palma, se hunde en el pecho y el centro se enciende.',
      },
      {
        id: 'barras-garganta',
        titulo: 'Otra vez las barras',
        texto: 'Empezar de nuevo con las barras de energía: formar la esfera, jugar como goma y sostenerla con la mano derecha.',
        aclaracion: 'Descrito en la revisión: para cada centro se comienza con las barras de energía.',
      },
      {
        id: 'garganta',
        titulo: 'Garganta: goma, la frase y la esfera entra',
        texto:
          'Lo mismo en la garganta: acercar la esfera con la mano mirando a la garganta, hacer goma durante 5 segundos, decir la frase e introducir la esfera sin tocar el cuerpo, con la mano a unos 10 cm.',
        frase: 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DE LA PALABRA QUE RADICA EN MI VOZ',
        aclaracion: 'Descrito en la revisión: es lo mismo para la garganta. Elegido en la revisión: la frase del ejercicio de referencia.',
        lectura: 'La esfera toca la garganta abajo, donde el cuello se ensancha, sin llegar al mentón.',
      },
      {
        id: 'barras-frente',
        titulo: 'Otra vez las barras',
        texto: 'Empezar de nuevo con las barras de energía: formar la esfera, jugar como goma y sostenerla con la mano derecha.',
        aclaracion: 'Descrito en la revisión: para cada centro se comienza con las barras de energía.',
      },
      {
        id: 'frente',
        titulo: 'Frente: goma, la frase y la esfera entra',
        texto:
          'Lo mismo en la frente: acercar la esfera con la mano mirando a la frente, hacer goma durante 5 segundos, decir la frase e introducir la esfera sin tocar el cuerpo, con la mano a unos 10 cm.',
        frase: 'CON ESTA ESFERA DE LUZ ACTIVO EL PODER DE LA CLARIVIDENCIA EN MÍ',
        aclaracion: 'Descrito en la revisión: es lo mismo para la frente. Elegido en la revisión: la frase del ejercicio de referencia.',
        lectura: 'La mano sube frente a la frente, con los dedos hacia la izquierda y el codo afuera.',
      },
    ],
  },

  {
    id: 'sellado-ombligo',
    numero: 11,
    titulo: 'Sellado final',
    origen: 'revision',
    resumen:
      'La mano derecha tapa el ombligo y la izquierda va encima, presionando un poco el cuerpo. Se pega la punta de la lengua al paladar de arriba, se inhala y se aguanta la respiración 30 s; al exhalar, se termina con las manos a los costados.',
    acento: 'violeta',
    pasos: [
      {
        id: 'manos-ombligo',
        titulo: 'La derecha tapa el ombligo, la izquierda encima',
        texto: 'Colocar la mano derecha tapando el ombligo y la izquierda encima, y presionar un poco el cuerpo.',
        aclaracion: 'Descrito en la revisión.',
        lectura:
          'Las manos quedan cruzadas: los dedos de la derecha hacia la izquierda y los de la izquierda hacia la derecha. La palma derecha se apoya sobre el ombligo y la izquierda sobre el dorso de la derecha.',
      },
      {
        id: 'lengua-paladar',
        titulo: 'La lengua al paladar',
        texto: 'Pegar la lengua al paladar de arriba.',
        aclaracion:
          'Descrito en la revisión, con una imagen de referencia. Elegido en la revisión: la punta de la lengua toca el paladar justo detrás de los dientes de arriba, con la boca cerrada; el dibujo se ve junto a la cabeza mientras se hace.',
        lectura: 'Las manos siguen en el ombligo, presionando.',
      },
      {
        id: 'aguantar-30',
        titulo: 'Aguantar la respiración 30 s',
        texto: 'Aguantar la respiración por 30 segundos.',
        cantidad: { valor: 30, unidad: 'segundos', pregunta: '¿Cuántos segundos se aguanta la respiración en el sellado final?' },
        aclaracion:
          'Descrito en la revisión. Elegido en la revisión: se inhala profundo, se retiene 30 s y al final se exhala suave, con las manos en el ombligo y la lengua en el paladar.',
        lectura: 'Inhalar dura unos 4 s y exhalar unos 5 s.',
      },
      {
        id: 'manos-costados',
        titulo: 'Las manos a los costados',
        texto: 'Terminar con las manos a los costados.',
        aclaracion: 'Descrito en la revisión: no se hace «Expandir y contraer» del ejercicio de referencia.',
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
        respiraciones: 15,
        aclaracion:
          'Aclarado en la revisión: hay ritmos variados —4-3-4, 3-3-3 o 5-5-5 (inhalar · retener · exhalar)— y la pausa es de 3 s en todos; se elige uno. Se hace viendo y escuchando el video del taller.',
        lectura: 'Sin el video se muestra una respiración de muestra al ritmo elegido; acompañando con el video, el paso dura las 15.',
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
        respiraciones: 30,
        aclaracion:
          'Aclarado en la revisión: hay ritmos variados —4-3-4, 3-3-3 o 5-5-5 (inhalar · retener · exhalar)— y la pausa es de 3 s en todos; se elige uno. Se hace viendo y escuchando el video del taller.',
        lectura: 'Sin el video se muestra una respiración de muestra al ritmo elegido; acompañando con el video, el paso dura las 30.',
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
