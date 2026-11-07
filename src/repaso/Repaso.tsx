import { ArrowLeft, Check, RotateCcw, Undo2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EJERCICIOS, buscarEjercicio } from '../contenido/ejercicios';
import { registrarRepaso } from '../ui/progreso';
import { irA } from '../ui/ruta';
import { type Pregunta, type PreguntaOpcion, type PreguntaOrden, crearAzar, crearRepaso } from './preguntas';

const ETIQUETA: Record<Pregunta['tipo'], string> = {
  orden: 'Orden de los pasos',
  frase: 'Frase exacta',
  cantidad: 'Cantidad',
  polaridad: 'Tierra o cielo',
  siguiente: 'Qué sigue',
  dato: 'Dato clave',
};

export function Repaso({ id }: { id?: string }) {
  const ej = id ? buscarEjercicio(id) : undefined;
  const [semilla, setSemilla] = useState(() => Math.floor(Math.random() * 1e9));
  const preguntas = useMemo(() => crearRepaso(ej?.id, crearAzar(semilla), ej ? 8 : 10), [ej, semilla]);
  const [indice, setIndice] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [respondida, setRespondida] = useState<boolean | null>(null);

  useEffect(() => {
    setIndice(0);
    setAciertos(0);
    setRespondida(null);
  }, [preguntas]);

  const terminado = indice >= preguntas.length;
  useEffect(() => {
    if (terminado && preguntas.length) registrarRepaso(ej?.id ?? 'general', aciertos, preguntas.length);
  }, [terminado, aciertos, preguntas.length, ej]);

  const responder = (ok: boolean) => {
    if (respondida !== null) return;
    setRespondida(ok);
    if (ok) setAciertos((a) => a + 1);
  };
  const siguiente = () => {
    setRespondida(null);
    setIndice((i) => i + 1);
  };

  return (
    <main className="pagina repaso" data-acento={ej?.acento ?? 'oro'}>
      <header className="pagina-cabecera">
        <button className="boton-icono" onClick={() => irA(ej ? `#/ejercicio/${ej.id}` : '#/')} aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="inicio-antetitulo">Repaso de memoria</p>
          <h1>{ej ? ej.titulo : 'Todos los ejercicios'}</h1>
        </div>
      </header>

      {!ej && <SelectorEjercicio />}

      <div className="repaso-progreso" aria-label={`Pregunta ${Math.min(indice + 1, preguntas.length)} de ${preguntas.length}`}>
        {preguntas.map((_, i) => (
          <span key={i} data-estado={i < indice ? 'hecha' : i === indice ? 'actual' : 'pendiente'} />
        ))}
      </div>

      {terminado ? (
        <section className="repaso-final">
          <p className="repaso-puntaje">
            <strong>{aciertos}</strong> / {preguntas.length}
          </p>
          <p className="pagina-intro">
            {aciertos === preguntas.length
              ? 'Todo en su sitio. Vuelve en unos días para fijarlo.'
              : 'Repasa en 3D los pasos que fallaste y vuelve a intentarlo.'}
          </p>
          <div className="repaso-acciones">
            <button className="boton" onClick={() => setSemilla(Math.floor(Math.random() * 1e9))}>
              <RotateCcw size={16} /> Otro repaso
            </button>
            <a className="boton" href="#/">
              Volver al inicio
            </a>
          </div>
        </section>
      ) : (
        <TarjetaPregunta
          key={`${semilla}-${indice}`}
          p={preguntas[indice]}
          respondida={respondida}
          onResponder={responder}
          onSiguiente={siguiente}
          ultima={indice === preguntas.length - 1}
        />
      )}
    </main>
  );
}

function SelectorEjercicio() {
  return (
    <nav className="repaso-selector" aria-label="Repasar un ejercicio concreto">
      {EJERCICIOS.map((e) => (
        <a key={e.id} className="chip" href={`#/repaso/${e.id}`} data-acento={e.acento}>
          {String(e.numero).padStart(2, '0')} · {e.titulo}
        </a>
      ))}
    </nav>
  );
}

function TarjetaPregunta(props: {
  p: Pregunta;
  respondida: boolean | null;
  onResponder: (ok: boolean) => void;
  onSiguiente: () => void;
  ultima: boolean;
}) {
  const { p, respondida, onSiguiente, ultima } = props;
  const ej = buscarEjercicio(p.ejercicioId)!;
  return (
    <article className="pregunta" data-acento={ej.acento}>
      <span className="pregunta-tipo">{ETIQUETA[p.tipo]}</span>
      <h2 className="pregunta-enunciado">{p.enunciado}</h2>
      {p.tipo === 'orden' ? (
        <Ordenar p={p} respondida={respondida} onResponder={props.onResponder} />
      ) : (
        <Opciones p={p} respondida={respondida} onResponder={props.onResponder} />
      )}
      {respondida !== null && (
        <div className="pregunta-feedback" data-ok={respondida} role="status">
          <p className="pregunta-veredicto">
            {respondida ? <Check size={18} /> : <X size={18} />} {respondida ? 'Correcto' : 'No era esa'}
          </p>
          <p className="pregunta-explicacion">{p.explicacion}</p>
          <div className="repaso-acciones">
            <a className="boton-texto" href={`#/ejercicio/${p.ejercicioId}/${p.paso + 1}`}>
              Ver este paso en 3D →
            </a>
            <button className="boton boton-primario" onClick={onSiguiente} autoFocus>
              {ultima ? 'Ver resultado' : 'Siguiente'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Opciones({ p, respondida, onResponder }: { p: PreguntaOpcion; respondida: boolean | null; onResponder: (ok: boolean) => void }) {
  const [elegida, setElegida] = useState<number | null>(null);
  useEffect(() => {
    const alTeclear = (ev: KeyboardEvent) => {
      const n = Number(ev.key) - 1;
      if (respondida === null && n >= 0 && n < p.opciones.length) {
        setElegida(n);
        onResponder(n === p.correcta);
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [p, respondida, onResponder]);
  return (
    <>
      {p.contexto && <p className="pregunta-contexto">{p.contexto}</p>}
      <div className="opciones" role="group" aria-label="Opciones">
        {p.opciones.map((o, i) => {
          const estado =
            respondida === null ? undefined : i === p.correcta ? 'correcta' : i === elegida ? 'incorrecta' : 'neutra';
          return (
            <button
              key={o}
              className="opcion"
              data-estado={estado}
              disabled={respondida !== null}
              onClick={() => {
                setElegida(i);
                onResponder(i === p.correcta);
              }}
            >
              <span className="opcion-tecla">{i + 1}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Ordenar({ p, respondida, onResponder }: { p: PreguntaOrden; respondida: boolean | null; onResponder: (ok: boolean) => void }) {
  const [elegidos, setElegidos] = useState<string[]>([]);
  const restantes = p.mezclado.filter((x) => !elegidos.includes(x));
  const completo = elegidos.length === p.correcto.length;
  return (
    <div className="ordenar">
      <ol className="ordenar-lista" aria-label="Tu orden">
        {p.correcto.map((correcto, i) => {
          const x = elegidos[i];
          const estado = respondida === null || !x ? undefined : x === correcto ? 'correcta' : 'incorrecta';
          return (
            <li key={i} data-estado={estado} data-vacio={!x}>
              <span className="opcion-tecla">{i + 1}</span>
              <span>{x ?? '—'}</span>
              {respondida !== null && x !== correcto && <em className="ordenar-correcto">{correcto}</em>}
            </li>
          );
        })}
      </ol>
      {respondida === null && (
        <>
          <div className="opciones opciones-compactas" role="group" aria-label="Pasos por colocar">
            {restantes.map((x) => (
              <button key={x} className="opcion" onClick={() => setElegidos((e) => [...e, x])}>
                {x}
              </button>
            ))}
          </div>
          <div className="repaso-acciones">
            <button className="boton-texto" disabled={!elegidos.length} onClick={() => setElegidos((e) => e.slice(0, -1))}>
              <Undo2 size={15} /> Deshacer
            </button>
            <button
              className="boton boton-primario"
              disabled={!completo}
              onClick={() => onResponder(elegidos.every((x, i) => x === p.correcto[i]))}
            >
              Comprobar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
