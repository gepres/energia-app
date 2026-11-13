# Analítica de uso · PostHog

Para saber cómo se usa la app: qué ejercicios y rutinas se abren, hasta qué paso se llega, qué se toca
(mapa de calor) y desde dónde llega la gente. Tarjeta RE3WYM-32.

**Decidido por el usuario (2026-11-13):**

- **Solo PostHog.** Primero se pensó en PostHog con Matomo. Se descartó Matomo:
  - repite lo que PostHog ya trae: visitas, origen, país y dispositivo;
  - Matomo Cloud es de pago; instalarlo en un servidor propio requiere PHP y MySQL;
  - su mapa de calor es un plugin de pago.
- **Aviso informativo**, sin franja de aceptar o rechazar: una línea en el pie del inicio y la página
  `#/privacidad`, con lo que se mide y un botón para dejar de medir.

## Cómo funciona

| Archivo | Qué hace |
|---|---|
| `src/analitica/config.ts` | Decide si se mide y por qué no. |
| `src/analitica/eventos.ts` | Traduce los cambios del reproductor y de la ruta en eventos. Es lógica pura, con pruebas. |
| `src/analitica/registro.ts` | `registrar()` y `fijar()`: lo que usan los componentes. Si PostHog todavía no cargó, guarda en una cola. |
| `src/analitica/index.ts` | El arranque: escucha las rutas y el reproductor, y carga PostHog cuando la página ya pintó. |
| `src/ui/Privacidad.tsx` | La página `#/privacidad`. |

**Se mide solo si se cumple todo esto:**

- la app está en `energia.genaropretill.com`;
- `VITE_POSTHOG_KEY` está en `.env.production`;
- no es `/old`;
- el navegador no pide «no rastrear» (Do Not Track o GPC);
- la persona no lo desactivó en `#/privacidad`.

**Cómo se mide:**

- **Envíos:** pasan por el propio dominio, `/pulso/*`, con el proxy de `netlify.toml`, para que los
  bloqueadores de anuncios no los corten. El nombre `/pulso` es propio a propósito: `/analytics` o
  `/ingest` los bloquean.
- **Peso:** PostHog va en un archivo aparte, `posthog-*.js` (104 KB comprimido). Se carga después del
  evento `load` y no entra en la caché sin conexión.
- **Rutas:** la app navega con `#`, así que todas las pantallas comparten la ruta real `/`. Por eso
  cada visita y cada evento llevan una ruta virtual en `$pathname`, como `/ejercicio/cargar-ombligo`,
  `/rutina/completa` o `/privacidad`. Va sin el número de paso.
- **Privacidad:**
  - visitas anónimas (`person_profiles: 'identified_only'`; nunca se identifica a nadie);
  - sin cookies (`persistence: 'localStorage'`);
  - las grabaciones no muestran lo que se escribe (`maskAllInputs`), ni los nombres de las rutinas
    propias (clase `ph-sensitive`).
- **Escena 3D:** arrastrarla no cuenta como «clic muerto» ni «clic de rabia» (`ph-no-deadclick`,
  `ph-no-rageclick`). Las grabaciones no muestran la escena: PostHog podría grabar el lienzo, pero
  pide `preserveDrawingBuffer`, que en el celular cuesta rendimiento.

## Eventos

| Evento | Cuándo | Propiedades |
|---|---|---|
| `$pageview` | Cambio de pantalla (hash) | `pagina`, `$pathname` |
| `ejercicio_abierto` | Se abre un ejercicio | `ejercicio`, `ejercicio_titulo`, `pasos` |
| `ejercicio_paso` | Llega a un paso nuevo (desde el 2; si salta, cuenta el paso al que llega) | `paso`, `pasos` |
| `ejercicio_terminado` | Llega al final (si lo repite, cuenta otra vez) | `segundos` desde que lo abrió, `vez` |
| `camara_libre` | Gira o acerca la escena 3D (una vez por apertura) | `ejercicio` |
| `velocidad` · `voz` · `ritmo_respiracion` · `video_respiracion` | Cambia esa opción | el valor nuevo |
| `tema` | Cambia a claro u oscuro | `tema` |
| `rutina_iniciada` · `rutina_item` | Entra a una rutina, y cada ítem | `rutina` (completa o propia), `items`, `item` |
| `rutina_guardada` | Guarda una rutina propia | `nueva`, `items`, `ejercicios`, `respiraciones` |
| `app_instalada` | Instala la PWA | — |

**Propiedades de todos los eventos:** `instalada` (si abre la PWA instalada), `tema` y, dentro de una
rutina, `en_rutina`.

**Lo que PostHog registra por su cuenta:** clics (`$autocapture`), mapa de calor (`$$heatmap`), salida de
la página (`$pageleave`) y, si están activadas en el proyecto, las grabaciones.

## Puesta en marcha (una vez)

1. Crear el proyecto en posthog.com. Anotar la región: US o EU.
2. Copiar el *Project token* (`phc_…`) en `VITE_POSTHOG_KEY` de `.env.production`. Es público y viaja
   en el JavaScript.
3. Si la región es EU: `VITE_POSTHOG_REGION=eu`, y cambiar `us` por `eu` en las tres reglas `/pulso`
   de `netlify.toml`.
4. En la configuración del proyecto de PostHog:
   - activar la grabación de sesiones (*Session replay*). Hecho el 2026-11-13;
   - en *Heatmaps* → *Heatmap capture URLs*, *Only listed URLs*, poner `https://energia.genaropretill.com/*`.
     El plan gratuito acepta hasta 3 URLs, con comodín. Sin eso, PostHog captura solo las páginas
     de los 3 mapas guardados más antiguos;
   - en *Project settings* → *Authorized URLs*, agregar `https://energia.genaropretill.com`.
5. Publicar (push a main).
6. Verificar que `https://energia.genaropretill.com/pulso/static/array.js` responde 200 y que llegan
   eventos en *Activity*.

## Dónde mirar

- **Web analytics:** visitas, origen, países, dispositivos y pantallas (por la ruta virtual).
- **Mapa de calor:** en la página *Heatmaps* de PostHog, que es gratis. En *Display URL* va la pantalla,
  por ejemplo `https://energia.genaropretill.com/#/ejercicio/cargar-ombligo`. Hay vista de calor,
  de scroll y de clics.
  - Esa página carga la app en un iframe. Por eso `netlify.toml` permite el marco solo a
    `https://us.posthog.com` (`frame-ancestors`, en lugar de `X-Frame-Options`).
  - Dentro de un marco la app no mide (motivo `incrustada`), así que revisar el mapa no suma visitas.
  - Verlo desde la barra de PostHog (*Toolbar*) requiere el plan pay-as-you-go.
- **Grabaciones:** *Session replay*.
- **Embudos:** en *Product analytics* → *Funnel*, armar `ejercicio_abierto` → `ejercicio_paso` → `ejercicio_terminado`,
  desglosado por `ejercicio`. Muestra dónde se abandona cada ejercicio.

## Probar en local

En local no se mide, porque `/pulso` existe solo en Netlify. Para ver qué se enviaría:

1. Compilar con una clave de prueba: `VITE_POSTHOG_KEY=phc_prueba`.
2. Servir el build con `vite preview`.
3. En el navegador, guardar `repaso-energetico:analitica` = `forzar` en `localStorage`, interceptar
   `/pulso/**` y recargar.

Hay dos detalles a tener en cuenta:

- PostHog descarta los navegadores automáticos (por `HeadlessChrome` en el user agent).
- PostHog marca a quien visita desde `localhost` como usuario interno o de prueba
  (`$internal_or_test_user`).

`window.__repaso.analitica()` dice si se está midiendo y, si no, por qué.
