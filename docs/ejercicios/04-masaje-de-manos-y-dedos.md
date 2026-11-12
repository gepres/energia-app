# 04 · Masaje de manos y dedos (palma y falange por falange)

> **Grupo:** Sensibilización. Desde el 2026-11-12 los ejercicios se numeran por grupo; este conserva su número. En el resto de este documento, los números de otros ejercicios son los de antes (la equivalencia está en [README.md](README.md)).

> **Estado:** aprobado por el usuario el 2026-11-08, revisándolo uno por uno.
> Es la versión «uno por uno», descrita en el taller. No tiene equivalente en la versión de referencia.
> Misma nota en Foundry: espacio energia-app → «Ejercicios uno por uno · comportamiento aprobado» → «04 · Masaje de manos y dedos».

## 1. Lo que dijo el taller

- «Masajes en las manos y dedos: **con la ayuda de una mano masajeas la otra**, desde **la palma** de la mano y **los dedos, dedo por dedo, por cada falange**, y después vas **a la otra mano**.»

Respuestas a las preguntas:
- Primero **la derecha masajea la izquierda** y después al revés.
- Cada falange: **el pulgar (arriba) y el índice (abajo)** la toman como una pinza y hacen **círculos**.
- La palma: la mano que masajea la sostiene por debajo y **su pulgar hace círculos**.
- **3 círculos por falange.**

Correcciones de la revisión:
- los dedos **empiezan por el meñique** (meñique, anular, medio, índice y al final el pulgar);
- el masaje tiene que **parecer real y no verse deforme**: ninguna mano atraviesa la otra;
- confirmado: para el pulgar, **la mano masajeada gira la palma hacia abajo**;
- confirmado: **al terminar, las manos se sueltan a los costados**.

## 2. Textos de la app

**Ejercicio:** «Masaje de manos y dedos» · palma y falange por falange · pista «Uno por uno» · color rosa.

**Resumen:** «Con una mano se masajea la otra: primero la palma, con el pulgar en círculos, y después dedo por dedo, cada falange entre el pulgar y el índice, empezando por el meñique y terminando en el pulgar. Después se cambia de mano.»

| Paso | Texto | Aclaración / lectura |
|---|---|---|
| 1 · La derecha masajea la palma izquierda | «Con la mano derecha, sostener la izquierda por debajo y hacer círculos con el pulgar por toda la palma.» | «Descrito en el taller: primero la derecha masajea la izquierda; el pulgar hace círculos por la palma.» |
| 2 · Dedo por dedo · mano izquierda | «Masajear la mano izquierda dedo por dedo, empezando por el meñique (meñique, anular, medio, índice y al final el pulgar): cada falange se toma entre el pulgar (arriba) y el índice (abajo) y se hacen 3 círculos.» Cantidad: **3 círculos por falange**. | Aclaración: «Descrito en el taller: dedo por dedo, por cada falange, con pulgar e índice en círculos; empezando por el meñique. Para el pulgar, la mano gira la palma hacia abajo y el pulgar apunta a la otra mano.» Lectura: «Mientras se masajea un dedo, los otros se recogen un poco y ese queda estirado.» |
| 3 · La izquierda masajea la palma derecha | «Cambiar de mano: con la izquierda, sostener la derecha por debajo y hacer círculos con el pulgar por toda la palma.» | «Descrito en el taller.» |
| 4 · Dedo por dedo · mano derecha | «Masajear la mano derecha dedo por dedo, empezando por el meñique y terminando en el pulgar, con 3 círculos en cada falange.» | «Descrito en el taller: al terminar, las manos se sueltan a los costados.» |

## 3. Coreografía

Duración total a 1×: **73,6 s**.

| Paso | s | Qué pasa |
|---|---|---|
| 1 | 9,25 | En 2,5 s las manos se acomodan. La izquierda queda abierta, con la palma hacia arriba y los dedos hacia el centro del cuerpo. La derecha la sostiene por debajo. Después, el pulgar derecho recorre 5 zonas de la palma, con 2 círculos en cada una: talón, base del pulgar, centro, borde del meñique y bajo los nudillos. |
| 2 | 26,05 | Dedo por dedo, mano izquierda: **meñique → anular → medio → índice**, cada uno de la base a la punta (3 falanges), y **al final el pulgar** (2 falanges). |
| 3 | 9,75 | **Cambio de mano (3 s):** las dos manos se sueltan al frente, la cámara pasa de un hombro al otro rodeando por delante y la izquierda queda sosteniendo la derecha. Luego, círculos por las 5 zonas de la palma derecha. |
| 4 | 28,55 | Dedo por dedo, mano derecha, en el mismo orden. Al terminar (2,5 s), **las manos se sueltan a los costados** y la cámara se aleja para ver a la persona entera. |

**Cada parada**
- La mano que masajea se traslada en 0,45 s y hace sus círculos, de 0,45 s cada uno.
- Para pasar al pulgar, la mano masajeada **gira la palma hacia abajo** en 1,3 s.
- Los círculos son pequeños: 4 mm en las falanges y 8 mm en la palma. Se hacen en el plano de la superficie y entran y salen suaves.

**Cómo se toma cada falange (para que se vea real)**
- **Pinza de dedo, de costado:** la mano que masajea va de canto, a lo largo del dedo. Su pulgar queda **arriba**, sobre la falange; su índice, **abajo**, casi recto; y sus otros tres dedos, recogidos para no tocar a los vecinos.
- **El dedo masajeado queda estirado y los demás se recogen un poco**, para aislarlo:
  - con el índice o el meñique se recogen más (0,62 y 0,58);
  - con el medio y el anular, poco (0,30 y 0,38). Cerrarlos del todo formaría un gesto ofensivo con el medio, y una postura imposible con el anular.
  - Al pasar de un dedo a otro, la mano se abre y aísla el siguiente.
- **Pulgar:** la mano masajeada gira la palma hacia abajo con los dedos al frente. Así el pulgar apunta a la otra mano, que lo toma con su pulgar arriba y su índice abajo.
- **Palma:** la mano que masajea va plana por debajo, con los dedos estirados, y su pulgar se arquea por encima de la palma.
- **Desde dónde y con qué giro se toma cada parada** se elige automáticamente al cargar el ejercicio (`elegirToma`). Se prueban dos direcciones (desde la punta o desde la base) y giros de hasta ≈ 46° a cada lado. Gana la opción con más espacio entre las manos (más de 6 mm cuenta como libre); a igualdad, la de menos giro y con la muñeca más cerca del hombro. Solo cuentan las opciones que el brazo alcanza (muñeca a menos de 0,53 m del hombro).

**Lo que se ve**
- **Cámara:** vista de la persona, por encima del hombro de la mano masajeada y mirando las manos desde arriba.
- **Luz:** una pequeña luz rosada marca el punto que se masajea.
- **Contador:** dedo y falange, por ejemplo «1 / 5 · meñique · falange 1».
- **Avisos:**
  - en la palma: «La derecha sostiene la mano izquierda y su pulgar hace círculos por la palma»;
  - en los dedos: «Dedo por dedo, desde el meñique…»;
  - en el pulgar: «Al final el pulgar: la mano gira la palma hacia abajo y la otra lo toma»;
  - al final: «Las dos manos masajeadas, palma y dedos».

## 4. Medidas

Unidades en metros. La figura mide 1,715 m y mira a +Z; su derecha está en −X. Cuando hay dos valores (±), el primero es de la izquierda y el segundo de la derecha.

- **Mano masajeada, palma arriba:** muñeca (±0,15; 1,08; 0,22), dedos hacia el centro del cuerpo y algo al frente, cierre 0,05.
- **Mano masajeada, para el pulgar:** muñeca (±0,13; 1,08; 0,20), palma hacia abajo, dedos al frente, cierre 0,22.
- **Pinzas** (medidas en el marco de la mano que masajea: a hacia el pulgar, b hacia los dedos, c hacia la palma; sin escala; la mano mide ≈ 0,185 m):
  - de palma: hueco (0,0265; 0,105; 0,022), yema del pulgar (0,0265; 0,104; 0,04);
  - de dedo: hueco (0,052; 0,105; 0,004), yema del pulgar (0,069; 0,105; 0,006). Cierre de los dedos: índice 0,10, medio 0,72, anular 0,82, meñique 0,88.
- **Zonas de la palma** (a hacia el pulgar, b hacia los dedos): (0; 0,03), (0,018; 0,045), (0; 0,055), (−0,018; 0,05) y (0; 0,078).
- **Cámara**
  - Por encima del hombro: centro (±0,06; 1,09; 0,28), alto visible 0,46 m, ángulo ±(π − 0,5) y elevación 1,2.
  - En el cambio de mano: de frente, centro (0; 1,12; 0,25), alto 0,62.

## 5. Supuestos aprobados en la revisión

- Mientras se masajea un dedo, los otros se recogen un poco y ese queda estirado.
- La mano masajeada se abre con la palma arriba y los dedos hacia el centro del cuerpo, y la otra toma cada dedo de costado.
- Vista de la persona por encima del hombro, con una luz rosada en el punto que se masajea.

## 6. Dónde está en el código

| Qué | Archivo |
|---|---|
| Coreografía (recorrido, paradas, elección de la toma, círculos, cámara, contador) | `src/secuencias/masajeManos.ts` (`recorrido`, `elegirToma`, `holguraManos`, `masajeEn`) |
| Cinemática de la mano, pinzas, dedo aislado | `src/escena/manos.ts` (`segmentosMano`, `manoEnPinza`, `FALANGES`, `PINZAS`, `RECOGER_OTROS`) |
| Campos de la pose | `src/escena/cuerpo.ts` (`pinzaD/I`, `tipoPinzaD/I`, `aisladoD/I`, `aislarD/I`) |
| Amortiguación del dedo aislado sin saltos | `src/escena/Maniqui.tsx` |
| Textos | `src/contenido/ejercicios.ts`, id `masaje-manos` |
| Pruebas | `src/secuencias/secuencias.test.ts`, bloque «Masaje de manos y dedos»: alcance, pulgar arriba e índice abajo, ninguna mano atraviesa la otra (tolerancia 4 mm) y orden desde el meñique |

Commits:
- `a59da21`: primera versión.
- `8505bb0`: empieza por el meñique y sin manos que se atraviesan.
- `caa10f8`: confirmados el giro para el pulgar y el final.

## 7. Para generarlo de nuevo (resumen para pasar a alguien)

> Animación 3D de un maniquí que se masajea las manos, vista desde sus ojos, por encima del hombro.
>
> **Primero la derecha masajea la izquierda.** La izquierda se abre con la palma hacia arriba y los dedos hacia el centro del cuerpo.
>
> 1. **Palma:** la derecha la sostiene por debajo y su pulgar hace 2 círculos en cada una de 5 zonas de la palma.
> 2. **Dedos:** dedo por dedo, **empezando por el meñique** (meñique, anular, medio, índice) y de la base a la punta. Cada falange se toma de costado, como una pinza: el pulgar arriba, el índice abajo y los demás dedos recogidos. Se hacen 3 círculos pequeños. El dedo que se masajea queda estirado y los otros se recogen un poco (poco con el medio y el anular).
> 3. **Pulgar, al final:** la mano izquierda gira la palma hacia abajo; el pulgar apunta a la derecha, que lo toma igual.
> 4. **Cambio de mano:** las manos se sueltan al frente y la izquierda masajea la derecha, igual y en espejo.
>
> **Final.** Las manos se sueltan a los costados. Ninguna mano atraviesa a la otra. Una lucecita rosada marca el punto que se masajea y un contador indica el dedo y la falange.
