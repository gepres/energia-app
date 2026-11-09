import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useReproductor } from '../reproductor';
import { PAUSA_RESPIRACION, RITMOS, type Ritmo, cicloRespiracion } from '../secuencias/motor';
import { BotonVideo, SelectorRitmo, VideoRespiracion } from '../ui/RespiracionPanel';
import { irA } from '../ui/ruta';

/** Las fases de una respiración con un ritmo: inhalar · retener · exhalar y la pausa de 1 s. */
export const fasesDe = (r: Ritmo) =>
  [
    { nombre: 'Inhala', seg: RITMOS[r][0] },
    { nombre: 'Retén', seg: RITMOS[r][1] },
    { nombre: 'Exhala', seg: RITMOS[r][2] },
    { nombre: 'Pausa', seg: PAUSA_RESPIRACION },
  ] as const;

/** Fase, progreso y ciclo a partir de los segundos transcurridos, con el ritmo `r`. */
export function faseEn(seg: number, r: Ritmo = '4-3-4') {
  const largo = cicloRespiracion(r);
  const ciclo = Math.floor(seg / largo);
  let resto = seg - ciclo * largo;
  for (const f of fasesDe(r)) {
    if (resto < f.seg) return { fase: f.nombre, k: resto / f.seg, restante: Math.ceil(f.seg - resto), ciclo };
    resto -= f.seg;
  }
  return { fase: 'Pausa' as const, k: 1, restante: 0, ciclo };
}

export function Respiracion() {
  const ritmo = useReproductor((s) => s.opciones.ritmo);
  const video = useReproductor((s) => s.opciones.video);
  const [meta, setMeta] = useState(15);
  const [corriendo, setCorriendo] = useState(false);
  const [seg, setSeg] = useState(0);
  const ultimo = useRef<number | null>(null);
  const largo = cicloRespiracion(ritmo);

  // Al cambiar de ritmo se empieza de nuevo.
  useEffect(() => {
    setSeg(0);
    setCorriendo(false);
  }, [ritmo]);

  useEffect(() => {
    if (!corriendo) {
      ultimo.current = null;
      return;
    }
    let raf = 0;
    const bucle = (ahora: number) => {
      if (ultimo.current !== null) setSeg((s) => Math.min(s + (ahora - ultimo.current!) / 1000, meta * largo));
      ultimo.current = ahora;
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
    return () => cancelAnimationFrame(raf);
  }, [corriendo, meta, largo]);

  const fin = seg >= meta * largo;
  useEffect(() => {
    if (fin) setCorriendo(false);
  }, [fin]);

  const { fase, k, restante, ciclo } = faseEn(seg, ritmo);
  const escala = fase === 'Inhala' ? 0.55 + 0.45 * k : fase === 'Retén' ? 1 : fase === 'Exhala' ? 1 - 0.45 * k : 0.55;

  return (
    <main className="pagina respiracion" data-acento="cielo" data-video={video || undefined}>
      <header className="pagina-cabecera">
        <button className="boton-icono" onClick={() => irA('#/')} aria-label="Volver al inicio">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="inicio-antetitulo">Respiraciones conscientes</p>
          <h1>Ritmo {RITMOS[ritmo].join(' · ')}</h1>
          <p className="resp-subtitulo">
            inhalar · retener · exhalar · pausa {PAUSA_RESPIRACION} s
          </p>
        </div>
      </header>

      <section className="resp-opciones" aria-label="Opciones de la respiración">
        <SelectorRitmo />
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
        <BotonVideo />
      </section>

      <div className="resp-cuerpo">
        {video && <VideoRespiracion />}
        <div className="resp-guia">
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
        </div>
      </div>
    </main>
  );
}
