import { useEffect, useMemo, useRef } from 'react';
import { useReproductor } from '../reproductor';
import { escena } from '../escena/tienda';

/**
 * Frase que se dice en voz alta. Las palabras aparecen con el progreso del paso
 * (así el scrub también la revela), o cuando la secuencia la dice (`hud.frase`);
 * con movimiento reducido se muestra entera.
 */
export function Frase({ texto, paso }: { texto: string; paso: number }) {
  const palabras = useMemo(() => texto.split(/\s+/), [texto]);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const bucle = () => {
      const s = useReproductor.getState();
      const dicha = escena.estado.hud.frase;
      const k = s.paso > paso ? 1 : s.paso < paso ? 0 : dicha != null ? dicha : Math.min(1, s.t / 0.6);
      const visibles = escena.reducido ? palabras.length : k * palabras.length;
      refs.current.forEach((r, i) => {
        if (!r) return;
        const a = Math.max(0, Math.min(1, visibles - i));
        r.style.opacity = String(0.12 + 0.88 * a);
        r.style.filter = a >= 1 ? 'none' : `blur(${(1 - a) * 4}px)`;
        r.style.transform = `translateY(${(1 - a) * 6}px)`;
      });
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
    return () => cancelAnimationFrame(raf);
  }, [palabras, paso]);

  return (
    <blockquote className="frase" aria-label={`Frase: ${texto}`}>
      <span className="frase-etiqueta">Se dice</span>
      <p className="frase-texto" aria-hidden="true">
        {palabras.map((p, i) => (
          <span key={i} ref={(r) => void (refs.current[i] = r)} className="frase-palabra">
            {p}{' '}
          </span>
        ))}
      </p>
    </blockquote>
  );
}
