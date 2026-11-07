import { describe, expect, it } from 'vitest';
import { EJERCICIOS } from '../contenido/ejercicios';
import { crearAzar, crearRepaso, type Pregunta } from './preguntas';

function valida(p: Pregunta) {
  const ej = EJERCICIOS.find((e) => e.id === p.ejercicioId);
  expect(ej, p.ejercicioId).toBeDefined();
  expect(p.paso).toBeGreaterThanOrEqual(0);
  expect(p.paso).toBeLessThan(ej!.pasos.length);
  if (p.tipo === 'orden') {
    expect([...p.mezclado].sort()).toEqual([...p.correcto].sort());
    expect(p.mezclado).not.toEqual(p.correcto);
  } else {
    expect(new Set(p.opciones).size).toBe(p.opciones.length);
    expect(p.correcta).toBeGreaterThanOrEqual(0);
    expect(p.correcta).toBeLessThan(p.opciones.length);
    expect(p.opciones.length).toBeGreaterThanOrEqual(2);
  }
}

describe('repaso de memoria', () => {
  it('genera un repaso general variado y válido', () => {
    for (let s = 1; s <= 25; s++) {
      const r = crearRepaso(undefined, crearAzar(s), 10);
      expect(r).toHaveLength(10);
      r.forEach(valida);
      expect(new Set(r.map((p) => p.tipo)).size).toBeGreaterThanOrEqual(3);
    }
  });

  it('genera repasos válidos para cada ejercicio', () => {
    for (const ej of EJERCICIOS) {
      for (let s = 1; s <= 10; s++) {
        const r = crearRepaso(ej.id, crearAzar(s), 8);
        expect(r.length, ej.id).toBeGreaterThan(0);
        r.forEach(valida);
        r.forEach((p) => expect(p.ejercicioId).toBe(ej.id));
      }
    }
  });

  it('las preguntas de frase ocultan una palabra que es la respuesta correcta', () => {
    const r = crearRepaso('liberar-creencias', crearAzar(3), 8).filter((p) => p.tipo === 'frase');
    for (const p of r) {
      if (p.tipo !== 'frase') continue;
      expect(p.contexto).toContain('______');
      expect(p.contexto!.replace('______', p.opciones[p.correcta])).toBe(p.explicacion);
    }
  });

  it('la semilla hace el repaso reproducible', () => {
    expect(JSON.stringify(crearRepaso(undefined, crearAzar(7)))).toBe(JSON.stringify(crearRepaso(undefined, crearAzar(7))));
  });
});
