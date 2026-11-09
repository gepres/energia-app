import { describe, expect, it } from 'vitest';
import { EJERCICIOS } from '../contenido/ejercicios';
import { cicloRespiracion, OPCIONES_INICIALES } from '../secuencias/motor';
import { esOld, leerRuta } from '../ui/ruta';
import {
  EJERCICIOS_RUTINA,
  RUTINA_POR_DEFECTO,
  borrarRutina,
  buscarRutina,
  duracionItem,
  duracionRutina,
  guardarRutina,
  leerRutinas,
  minutos,
} from './rutinas';

/** Un almacenamiento en memoria, como el del navegador. */
function memoria() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe('Rutinas (pedido en la revisión)', () => {
  it('la rutina por defecto: los 11 ejercicios uno por uno, en el orden pedido', () => {
    const titulo = (id: string) => EJERCICIOS.find((e) => e.id === id)?.titulo;
    expect(RUTINA_POR_DEFECTO.items.map((it) => (it.tipo === 'ejercicio' ? titulo(it.id) : ''))).toEqual([
      'Masaje de manos y dedos',
      'Cargar el ombligo',
      'Colocar energía en los 3 puntos',
      'Sensibilización de manos',
      'Recorrido por chakras',
      'Cargar las ingles',
      'Sensibilización de piernas',
      'Enraizar',
      'Activación de centros energéticos',
      'Sellar desde el cielo',
      'Sellado final',
    ]);
    for (const it of RUTINA_POR_DEFECTO.items) {
      expect(it.tipo).toBe('ejercicio');
      if (it.tipo === 'ejercicio') expect(EJERCICIOS.find((e) => e.id === it.id)?.origen).toBe('revision');
    }
    expect(EJERCICIOS_RUTINA).toHaveLength(11);
  });

  it('se guarda, se lee, se edita y se borra en el navegador; lo inválido se descarta', () => {
    const a = memoria();
    expect(leerRutinas(a)).toEqual([]);
    guardarRutina({ id: 'r-1', nombre: '  Mañana  ', items: [{ tipo: 'respiracion', total: 15 }, { tipo: 'ejercicio', id: 'cargar-ombligo' }] }, a);
    expect(leerRutinas(a)).toEqual([{ id: 'r-1', nombre: 'Mañana', items: [{ tipo: 'respiracion', total: 15 }, { tipo: 'ejercicio', id: 'cargar-ombligo' }] }]);
    // Editar reemplaza; otra rutina se suma.
    guardarRutina({ id: 'r-1', nombre: 'Mañana corta', items: [{ tipo: 'ejercicio', id: 'sellado-ombligo' }] }, a);
    guardarRutina({ id: 'r-2', nombre: '', items: [{ tipo: 'ejercicio', id: 'no-existe' }, { tipo: 'respiracion', total: 30 }] }, a);
    const todas = leerRutinas(a);
    expect(todas.map((r) => r.nombre)).toEqual(['Mañana corta', 'Mi rutina']);
    expect(todas[1].items).toEqual([{ tipo: 'respiracion', total: 30 }]);
    expect(buscarRutina('r-2', a)?.nombre).toBe('Mi rutina');
    expect(buscarRutina('completa', a)).toBe(RUTINA_POR_DEFECTO);
    borrarRutina('r-1', a);
    expect(leerRutinas(a).map((r) => r.id)).toEqual(['r-2']);
    // Datos rotos o ajenos: no rompen la portada.
    a.m.set('repaso-energetico:rutinas', '{no es json');
    expect(leerRutinas(a)).toEqual([]);
    expect(leerRutinas(undefined)).toEqual([]);
  });

  it('la duración: cada ejercicio a 1× y las respiraciones con el ritmo elegido', () => {
    expect(duracionItem({ tipo: 'respiracion', total: 15 })).toBe(15 * cicloRespiracion(OPCIONES_INICIALES.ritmo));
    expect(duracionItem({ tipo: 'ejercicio', id: 'sellado-ombligo' })).toBeCloseTo(58, 0);
    const total = duracionRutina(RUTINA_POR_DEFECTO);
    expect(total).toBeGreaterThan(10 * 60);
    expect(minutos(90)).toBe('2 min');
    expect(minutos(3725)).toBe('1 h 2 min');
  });

  it('las rutas: reproducir, crear, copiar y editar una rutina; el home de trabajo en /old', () => {
    expect(leerRuta('#/rutina/completa/3')).toEqual({ nombre: 'rutina', id: 'completa', indice: 3 });
    expect(leerRuta('#/rutina/completa')).toEqual({ nombre: 'rutina', id: 'completa', indice: 1 });
    expect(leerRuta('#/rutinas/nueva')).toEqual({ nombre: 'editar-rutina', base: undefined });
    expect(leerRuta('#/rutinas/nueva/completa')).toEqual({ nombre: 'editar-rutina', base: 'completa' });
    expect(leerRuta('#/rutinas/r-abc')).toEqual({ nombre: 'editar-rutina', id: 'r-abc' });
    expect(esOld('/old')).toBe(true);
    expect(esOld('/old/')).toBe(true);
    expect(esOld('/')).toBe(false);
    expect(esOld('/oldies')).toBe(false);
  });
});
