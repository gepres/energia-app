import { describe, expect, it } from 'vitest';
import { DUDAS, EJERCICIOS, ORGANOS, fraseOrgano } from '../contenido/ejercicios';
import { MeshBasicMaterial } from 'three';
import { NEUTRA, ik2, resolverEsqueleto } from '../escena/cuerpo';
import { crearManos, huecoPalma } from '../escena/manos';
import type { Estado } from '../escena/estado';
import { largoV, restaV } from '../escena/mate';
import { SECUENCIAS } from './index';
import { OPCIONES_INICIALES, duracionTotal, evaluar, ubicar } from './motor';
import { faseSellado } from './sellarCielo';

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
  it('conserva los 12 de referencia (7 del documento y 5 de las notas) y suma los nuevos', () => {
    expect(EJERCICIOS.filter((e) => e.origen === 'set2026')).toHaveLength(7);
    expect(EJERCICIOS.filter((e) => e.origen === 'notas')).toHaveLength(5);
    expect(EJERCICIOS.filter((e) => e.origen === 'revision').map((e) => e.id)).toContain('cargar-ombligo');
    expect(new Set(EJERCICIOS.map((e) => e.id)).size).toBe(EJERCICIOS.length);
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

describe('manos articuladas', () => {
  const e = resolverEsqueleto(NEUTRA);
  const manos = crearManos(new MeshBasicMaterial());
  const puntas = (cierre: number) => {
    manos.actualizar(e, cierre, cierre);
    manos.raiz.updateMatrixWorld(true);
    // Hueso 3 = base de la falange distal del índice de la mano derecha.
    return manos.raiz.children.map((h) => h.position.toArray() as [number, number, number]);
  };

  it('arma una sola malla con un hueso por pieza y posiciones finitas', () => {
    expect(manos.malla.skeleton.bones).toHaveLength(32);
    for (const p of puntas(0.3)) expect(p.every(Number.isFinite)).toBe(true);
  });

  it('pone el pulgar del lado de afuera en la posición anatómica (palmas al frente)', () => {
    const anatomica = resolverEsqueleto({
      ...NEUTRA,
      palmaD: [0, 0, 1],
      palmaI: [0, 0, 1],
      dedosD: [0, -1, 0],
      dedosI: [0, -1, 0],
    });
    manos.actualizar(anatomica, 0, 0);
    const h = manos.raiz.children;
    // Hueso 15 = punta del pulgar derecho; 31 = del izquierdo. El derecho está en −X.
    expect(h[15].position.x).toBeLessThan(anatomica.munecaD[0] - 0.02);
    expect(h[31].position.x).toBeGreaterThan(anatomica.munecaI[0] + 0.02);
  });

  it('el hueco de la palma queda del lado de la palma, no del dorso', () => {
    const { munecaD: w, palmaD: pm } = e;
    const p = huecoPalma(w, pm.dedos, pm.normal, 0.04);
    const d: [number, number, number] = [p[0] - w[0], p[1] - w[1], p[2] - w[2]];
    const enNormal = d[0] * pm.normal[0] + d[1] * pm.normal[1] + d[2] * pm.normal[2];
    const enDedos = d[0] * pm.dedos[0] + d[1] * pm.dedos[1] + d[2] * pm.dedos[2];
    expect(enNormal).toBeGreaterThan(0.045);
    expect(enDedos).toBeGreaterThan(0.03);
    expect(enDedos).toBeLessThan(0.09);
  });

  it('cerrar la mano acerca los dedos a la muñeca', () => {
    const dist = (c: number) => {
      const p = puntas(c)[3];
      return Math.hypot(p[0] - e.munecaD[0], p[1] - e.munecaD[1], p[2] - e.munecaD[2]);
    };
    const abierta = dist(0);
    expect(abierta).toBeGreaterThan(0.12);
    expect(abierta).toBeLessThan(0.18);
    expect(dist(1)).toBeLessThan(abierta - 0.03);
  });
});

describe('Cargar el ombligo (descrito en el taller)', () => {
  const sec = SECUENCIAS['cargar-ombligo'];
  const cuenta = (t: number) => {
    const c = evaluar(sec, 1, t, OPCIONES_INICIALES).hud.contador;
    const m = c?.etiqueta.match(/derecha (\d+) · izquierda (\d+)/);
    return m ? { d: Number(m[1]), i: Number(m[2]), total: c!.valor } : null;
  };

  it('alterna las manos: nunca hay más de una carga de diferencia entre derecha e izquierda', () => {
    let previa = { d: 0, i: 0 };
    for (let k = 0; k <= 400; k++) {
      const c = cuenta(k / 400);
      if (!c) continue;
      expect(Math.abs(c.d - c.i), `t=${k / 400}`).toBeLessThanOrEqual(1);
      expect(c.d).toBeGreaterThanOrEqual(c.i); // empieza la derecha
      expect(c.d + c.i).toBe(c.total);
      expect(c.d).toBeGreaterThanOrEqual(previa.d);
      expect(c.i).toBeGreaterThanOrEqual(previa.i);
      previa = c;
    }
    expect(previa).toMatchObject({ d: 15, i: 15 });
  });

  it('mantiene los brazos estirados al agarrar las barras (muñeca a más de 0,5 m del hombro)', () => {
    const e = evaluar(sec, 0, 1, OPCIONES_INICIALES);
    const esq = resolverEsqueleto(e.figuras[0].pose);
    expect(largoV(restaV(esq.munecaD, esq.hombroD))).toBeGreaterThan(0.5);
    expect(largoV(restaV(esq.munecaI, esq.hombroI))).toBeGreaterThan(0.5);
  });
});

describe('Sellar desde el cielo (descrito en el taller)', () => {
  const sec = SECUENCIAS['sellar-cielo'];
  const dur = sec.pasos[1].dur;
  const esqEn = (paso: number, t: number) => resolverEsqueleto(evaluar(sec, paso, t, OPCIONES_INICIALES).figuras[0].pose);
  /** Primer instante (t del paso 2) en que el gesto está en esa vez y fase con ese avance. */
  const instante = (vez: number, fase: string, k: number) => {
    for (let i = 0; i <= 4000; i++) {
      const f = faseSellado((i / 4000) * dur);
      if (f.vez === vez && f.fase === fase && f.k >= k) return i / 4000;
    }
    throw new Error(`no hay ${fase} ${vez}`);
  };

  it('termina el paso 1 con las dos manos estiradas arriba, tocando la nube', () => {
    const e = esqEn(0, 1);
    expect(e.munecaD[1]).toBeGreaterThan(1.9);
    expect(e.munecaI[1]).toBeGreaterThan(1.9);
    const n = evaluar(sec, 0, 1, OPCIONES_INICIALES).nube;
    expect(n.activa).toBe(true);
    // Las puntas de los dedos (≈ 17 cm más arriba de la muñeca) entran en la base de la nube.
    expect(e.munecaD[1] + 0.17).toBeGreaterThan(n.centro[1] - n.radio * 0.38);
  });

  it('baja los brazos abiertos por los costados (en cruz a mitad de camino)', () => {
    const e = esqEn(1, instante(0, 'bajar', 0.5));
    expect(e.munecaD[0]).toBeLessThan(-0.55);
    expect(e.munecaI[0]).toBeGreaterThan(0.55);
    expect(Math.abs(e.munecaD[1] - 1.415)).toBeLessThan(0.15);
  });

  it('cuenta 3 veces, sin saltos, y termina con las manos sueltas a los costados', () => {
    let previo = 0;
    for (let i = 0; i <= 300; i++) {
      const c = evaluar(sec, 1, i / 300, OPCIONES_INICIALES).hud.contador!;
      expect(c.valor - previo).toBeGreaterThanOrEqual(0);
      expect(c.valor - previo).toBeLessThanOrEqual(1);
      previo = c.valor;
    }
    expect(previo).toBe(3);
    const e = esqEn(1, 1);
    expect(e.munecaD[1]).toBeLessThan(1.0);
    expect(Math.abs(e.munecaD[0])).toBeLessThan(0.3);
  });
});

