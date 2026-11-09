import { ExternalLink, MonitorPlay } from 'lucide-react';
import { VIDEO_RESPIRACION } from '../contenido/ejercicios';
import { useReproductor } from '../reproductor';
import { PAUSA_RESPIRACION, RITMOS, type Ritmo } from '../secuencias/motor';

const ORDEN: Ritmo[] = ['4-3-4', '3-3-3', '5-5-5'];

/**
 * Las respiraciones conscientes (aclarado en la revisión): se elige un ritmo —inhalar · retener ·
 * exhalar— con una pausa de 3 s en todos. El ritmo elegido vale para la página de respiración y
 * para los pasos de respiración de los ejercicios.
 */
export function SelectorRitmo() {
  const ritmo = useReproductor((s) => s.opciones.ritmo);
  const setOpciones = useReproductor((s) => s.setOpciones);
  return (
    <>
      <div className="organos-chips" role="group" aria-label="Ritmo: inhalar, retener y exhalar">
        {ORDEN.map((r) => (
          <button key={r} className="chip" aria-pressed={ritmo === r} onClick={() => setOpciones({ ritmo: r })}>
            {RITMOS[r].join(' · ')}
          </button>
        ))}
      </div>
      <p className="resp-nota">Inhalar · retener · exhalar, y una pausa de {PAUSA_RESPIRACION} s en todos los ritmos.</p>
    </>
  );
}

/** Acompañar las respiraciones con el video del taller (la interfaz se ajusta para verlo). */
export function BotonVideo() {
  const video = useReproductor((s) => s.opciones.video);
  const setOpciones = useReproductor((s) => s.setOpciones);
  return (
    <button className="boton-video" aria-pressed={video} onClick={() => setOpciones({ video: !video })}>
      <MonitorPlay size={16} aria-hidden="true" /> Acompañar con el video
    </button>
  );
}

/** En un paso de respiraciones de un ejercicio: el ritmo y el video. */
export function SelectorRespiracion({ total }: { total: number }) {
  const video = useReproductor((s) => s.opciones.video);
  return (
    <section className="resp-panel" aria-label="Respiraciones conscientes">
      <h3>Ritmo de respiración</h3>
      <SelectorRitmo />
      <BotonVideo />
      <p className="resp-nota">
        {video ? `El paso dura las ${total} respiraciones y el anillo las cuenta.` : 'Se muestra una respiración de muestra, al ritmo elegido.'}
      </p>
    </section>
  );
}

/** El video del taller, para respirar acompañándolo. */
export function VideoRespiracion() {
  const { id, inicio, titulo } = VIDEO_RESPIRACION;
  return (
    <section className="video-guia" aria-label="Video guía de respiración">
      <div className="video-guia-marco">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?start=${inicio}&rel=0&playsinline=1`}
          title={`Video del taller: ${titulo}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <a className="video-guia-enlace" href={`https://www.youtube.com/watch?v=${id}&t=${inicio}s`} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={13} aria-hidden="true" /> Abrir en YouTube
      </a>
    </section>
  );
}
