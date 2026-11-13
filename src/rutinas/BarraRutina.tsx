import { ChevronLeft, ChevronRight, ListOrdered, PartyPopper } from 'lucide-react';
import type { EnRutina } from './rutinas';

/** «Rutina completa · 3 de 11», con anterior y siguiente. */
export function BarraRutina({ rutina }: { rutina: EnRutina }) {
  return (
    <div className="barra-rutina" role="group" aria-label="Rutina en curso">
      <ListOrdered size={15} aria-hidden="true" />
      <span className="barra-rutina-texto">
        <span className="ph-sensitive">{rutina.nombre}</span> · <strong>{rutina.indice}</strong> de {rutina.total}
      </span>
      <button className="boton-icono" onClick={rutina.irAnterior} disabled={!rutina.irAnterior} aria-label="Ejercicio anterior de la rutina">
        <ChevronLeft size={16} />
      </button>
      <button className="boton-icono" onClick={rutina.irSiguiente} disabled={!rutina.irSiguiente} aria-label="Siguiente ejercicio de la rutina">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

/** Al terminar una parte: espera a que se toque «Siguiente» (o cierra la rutina si era la última). */
export function FinParte({ rutina, que }: { rutina: EnRutina; que: string }) {
  return (
    <div className="fin-parte" role="status">
      {rutina.irSiguiente ? (
        <>
          <p>
            Terminó <strong>{que}</strong>. Sigue: <strong>{rutina.siguiente}</strong>
          </p>
          <button className="boton" data-principal="true" onClick={rutina.irSiguiente} autoFocus>
            Siguiente ejercicio <ChevronRight size={16} aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <p>
            <PartyPopper size={16} aria-hidden="true" /> Terminaste <strong className="ph-sensitive">{rutina.nombre}</strong>.
          </p>
          <button className="boton" data-principal="true" onClick={rutina.salir} autoFocus>
            Volver al inicio
          </button>
        </>
      )}
    </div>
  );
}
