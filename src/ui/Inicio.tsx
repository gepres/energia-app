import { ArrowRight, Brain, CircleHelp, Copy, Pencil, Play, Plus, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DUDAS, EJERCICIOS, ejerciciosPorGrupo } from '../contenido/ejercicios';
import type { Ejercicio } from '../contenido/tipos';
import { RUTINA_POR_DEFECTO, type Rutina, alCambiarRutinas, duracionRutina, leerRutinas, minutos, nombreItem } from '../rutinas/rutinas';
import { useProgreso } from './progreso';
import { BotonTema } from './Tema';

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

/** Las rutinas propias, al día con lo que se guarda o se borra. */
function useRutinas(): Rutina[] {
  const [lista, setLista] = useState<Rutina[]>(() => leerRutinas());
  useEffect(() => alCambiarRutinas(() => setLista(leerRutinas())), []);
  return lista;
}

function TarjetaRutina({ r, porDefecto }: { r: Rutina; porDefecto?: boolean }) {
  const ejercicios = r.items.filter((it) => it.tipo === 'ejercicio').length;
  const respiraciones = r.items.length - ejercicios;
  const resumen = r.items.map(nombreItem).join(' · ');
  return (
    <article className="tarjeta-rutina" data-acento={porDefecto ? 'oro' : 'jade'}>
      <a className="tarjeta-rutina-enlace" href={`#/rutina/${encodeURIComponent(r.id)}/1`}>
        <span className="tarjeta-titulo">{r.nombre}</span>
        <span className="tarjeta-meta">
          {ejercicios} {ejercicios === 1 ? 'ejercicio' : 'ejercicios'}
          {respiraciones > 0 && ` · ${respiraciones} de respiraciones`} · unos {minutos(duracionRutina(r))}
          {porDefecto && <span className="sello">por defecto</span>}
        </span>
        <span className="tarjeta-resumen tarjeta-rutina-lista">{resumen}</span>
      </a>
      <div className="tarjeta-rutina-acciones">
        <a className="boton-rutina" data-principal="true" href={`#/rutina/${encodeURIComponent(r.id)}/1`}>
          <Play size={15} aria-hidden="true" /> Empezar
        </a>
        {porDefecto ? (
          <a className="boton-rutina" href={`#/rutinas/nueva/${encodeURIComponent(r.id)}`}>
            <Copy size={15} aria-hidden="true" /> Copiar y editar
          </a>
        ) : (
          <a className="boton-rutina" href={`#/rutinas/${encodeURIComponent(r.id)}`}>
            <Pencil size={15} aria-hidden="true" /> Editar
          </a>
        )}
      </div>
    </article>
  );
}

/** La portada: respiraciones, rutinas y los ejercicios uno por uno (pedido en la revisión). */
export function Inicio() {
  const progreso = useProgreso();
  const rutinas = useRutinas();
  const uno = EJERCICIOS.filter((e) => e.origen === 'revision');
  return (
    <main className="inicio">
      <div className="inicio-herramientas">
        <BotonTema />
      </div>
      <header className="inicio-cabecera">
        <p className="inicio-antetitulo">Taller · set 2026</p>
        <h1>
          Repaso
          <br />
          energético
        </h1>
        <p className="inicio-intro">Cada ejercicio, paso a paso y en 3D. Míralo, detenlo, arrástralo y arma tu rutina.</p>
        <nav className="inicio-accesos" aria-label="Accesos">
          <a className="acceso" href="#/respiracion">
            <Wind size={17} /> Respiraciones conscientes
          </a>
        </nav>
      </header>

      <section className="inicio-grupo" aria-labelledby="titulo-rutinas">
        <div className="inicio-grupo-cabeza">
          <h2 id="titulo-rutinas">Rutinas</h2>
          <span>Los ejercicios seguidos, uno tras otro</span>
        </div>
        <div className="tarjetas">
          <TarjetaRutina r={RUTINA_POR_DEFECTO} porDefecto />
          {rutinas.map((r) => (
            <TarjetaRutina key={r.id} r={r} />
          ))}
          <a className="tarjeta-nueva" href="#/rutinas/nueva">
            <Plus size={18} aria-hidden="true" />
            <span>
              <strong>Crear mi rutina</strong>
              <span>Elige los ejercicios y las respiraciones, en el orden que quieras. Se guarda en este navegador.</span>
            </span>
          </a>
        </div>
      </section>

      <section className="inicio-grupo" aria-labelledby="titulo-uno">
        <div className="inicio-grupo-cabeza">
          <h2 id="titulo-uno">Ejercicios</h2>
          <span>Cada uno, paso a paso</span>
        </div>
        {ejerciciosPorGrupo(uno).map(({ grupo, ejercicios }) => (
          <section key={grupo.id} className="inicio-subgrupo" aria-labelledby={`grupo-${grupo.id}`}>
            <h3 id={`grupo-${grupo.id}`} className="inicio-subgrupo-titulo">
              {grupo.titulo}
              {grupo.nota && <span> · {grupo.nota}</span>}
            </h3>
            <div className="tarjetas">
              {ejercicios.map((ej) => (
                <Tarjeta key={ej.id} ej={ej} visto={!!progreso.vistos[ej.id]} repaso={progreso.repaso[ej.id]} />
              ))}
            </div>
          </section>
        ))}
      </section>
      <footer className="inicio-pie">Representación simbólica de las prácticas del taller.</footer>
    </main>
  );
}

/**
 * La versión de trabajo (en /old): el home anterior, con los ejercicios de referencia, el repaso
 * de memoria y las dudas, para seguir revisando.
 */
export function InicioOld() {
  const progreso = useProgreso();
  const grupos = [
    { titulo: 'Uno por uno', nota: 'Rehechos con la descripción del taller', lista: EJERCICIOS.filter((e) => e.origen === 'revision'), referencia: false },
    { titulo: 'Referencia · set 2026', nota: 'Versión anterior, del documento del taller', lista: EJERCICIOS.filter((e) => e.origen === 'set2026'), referencia: true },
    { titulo: 'Referencia · notas del repaso', nota: 'Versión anterior, de las notas', lista: EJERCICIOS.filter((e) => e.origen === 'notas'), referencia: true },
  ];
  return (
    <main className="inicio">
      <div className="inicio-herramientas">
        <span className="sello">versión de trabajo</span>
        <BotonTema />
      </div>
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
            <Wind size={17} /> Respiraciones conscientes
          </a>
          <a className="acceso" href="#/dudas">
            <CircleHelp size={17} /> {DUDAS.length === 1 ? '1 duda pendiente' : `${DUDAS.length} dudas del apunte`}
          </a>
        </nav>
      </header>
      {grupos.map((g) => (
        <section key={g.titulo} className="inicio-grupo" data-referencia={g.referencia}>
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
