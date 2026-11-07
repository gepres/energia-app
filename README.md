# Repaso energético

Repaso en 3D, para web y móvil, de los ejercicios del taller **Manejo de energía · set 2026**.
Cada ejercicio se ve paso a paso con un maniquí, esferas de energía, rosas de luz y el cubo;
se puede pausar, arrastrar la línea de tiempo y girar la cámara. Después, un repaso de memoria
pregunta el orden de los pasos, las frases exactas, las cantidades y la tabla tierra/cielo.

Fuentes (en esta carpeta, sin modificar):

- `MANEJO DE ENERGÍA SET 2026.docx` → ejercicios 1–7.
- `notas-1.txt` → ejercicios 8–12 (carga, sensibilización de manos, activación de centros,
  recorrido por chakras, sellado final).

Lo que los apuntes no precisan **no se inventa**: se marca como duda y la animación lo dibuja como
«lectura ilustrativa» (en la app: `#/dudas` y en cada paso afectado). Cuando el taller aclara una,
pasa a `aclaracion` del paso y se muestra como «Confirmado en el taller». Ya confirmadas: 15 cargas
por lado en el ombligo, el gesto de sellar desde el cielo (la mano baja como un velo) y la columna
izquierda (2 barras de energía frente a las manos estiradas).

## Usar

```bash
npm install
npm run dev        # http://localhost:5173 (con --host para abrirlo desde el móvil en la misma red)
npm test           # 58 tests: contenido, coreografías y repaso
npm run build      # dist/ estático, instalable y offline (PWA)
npm run preview
```

En el móvil: abrir la URL publicada y «Añadir a pantalla de inicio». Funciona sin conexión
después de la primera visita (requiere https; por la IP local de la red se ve, pero no se instala).

Publicar: `dist/` es estático y usa `base: './'`, así que sirve en cualquier hosting o
subcarpeta. `netlify.toml` ya trae el build y las cabeceras de caché del service worker.

Atajos en el visor: espacio (reproducir/pausar), ← → (paso anterior/siguiente), Esc (volver).
En el repaso: 1–4 para elegir opción.

## Cómo está hecho

| Pieza | Dónde | Idea |
|---|---|---|
| Contenido | `src/contenido/ejercicios.ts` | Ejercicios, pasos, frases literales, cantidades, órganos y dudas. Única fuente de verdad del texto. |
| Coreografía | `src/secuencias/*.ts` | Por ejercicio, un tiempo por paso: `aplicar(estado, t)`. El estado es **función pura** de (paso, progreso), por eso el scrub va adelante y atrás sin errores. |
| Motor | `src/secuencias/motor.ts` | `evaluar()`, `posar()`, `toma()`, `encuadre()` (cámara por altura visible). |
| Maniquí | `src/escena/cuerpo.ts`, `Maniqui.tsx` | Figura procedural con IK de dos huesos: las manos llegan exactamente al corazón, al órgano o al piso. ~12 draw calls. |
| Energía | `src/escena/Energia.tsx`, `shaders.ts` | Esferas (núcleo HDR + Fresnel + ruido), flujos de partículas por curvas, pulsos, mantos, órganos y centros. |
| Objetos | `src/escena/Objetos.tsx` | Rosa de luz, bolsa, tacho, foto/dibujo, recipiente, llama, cubo y haces de cielo/tierra. |
| Escenario | `src/escena/Escenario.tsx` | Canvas, luces, piso con rumbos, bloom + AgX, calidad adaptativa (DPR, MSAA/SMAA, partículas). |
| Repaso | `src/repaso/` | Preguntas generadas del contenido (`preguntas.ts`) y respiración guiada 4·3·4·4. |

Decisiones técnicas e investigación (hecha con Codex): [docs/03-investigacion-tecnica.md](docs/03-investigacion-tecnica.md).

### Añadir o corregir un ejercicio

1. Texto: editar `src/contenido/ejercicios.ts` (si una duda se resuelve, quitarla de `DUDAS` y del paso).
2. Animación: el archivo de `src/secuencias/` del ejercicio tiene un bloque por paso, en el mismo orden.
3. `npm test` comprueba que cada paso tiene su animación, que no hay valores inválidos en ningún
   instante y que el scrub es determinista.

## Accesibilidad y rendimiento

- `prefers-reduced-motion`: sin reproducción automática, cámara estable y frases completas.
- Controles con teclado y foco visible; textos en la interfaz, no dentro del 3D.
- Calidad adaptativa: en móvil arranca en calidad media (DPR ≤ 1,5, sin MSAA) y baja sola si el
  dispositivo no sostiene los fotogramas.

Representación simbólica de las prácticas del taller; no describe efectos físicos.
