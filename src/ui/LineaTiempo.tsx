import { useEffect, useRef } from 'react';
import type { Paso } from '../contenido/tipos';
import { useReproductor } from '../reproductor';
import { inicios } from '../secuencias/motor';

/**
 * Línea de tiempo segmentada por pasos. Arrastrar hace scrub determinista;
 * el relleno se actualiza por fotograma sin renders de React.
 */
export function LineaTiempo({ pasos }: { pasos: Paso[] }) {
  const sec = useReproductor((s) => s.secuencia);
  const total = useReproductor((s) => s.total);
  const buscar = useReproductor((s) => s.buscar);
  const pausar = useReproductor((s) => s.pausar);
  const pista = useRef<HTMLDivElement>(null);
  const rellenos = useRef<(HTMLSpanElement | null)[]>([]);
  const arrastrando = useRef(false);

  useEffect(() => {
    if (!sec) return;
    const ini = inicios(sec);
    let raf = 0;
    const bucle = () => {
      const { tiempo } = useReproductor.getState();
      sec.pasos.forEach((p, i) => {
        const r = rellenos.current[i];
        if (!r) return;
        const k = Math.max(0, Math.min(1, (tiempo - ini[i]) / p.dur));
        r.style.transform = `scaleX(${k})`;
      });
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
    return () => cancelAnimationFrame(raf);
  }, [sec]);

  if (!sec) return null;

  const desdePuntero = (x: number) => {
    const r = pista.current!.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (x - r.left) / r.width));
    buscar(k * total);
  };

  return (
    <div
      ref={pista}
      className="linea"
      role="slider"
      tabIndex={0}
      aria-label="Progreso del ejercicio"
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={Math.round(useReproductor.getState().tiempo)}
      onPointerDown={(ev) => {
        arrastrando.current = true;
        (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
        pausar();
        desdePuntero(ev.clientX);
      }}
      onPointerMove={(ev) => arrastrando.current && desdePuntero(ev.clientX)}
      onPointerUp={() => (arrastrando.current = false)}
      onPointerCancel={() => (arrastrando.current = false)}
      onKeyDown={(ev) => {
        const s = useReproductor.getState();
        if (ev.key === 'ArrowRight') {
          ev.preventDefault();
          ev.stopPropagation();
          s.buscar(s.tiempo + 1);
        } else if (ev.key === 'ArrowLeft') {
          ev.preventDefault();
          ev.stopPropagation();
          s.buscar(s.tiempo - 1);
        }
      }}
    >
      {sec.pasos.map((p, i) => (
        <div key={i} className="linea-seg" style={{ flexGrow: p.dur }} title={pasos[i]?.titulo}>
          <span className="linea-fondo" />
          <span ref={(r) => void (rellenos.current[i] = r)} className="linea-relleno" />
        </div>
      ))}
    </div>
  );
}
