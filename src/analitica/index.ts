import type { PostHog } from 'posthog-js';
import { type EstadoReproductor, useReproductor } from '../reproductor';
import { buscarRutina } from '../rutinas/rutinas';
import { type Ruta, leerRuta } from '../ui/ruta';
import {
  type ConfigPostHog,
  type Motivo,
  RUTA_PROXY,
  entornoActual,
  guardarPreferencia,
  hostInterfaz,
  leerConfig,
  motivoParaNoMedir,
} from './config';
import { SeguimientoReproductor, type VistaReproductor, contextoDeRuta, eventosDeRuta, paginaDeRuta } from './eventos';
import { activar, conectar, desactivar, fijar, midiendo, posthogCargado, registrar } from './registro';

/**
 * Arranque de la analítica: decide si se mide, escucha las rutas y el reproductor (sin tocar los
 * componentes) y carga PostHog cuando la página ya pintó.
 */

let motivo: Motivo | null = 'sin-clave';
let escuchando = false;
let ruta: Ruta = leerRuta();

const vista = (s: EstadoReproductor): VistaReproductor => ({
  ejercicioId: s.ejercicioId,
  pasos: s.secuencia?.pasos.length ?? 0,
  paso: s.paso,
  tiempo: s.tiempo,
  total: s.total,
  camaraLibre: s.camaraLibre,
  velocidad: s.velocidad,
  voz: s.opciones.voz,
  ritmo: s.opciones.ritmo,
  video: s.opciones.video,
});

const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Propiedades de todos los eventos propios: la pantalla (ruta virtual) y si es parte de una rutina. */
const contexto = () => ({ $pathname: paginaDeRuta(ruta).ruta, ...contextoDeRuta(ruta) });

function visitar(previa: Ruta | null) {
  const p = paginaDeRuta(ruta);
  // También para lo que registra PostHog solo (clics, mapa de calor, salida de la página).
  fijar({ $pathname: p.ruta });
  registrar('$pageview', { pagina: p.titulo, $current_url: window.location.href });
  for (const e of eventosDeRuta(previa, ruta, (id) => buscarRutina(id)?.items.length)) registrar(e.nombre, e.props);
}

function escuchar() {
  if (escuchando) return;
  escuchando = true;
  window.addEventListener('hashchange', () => {
    const previa = ruta;
    ruta = leerRuta();
    visitar(previa);
  });
  const seguimiento = new SeguimientoReproductor();
  let previa = vista(useReproductor.getState());
  useReproductor.subscribe((s) => {
    const v = vista(s);
    for (const e of seguimiento.cambio(v, previa, Date.now())) registrar(e.nombre, e.props);
    previa = v;
  });
  window.addEventListener('appinstalled', () => {
    registrar('app_instalada');
    fijar({ instalada: true });
  });
}

async function cargarPostHog(config: ConfigPostHog) {
  const yaCargado = posthogCargado();
  if (yaCargado) {
    yaCargado.opt_in_capturing();
    return;
  }
  let posthog: PostHog;
  try {
    posthog = (await import('posthog-js')).default;
  } catch {
    desactivar(); // sin conexión o bloqueado: no se insiste
    motivo = 'bloqueada';
    return;
  }
  if (!midiendo()) return; // la persona lo desactivó mientras cargaba
  posthog.init(config.clave, {
    api_host: RUTA_PROXY,
    ui_host: hostInterfaz(config.region),
    defaults: '2026-08-30',
    // Visitas anónimas: sin perfiles de personas (nunca se identifica a nadie).
    person_profiles: 'identified_only',
    // Un identificador al azar en el almacenamiento del navegador; sin cookies.
    persistence: 'localStorage',
    // La app navega con «#»: las visitas las registra visitar(), con su ruta virtual.
    capture_pageview: false,
    capture_pageleave: true,
    capture_heatmaps: true,
    respect_dnt: true,
    // En las grabaciones no se ve lo que se escribe ni los nombres de las rutinas propias.
    session_recording: { maskAllInputs: true, maskTextSelector: '.ph-sensitive' },
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
  });
  // Lo que manda es la preferencia de la app: si alguna vez se desactivó y ahora se permite, se reactiva.
  if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
  conectar(posthog);
}

/** Se llama una vez al arrancar (main.tsx), y otra si la persona vuelve a permitir la medición. */
export function iniciarAnalitica() {
  const config = leerConfig(import.meta.env);
  motivo = motivoParaNoMedir(config, entornoActual());
  if (motivo || !config) return;
  activar(contexto);
  fijar({ instalada: instalada(), tema: document.documentElement.dataset.tema ?? '' });
  escuchar();
  ruta = leerRuta();
  visitar(null);
  const empezar = () => void cargarPostHog(config);
  if (document.readyState === 'complete') setTimeout(empezar, 0);
  else window.addEventListener('load', empezar, { once: true });
}

/** Desde la página de privacidad: no medir más en este navegador. */
export function dejarDeMedir() {
  guardarPreferencia('no');
  const ph = posthogCargado();
  if (ph) {
    ph.stopSessionRecording();
    ph.opt_out_capturing();
  }
  desactivar();
  motivo = 'excluido';
}

/** Desde la página de privacidad: volver a permitir la medición. */
export function volverAMedir() {
  guardarPreferencia(null);
  iniciarAnalitica();
}

export const estadoAnalitica = () => ({ midiendo: midiendo(), motivo });
