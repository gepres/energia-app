# Respiraciones conscientes · ritmos y video del taller

> **Estado:** aprobado por el usuario el 2026-11-09. Hubo una corrección: la pausa es de 1 s, no de 3 s.
> Vale para toda la app: la página «Respiraciones conscientes» y los pasos de respiración de los ejercicios.
> Misma nota en Foundry: espacio energia-app → «Ejercicios uno por uno · comportamiento aprobado» → «Respiraciones conscientes · ritmos y video».

## 1. Lo que dijo el taller

- «Hay ritmos variados: 4-3-4, 3-3-3, 5-5-5» (inhalar · retener · exhalar).
- «La pausa es de 3 s para todos». Después lo corrigió: «que la pausa sea de 1 seg».
- «Y haces viendo y escuchando este video»: [«Ejercicio Energético uno - Pre Taller»](https://www.youtube.com/watch?v=wzBk2_A8_zc&t=318s), desde el minuto 5:18.

Respuestas a las preguntas:
- **Dónde:** se mejora la parte que decía «Ritmo 4 · 3 · 4 · 4», con estos datos.
- **Los ritmos:** se elige uno.
- **El video:** es una opción. Si el usuario quiere acompañar con el video, la interfaz se ajusta para verlo mientras respira.
- **La duración del paso** de un ejercicio:
  - sin video, una respiración de muestra al ritmo real;
  - con el video, todas las respiraciones (15 o 30).

## 2. Cómo quedó

**Ritmos.**
- Una respiración: inhalar, retener, exhalar y una pausa de 1 s.
- Duración: 12 s con 4-3-4, 10 s con 3-3-3 y 16 s con 5-5-5.
- El ritmo elegido y la opción del video valen para toda la app: la página y los ejercicios comparten las mismas opciones del reproductor.

**Página «Respiraciones conscientes»** (`#/respiracion`; el acceso de la portada se llama así).
- El título muestra el ritmo («Ritmo 4 · 3 · 4») y debajo dice «inhalar · retener · exhalar · pausa 1 s».
- Chips para elegir el ritmo y la meta: 15 respiraciones (liberar creencias) o 30 (equilibrar órganos).
- El círculo crece al inhalar, queda lleno al retener y se achica al exhalar; muestra los segundos que faltan y «Respiración n de 15». Al cambiar de ritmo se empieza de nuevo.
- **«Acompañar con el video»:** la página se ensancha. En escritorio, el video del taller queda al lado del círculo; en el teléfono, arriba. Empieza en 5:18 y tiene el enlace «Abrir en YouTube».

**Pasos de respiración de los ejercicios.** Son «Mano en el corazón» de «Liberación de creencias» (15) y «30 respiraciones» de «Equilibrar la energía de los órganos».
- En el panel aparecen el selector de ritmo y el botón «Acompañar con el video». Con el video activado, el video se ve arriba del panel.
- El anillo de la escena sigue el ritmo en tiempo real: «Inhala», «Retén», «Exhala» y «Pausa».
- **Sin video:** el paso muestra una respiración de muestra. El pie del anillo dice «× 15 · ritmo 4 · 3 · 4 · pausa 1 s».
- **Con video:** el paso dura todas las respiraciones y el anillo las cuenta («3 / 15 · …»). Por ejemplo, 15 × 12 s ≈ 3 min.
- Si se cambia el ritmo o el video en medio del paso, se sigue en el mismo segundo del paso.
- Las aclaraciones de los dos pasos registran los ritmos, la pausa de 1 s y el video.

## 3. Dónde está en el código

| Qué | Archivo |
|---|---|
| Ritmos, pausa y opciones `ritmo` y `video`; duración de un paso según las opciones (`durCon`, `durPaso`) | `src/secuencias/motor.ts` (`RITMOS`, `PAUSA_RESPIRACION`, `cicloRespiracion`, `Opciones`) |
| La respiración en la escena (anillo en tiempo real, una de muestra o todas) | `src/secuencias/comunes.ts` (`respirar`, `durRespirando`, `manoCorazonRespirando`) |
| Los dos pasos | `src/secuencias/liberar.ts`, `src/secuencias/organos.ts` |
| El reproductor y la línea de tiempo con duraciones según las opciones | `src/reproductor.ts`, `src/ui/LineaTiempo.tsx` |
| Selector de ritmo, botón y video | `src/ui/RespiracionPanel.tsx`, `src/ui/Visor.tsx` (`Paso.respiraciones`) |
| La página | `src/repaso/Respiracion.tsx` (`fasesDe`, `faseEn`) |
| El video | `VIDEO_RESPIRACION` en `src/contenido/ejercicios.ts` |
| Pruebas | Bloque «Respiraciones conscientes» de `src/secuencias/secuencias.test.ts` y `src/repaso/respiracion.test.ts` |

Commits: `095a013` (ritmos, selector y video) y `f318d11` (pausa de 1 s).
