import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buscarDuda } from '../contenido/ejercicios';
import { irA } from '../ui/ruta';

const FASES = [
  { nombre: 'Inhala', seg: 4 },
  { nombre: 'Retén', seg: 3 },
  { nombre: 'Exhala', seg: 4 },
  { nombre: 'Pausa', seg: 4 },
] as const;
const CICLO = FASES.reduce((s, f) => s + f.seg, 0);

/** Fase, progreso y ciclo a partir de los segundos transcurridos. */
export function faseEn(seg: number) {
  const ciclo = Math.floor(seg / CICLO);
  let r = seg - ciclo * CICLO;
  for (const f of FASES) {
    if (r < f.seg) return { fase: f.nombre, k: r / f.seg, restante: Math.ceil(f.seg - r), ciclo };
    r -= f.seg;
  }
  return { fase: 'Pausa' as const, k: 1, restante: 0, ciclo };
}

export function Respiracion() {
  const [meta, setMeta] = useState(15);
  const [corriendo, setCorriendo] = useState(false);
  const [seg, setSeg] = useState(0);
  const ultimo = useRef<number | null>(null);
  const duda = buscarDuda('ritmo-4344');

  useEffect(() => {
    if (!corriendo) {
      ultimo.current = null;
      return;
    }
    let raf = 0;
    const bucle = (ahora: number) => {
      if (ultimo.current !== null) setSeg((s) => Math.min(s + (ahora - ultimo.current!) / 1000, meta * CICLO));
      ultimo.current = ahora;
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
    return () => cancelAnimationFrame(raf);
  }, [corriendo, meta]);

  const fin = seg >= meta * CICLO;
  useEffect(() => {
    if (fin) setCorriendo(false);
  }, [fin]);

  const { fase, k, restante, ciclo } = faseEn(seg);
  const escala = fase === 'Inhala' ? 0.55 + 0.45 * k : fase === 'Retén' ? 1 : fase === 'Exhala' ? 1 - 0.45 * k : 0.55;

  return (
    <main className="pagina respiracion" data-acento="cielo">
      <header className="pagina-cabecera">
        <button className="boton-icono" onClick={() => irA('#/')} aria-label="Volver al inicio">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="inicio-antetitulo">Respiraciones conscientes</p>
          <h1>Ritmo 4 · 3 · 4 · 4</h1>
        </div>
      </header>

      <div className="resp-metas" role="group" aria-label="Cantidad de respiraciones">
        {[15, 30].map((n) => (
          <button
            key={n}
            className="chip"
            aria-pressed={meta === n}
            onClick={() => {
              setMeta(n);
              setSeg(0);
              setCorriendo(false);
            }}
          >
            {n} respiraciones · {n === 15 ? 'liberar creencias' : 'equilibrar órganos'}
          </button>
        ))}
      </div>

      <div className="resp-escena" aria-live="polite">
        <div className="resp-circulo" style={{ transform: `scale(${escala})` }} data-fase={fase} />
        <div className="resp-texto">
          <span className="resp-fase">{fin ? 'Listo' : seg === 0 ? 'Preparado' : fase}</span>
          {!fin && seg > 0 && <span className="resp-restante">{restante}</span>}
        </div>
      </div>

      <p className="resp-cuenta">
        Respiración <strong>{Math.min(ciclo + (fin ? 0 : 1), meta)}</strong> de {meta}
      </p>

      <div className="transporte-botones resp-controles">
        <button className="boton-icono" onClick={() => setSeg(0)} aria-label="Reiniciar">
          <RotateCcw size={17} />
        </button>
        <button className="boton-play" onClick={() => setCorriendo((c) => !c)} aria-label={corriendo ? 'Pausar' : 'Empezar'}>
          {corriendo ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>

      {duda && (
        <details className="duda resp-duda">
          <summary>{duda.titulo}</summary>
          <p>{duda.detalle}</p>
          <p className="duda-lectura">
            <span>Cómo se usa aquí:</span> {duda.lectura}
          </p>
        </details>
      )}
    </main>
  );
}
