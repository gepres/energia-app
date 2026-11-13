import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2, Wind, X } from 'lucide-react';
import { useState } from 'react';
import { useReproductor } from '../reproductor';
import { registrar } from '../analitica/registro';
import { BotonTema } from '../ui/Tema';
import { irA } from '../ui/ruta';
import {
  EJERCICIOS_RUTINA,
  type ItemRutina,
  RUTINA_POR_DEFECTO,
  borrarRutina,
  buscarRutina,
  duracionItem,
  guardarRutina,
  minutos,
  nombreItem,
  nuevoId,
} from './rutinas';

/**
 * Crear o editar una rutina propia (pedido en la revisión): se eligen ejercicios uno por uno
 * —cada uno una vez— y bloques de respiraciones conscientes, se ordenan y se les pone nombre.
 * Se guarda en este navegador.
 */
export function EditorRutina({ id, base }: { id?: string; base?: string }) {
  const opciones = useReproductor((s) => s.opciones);
  // La rutina por defecto no se edita: se copia.
  const existente = id && id !== RUTINA_POR_DEFECTO.id ? buscarRutina(id) : undefined;
  const desde = !existente && (base ?? (id === RUTINA_POR_DEFECTO.id ? id : undefined));
  const copia = desde ? buscarRutina(desde) : undefined;
  const [nombre, setNombre] = useState(existente?.nombre ?? (copia ? `${copia.nombre} · mía` : ''));
  const [items, setItems] = useState<ItemRutina[]>(existente?.items ?? copia?.items ?? []);
  const [borrando, setBorrando] = useState(false);

  if (id && !existente && id !== RUTINA_POR_DEFECTO.id) {
    return (
      <main className="pagina editor-rutina">
        <p>No encontré esa rutina en este navegador.</p>
        <button className="boton" onClick={() => irA('#/')}>
          Volver al inicio
        </button>
      </main>
    );
  }

  const incluidos = new Set(items.flatMap((it) => (it.tipo === 'ejercicio' ? [it.id] : [])));
  const mover = (i: number, d: -1 | 1) =>
    setItems((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const copia2 = [...xs];
      [copia2[i], copia2[j]] = [copia2[j], copia2[i]];
      return copia2;
    });
  const quitar = (i: number) => setItems((xs) => xs.filter((_, k) => k !== i));
  const agregar = (it: ItemRutina) => setItems((xs) => [...xs, it]);
  const total = items.reduce((a, it) => a + duracionItem(it, opciones), 0);

  const guardar = () => {
    if (items.length === 0) return;
    guardarRutina({ id: existente?.id ?? nuevoId(), nombre: nombre.trim() || 'Mi rutina', items });
    const ejercicios = items.filter((it) => it.tipo === 'ejercicio').length;
    registrar('rutina_guardada', { nueva: !existente, items: items.length, ejercicios, respiraciones: items.length - ejercicios });
    irA('#/');
  };

  return (
    <main className="pagina editor-rutina">
      <header className="pagina-cabecera">
        <button className="boton-icono" onClick={() => irA('#/')} aria-label="Volver al inicio">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="inicio-antetitulo">Rutinas</p>
          <h1>{existente ? 'Editar rutina' : 'Nueva rutina'}</h1>
        </div>
        <span className="pagina-herramientas">
          <BotonTema />
        </span>
      </header>

      <label className="editor-nombre">
        <span>Nombre</span>
        <input value={nombre} maxLength={60} placeholder="Mi rutina de la mañana" onChange={(ev) => setNombre(ev.target.value)} />
      </label>

      <section className="editor-bloque" aria-labelledby="titulo-tu-rutina">
        <div className="inicio-grupo-cabeza">
          <h2 id="titulo-tu-rutina">Tu rutina</h2>
          <span>
            {items.length} {items.length === 1 ? 'parte' : 'partes'} · unos {minutos(total)}
          </span>
        </div>
        {items.length === 0 ? (
          <p className="editor-vacio">Todavía está vacía: agrega ejercicios o respiraciones desde abajo.</p>
        ) : (
          <ol className="rutina-items">
            {items.map((it, i) => (
              <li key={`${i}-${it.tipo === 'ejercicio' ? it.id : `r${it.total}`}`} className="rutina-item" data-tipo={it.tipo}>
                <span className="rutina-item-num">{i + 1}</span>
                <span className="rutina-item-nombre">
                  {nombreItem(it)}
                  <small>{minutos(duracionItem(it, opciones))}</small>
                </span>
                <span className="rutina-item-acciones">
                  <button className="boton-icono" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${nombreItem(it)}`}>
                    <ArrowUp size={15} />
                  </button>
                  <button className="boton-icono" onClick={() => mover(i, 1)} disabled={i === items.length - 1} aria-label={`Bajar ${nombreItem(it)}`}>
                    <ArrowDown size={15} />
                  </button>
                  <button className="boton-icono" onClick={() => quitar(i)} aria-label={`Quitar ${nombreItem(it)}`}>
                    <X size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="editor-bloque" aria-labelledby="titulo-agregar">
        <div className="inicio-grupo-cabeza">
          <h2 id="titulo-agregar">Agregar</h2>
          <span>Cada ejercicio una vez; las respiraciones, las veces que quieras</span>
        </div>
        <ul className="editor-opciones">
          {([15, 30] as const).map((n) => (
            <li key={`r${n}`}>
              <button className="editor-agregar" data-tipo="respiracion" onClick={() => agregar({ tipo: 'respiracion', total: n })}>
                <Wind size={16} aria-hidden="true" />
                <span>Respiraciones conscientes · {n}</span>
                <Plus size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
          {EJERCICIOS_RUTINA.map((ej) => (
            <li key={ej.id}>
              <button className="editor-agregar" data-acento={ej.acento} disabled={incluidos.has(ej.id)} onClick={() => agregar({ tipo: 'ejercicio', id: ej.id })}>
                <span className="editor-agregar-num">{String(ej.numero).padStart(2, '0')}</span>
                <span>
                  {ej.titulo}
                  {ej.subtitulo && <em> · {ej.subtitulo}</em>}
                </span>
                {incluidos.has(ej.id) ? <small>en la rutina</small> : <Plus size={16} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="editor-acciones">
        <button className="boton" data-principal="true" onClick={guardar} disabled={items.length === 0}>
          Guardar rutina
        </button>
        <button className="boton" onClick={() => irA('#/')}>
          Cancelar
        </button>
        {existente &&
          (borrando ? (
            <span className="editor-borrar">
              ¿Borrar «<span className="ph-sensitive">{existente.nombre}</span>»?
              <button
                className="boton"
                data-peligro="true"
                onClick={() => {
                  borrarRutina(existente.id);
                  irA('#/');
                }}
              >
                Sí, borrar
              </button>
              <button className="boton" onClick={() => setBorrando(false)}>
                No
              </button>
            </span>
          ) : (
            <button className="boton" data-peligro="true" onClick={() => setBorrando(true)}>
              <Trash2 size={15} aria-hidden="true" /> Borrar
            </button>
          ))}
      </div>
    </main>
  );
}
