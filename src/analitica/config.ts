import { esOld } from '../ui/ruta';

/**
 * Analítica de uso con PostHog (elegido por el usuario el 2026-11-13, tarjeta RE3WYM-32).
 *
 * Qué decide este archivo: si en este navegador se mide o no, y por qué. Se mide solo en el
 * dominio publicado, con la clave puesta, fuera de /old (la versión de trabajo) y si la persona
 * no pidió «no rastrear» ni lo desactivó en la página de privacidad.
 */

/** El único dominio en el que se mide (los envíos van por el proxy de Netlify, que no existe en local). */
export const DOMINIO = 'energia.genaropretill.com';

/**
 * Ruta del proxy de Netlify hacia PostHog (ver netlify.toml). Un nombre propio de la app: los
 * bloqueadores de anuncios reconocen /analytics, /tracking, /ingest o /posthog.
 */
export const RUTA_PROXY = '/pulso';

/** Lo que eligió la persona en este navegador: 'no' = no medir; 'forzar' = medir aunque no sea el dominio (para probar). */
export type Preferencia = 'no' | 'forzar' | null;
const CLAVE_PREFERENCIA = 'repaso-energetico:analitica';

export type Region = 'us' | 'eu';
export interface ConfigPostHog {
  /** La clave pública del proyecto (phc_…): viaja en el JavaScript, no es secreta. */
  clave: string;
  region: Region;
}

/** La configuración que se compila en la app (`VITE_POSTHOG_KEY` y `VITE_POSTHOG_REGION`, en .env.production). */
export function leerConfig(env: Record<string, unknown>): ConfigPostHog | null {
  const clave = String(env.VITE_POSTHOG_KEY ?? '').trim();
  if (!clave) return null;
  const region: Region = String(env.VITE_POSTHOG_REGION ?? '').trim().toLowerCase() === 'eu' ? 'eu' : 'us';
  return { clave, region };
}

/** Dónde se ven los datos (y de dónde carga la barra de PostHog para el mapa de calor). */
export const hostInterfaz = (r: Region) => (r === 'eu' ? 'https://eu.posthog.com' : 'https://us.posthog.com');

export interface Entorno {
  host: string;
  pathname: string;
  /** El navegador pide no rastrear (Do Not Track o Global Privacy Control). */
  noRastrear: boolean;
  /** La app está dentro de un marco (p. ej. el visor de mapas de calor de PostHog): no es una visita. */
  incrustada: boolean;
  preferencia: Preferencia;
}

export type Motivo = 'sin-clave' | 'excluido' | 'no-rastrear' | 'version-de-trabajo' | 'incrustada' | 'otro-dominio' | 'bloqueada';

/** Por qué no se mide en este navegador, o `null` si se mide. */
export function motivoParaNoMedir(config: ConfigPostHog | null, e: Entorno): Motivo | null {
  if (!config) return 'sin-clave';
  if (e.preferencia === 'no') return 'excluido';
  if (e.noRastrear) return 'no-rastrear';
  if (esOld(e.pathname)) return 'version-de-trabajo';
  if (e.incrustada) return 'incrustada';
  if (e.host !== DOMINIO && e.preferencia !== 'forzar') return 'otro-dominio';
  return null;
}

/** Cómo se lo cuenta la página de privacidad. */
export const MOTIVOS: Record<Motivo, string> = {
  'sin-clave': 'La medición todavía no está configurada.',
  excluido: 'Desactivaste la medición en este navegador.',
  'no-rastrear': 'Tu navegador pide no rastrear, y lo respetamos.',
  'version-de-trabajo': 'Esta es la versión de trabajo: no se mide.',
  incrustada: 'La app está dentro de otra página: no se mide.',
  'otro-dominio': 'Solo se mide en la app publicada.',
  bloqueada: 'No se pudo cargar la medición: sin conexión o la bloquea el navegador o una extensión.',
};

export function leerPreferencia(): Preferencia {
  try {
    const v = localStorage.getItem(CLAVE_PREFERENCIA);
    return v === 'no' || v === 'forzar' ? v : null;
  } catch {
    return null;
  }
}

export function guardarPreferencia(p: Preferencia) {
  try {
    if (p) localStorage.setItem(CLAVE_PREFERENCIA, p);
    else localStorage.removeItem(CLAVE_PREFERENCIA);
  } catch {
    /* sin almacenamiento: dura hasta recargar */
  }
}

export function entornoActual(): Entorno {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  const win = window as Window & { doNotTrack?: string };
  return {
    host: window.location.hostname,
    pathname: window.location.pathname,
    noRastrear: nav.doNotTrack === '1' || win.doNotTrack === '1' || nav.globalPrivacyControl === true,
    incrustada: (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })(),
    preferencia: leerPreferencia(),
  };
}
