import { Color } from 'three';
import type { ColorEnergia } from './estado';

/** Colores de energía (lineales, para la escena). */
export const HEX_ENERGIA: Record<ColorEnergia, string> = {
  oro: '#ffc96b',
  cielo: '#7cc8ff',
  tierra: '#ff8648',
  rosa: '#ff73a8',
  violeta: '#a98bff',
  jade: '#5ff2c2',
  blanco: '#fff3df',
  sombra: '#6f5f93',
};

const cache = new Map<ColorEnergia, Color>();
export function colorEnergia(c: ColorEnergia): Color {
  let col = cache.get(c);
  if (!col) {
    col = new Color(HEX_ENERGIA[c]);
    cache.set(c, col);
  }
  return col;
}

export const ESCENARIO = {
  fondo: '#06070c',
  niebla: '#06070c',
  piso: '#0c0e16',
  lineas: '#2a3046',
};
