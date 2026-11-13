import { buscarEjercicio } from '../contenido/ejercicios';
import { RUTINA_POR_DEFECTO } from '../rutinas/rutinas';
import type { Ruta } from '../ui/ruta';

/**
 * Los eventos propios de la app, deducidos del reproductor y de la ruta. Es lógica pura: no
 * sabe de PostHog (eso está en registro.ts) y se prueba sin navegador.
 *
 * Eventos:
 * - ejercicio_abierto · ejercicio_paso (cada paso nuevo al que se llega, desde el 2) · ejercicio_terminado
 * - camara_libre (giró o acercó la escena 3D) · velocidad · voz · ritmo_respiracion · video_respiracion
 * - rutina_iniciada · rutina_item · rutina_guardada · tema · app_instalada
 */

export type Valor = string | number | boolean;
export type Props = Record<string, Valor>;
export interface Evento {
  nombre: string;
  props: Props;
}

/** Lo que la analítica mira del reproductor. */
export interface VistaReproductor {
  ejercicioId: string | null;
  pasos: number;
  /** Paso actual, desde 0. */
  paso: number;
  tiempo: number;
  total: number;
  camaraLibre: boolean;
  velocidad: number;
  voz: boolean;
  ritmo: string;
  video: boolean;
}

const FIN = 1e-3;

const ejercicio = (id: string): Props => ({ ejercicio: id, ejercicio_titulo: buscarEjercicio(id)?.titulo ?? id });

/** Sigue un ejercicio abierto y traduce los cambios del reproductor en eventos. */
export class SeguimientoReproductor {
  private abierto: { id: string; pasoMax: number; camara: boolean; desde: number; veces: number } | null = null;

  cambio(s: VistaReproductor, p: VistaReproductor, ahora: number): Evento[] {
    const ev: Evento[] = [];
    if (s.ejercicioId !== p.ejercicioId) {
      this.abierto = s.ejercicioId ? { id: s.ejercicioId, pasoMax: 1, camara: false, desde: ahora, veces: 0 } : null;
      if (s.ejercicioId) ev.push({ nombre: 'ejercicio_abierto', props: { ...ejercicio(s.ejercicioId), pasos: s.pasos } });
    }
    const a = this.abierto;
    if (a && s.ejercicioId === a.id) {
      const n = s.paso + 1;
      if (n > a.pasoMax) {
        a.pasoMax = n;
        ev.push({ nombre: 'ejercicio_paso', props: { ...ejercicio(a.id), paso: n, pasos: s.pasos } });
      }
      // Llegar al final (reproduciendo o con «Siguiente» en el último paso). Si lo repite, cuenta otra vez.
      const alFinal = (x: VistaReproductor) => x.total > 0 && x.tiempo >= x.total - FIN;
      if (alFinal(s) && !(p.ejercicioId === a.id && alFinal(p))) {
        a.veces += 1;
        ev.push({
          nombre: 'ejercicio_terminado',
          props: { ...ejercicio(a.id), pasos: s.pasos, segundos: Math.round((ahora - a.desde) / 1000), vez: a.veces },
        });
      }
      if (s.camaraLibre && !p.camaraLibre && !a.camara) {
        a.camara = true;
        ev.push({ nombre: 'camara_libre', props: ejercicio(a.id) });
      }
    }
    if (s.velocidad !== p.velocidad) ev.push({ nombre: 'velocidad', props: { velocidad: s.velocidad } });
    if (s.voz !== p.voz) ev.push({ nombre: 'voz', props: { activa: s.voz } });
    if (s.ritmo !== p.ritmo) ev.push({ nombre: 'ritmo_respiracion', props: { ritmo: s.ritmo } });
    if (s.video !== p.video) ev.push({ nombre: 'video_respiracion', props: { activo: s.video } });
    return ev;
  }
}

/** Las rutinas propias tienen ids al azar: se agrupan como «propia». */
export const tipoRutina = (id: string) => (id === RUTINA_POR_DEFECTO.id ? 'completa' : 'propia');

/** Eventos al cambiar de ruta (la rutina no tiene estado propio: se sigue por la ruta). */
export function eventosDeRuta(previa: Ruta | null, ruta: Ruta, items: (id: string) => number | undefined): Evento[] {
  if (ruta.nombre !== 'rutina') return [];
  const total = items(ruta.id);
  if (total === undefined) return [];
  const base = { rutina: tipoRutina(ruta.id), items: total };
  const ev: Evento[] = [];
  if (!(previa?.nombre === 'rutina' && previa.id === ruta.id)) ev.push({ nombre: 'rutina_iniciada', props: { ...base, desde: ruta.indice } });
  ev.push({ nombre: 'rutina_item', props: { ...base, item: Math.min(ruta.indice, total) } });
  return ev;
}

/** Propiedades que acompañan a todos los eventos según dónde está la persona. */
export function contextoDeRuta(ruta: Ruta): Props {
  return ruta.nombre === 'rutina' ? { en_rutina: tipoRutina(ruta.id) } : {};
}

/**
 * La página, como la ve la analítica. La app navega con «#», así que todas las pantallas
 * comparten la misma ruta real («/»); esta ruta virtual las separa en los informes.
 */
export function paginaDeRuta(ruta: Ruta): { ruta: string; titulo: string } {
  switch (ruta.nombre) {
    case 'inicio':
      return { ruta: '/', titulo: 'Inicio' };
    case 'ejercicio':
      return { ruta: `/ejercicio/${ruta.id}`, titulo: buscarEjercicio(ruta.id)?.titulo ?? ruta.id };
    case 'rutina':
      return { ruta: `/rutina/${tipoRutina(ruta.id)}`, titulo: tipoRutina(ruta.id) === 'completa' ? 'Rutina completa' : 'Rutina propia' };
    case 'editar-rutina':
      return { ruta: '/rutinas/editar', titulo: 'Editar rutina' };
    case 'respiracion':
      return { ruta: '/respiracion', titulo: 'Respiraciones conscientes' };
    case 'repaso':
      return { ruta: ruta.id ? `/repaso/${ruta.id}` : '/repaso', titulo: 'Repaso de memoria' };
    case 'dudas':
      return { ruta: '/dudas', titulo: 'Dudas del apunte' };
    case 'privacidad':
      return { ruta: '/privacidad', titulo: 'Privacidad' };
  }
}
