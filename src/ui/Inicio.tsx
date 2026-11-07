import { ArrowRight, Brain, CircleHelp, Wind } from 'lucide-react';
import { DUDAS, EJERCICIOS } from '../contenido/ejercicios';
import type { Ejercicio } from '../contenido/tipos';
import { useProgreso } from './progreso';

function Tarjeta({ ej, visto, repaso }: { ej: Ejercicio; visto: boolean; repaso?: { aciertos: number; intentos: number } }) {
  return (
    <a className="tarjeta" href={`#/ejercicio/${ej.id}`} data-acento={ej.acento}>
      <span className="tarjeta-num">{String(ej.numero).padStart(2, '0')}</span>
      <span className="tarjeta-cuerpo">
        <span className="tarjeta-titulo">
          {ej.titulo}
          {ej.subtitulo && <em> · {ej.subtitulo}</em>}
        </span>
        <span className="tarjeta-resumen">{ej.resumen}</span>
        <span className="tarjeta-meta">
          {ej.pasos.length} pasos
          {visto && <span className="sello">visto</span>}
          {repaso && (
            <span className="sello" data-tipo="repaso">
              repaso {repaso.aciertos}/{repaso.intentos}
            </span>
          )}
        </span>
      </span>
      <ArrowRight className="tarjeta-flecha" size={18} aria-hidden="true" />
    </a>
  );
}

export function Inicio() {
  const progreso = useProgreso();
  const grupos = [
    { titulo: 'Manejo de energía · set 2026', nota: 'Del documento del taller', lista: EJERCICIOS.filter((e) => e.origen === 'set2026') },
    { titulo: 'Notas del repaso', nota: 'Fundamentos que se repasaron en grupo', lista: EJERCICIOS.filter((e) => e.origen === 'notas') },
  ];
  return (
    <main className="inicio">
      <header className="inicio-cabecera">
        <p className="inicio-antetitulo">Taller · set 2026</p>
        <h1>
          Repaso
          <br />
          energético
        </h1>
        <p className="inicio-intro">
          Cada ejercicio, paso a paso y en 3D. Míralo, detenlo, arrástralo y después repásalo de memoria.
        </p>
        <nav className="inicio-accesos" aria-label="Accesos">
          <a className="acceso" href="#/repaso">
            <Brain size={17} /> Repaso de memoria
          </a>
          <a className="acceso" href="#/respiracion">
            <Wind size={17} /> Respiración 4·3·4·4
          </a>
          <a className="acceso" href="#/dudas">
            <CircleHelp size={17} /> {DUDAS.length} dudas del apunte
          </a>
        </nav>
      </header>
      {grupos.map((g) => (
        <section key={g.titulo} className="inicio-grupo">
          <div className="inicio-grupo-cabeza">
            <h2>{g.titulo}</h2>
            <span>{g.nota}</span>
          </div>
          <div className="tarjetas">
            {g.lista.map((ej) => (
              <Tarjeta key={ej.id} ej={ej} visto={!!progreso.vistos[ej.id]} repaso={progreso.repaso[ej.id]} />
            ))}
          </div>
        </section>
      ))}
      <footer className="inicio-pie">
        Representación simbólica de las prácticas del taller. Lo que el apunte no precisa se marca como duda y se dibuja
        como lectura ilustrativa.
      </footer>
    </main>
  );
}
