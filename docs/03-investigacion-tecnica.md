# Investigación técnica (Codex · 7 nov 2026)

Resumen de la investigación hecha con Codex antes de construir. Versiones y licencias verificadas en npm/GitHub; los presupuestos de rendimiento son recomendaciones iniciales, no medidas en dispositivo.

## 1. Stack

| Paquete | Versión | Licencia | Nota |
|---|---|---|---|
| three | 0.187.0 (fijada) | MIT | `postprocessing 6.39.6` admite three ≥0.168 y **<0.188**: no actualizar three sin revisar. |
| @react-three/fiber | 9.8.2 | MIT | Fiber 9 ↔ React 19. |
| @react-three/drei | 10.7.9 | MIT | |
| @react-three/postprocessing | 3.2.2 | MIT | Exige Fiber ≥9.7. |
| postprocessing | 6.39.6 | Zlib | |
| zustand | 5.1.0 | MIT | |
| vite / vite-plugin-pwa | 8.3.6 / 2.0.0 | MIT | Vite exige Node 20.19+ o 22.12+. |

**Coreografía:** se descartó Theatre.js (su adaptador R3F declara Fiber 8). GSAP es gratuito, pero no hace falta: el estado de la escena es una función pura `evaluar(ejercicio, paso, progreso)`; mismo progreso → misma imagen, sin importar el recorrido previo. Eso permite el *scrub* adelante y atrás.

## 2. Figura humana

- **mannequin.js**: GPL-3.0, crea su propio renderer y bucle; no encaja en R3F sin adaptarlo. **Descartado.**
- **Quaternius Universal Base Characters**: CC0 y con rig; alternativa si se quisiera una silueta orgánica continua.
- **Elegido: maniquí procedural propio.** Articulaciones calculadas con IK de dos huesos (las manos llegan exactamente al corazón, al órgano o al piso) y segmentos ahusados de longitud fija. Los contactos (mano-pecho, pies-suelo) se resuelven por restricción, no interpolando ángulos.

## 3. Acabado visual

- Esferas: núcleo HDR + borde Fresnel + ruido suave; `Bloom` con umbral ≈1 y emisivos >1 (más barato que `SelectiveBloom`).
- Partículas: `Points` evaluados sobre curvas con semilla fija (no integrar velocidad por fotograma). `Sparkles` y `Trail` de drei no son deterministas: solo para ambiente decorativo.
- Un único tone mapping al final del composer (AgX); el renderer sin tone mapping.
- `ContactShadows` es caro con un cuerpo animado → sombra de contacto falsa (decal radial que sigue la pelvis).
- `MeshTransmissionMaterial` evitado (otra pasada de render).

## 4. Rendimiento móvil y accesibilidad

- DPR 1–1,5 en móvil, ≤2 en escritorio; objetivo < 80 draw calls.
- Canvas sin antialias; MSAA del composer solo en calidad alta; degradación con `PerformanceMonitor` (DPR → partículas → bloom).
- No hay evidencia de que WebGL2 esté roto en iOS 18/26 (los fallos citados están corregidos).
- `prefers-reduced-motion`: cámara estable, sin reproducción automática ni pulsos decorativos; los pasos y el scrub siguen disponibles.

## 5. PWA

`generateSW`, recursos locales (fuentes con @fontsource, sin CDN) y `maximumFileSizeToCacheInBytes` holgado para el chunk de three. `base: './'` para poder publicarla en un subdirectorio.

## 6. Referencias

- Wawa Sensei – r3f-scrolling-animation-tutorial (escenas por niveles + UI sincronizada).
- Codrops Camera Fly-through (composición de cámara).
- drcmda/the-substance (tratamiento visual con shaders).
