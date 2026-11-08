# 07 · Cargar las ingles (cruzadas, 15 por cada mano)

> **Estado:** aprobado por el usuario el 2026-11-08, revisándolo uno por uno.
> Es un ejercicio nuevo de la revisión «uno por uno», descrito en el taller; no tiene versión de referencia.
> Misma nota en Foundry: espacio energia-app → «Ejercicios uno por uno · comportamiento aprobado» → «07 · Cargar las ingles».

## 1. Lo que dijo el taller

Pedido inicial: «El siguiente ejercicio va a ser parecido a "Cargar el ombligo", pero en lugar de llevar las esferas de energía al ombligo lo hace así: **mano derecha a la ingle izquierda y mano izquierda a la ingle derecha**, colocando las esferas de energía en esas partes.»

Respuestas a las preguntas:
- Las manos van **intercaladas, 15 por mano**, como en «Cargar el ombligo».
- Nombre: **«Cargar las ingles»**.

Correcciones de la revisión (en orden):
1. **Espalda recta:** «el cuerpo se inclina un poco al frente al poner las esferas de energía; corrige eso, y que la espalda esté recta al colocar las esferas en las ingles».
   - El torso ya no se inclina en ningún momento.
   - Para llegar a la ingle del otro lado, el hombro de esa mano se adelanta y el torso gira un poco hacia esa ingle.
2. **Hombros sin pliegues:** «la animación de los hombros, cómo se doblan, no se ve bien; busca una mejor forma de hacer la animación».
   - Antes, el hombro adelantado desplazaba en bloque una zona del torso, y quedaban un pliegue vertical en el pecho y un escalón en la espalda.
   - Ahora la clavícula gira hacia adelante desde el esternón, y la piel la acompaña cada vez menos hacia el centro, sin cortes.
3. **Las dos ingles iguales:** «cuando mando la energía a la ingle derecha y termina, la esfera de la ingle izquierda se enciende más».
   - Las cargas quietas de las ingles ya no se llevan la luz que alumbra el cuerpo: la lleva solo la esfera que viaja en la mano.

## 2. Textos de la app

**Ejercicio:** «Cargar las ingles» · cruzadas, 15 por cada mano · pista «Uno por uno» · color tierra.

**Resumen:** «Como "Cargar el ombligo": brazos bien estirados al frente, tomando la energía de dos barras verticales; las manos, intercaladas, llevan lentamente una esfera cada vez, pero cruzadas: la mano derecha a la ingle izquierda y la izquierda a la ingle derecha. 15 por cada mano.»

| Paso | Texto | Aclaración / lectura |
|---|---|---|
| 1 · Brazos al frente | «Estirar bien los brazos al frente, a la altura de los hombros (90°), y agarrar la energía que está a la altura de las manos, como barras de energía verticales.» | Aclaración: «Descrito en el taller: como en "Cargar el ombligo".» |
| 2 · Cargas cruzadas · 15 por mano | «Después de un momento, las manos se dirigen lentamente a las ingles llevando una esfera de energía, cruzadas: la mano derecha a la ingle izquierda y la izquierda a la ingle derecha, colocando la esfera en cada una. Intercaladas: derecha, izquierda, derecha… 15 por cada mano.» Cantidad: **15 por cada mano (30 en total)**. | Aclaración: «Descrito en el taller: parecido a "Cargar el ombligo", pero la mano derecha va a la ingle izquierda y la izquierda a la ingle derecha, colocando las esferas en esas partes. Elegido en la revisión: intercaladas, 15 por mano.» Lectura: «Empieza la derecha. La espalda queda recta: para llegar a la ingle del otro lado, el hombro de esa mano se adelanta y el torso gira un poco hacia esa ingle mientras la mano lleva la esfera. Cada esfera se acumula en su ingle.» |

## 3. Coreografía

Duración total a 1×: **100,3 s**. El paso 1 dura 8 s y el paso 2, 92,3 s; los tiempos son los de «Cargar el ombligo».

### Paso 1 · Brazos al frente (8 s)

Igual que el paso 1 de «Cargar el ombligo». `t` es el avance del paso, de 0 a 1.

| t | Qué pasa |
|---|---|
| 0 – 0,40 | La cámara va del plano general al encuadre del ejercicio. |
| 0,05 – 0,40 | Aparecen las dos barras. |
| 0,25 – 0,60 | La figura levanta los brazos bien estirados y **cierra el puño sobre cada barra**, con el pulgar arriba. |
| 0,58 – 1 | Un flujo dorado baja desde lo alto de cada barra (de 1,72 m a 1,50 m) hasta la mano. |
| 0,62 – 0,95 | Se junta una esferita de energía (radio 1,6 cm) en la palma de cada mano. |
| 0,60 – 1 | **Las dos ingles** se encienden suave, hasta el 25 %. |
| 0,30 – 0,97 | Aviso: «Brazos bien estirados, a la altura de los hombros». |

### Paso 2 · Cargas cruzadas (92,3 s)

**Ritmo** (el mismo de «Cargar el ombligo»)
- Cada carga de una mano es un ciclo de **3,4 s**.
- La mano siguiente arranca cuando la anterior empieza a volver: a 0,86 de su ciclo.
- Duración: 0,6 s de espera + 25,94 ciclos × 3,4 s + 3,5 s de cierre = **92,3 s**.
- **Empieza la derecha.** Los ciclos pares son de la derecha y los impares de la izquierda.
- Mientras una mano carga, la otra espera agarrando su barra con el brazo estirado.

**Ciclo de una mano** (`u` es el avance del ciclo, de 0 a 1)

| u | La mano | El torso y los hombros | La esfera |
|---|---|---|---|
| 0 – 0,18 | Agarra la barra con el brazo estirado. Los dedos aprietan un instante. | Derecho, de frente. | La barra brilla más y baja un flujo dorado a la mano. |
| 0,18 – 0,78 | Lleva la energía **despacio**, en arco: **baja por delante y después cruza** hacia la ingle del otro lado. La palma gira: hacia adentro → hacia arriba → hacia el cuerpo. Los dedos sueltan rápido, se ahuecan y se abren al llegar. | Entre u 0,15 y 0,55, **el hombro de esa mano se adelanta** (la clavícula gira) y **el torso gira 11,5° hacia esa ingle**. La espalda sigue recta. El hombro de la mano que espera se adelanta un poco (40 %) para seguir en su barra. | La esfera **nace en la palma** entre u 0,17 y 0,32 (radio hasta 4 cm, con un leve rebote) y viaja **en el hueco de la palma**. **Solo esta esfera lleva la luz** que alumbra el cuerpo. |
| 0,78 – 0,86 | Entrega: empuja 2,5 cm hacia la ingle, con la palma hacia el cuerpo y los dedos hacia abajo. | Quietos, adelantados y girados. | La esfera pasa de la palma a la ingle y se encoge al 40 %; la luz se apaga en esa misma ingle. |
| 0,82 – 1 | — | — | Pulso dorado en esa ingle. **Suma 1 al contador.** |
| 0,86 – 1 | Vuelve abierta a su barra, por el mismo arco, y cierra el puño al final. | El torso y los hombros vuelven al frente. | — |

La cabeza se inclina un poco (0,3 rad) mirando hacia las ingles mientras dura la carga.

**Carga acumulada**
- **En cada ingle** crece una esfera dorada propia, con las cargas de la mano que va a ella: radio 1,6 cm + 2,4 cm × (cargas / 15). Al final mide 4 cm.
  - En la ingle izquierda, las de la mano derecha.
  - En la ingle derecha, las de la mano izquierda.
- Su brillo sube de 0,75 a 1,2, y cada ingle se enciende del 25 % al 100 %.
- Las cargas quietas **no se llevan la luz** que alumbra el cuerpo. Así ninguna ingle se ve más encendida que la otra.

**Contador:** «n / 30 · derecha n · izquierda n».

**Avisos**
- «La mano derecha lleva la esfera a la ingle izquierda».
- «La mano izquierda lleva la esfera a la ingle derecha».

**Final**
- Aviso: «Carga completa: 15 por mano, en cada ingle».
- La figura vuelve a una postura serena.
- Las barras se desvanecen en 3,5 s.

## 4. Medidas

Unidades en metros. La figura mide 1,715 m y mira a +Z; su derecha está en −X. Cuando hay dos valores (∓), el primero es de la derecha y el segundo de la izquierda.

- **Barras, puño y muñeca al agarrar:** iguales que en «Cargar el ombligo». La muñeca va en (∓0,182; 1,41; 0,525).
- **Ingles**
  - Puntos de carga: (∓0,075; 0,90; 0,125), delante del pliegue entre el vientre y el muslo. La piel está a z ≈ 0,07.
  - Centros de la app (`ingleD` / `ingleI`): (∓0,075; 0,90; 0,07).
- **Entrega** (mano derecha en la ingle izquierda; la izquierda, en espejo)
  - El hueco de la palma queda 4,5 cm delante del punto de carga: (0,075; 0,90; 0,17). La esfera queda entre la palma y la ingle.
  - Muñeca: (0,049; 0,950; 0,180). Palma hacia el cuerpo (0; 0; −1).
  - Dedos hacia abajo y hacia el costado de esa ingle: (0,47; −0,88; 0). Cierre 0,10.
  - Pista del codo: afuera, abajo y adelante, (∓0,6; −0,7; 0,4) normalizada. El brazo cruza por delante del vientre.
- **Arco de ida y vuelta:** Bézier cuadrática con punto de control en (∓0,10; 1,05; 0,50).
- **Espalda recta**
  - Inclinación: 0 en todo el ejercicio.
  - Giro del torso: 0,2 rad (11,5°) alrededor de la vertical de la cintura (y = 1,02), con una mezcla de ±4 cm. Gira hacia la ingle a la que va la mano: hacia la izquierda con la derecha y al revés.
  - El cuello y la cabeza giran con el torso.
- **Hombro adelantado (clavícula)**
  - La clavícula gira hacia adelante alrededor de su unión con el esternón: un eje vertical en (∓0,02; z 0,05).
  - Giro: hasta 0,55 rad (31,5°) en la mano que cruza y 40 % de eso en la que espera.
  - El hombro derecho pasa de (−0,182; 1,415; −0,010) a (−0,189; 1,415; 0,084): avanza 9,4 cm en arco y no va hacia el centro.
  - La piel gira con la clavícula con un peso suave: `pasoSuave(0; 0,17; |x|) × pasoSuave(1,05; 1,38; y)`. Gira entera en el hombro y cada vez menos hacia el esternón, la columna y las costillas de abajo.
- **Holguras medidas en el ciclo**
  - El brazo que cruza queda +0,4 mm fuera del torso, el cuello y la cabeza (tope de la prueba: −5 mm) y +40 mm fuera de los muslos.
  - El IK llega siempre (error de 0 mm): la mano que espera no se despega de su barra.
- **Pliegue de la piel:** el ángulo entre normales vecinas crece como máximo 9–10° respecto del reposo. Desplazar la zona en bloque daba 35–40°.
- **Cámara**
  - Paso 1: centro (0; 1,12; 0,32), alto visible 1,85 m, ángulo 0,62 rad, elevación 0,14.
  - Paso 2: centro (0; 1,10; 0,30), alto visible 1,70 m, ángulo 0,62 rad, elevación 0,12.
  - En pantallas verticales se aleja sola.

## 5. Supuestos aprobados en la revisión

- Empieza la derecha, como en «Cargar el ombligo».
- Para llegar a la ingle del otro lado con la espalda recta: el hombro de esa mano se adelanta (la clavícula gira desde el esternón) y el torso gira un poco (11,5°) hacia esa ingle. Inclinar el torso se descartó.
- La mano que espera en su barra adelanta un poco su hombro (40 %): con el giro del torso, si no, se despegaría de la barra.
- La esfera se entrega delante del pliegue de la ingle, con la palma hacia el cuerpo y los dedos hacia abajo.
- Cada ingle acumula sus 15 cargas en una esfera propia.
- La cabeza mira hacia las ingles mientras dura la carga.
- Las cargas quietas no llevan la luz que alumbra el cuerpo: la lleva solo la esfera que viaja.

## 6. Dónde está en el código

| Qué | Archivo |
|---|---|
| Coreografía (2 pasos, cargas acumuladas, avisos, contador, cámaras) | `src/secuencias/cargarIngles.ts` (`cargarIngles`, `cargaIngle`, `DESTINO`, `CENTRO`, `ACUMULA`) |
| Ritmo, ciclos y conteo de entregas (compartidos con el 01) | `src/secuencias/cargarOmbligo.ts` (`POR_MANO`, `TOTAL`, `SEG_CICLO`, `DESFASE`, `CICLOS`, `faseMano`, `entregas`) |
| Pose del gesto: entrega cruzada, arco, giro y hombros | `src/escena/poses.ts` (`poseCargaIngles`, `entregaIngle`, `arcoIngle`, `INGLE_DER`, `INGLE_IZQ`, `GIRAR_INGLES`, `ADELANTAR_ESPERA`, `giroDeMano`; `cicloMano` con destino y arco propios) |
| Giro del torso y hombro adelantado (esqueleto) | `src/escena/cuerpo.ts` (`girar`, `adelantarD`/`adelantarI`, `CLAVICULA`, `adelantarHombro`, `transformarPunto`; puntos `ingleD`/`ingleI`) |
| La piel del torso con el giro y la clavícula | `src/escena/cuerpoGeo.ts` (`PESO_HOMBRO`, `crearTorso().deformar`) |
| Suavizado del giro y de los hombros; cuello que gira | `src/escena/Maniqui.tsx` |
| Anclas y energía que siguen al torso girado | `src/escena/anclas.ts`, `src/escena/Energia.tsx` |
| Textos | `src/contenido/ejercicios.ts`, id `cargar-ingles` |
| Pruebas | `src/secuencias/secuencias.test.ts`, bloque «Cargar las ingles (descrito en el taller)» (ver abajo) |

Pruebas del bloque:
- Alterna las manos, empezando por la derecha, hasta 15 por cada una.
- Cada mano lleva su esfera a la ingle del otro lado. La palma queda a menos de 7 cm y la esfera a menos de 5 cm de esa ingle, mientras la otra mano espera en su barra.
- Las cargas se acumulan en cada ingle (radio 4 cm al final) y las dos ingles se encienden.
- La luz que alumbra el cuerpo va con la esfera que viaja, nunca con una ingle, ni durante el ciclo ni al final.
- Espalda recta: nunca se inclina. El hombro que cruza se adelanta del todo y el otro menos; el torso gira ±0,2 en las entregas y vuelve a 0 al final; los brazos llegan siempre (IK con menos de 3 mm de error).
- El hombro se adelanta en arco (más de 7 cm, sin ir hacia el centro) y la piel no se arruga: el ángulo entre normales vecinas crece menos de 15°.
- El brazo que cruza no se mete en el torso, el cuello ni la cabeza (malla real; tolerancia 5 mm), ni en los muslos, y las manos no se tocan.

Commits:
- `0addcdb`: primera versión.
- `44e2516`: espalda recta, sin inclinar el torso.
- `d944f3a`: el hombro se adelanta girando la clavícula, sin pliegues.
- `38d555f`: la luz ya no salta a la ingle izquierda.

## 7. Para generarlo de nuevo (resumen para pasar a alguien)

> Animación 3D de un maniquí de pie, con dos barras de energía verticales al frente, a la altura de las manos.
>
> 1. **Barras:** la figura estira bien los brazos al frente, a la altura de los hombros, y cierra el puño sobre cada barra. Baja energía dorada a cada mano y las dos ingles se encienden suave.
> 2. **Cargas cruzadas e intercaladas:** 15 por mano, empezando por la derecha. Cada mano toma energía de su barra; nace una esfera en la palma y la mano la lleva lentamente, en arco por delante, **a la ingle del otro lado**: la derecha a la ingle izquierda y la izquierda a la ingle derecha. La coloca con la palma hacia el cuerpo y vuelve a su barra. La siguiente mano arranca cuando la anterior empieza a volver.
>    - **Con la espalda recta:** para llegar, el hombro de esa mano se adelanta (la clavícula gira desde el esternón, sin pliegues en el pecho ni en la espalda) y el torso gira apenas (11,5°) hacia esa ingle. La mano que espera sigue agarrando su barra.
>    - **En cada ingle** se acumula una esfera dorada que crece con sus cargas. Las dos quedan igual de encendidas: solo la esfera que viaja en la mano alumbra el cuerpo.
>    - **Al final:** «Carga completa: 15 por mano, en cada ingle». La figura vuelve a una postura serena y las barras se desvanecen.
