import manifiesto from './voz.json';
import type { Ejercicio } from './tipos';

/**
 * Narración con voz de los pasos (ElevenLabs). Los audios los genera `npm run voz -- --generar`
 * (scripts/voz/generar.mjs) en public/voz/<ejercicio>/<paso>.mp3, y su duración queda en
 * voz.json. La voz dice el título y el texto de cada paso, tal como están en la app.
 */
export interface ClipVoz {
  /** Ruta del audio dentro de public/ (sin barra inicial). */
  audio: string;
  /** Lo que dura la voz, en segundos. */
  segundos: number | null;
  firma: string;
  caracteres: number;
}

const CLIPS = manifiesto as Record<string, ClipVoz>;

/** Pausa después de la voz antes de pasar al paso siguiente (s). */
export const RESPIRO_VOZ = 0.6;

/** El audio de un paso, si ya se generó. */
export function clipVoz(ejercicioId: string, pasoId: string | undefined): ClipVoz | null {
  if (!pasoId) return null;
  const c = CLIPS[`${ejercicioId}/${pasoId}`];
  return c && c.segundos ? c : null;
}

/** Si el ejercicio tiene narración en todos sus pasos. */
export function tieneVoz(ej: Ejercicio): boolean {
  return ej.pasos.length > 0 && ej.pasos.every((p) => clipVoz(ej.id, p.id));
}

/** Preferencia de la persona (se recuerda en el navegador). */
const CLAVE = 'repaso-energetico:voz';

export function leerPreferenciaVoz(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export function guardarPreferenciaVoz(v: boolean) {
  try {
    localStorage.setItem(CLAVE, v ? '1' : '0');
  } catch {
    // Sin almacenamiento (modo privado): la preferencia dura lo que la visita.
  }
}
