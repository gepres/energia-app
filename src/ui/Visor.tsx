import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  Video,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buscarDuda, buscarEjercicio, fraseOrgano, ORGANOS } from '../contenido/ejercicios';
import type { Ejercicio, Paso } from '../contenido/tipos';
import { useReproductor } from '../reproductor';
import { Frase } from './Frase';
import { LineaTiempo } from './LineaTiempo';
import { marcarVisto } from './progreso';
import { irA } from './ruta';

const VELOCIDADES = [0.5, 0.75, 1, 1.5];

export function Visor({ id, paso }: { id: string; paso?: number }) {
  const ej = buscarEjercicio(id);
  const abrir = useReproductor((s) => s.abrir);
  const cerrar = useReproductor((s) => s.cerrar);

  useEffect(() => {
    if (!ej) return;
    abrir(ej.id);
    return () => cerrar();
  }, [ej, abrir, cerrar]);

  // Enlace directo a un paso (desde el repaso): #/ejercicio/<id>/<n>.
  useEffect(() => {
    if (ej && paso) useReproductor.getState().irAPaso(paso - 1, true);
  }, [ej, paso]);

  useAtajos();

  if (!ej) {
    return (
      <div className="visor-vacio">
        <p>No encontré ese ejercicio.</p>
        <button className="boton" onClick={() => irA('#/')}>
          Volver al inicio
        </button>
      </div>
    );
  }
  return <VisorEjercicio ej={ej} />;
}

function useAtajos() {
  useEffect(() => {
    const alTeclear = (ev: KeyboardEvent) => {
      const el = ev.target as HTMLElement;
      if (el.closest('input, select, textarea, [role="slider"]')) return;
      const s = useReproductor.getState();
      if (ev.key === ' ' || ev.key === 'k') {
        ev.preventDefault();
        s.alternar();
      } else if (ev.key === 'ArrowRight') {
        s.siguiente();
      } else if (ev.key === 'ArrowLeft') {
        s.anterior();
      } else if (ev.key === 'Escape') {
        irA('#/');
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);
}

function VisorEjercicio({ ej }: { ej: Ejercicio }) {
  const paso = useReproductor((s) => s.paso);
  const final = useReproductor((s) => s.paso === ej.pasos.length - 1 && s.t > 0.95);
  const [lista, setLista] = useState(false);

  useEffect(() => {
    if (final) marcarVisto(ej.id);
  }, [final, ej.id]);

  const actual = ej.pasos[paso] ?? ej.pasos[0];

  return (
    <div className="visor" data-acento={ej.acento}>
      <header className="visor-cabecera">
        <button className="boton-icono" onClick={() => irA('#/')} aria-label="Volver a la lista de ejercicios">
          <ArrowLeft size={18} />
        </button>
        <div className="visor-titulo">
          <span className="visor-numero">
            {String(ej.numero).padStart(2, '0')} · {ej.origen === 'set2026' ? 'Set 2026' : 'Notas del repaso'}
          </span>
          <h1>
            {ej.titulo}
            {ej.subtitulo && <em> · {ej.subtitulo}</em>}
          </h1>
        </div>
      </header>

      <aside className="panel" aria-label="Pasos del ejercicio">
        <div className="panel-cabeza">
          <span className="panel-contador">
            Paso <strong>{paso + 1}</strong> de {ej.pasos.length}
          </span>
          <button className="boton-texto" onClick={() => setLista((v) => !v)} aria-expanded={lista}>
            <ListChecks size={16} /> {lista ? 'Ocultar pasos' : 'Todos los pasos'}
          </button>
        </div>
        {lista && <ListaPasos ej={ej} actual={paso} />}
        <PasoActual key={`${ej.id}-${paso}`} ej={ej} paso={actual} indice={paso} />
        {ej.id === 'equilibrar-organos' && <SelectorOrgano />}
        {ej.bloques?.map((b) => (
          <section key={b.titulo} className="bloque">
            <h3>{b.titulo}</h3>
            <ul>
              {b.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </section>
        ))}
        <a className="enlace-repaso" href={`#/repaso/${ej.id}`}>
          Repasar este ejercicio de memoria →
        </a>
      </aside>

      <Transporte pasos={ej.pasos} />
    </div>
  );
}

function ListaPasos({ ej, actual }: { ej: Ejercicio; actual: number }) {
  const irAPaso = useReproductor((s) => s.irAPaso);
  return (
    <ol className="lista-pasos">
      {ej.pasos.map((p, i) => (
        <li key={p.id}>
          <button
            className="lista-paso"
            data-estado={i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente'}
            aria-current={i === actual ? 'step' : undefined}
            onClick={() => irAPaso(i, true)}
          >
            <span className="lista-paso-num">{i + 1}</span>
            <span>{p.titulo}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function PasoActual({ ej, paso, indice }: { ej: Ejercicio; paso: Paso; indice: number }) {
  const organo = useReproductor((s) => s.opciones.organo);
  const o = ORGANOS.find((x) => x.id === organo);
  const frase = ej.id === 'equilibrar-organos' && paso.id === 'dirigir-pedir' && o ? fraseOrgano(o) : paso.frase;
  const dudas = (paso.dudas ?? []).map(buscarDuda).filter((d) => !!d);
  return (
    <article className="paso" aria-live="polite">
      <h2 className="paso-titulo">{paso.titulo}</h2>
      <p className="paso-texto">{paso.texto}</p>
      {frase && <Frase texto={frase} paso={indice} />}
      {paso.cantidad && (
        <p className="paso-cantidad">
          <strong>{paso.cantidad.valor}</strong> {paso.cantidad.unidad}
        </p>
      )}
      {paso.lectura && <p className="paso-lectura">{paso.lectura}</p>}
      {dudas.map((d) => (
        <details key={d.id} className="duda">
          <summary>
            <CircleHelp size={15} /> {d.titulo}
          </summary>
          <p>{d.detalle}</p>
          <p className="duda-lectura">
            <span>Cómo se dibuja:</span> {d.lectura}
          </p>
        </details>
      ))}
    </article>
  );
}

function SelectorOrgano() {
  const organo = useReproductor((s) => s.opciones.organo);
  const setOpciones = useReproductor((s) => s.setOpciones);
  const irAPaso = useReproductor((s) => s.irAPaso);
  const paso = useReproductor((s) => s.paso);
  return (
    <section className="organos" aria-label="Elegir órgano">
      {(['tierra', 'cielo'] as const).map((pol) => (
        <div key={pol} className="organos-grupo" data-polaridad={pol}>
          <h3>{pol === 'tierra' ? 'Energía de tierra (−)' : 'Energía del cielo (+)'}</h3>
          <div className="organos-chips">
            {ORGANOS.filter((x) => x.polaridad === pol).map((x) => (
              <button
                key={x.id}
                className="chip"
                aria-pressed={organo === x.id}
                onClick={() => {
                  setOpciones({ organo: x.id });
                  if (paso < 2) irAPaso(2, true);
                }}
              >
                {x.nombre}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Transporte({ pasos }: { pasos: Paso[] }) {
  const reproduciendo = useReproductor((s) => s.reproduciendo);
  const alternar = useReproductor((s) => s.alternar);
  const siguiente = useReproductor((s) => s.siguiente);
  const anterior = useReproductor((s) => s.anterior);
  const irAPaso = useReproductor((s) => s.irAPaso);
  const velocidad = useReproductor((s) => s.velocidad);
  const setVelocidad = useReproductor((s) => s.setVelocidad);
  const libre = useReproductor((s) => s.camaraLibre);
  const setLibre = useReproductor((s) => s.setCamaraLibre);
  const botonPlay = useRef<HTMLButtonElement>(null);

  return (
    <div className="transporte">
      <LineaTiempo pasos={pasos} />
      <div className="transporte-botones">
        <button className="boton-icono" onClick={() => irAPaso(0, true)} aria-label="Desde el inicio">
          <RotateCcw size={17} />
        </button>
        <button className="boton-icono" onClick={anterior} aria-label="Paso anterior">
          <ChevronLeft size={20} />
        </button>
        <button ref={botonPlay} className="boton-play" onClick={alternar} aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}>
          {reproduciendo ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="boton-icono" onClick={siguiente} aria-label="Paso siguiente">
          <ChevronRight size={20} />
        </button>
        <button
          className="boton-velocidad"
          onClick={() => setVelocidad(VELOCIDADES[(VELOCIDADES.indexOf(velocidad) + 1) % VELOCIDADES.length])}
          aria-label={`Velocidad ${velocidad}×`}
        >
          {velocidad}×
        </button>
      </div>
      {libre && (
        <button className="boton-toma" onClick={() => setLibre(false)}>
          <Video size={15} /> Volver a la toma
        </button>
      )}
    </div>
  );
}
