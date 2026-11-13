import { describe, expect, it } from 'vitest';
import { DOMINIO, type Entorno, leerConfig, motivoParaNoMedir } from './config';
import { SeguimientoReproductor, type VistaReproductor, contextoDeRuta, eventosDeRuta, paginaDeRuta } from './eventos';

const config = { clave: 'phc_prueba', region: 'us' as const };
const enProduccion: Entorno = { host: DOMINIO, pathname: '/', noRastrear: false, incrustada: false, preferencia: null };

describe('cuándo se mide', () => {
  it('lee la clave y la región; sin clave no hay configuración', () => {
    expect(leerConfig({})).toBeNull();
    expect(leerConfig({ VITE_POSTHOG_KEY: '  ' })).toBeNull();
    expect(leerConfig({ VITE_POSTHOG_KEY: 'phc_x' })).toEqual({ clave: 'phc_x', region: 'us' });
    expect(leerConfig({ VITE_POSTHOG_KEY: 'phc_x', VITE_POSTHOG_REGION: 'EU' })).toEqual({ clave: 'phc_x', region: 'eu' });
  });

  it('mide en el dominio publicado, con clave', () => {
    expect(motivoParaNoMedir(config, enProduccion)).toBeNull();
  });

  it('no mide sin clave, en local, en /old, con «no rastrear» ni si la persona lo desactivó', () => {
    expect(motivoParaNoMedir(null, enProduccion)).toBe('sin-clave');
    expect(motivoParaNoMedir(config, { ...enProduccion, host: 'localhost' })).toBe('otro-dominio');
    expect(motivoParaNoMedir(config, { ...enProduccion, host: 'repaso-energetico.netlify.app' })).toBe('otro-dominio');
    expect(motivoParaNoMedir(config, { ...enProduccion, pathname: '/old' })).toBe('version-de-trabajo');
    expect(motivoParaNoMedir(config, { ...enProduccion, pathname: '/old/' })).toBe('version-de-trabajo');
    expect(motivoParaNoMedir(config, { ...enProduccion, noRastrear: true })).toBe('no-rastrear');
    expect(motivoParaNoMedir(config, { ...enProduccion, preferencia: 'no' })).toBe('excluido');
  });

  it('dentro de un marco (el visor de mapas de calor de PostHog) no mide, ni con «forzar»', () => {
    expect(motivoParaNoMedir(config, { ...enProduccion, incrustada: true })).toBe('incrustada');
    expect(motivoParaNoMedir(config, { ...enProduccion, incrustada: true, preferencia: 'forzar' })).toBe('incrustada');
  });

  it('«forzar» permite probar fuera del dominio, pero no pasa por encima de «no rastrear» ni de /old', () => {
    const local = { ...enProduccion, host: 'localhost', preferencia: 'forzar' as const };
    expect(motivoParaNoMedir(config, local)).toBeNull();
    expect(motivoParaNoMedir(config, { ...local, noRastrear: true })).toBe('no-rastrear');
    expect(motivoParaNoMedir(config, { ...local, pathname: '/old' })).toBe('version-de-trabajo');
    expect(motivoParaNoMedir(null, local)).toBe('sin-clave');
  });
});

const quieto: VistaReproductor = {
  ejercicioId: null,
  pasos: 0,
  paso: 0,
  tiempo: 0,
  total: 0,
  camaraLibre: false,
  velocidad: 1,
  voz: false,
  ritmo: '4-3-4',
  video: false,
};

/** Recorre una serie de estados y junta los eventos (nombre y props). */
function recorrer(estados: Partial<VistaReproductor>[], inicio: VistaReproductor = quieto) {
  const seg = new SeguimientoReproductor();
  let previo = inicio;
  const eventos: { nombre: string; props: Record<string, unknown> }[] = [];
  let ahora = 0;
  for (const cambio of estados) {
    ahora += 1000;
    const s = { ...previo, ...cambio };
    eventos.push(...seg.cambio(s, previo, ahora));
    previo = s;
  }
  return eventos;
}

describe('eventos del reproductor', () => {
  const abrir = { ejercicioId: 'cargar-ombligo', pasos: 3, paso: 0, tiempo: 0, total: 30 };

  it('abrir, avanzar paso a paso y terminar', () => {
    const ev = recorrer([abrir, { tiempo: 5 }, { paso: 1, tiempo: 10 }, { paso: 1, tiempo: 15 }, { paso: 2, tiempo: 20 }, { tiempo: 30 }]);
    expect(ev.map((e) => e.nombre)).toEqual(['ejercicio_abierto', 'ejercicio_paso', 'ejercicio_paso', 'ejercicio_terminado']);
    expect(ev[0].props).toMatchObject({ ejercicio: 'cargar-ombligo', pasos: 3 });
    expect(ev[0].props.ejercicio_titulo).toEqual(expect.any(String));
    expect(ev[1].props).toMatchObject({ paso: 2, pasos: 3 });
    expect(ev[2].props).toMatchObject({ paso: 3 });
    expect(ev[3].props).toMatchObject({ ejercicio: 'cargar-ombligo', segundos: 5, vez: 1 });
  });

  it('volver atrás no repite pasos; saltar registra el paso al que llega', () => {
    const ev = recorrer([abrir, { paso: 2, tiempo: 20 }, { paso: 0, tiempo: 0 }, { paso: 1, tiempo: 10 }, { paso: 2, tiempo: 20 }]);
    expect(ev.map((e) => [e.nombre, e.props.paso])).toEqual([
      ['ejercicio_abierto', undefined],
      ['ejercicio_paso', 3],
    ]);
  });

  it('quedarse al final no repite «terminado»; repetirlo hasta el final sí cuenta otra vez', () => {
    const ev = recorrer([abrir, { paso: 2, tiempo: 30 }, { velocidad: 1 }, { paso: 0, tiempo: 0 }, { paso: 2, tiempo: 30 }]);
    const terminados = ev.filter((e) => e.nombre === 'ejercicio_terminado');
    expect(terminados.map((e) => e.props.vez)).toEqual([1, 2]);
  });

  it('otro ejercicio empieza de cero; cerrar no inventa eventos', () => {
    const ev = recorrer([abrir, { paso: 2, tiempo: 20 }, { ...quieto }, { ...abrir, ejercicioId: 'sellar-cielo' }]);
    expect(ev.map((e) => [e.nombre, e.props.ejercicio])).toEqual([
      ['ejercicio_abierto', 'cargar-ombligo'],
      ['ejercicio_paso', 'cargar-ombligo'],
      ['ejercicio_abierto', 'sellar-cielo'],
    ]);
  });

  it('mover la cámara cuenta una vez por apertura', () => {
    const ev = recorrer([abrir, { camaraLibre: true }, { camaraLibre: false }, { camaraLibre: true }]);
    expect(ev.filter((e) => e.nombre === 'camara_libre')).toHaveLength(1);
  });

  it('las opciones: velocidad, voz, ritmo y video', () => {
    const ev = recorrer([{ velocidad: 0.5 }, { voz: true }, { ritmo: '5-5-5' }, { video: true }]);
    expect(ev).toEqual([
      { nombre: 'velocidad', props: { velocidad: 0.5 } },
      { nombre: 'voz', props: { activa: true } },
      { nombre: 'ritmo_respiracion', props: { ritmo: '5-5-5' } },
      { nombre: 'video_respiracion', props: { activo: true } },
    ]);
  });

  it('el avance cuadro a cuadro no genera eventos', () => {
    const cuadros = Array.from({ length: 50 }, (_, i) => ({ tiempo: 1 + i * 0.1 }));
    expect(recorrer([abrir, ...cuadros]).map((e) => e.nombre)).toEqual(['ejercicio_abierto']);
  });
});

describe('rutas', () => {
  const items = (id: string) => (id === 'completa' ? 11 : id === 'r-abc' ? 4 : undefined);

  it('empezar una rutina, avanzar y no repetir «iniciada»', () => {
    const r1 = { nombre: 'rutina' as const, id: 'completa', indice: 1 };
    const r2 = { ...r1, indice: 2 };
    expect(eventosDeRuta({ nombre: 'inicio' }, r1, items).map((e) => e.nombre)).toEqual(['rutina_iniciada', 'rutina_item']);
    expect(eventosDeRuta(r1, r2, items)).toEqual([{ nombre: 'rutina_item', props: { rutina: 'completa', items: 11, item: 2 } }]);
  });

  it('las rutinas propias se agrupan; una rutina que no existe no genera eventos', () => {
    const propia = { nombre: 'rutina' as const, id: 'r-abc', indice: 1 };
    expect(eventosDeRuta(null, propia, items)[0].props).toMatchObject({ rutina: 'propia', items: 4 });
    expect(eventosDeRuta(null, { ...propia, id: 'r-borrada' }, items)).toEqual([]);
    expect(eventosDeRuta(null, { nombre: 'dudas' }, items)).toEqual([]);
  });

  it('cada pantalla tiene su ruta virtual, sin el número de paso', () => {
    expect(paginaDeRuta({ nombre: 'inicio' }).ruta).toBe('/');
    expect(paginaDeRuta({ nombre: 'ejercicio', id: 'cargar-ombligo', paso: 3 }).ruta).toBe('/ejercicio/cargar-ombligo');
    expect(paginaDeRuta({ nombre: 'rutina', id: 'r-abc', indice: 2 }).ruta).toBe('/rutina/propia');
    expect(paginaDeRuta({ nombre: 'privacidad' })).toEqual({ ruta: '/privacidad', titulo: 'Privacidad' });
    expect(contextoDeRuta({ nombre: 'rutina', id: 'completa', indice: 3 })).toEqual({ en_rutina: 'completa' });
    expect(contextoDeRuta({ nombre: 'inicio' })).toEqual({});
  });
});
