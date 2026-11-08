import { describe, expect, it } from 'vitest';
import { DUDAS, EJERCICIOS, ORGANOS, fraseOrgano } from '../contenido/ejercicios';
import { MeshBasicMaterial } from 'three';
import { NEUTRA, PUNTOS, ik2, resolverEsqueleto } from '../escena/cuerpo';
import { crearManos, huecoPalma, segmentosMano } from '../escena/manos';
import type { Estado } from '../escena/estado';
import { largoV, restaV } from '../escena/mate';
import { SECUENCIAS } from './index';
import { OPCIONES_INICIALES, duracionTotal, evaluar, ubicar } from './motor';
import { faseSellado } from './sellarCielo';
import { faseUnir } from './unirBarras';
import { masajeInterno } from './masajeManos';

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
    manos.actualizar(e, { ...NEUTRA, cierreD: cierre, cierreI: cierre });
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
    manos.actualizar(anatomica, { ...NEUTRA, cierreD: 0, cierreI: 0 });
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

  it('al bajar, las palmas giran hacia el piso y las manos se abren poco a poco', () => {
    const al = (k: number) => {
      const e = evaluar(sec, 1, instante(0, 'bajar', k), OPCIONES_INICIALES);
      return { cierre: e.figuras[0].pose.cierreD, palma: resolverEsqueleto(e.figuras[0].pose).palmaD.normal };
    };
    const inicio = al(0.05);
    const mitad = al(0.5);
    const final = al(0.95);
    expect(inicio.cierre).toBeGreaterThan(0.6); // todavía agarra la nube
    expect(mitad.cierre).toBeLessThan(inicio.cierre);
    expect(final.cierre).toBeLessThan(0.02); // del todo abierta
    expect(inicio.palma[1]).toBeGreaterThan(-0.3); // arriba la palma mira al frente
    expect(mitad.palma[1]).toBeLessThan(-0.7); // en cruz ya mira al piso
    expect(final.palma[1]).toBeLessThan(-0.8);
  });

  it('la tela baja con su ruedo en las manos y termina en el piso envolviendo el cuerpo', () => {
    for (const k of [0.2, 0.5, 0.8]) {
      const e = evaluar(sec, 1, instante(0, 'bajar', k), OPCIONES_INICIALES);
      const esq = resolverEsqueleto(e.figuras[0].pose);
      const t = e.telas[1];
      expect(t.activa).toBe(true);
      expect(Math.abs(t.borde - esq.munecaD[1]), `k=${k}`).toBeLessThan(0.06);
      expect(Math.abs(t.ancho - Math.abs(esq.munecaD[0])), `k=${k}`).toBeLessThan(0.1);
    }
    const fin = evaluar(sec, 1, 1, OPCIONES_INICIALES).telas[0];
    expect(fin.activa).toBe(true);
    expect(fin.borde).toBeLessThan(0.05);
    // Más ancha que los hombros y los brazos sueltos: envuelve el cuerpo sin atravesarlo.
    expect(fin.ancho).toBeGreaterThan(0.4);
  });

  it('entre una vez y otra, las manos vuelven a subir por los costados (en cruz a mitad de camino)', () => {
    const e = esqEn(1, instante(0, 'subir', 0.55));
    expect(e.munecaD[0]).toBeLessThan(-0.5);
    expect(e.munecaI[0]).toBeGreaterThan(0.5);
    expect(Math.abs(e.munecaD[2])).toBeLessThan(0.12); // no van por delante
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

describe('Colocar energía en los 3 puntos (descrito en el taller)', () => {
  const sec = SECUENCIAS['colocar-tres-puntos'];
  const centros = ['ombligo', 'corazon', 'frente'] as const;
  const dur = sec.pasos[1].dur;
  /** Primer t del paso de un centro en que el ciclo está en esa fase con ese avance. */
  const instante = (fase: string, k: number) => {
    for (let i = 0; i <= 3000; i++) {
      const f = faseUnir((i / 3000) * dur);
      if (f.fase === fase && f.k >= k) return i / 3000;
    }
    throw new Error(`no hay ${fase}`);
  };

  it('tiene un paso para agarrar las barras y uno por cada centro', () => {
    expect(sec.pasos).toHaveLength(4);
  });

  it('une las esferas a la altura de las barras, con los brazos estirados, y juega con ella como goma', () => {
    const e = evaluar(sec, 1, instante('unir', 0.97), OPCIONES_INICIALES);
    const esq = resolverEsqueleto(e.figuras[0].pose);
    for (const [m, h] of [
      [esq.munecaD, esq.hombroD],
      [esq.munecaI, esq.hombroI],
    ]) {
      expect(Math.abs(m[1] - 1.41)).toBeLessThan(0.05);
      expect(Math.hypot(m[0] - h[0], m[1] - h[1], m[2] - h[2])).toBeGreaterThan(0.48);
    }
    // Durante el juego (≈ 4 s) la esfera se estira y se aplasta con las manos.
    const estirar: number[] = [];
    for (let i = 0; i <= 40; i++) estirar.push(evaluar(sec, 1, instante('jugar', (i / 40) * 0.98), OPCIONES_INICIALES).esferas[1].estirar);
    expect(Math.max(...estirar)).toBeGreaterThan(1.3);
    expect(Math.min(...estirar)).toBeLessThan(0.85);
  });

  it('al juntar, las manos no se retraen y la esfera se forma entre las barras, en su plano', () => {
    const zAgarre = resolverEsqueleto(evaluar(sec, 1, 0.01, OPCIONES_INICIALES).figuras[0].pose).munecaD[2];
    for (const [fase, k] of [
      ['juntar', 0.5],
      ['juntar', 0.95],
      ['unir', 0.9],
      ['jugar', 0.25],
      ['jugar', 0.6],
    ] as const) {
      const e = evaluar(sec, 1, instante(fase, k), OPCIONES_INICIALES);
      const esq = resolverEsqueleto(e.figuras[0].pose);
      // Las muñecas no vuelven hacia el cuerpo más de 1 cm respecto de cuando agarran las barras.
      expect(esq.munecaD[2], `${fase} ${k}`).toBeGreaterThan(zAgarre - 0.01);
      expect(esq.munecaI[2], `${fase} ${k}`).toBeGreaterThan(zAgarre - 0.01);
      // Brazos estirados: la muñeca llega a donde se la pide (dentro del alcance).
      const d = Math.hypot(esq.munecaD[0] - esq.hombroD[0], esq.munecaD[1] - esq.hombroD[1], esq.munecaD[2] - esq.hombroD[2]);
      expect(d, `${fase} ${k}`).toBeGreaterThan(0.53);
      expect(d, `${fase} ${k}`).toBeLessThanOrEqual(0.545);
      // Y la mano llega a donde la pide la pose (si quedara corta, las palmas no tocarían la esfera).
      const objetivo = e.figuras[0].pose.manoD;
      expect(Math.hypot(esq.munecaD[0] - objetivo[0], esq.munecaD[1] - objetivo[1], esq.munecaD[2] - objetivo[2]), `${fase} ${k}`).toBeLessThan(0.003);
    }
    // La esfera unida queda entre las barras: a su altura y a menos de 4 cm de su plano.
    const unida = evaluar(sec, 1, instante('jugar', 0.5), OPCIONES_INICIALES);
    const c = unida.esferas[1].pos;
    expect(Math.abs(c[1] - 1.41)).toBeLessThan(0.02);
    expect(Math.abs(c[2] - unida.barras.der[2])).toBeLessThan(0.04);
  });

  centros.forEach((id, n) => {
    it(`une las esferas y entra la energía en ${id}`, () => {
      const paso = n + 1;
      // Antes de unirse: cada mano trae su esfera.
      const antes = evaluar(sec, paso, instante('juntar', 0.9), OPCIONES_INICIALES);
      expect(antes.esferas[2].activa && antes.esferas[3].activa).toBe(true);
      // Unidas: una sola esfera, más grande que las de cada mano.
      const unida = evaluar(sec, paso, instante('llevar', 0.2), OPCIONES_INICIALES);
      expect(unida.esferas[2].activa || unida.esferas[3].activa).toBe(false);
      expect(unida.esferas[1].radio).toBeGreaterThan(antes.esferas[2].radio * 1.5);
      // Entrando: las manos delante del centro con las palmas hacia el cuerpo.
      const entra = evaluar(sec, paso, instante('entrar', 0.3), OPCIONES_INICIALES);
      const esq = resolverEsqueleto(entra.figuras[0].pose);
      expect(esq.palmaD.normal[2]).toBeLessThan(-0.7);
      expect(esq.palmaI.normal[2]).toBeLessThan(-0.7);
      expect(Math.abs(esq.palmaD.centro[1] - PUNTOS[id][1])).toBeLessThan(0.12);
      // Después: el centro encendido y el contador sumó uno.
      const despues = evaluar(sec, paso, instante('volver', 0.1), OPCIONES_INICIALES);
      expect(despues.centros[id]).toBeGreaterThan(0.9);
      expect(despues.hud.contador?.valor).toBe(n + 1);
    });
  });

  it('termina con los tres centros encendidos y las manos sueltas a los costados', () => {
    const e = evaluar(sec, 3, 1, OPCIONES_INICIALES);
    for (const id of centros) expect(e.centros[id]).toBeGreaterThan(0.9);
    // Las tres cargas son iguales y ninguna se lleva la luz que alumbra el cuerpo.
    const cargas = [4, 5, 6].map((i) => e.esferas[i]);
    for (const c of cargas) {
      expect(c.activa).toBe(true);
      expect(c.ilumina).toBe(false);
      expect(c.radio).toBeCloseTo(cargas[0].radio, 6);
      expect(c.brillo).toBe(cargas[0].brillo);
    }
    const esq = resolverEsqueleto(e.figuras[0].pose);
    expect(esq.munecaD[1]).toBeLessThan(1.0);
  });
});

describe('Masaje de manos y dedos (descrito en el taller)', () => {
  const { RECORRIDO, tomar, poseMasaje } = masajeInterno;
  /** Distancia mínima entre dos piezas (cilindros), por muestreo de sus ejes. */
  const holgura = (A: { pos: number[]; dir: number[]; largo: number; radio: number }, B: typeof A) => {
    let m = 1e9;
    for (let i = 0; i <= 8; i++)
      for (let j = 0; j <= 8; j++) {
        const a = [0, 1, 2].map((k) => A.pos[k] + A.dir[k] * A.largo * (i / 8));
        const b = [0, 1, 2].map((k) => B.pos[k] + B.dir[k] * B.largo * (j / 8));
        m = Math.min(m, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      }
    return m - A.radio - B.radio;
  };

  for (const [masajeada, masajea, s] of [
    ['I', 'D', 1],
    ['D', 'I', -1],
  ] as const) {
    it(`la mano ${masajea === 'D' ? 'derecha' : 'izquierda'} toma cada zona y cada falange sin atravesar la otra mano`, () => {
      const paradas = RECORRIDO[masajeada];
      expect(paradas.filter((p) => p.tipo === 'palma')).toHaveLength(5);
      expect(paradas.filter((p) => p.tipo === 'falange')).toHaveLength(14);
      for (const p of paradas) {
        const nombre = `${p.dedo ?? 'palma'} ${p.falange ?? ''}`;
        const m = tomar(masajea, p);
        const esq = resolverEsqueleto(poseMasaje(masajeada, p, m));
        const muneca = masajea === 'D' ? esq.munecaD : esq.munecaI;
        // El brazo llega: la muñeca está donde la pide la pinza.
        expect(Math.hypot(muneca[0] - m.muneca[0], muneca[1] - m.muneca[1], muneca[2] - m.muneca[2]), nombre).toBeLessThan(0.003);
        const pm = masajea === 'D' ? esq.palmaD : esq.palmaI;
        const segs = segmentosMano(muneca, pm.dedos, pm.normal, s, 0.12, 1, p.pinza === 'dedo' ? 1 : 0);
        // Pulgar arriba y el índice abajo de lo que se toma.
        const pul = segs[15];
        const yema = [0, 1, 2].map((i) => pul.pos[i] + pul.dir[i] * pul.largo - p.C[i]);
        const arriba = yema[0] * p.n[0] + yema[1] * p.n[1] + yema[2] * p.n[2];
        expect(arriba, `${nombre}: pulgar arriba`).toBeGreaterThan(0.008);
        expect(arriba, `${nombre}: pulgar arriba`).toBeLessThan(0.03);
        const idx = segs[1];
        const w = [0, 1, 2].map((i) => p.C[i] - idx.pos[i]);
        const t = Math.max(0, Math.min(idx.largo, w[0] * idx.dir[0] + w[1] * idx.dir[1] + w[2] * idx.dir[2]));
        const abajo = [0, 1, 2].map((i) => idx.pos[i] + idx.dir[i] * t - p.C[i]);
        expect(abajo[0] * p.n[0] + abajo[1] * p.n[1] + abajo[2] * p.n[2], `${nombre}: índice abajo`).toBeLessThan(-0.008);
        // Realismo: la mano que masajea no atraviesa los otros dedos de la masajeada (tolerancia 4 mm).
        const pt = masajeada === 'I' ? esq.palmaI : esq.palmaD;
        const mt = masajeada === 'I' ? esq.munecaI : esq.munecaD;
        const pose = poseMasaje(masajeada, p, m);
        const cierreT = masajeada === 'I' ? pose.cierreI : pose.cierreD;
        const [aislado, aislar] = masajeada === 'I' ? [pose.aisladoI, pose.aislarI] : [pose.aisladoD, pose.aislarD];
        const objetivo = segmentosMano(mt, pt.dedos, pt.normal, -s, cierreT, 0, 0, aislado, aislar);
        for (let a = 1; a < 16; a++)
          for (let b = 1; b < 16; b++) {
            const B = objetivo[b];
            const tomada = Math.hypot(B.pos[0] + (B.dir[0] * B.largo) / 2 - p.C[0], B.pos[1] + (B.dir[1] * B.largo) / 2 - p.C[1], B.pos[2] + (B.dir[2] * B.largo) / 2 - p.C[2]) < 0.002;
            if (tomada) continue;
            expect(holgura(segs[a], B), `${nombre}: pieza ${a} contra pieza ${b}`).toBeGreaterThan(-0.004);
          }
      }
    });
  }

  it('recorre los dedos desde el meñique hasta el índice y al final el pulgar, falange por falange', () => {
    const dedos = RECORRIDO.I.filter((p) => p.tipo === 'falange').map((p) => `${p.dedo}${p.falange}`);
    expect(dedos).toEqual(['meñique1', 'meñique2', 'meñique3', 'anular1', 'anular2', 'anular3', 'medio1', 'medio2', 'medio3', 'índice1', 'índice2', 'índice3', 'pulgar1', 'pulgar2']);
    const sec = SECUENCIAS['masaje-manos'];
    // Primero masajea la derecha (paso 2) y después la izquierda (paso 4).
    expect(evaluar(sec, 1, 0.5, OPCIONES_INICIALES).figuras[0].pose.pinzaD).toBe(1);
    expect(evaluar(sec, 3, 0.5, OPCIONES_INICIALES).figuras[0].pose.pinzaI).toBe(1);
    let previo = 0;
    for (let i = 0; i <= 200; i++) {
      const v = evaluar(sec, 1, i / 200, OPCIONES_INICIALES).hud.contador?.valor ?? 0;
      expect(v).toBeGreaterThanOrEqual(previo);
      previo = v;
    }
    expect(previo).toBe(5);
  });
});
