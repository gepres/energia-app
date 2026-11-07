import { describe, expect, it } from 'vitest';
import { DUDAS, EJERCICIOS, ORGANOS, fraseOrgano } from '../contenido/ejercicios';
import { ik2, resolverEsqueleto } from '../escena/cuerpo';
import type { Estado } from '../escena/estado';
import { largoV, restaV } from '../escena/mate';
import { SECUENCIAS } from './index';
import { OPCIONES_INICIALES, duracionTotal, evaluar, ubicar } from './motor';

const MUESTRAS = [0, 0.13, 0.37, 0.5, 0.71, 0.94, 1];

/** Recorre el estado y devuelve la ruta del primer número no finito. */
function buscarNoFinito(v: unknown, ruta = 'estado'): string | null {
  if (typeof v === 'number') return Number.isFinite(v) ? null : ruta;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const r = buscarNoFinito(v[i], `${ruta}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      const r = buscarNoFinito(x, `${ruta}.${k}`);
      if (r) return r;
    }
  }
  return null;
}

describe('contenido', () => {
  it('tiene los 12 ejercicios: 7 del documento y 5 de las notas', () => {
    expect(EJERCICIOS).toHaveLength(12);
    expect(EJERCICIOS.filter((e) => e.origen === 'set2026')).toHaveLength(7);
    expect(EJERCICIOS.filter((e) => e.origen === 'notas')).toHaveLength(5);
  });

  it('conserva literales las frases del apunte', () => {
    const frases = EJERCICIOS.flatMap((e) => e.pasos.map((p) => p.frase).filter(Boolean));
    expect(frases).toContain('GRACIAS, TE LIBERO, TE DEJO IR');
    expect(frases).toContain('TE AMO, SÁNATE');
    expect(frases).toContain('SÁNATE, CONÉCTATE HASTA SANAR');
    expect(frases).toContain('CON ESTA ESFERA DE LUZ ACTIVO EL PODER DEL AMOR QUE RADICA EN MÍ');
  });

  it('clasifica los órganos como en la tabla del documento', () => {
    const tierra = ORGANOS.filter((o) => o.polaridad === 'tierra').map((o) => o.nombre);
    expect(tierra).toEqual(['Vejiga', 'Riñones', 'Aparato reproductor', 'Bazo']);
    expect(ORGANOS.filter((o) => o.polaridad === 'cielo')).toHaveLength(7);
    expect(fraseOrgano(ORGANOS.find((o) => o.id === 'vejiga')!)).toBe(
      'QUE SUBA LA ENERGÍA − SUFICIENTE PARA SANAR MI VEJIGA Y SUS FUNCIONES',
    );
    expect(fraseOrgano(ORGANOS.find((o) => o.id === 'corazon')!)).toContain('QUE BAJE LA ENERGÍA +');
  });

  it('solo referencia dudas que existen', () => {
    const ids = new Set(DUDAS.map((d) => d.id));
    for (const e of EJERCICIOS) for (const p of e.pasos) for (const d of p.dudas ?? []) expect(ids.has(d), `${e.id}/${p.id} → ${d}`).toBe(true);
  });
});

describe('secuencias 3D', () => {
  for (const ej of EJERCICIOS) {
    describe(ej.titulo, () => {
      const sec = SECUENCIAS[ej.id];

      it('tiene una coreografía con un tiempo por cada paso del apunte', () => {
        expect(sec).toBeDefined();
        expect(sec.pasos).toHaveLength(ej.pasos.length);
        for (const p of sec.pasos) expect(p.dur).toBeGreaterThan(2);
      });

      it('produce estados finitos en todo el recorrido', () => {
        const organos = ej.id === 'equilibrar-organos' ? ORGANOS.map((o) => o.id) : [OPCIONES_INICIALES.organo];
        for (const organo of organos) {
          for (let paso = 0; paso < sec.pasos.length; paso++) {
            for (const t of MUESTRAS) {
              const e = evaluar(sec, paso, t, { organo });
              const malo = buscarNoFinito(e);
              expect(malo, `${organo} paso ${paso + 1} t=${t}: ${malo}`).toBeNull();
              const esq = resolverEsqueleto(e.figuras[0].pose);
              expect(buscarNoFinito(esq), `esqueleto paso ${paso + 1} t=${t}`).toBeNull();
            }
          }
        }
      });

      it('es determinista: el mismo instante da el mismo estado (scrub)', () => {
        const total = duracionTotal(sec);
        for (const f of [0.1, 0.42, 0.77]) {
          const u = ubicar(sec, total * f);
          const a: Estado = evaluar(sec, u.paso, u.t, OPCIONES_INICIALES);
          // Evaluar otro instante entre medias no debe afectar al resultado.
          evaluar(sec, Math.max(0, u.paso - 1), 0.3, OPCIONES_INICIALES);
          const b: Estado = evaluar(sec, u.paso, u.t, OPCIONES_INICIALES);
          expect(JSON.stringify(b)).toBe(JSON.stringify(a));
        }
      });

      it('termina cada paso en el estado con el que empieza el siguiente', () => {
        for (let paso = 0; paso < sec.pasos.length - 1; paso++) {
          const fin = evaluar(sec, paso, 1, OPCIONES_INICIALES);
          const ini = evaluar(sec, paso + 1, 0, OPCIONES_INICIALES);
          // La figura no salta entre pasos (la cámara y la pose pueden empezar a moverse después).
          expect(largoV(restaV(fin.figuras[0].pos, ini.figuras[0].pos))).toBeLessThan(1e-6);
        }
      });
    });
  }
});

describe('maniquí', () => {
  it('el IK alcanza objetivos dentro del brazo con la longitud exacta de los huesos', () => {
    const r = ik2([0, 1.4, 0], [0.2, 1.1, 0.3], 0.29, 0.255, [1, -0.5, -0.5]);
    expect(largoV(restaV(r.medio, [0, 1.4, 0]))).toBeCloseTo(0.29, 5);
    expect(largoV(restaV(r.fin, r.medio))).toBeCloseTo(0.255, 5);
    expect(largoV(restaV(r.fin, [0.2, 1.1, 0.3]))).toBeLessThan(1e-6);
  });

  it('estira el brazo hacia objetivos fuera de alcance sin romperlo', () => {
    const r = ik2([0, 1.4, 0], [0, 1.4, 2], 0.29, 0.255, [0, -1, 0]);
    expect(largoV(restaV(r.fin, [0, 1.4, 0]))).toBeCloseTo(0.545, 3);
  });
});
