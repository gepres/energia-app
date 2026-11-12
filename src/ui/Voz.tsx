import { Volume2, VolumeX } from 'lucide-react';
import { useEffect } from 'react';
import type { Ejercicio } from '../contenido/tipos';
import { clipVoz, guardarPreferenciaVoz } from '../contenido/voz';
import { type EstadoReproductor, useReproductor } from '../reproductor';
import { durPaso } from '../secuencias/motor';

/** Cuánto puede desfasarse la voz de la animación antes de volver a ubicarla (s). */
const DESFASE = 0.45;

/**
 * Narra los pasos del ejercicio con su voz (si la tiene y la voz está activa). Un solo elemento
 * de audio sigue al reproductor: suena mientras se reproduce, se pausa al pausar, se reubica si
 * se salta a otro momento y sigue la velocidad elegida. Al cambiar de paso, cambia de audio.
 */
export function useNarrador(ej: Ejercicio) {
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    let fuente = '';
    // Mientras carga un audio nuevo, se recuerda dónde debe empezar.
    let ubicarEn: number | null = null;
    audio.addEventListener('loadedmetadata', () => {
      if (ubicarEn !== null) audio.currentTime = ubicarEn;
      ubicarEn = null;
    });

    const callar = () => {
      if (!audio.paused) audio.pause();
    };

    const sincronizar = (s: EstadoReproductor) => {
      const clip = s.opciones.voz && s.ejercicioId === ej.id ? clipVoz(ej.id, ej.pasos[s.paso]?.id) : null;
      if (!clip?.segundos || !s.secuencia) return callar();
      const src = `${import.meta.env.BASE_URL}${clip.audio}`;
      // Segundos dentro del paso, en el mismo reloj que la animación.
      const pos = s.t * durPaso(s.secuencia.pasos[s.paso], s.opciones);
      if (fuente !== src) {
        fuente = src;
        audio.src = src;
        ubicarEn = pos;
      }
      if (!s.reproduciendo || pos >= clip.segundos) return callar();
      audio.playbackRate = s.velocidad;
      if (audio.readyState >= 1 && Math.abs(audio.currentTime - pos) > DESFASE) audio.currentTime = pos;
      else if (audio.readyState < 1) ubicarEn = pos;
      if (audio.paused) void audio.play().catch(() => undefined);
    };

    sincronizar(useReproductor.getState());
    const soltar = useReproductor.subscribe(sincronizar);
    return () => {
      soltar();
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [ej]);
}

/** Interruptor de la voz, en los controles del reproductor. */
export function BotonVoz() {
  const voz = useReproductor((s) => s.opciones.voz);
  const setOpciones = useReproductor((s) => s.setOpciones);
  return (
    <button
      className="boton-voz"
      aria-pressed={voz}
      aria-label={voz ? 'Voz activada: apagar la narración' : 'Voz apagada: narrar los pasos'}
      title={voz ? 'Apagar la voz' : 'Narrar los pasos con voz'}
      onClick={() => {
        guardarPreferenciaVoz(!voz);
        setOpciones({ voz: !voz });
      }}
    >
      {voz ? <Volume2 size={17} /> : <VolumeX size={17} />}
      <span>Voz</span>
    </button>
  );
}
