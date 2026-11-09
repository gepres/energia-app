import { Respiracion } from '../repaso/Respiracion';
import { Visor } from '../ui/Visor';
import { irA } from '../ui/ruta';
import { type EnRutina, buscarRutina, nombreItem } from './rutinas';

/**
 * Reproduce una rutina: muestra el ítem `indice` (un ejercicio en el visor o un bloque de
 * respiraciones). Al terminar cada uno espera a que se toque «Siguiente» (elegido en la revisión).
 */
export function ReproductorRutina({ id, indice }: { id: string; indice: number }) {
  const r = buscarRutina(id);
  if (!r || r.items.length === 0) {
    return (
      <div className="visor-vacio">
        <p>No encontré esa rutina en este navegador.</p>
        <button className="boton" onClick={() => irA('#/')}>
          Volver al inicio
        </button>
      </div>
    );
  }
  const i = Math.min(indice, r.items.length) - 1;
  const it = r.items[i];
  const sig = r.items[i + 1];
  const ruta = (n: number) => `#/rutina/${encodeURIComponent(r.id)}/${n}`;
  const enRutina: EnRutina = {
    nombre: r.nombre,
    indice: i + 1,
    total: r.items.length,
    siguiente: sig ? nombreItem(sig) : undefined,
    irSiguiente: sig ? () => irA(ruta(i + 2)) : undefined,
    irAnterior: i > 0 ? () => irA(ruta(i)) : undefined,
    salir: () => irA('#/'),
  };
  if (it.tipo === 'respiracion') return <Respiracion key={`${r.id}-${i}`} rutina={enRutina} metaFija={it.total} />;
  return <Visor key={`${r.id}-${i}-${it.id}`} id={it.id} rutina={enRutina} />;
}

/** El tipo de lo que muestra una rutina en ese índice (para el modo de la escena). */
export function tipoEnRutina(id: string, indice: number): 'ejercicio' | 'respiracion' | null {
  const r = buscarRutina(id);
  if (!r || r.items.length === 0) return null;
  return r.items[Math.min(indice, r.items.length) - 1].tipo;
}
