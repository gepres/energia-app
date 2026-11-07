import { ArrowLeft } from 'lucide-react';
import { DUDAS, EJERCICIOS } from '../contenido/ejercicios';
import { irA } from './ruta';

export function Dudas() {
  return (
    <main className="pagina">
      <header className="pagina-cabecera">
        <button className="boton-icono" onClick={() => irA('#/')} aria-label="Volver al inicio">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="inicio-antetitulo">Para confirmar en el taller</p>
          <h1>Dudas del apunte</h1>
        </div>
      </header>
      <p className="pagina-intro">
        Lo que los apuntes no dejan claro. La app no lo inventa: lo dibuja con una lectura ilustrativa y lo marca en el
        paso correspondiente.
      </p>
      <ol className="dudas-lista">
        {DUDAS.map((d) => {
          const usos = EJERCICIOS.flatMap((ej) =>
            ej.pasos.filter((p) => p.dudas?.includes(d.id)).map((p) => ({ ej, p })),
          );
          return (
            <li key={d.id} className="duda-tarjeta">
              <h2>{d.titulo}</h2>
              <p>{d.detalle}</p>
              <p className="duda-lectura">
                <span>Cómo se dibuja:</span> {d.lectura}
              </p>
              <p className="duda-fuente">
                Fuente: {d.fuente}
                {usos.length > 0 && (
                  <>
                    {' · '}
                    {usos.map(({ ej, p }, i) => (
                      <a key={`${ej.id}-${p.id}`} href={`#/ejercicio/${ej.id}`}>
                        {i > 0 ? ', ' : ''}
                        {ej.titulo} → {p.titulo}
                      </a>
                    ))}
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
