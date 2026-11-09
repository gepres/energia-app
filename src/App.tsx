import { lazy, Suspense, useEffect } from 'react';
import { escena } from './escena/tienda';
import { Dudas } from './ui/Dudas';
import { Hud } from './ui/Hud';
import { EditorRutina } from './rutinas/EditorRutina';
import { ReproductorRutina, tipoEnRutina } from './rutinas/ReproductorRutina';
import { Inicio, InicioOld } from './ui/Inicio';
import { esOld, useRuta } from './ui/ruta';
import { Visor } from './ui/Visor';

const Escenario = lazy(() => import('./escena/Escenario').then((m) => ({ default: m.Escenario })));
const Repaso = lazy(() => import('./repaso/Repaso').then((m) => ({ default: m.Repaso })));
const Respiracion = lazy(() => import('./repaso/Respiracion').then((m) => ({ default: m.Respiracion })));

function useMovimientoReducido() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => {
      escena.reducido = mq.matches;
      document.documentElement.dataset.reducido = String(mq.matches);
    };
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);
}

export function App() {
  const ruta = useRuta();
  useMovimientoReducido();
  const enVisor = ruta.nombre === 'ejercicio' || (ruta.nombre === 'rutina' && tipoEnRutina(ruta.id, ruta.indice) === 'ejercicio');
  const modo = enVisor ? 'visor' : ruta.nombre === 'inicio' ? 'portada' : 'fondo';

  useEffect(() => {
    document.documentElement.dataset.modo = modo;
    window.scrollTo({ top: 0 });
  }, [modo, ruta]);

  // Lente de la cámara según el diseño: deja sitio a la interfaz sobre la escena.
  useEffect(() => {
    const aplicar = () => {
      const ancho = window.innerWidth >= 960;
      if (modo === 'portada') escena.lente = ancho ? { x: -0.2, y: 0.02 } : { x: 0, y: 0.14 };
      else if (modo === 'visor') escena.lente = ancho ? { x: 0, y: 0.02 } : { x: 0, y: -0.05 };
      else escena.lente = { x: 0, y: 0 };
    };
    aplicar();
    window.addEventListener('resize', aplicar);
    return () => window.removeEventListener('resize', aplicar);
  }, [modo]);

  return (
    <>
      <div className="escenario" data-modo={modo}>
        <Suspense fallback={<div className="escenario-cargando">Preparando la escena…</div>}>
          <Escenario />
        </Suspense>
        {modo === 'visor' && <Hud />}
      </div>
      {ruta.nombre === 'inicio' && (esOld() ? <InicioOld /> : <Inicio />)}
      {ruta.nombre === 'ejercicio' && <Visor id={ruta.id} paso={ruta.paso} />}
      {ruta.nombre === 'rutina' && <ReproductorRutina id={ruta.id} indice={ruta.indice} />}
      {ruta.nombre === 'editar-rutina' && <EditorRutina key={`${ruta.id ?? ''}-${ruta.base ?? ''}`} id={ruta.id} base={ruta.base} />}
      {ruta.nombre === 'dudas' && <Dudas />}
      <Suspense fallback={null}>
        {ruta.nombre === 'repaso' && <Repaso id={ruta.id} />}
        {ruta.nombre === 'respiracion' && <Respiracion />}
      </Suspense>
    </>
  );
}
