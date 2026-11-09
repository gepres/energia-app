import { describe, expect, it } from 'vitest';
import { DUDAS, EJERCICIOS, ORGANOS, fraseOrgano } from '../contenido/ejercicios';
import { MeshBasicMaterial } from 'three';
import { NEUTRA, PROP, PUNTOS, ik2, resolverEsqueleto, transformarPunto } from '../escena/cuerpo';
import { crearManos, huecoPalma, segmentosMano } from '../escena/manos';
import type { Estado } from '../escena/estado';
import { largoV, restaV, rotarX } from '../escena/mate';
import { SECUENCIAS } from './index';
import { OPCIONES_INICIALES, type Opciones, PAUSA_RESPIRACION, RITMOS, type Ritmo, cicloRespiracion, durPaso, duracionTotal, evaluar, inicios, ubicar } from './motor';
import { faseSellado } from './sellarCielo';
import { faseUnir } from './unirBarras';
import { DUR_CARGAS, SEG_ANTES, SEG_CICLO, DESFASE } from './cargarOmbligo';
import { GIRAR_INGLES, INGLE_DER, INGLE_IZQ } from '../escena/poses';
import { masajeInterno } from './masajeManos';
import { chakrasInterno } from './recorridoPorChakras';
import { sensibilizarInterno } from './sensibilizarManos';
import { DIST_MANOS, PIEL_CENTRO, R_UNIDA, SEG } from './unirBarras';
import { SERENA } from '../escena/poses';
import { PERFIL_MUSLO, PERFIL_PIERNA, PLANO_MUSLO, PLANO_PIERNA, altoPie, bajoPie, crearGeometrias, crearTorso, radioMiembro } from '../escena/cuerpoGeo';
import { PRIMERA, SEGUNDA, piernasInterno } from './sensibilizarPiernas';
import { AGARRES, ANCLA, BOCA_CUCLILLAS, HUECO_DONA, PECHO, R_CIELO, R_TIERRA, R_TUBO, enraizarInterno } from './enraizarMaterial';
import { DONA_ANILLO, DONA_GROSOR } from '../escena/estado';
import { D_ENTRA, D_LEJOS, FRASES, SEG_GOMA, activacionInterno, dJunto, type IdCentro } from './activacionCentros';
import { GROSOR_MANO, OMBLIGO, SEG_RETENER, selladoInterno } from './selladoOmbligo';
import { Euler, Matrix4, Vector3, type BufferGeometry } from 'three';

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
              const e = evaluar(sec, paso, t, { ...OPCIONES_INICIALES, organo });
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

/** Piel del torso, el cuello y la cabeza (vértices y normales) en una pose. */
function pielDelCuerpo(e: Estado) {
  const q = resolverEsqueleto(e.figuras[0].pose);
  const torso = crearTorso();
  torso.deformar(q);
  const g = crearGeometrias();
  const piezas: [BufferGeometry, Matrix4][] = [
    [torso.geometry, new Matrix4()],
    [g.cuello, new Matrix4().makeRotationFromEuler(new Euler(q.inclinar, q.girar, 0, 'YXZ')).setPosition(...q.cuello)],
    [g.cabeza, new Matrix4().makeRotationFromEuler(new Euler(q.cabezaPitch, q.cabezaYaw, 0, 'YXZ')).setPosition(...q.cabeza)],
  ];
  const pts: number[][] = [];
  const nor: number[][] = [];
  const v = new Vector3();
  for (const [geo0, m] of piezas) {
    const geo = geo0;
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    const pos = geo.getAttribute('position');
    const nrm = geo.getAttribute('normal');
    const rot = new Matrix4().extractRotation(m);
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m);
      pts.push([v.x, v.y, v.z]);
      v.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).applyMatrix4(rot).normalize();
      nor.push([v.x, v.y, v.z]);
    }
  }
  return { pts, nor };
}
/** Distancia con signo de un punto a la piel (negativa si está adentro), según el vértice más cercano. */
function distanciaConSigno(c: number[], s: { pts: number[][]; nor: number[][] }) {
  let m = 1e9;
  let k = 0;
  s.pts.forEach((q, i) => {
    const d = Math.hypot(c[0] - q[0], c[1] - q[1], c[2] - q[2]);
    if (d < m) {
      m = d;
      k = i;
    }
  });
  const n = s.nor[k];
  const lado = [0, 1, 2].reduce((a, j) => a + (c[j] - s.pts[k][j]) * n[j], 0);
  return lado < 0 ? -m : m;
}

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

  it('al entrar la energía, las manos quedan a 5–10 cm del cuerpo, sin tocarlo', () => {
    const sec = SECUENCIAS['colocar-tres-puntos'];
    const total = Object.values(SEG).reduce((a, b) => a + b, 0);
    const finEntrar = SEG.tomar + SEG.juntar + SEG.unir + SEG.jugar + SEG.llevar + SEG.rodear + SEG.entrar;
    const ids = ['ombligo', 'corazon', 'frente'] as const;
    expect(DIST_MANOS).toBeGreaterThanOrEqual(0.05);
    expect(DIST_MANOS).toBeLessThanOrEqual(0.1);
    ids.forEach((id, n) => {
      let minimo = Infinity;
      // Durante toda la entrada y el comienzo de la vuelta, la palma nunca baja de 5 cm de la piel.
      for (let i = 0; i <= 40; i++) {
        const seg = finEntrar - SEG.entrar + (SEG.entrar + 0.3) * (i / 40);
        const esq = resolverEsqueleto(evaluar(sec, 1 + n, seg / total, OPCIONES_INICIALES).figuras[0].pose);
        for (const [m, p] of [
          [esq.munecaD, esq.palmaD],
          [esq.munecaI, esq.palmaI],
        ] as const) {
          const palma = huecoPalma(m, p.dedos, p.normal, 0);
          minimo = Math.min(minimo, palma[2] - PIEL_CENTRO[id]);
        }
      }
      expect(minimo, id).toBeGreaterThanOrEqual(0.05);
      expect(minimo, id).toBeLessThanOrEqual(0.1);
    });
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

describe('Recorrido por chakras (descrito en el taller)', () => {
  const { PARADAS, TRAMOS, PAUSA, ARRIBA, CURVA, puntoEnCurva, enRecorrido, atraves, DUR_FINAL, SEG_FINAL, INICIO_MANOS } = chakrasInterno;
  const sec = SECUENCIAS['recorrido-por-chakras'];

  it('baja por la espalda, pasa por el centro de abajo y sube por el frente, en el orden del taller', () => {
    expect(PARADAS.map((p) => p.nombre)).toEqual([
      'detrás de la frente',
      'detrás de la garganta',
      'detrás del pecho',
      'detrás del ombligo',
      'detrás de la ingle',
      'centro de abajo',
      'ingle',
      'ombligo',
      'centro del pecho',
      'garganta',
      'centro de la frente',
    ]);
    // Las cinco primeras por detrás (bajando), el centro de abajo y las de adelante, subiendo.
    const atras = PARADAS.slice(0, 5);
    const abajo = PARADAS[5];
    const adelante = PARADAS.slice(6);
    for (const p of atras) expect(p.pos[2]).toBeLessThan(0);
    for (const p of adelante) expect(p.pos[2]).toBeGreaterThan(0);
    for (let i = 1; i < atras.length; i++) expect(atras[i].pos[1]).toBeLessThan(atras[i - 1].pos[1]);
    for (let i = 1; i < adelante.length; i++) expect(adelante[i].pos[1]).toBeGreaterThan(adelante[i - 1].pos[1]);
    // Las de atrás a la altura de las de adelante: la frente y la ingle.
    expect(atras[0].pos[1]).toBeCloseTo(adelante[adelante.length - 1].pos[1], 6);
    expect(atras[4].pos[1]).toBeCloseTo(adelante[0].pos[1], 6);
    // El centro de abajo: en la misma vertical que la coronilla, debajo del cuerpo, y se ve a través de las piernas.
    expect(abajo.pos[0]).toBe(0);
    expect(abajo.pos[2]).toBe(0);
    expect(abajo.pos[1]).toBeLessThan(PUNTOS.perineo[1]);
    expect(atraves(abajo.pos)).toBe(1);
    for (const p of [...atras, ...adelante]) expect(atraves(p.pos), p.nombre).toBe(0);
    // Empieza y termina arriba de la coronilla.
    expect(CURVA[0]).toEqual(ARRIBA);
    expect(CURVA[CURVA.length - 1]).toEqual(ARRIBA);
  });

  it('se detiene 2 s en cada punto, quieta, y llega justo a cada uno', () => {
    expect(PAUSA).toBe(2);
    for (const tr of TRAMOS.filter((x) => x.i >= 0)) {
      const llega = tr.inicio + tr.viaje;
      const a = puntoEnCurva(enRecorrido(llega + 0.01).s);
      const b = puntoEnCurva(enRecorrido(llega + PAUSA - 0.01).s);
      expect(largoV(restaV(a, b)), PARADAS[tr.i].nombre).toBeLessThan(1e-9);
      expect(largoV(restaV(a, PARADAS[tr.i].pos)), PARADAS[tr.i].nombre).toBeLessThan(1e-6);
      expect(enRecorrido(llega + 1).pausa).not.toBeNull();
    }
  });

  it('se desliza pegada al cuerpo sin atravesarlo (salvo al pasar entre las piernas)', () => {
    const e = resolverEsqueleto(SERENA);
    const torso = crearTorso();
    torso.deformar(e);
    const g = crearGeometrias();
    const piezas: [BufferGeometry, Matrix4][] = [
      [torso.geometry, new Matrix4()],
      [g.cuello, new Matrix4().makeRotationFromEuler(new Euler(e.inclinar, 0, 0)).setPosition(...e.cuello)],
      [g.cabeza, new Matrix4().makeRotationFromEuler(new Euler(e.cabezaPitch, e.cabezaYaw, 0, 'YXZ')).setPosition(...e.cabeza)],
    ];
    const piel: number[][] = [];
    const v = new Vector3();
    for (const [geo, m] of piezas) {
      const pos = geo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m);
        piel.push([v.x, v.y, v.z]);
      }
    }
    const libre = (c: number[]) => Math.min(...piel.map((q) => Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]))) - R_UNIDA;
    for (const c of CURVA.filter((p) => p[1] > 0.87)) expect(libre(c), `esfera en ${c.map((x) => x.toFixed(3))}`).toBeGreaterThan(0);
    // En cada parada queda pegada: a menos de 2,5 cm de la piel.
    for (const p of PARADAS) expect(libre(p.pos), p.nombre).toBeLessThan(0.025);
  });

  it('las dos manos la bajan entre las palmas, ayudan a introducirla y al final se sueltan a los costados', () => {
    const ultimo = sec.pasos.length - 1;
    const en = (seg: number) => evaluar(sec, ultimo, seg / DUR_FINAL, OPCIONES_INICIALES);
    const { subir, tomar, bajar, entrar } = SEG_FINAL;
    // Al bajarla, la tienen entre las palmas enfrentadas, encima de la cabeza.
    const bajando = resolverEsqueleto(en(INICIO_MANOS + subir + tomar + bajar * 0.9).figuras[0].pose);
    for (const m of [bajando.munecaD, bajando.munecaI]) {
      expect(m[1]).toBeGreaterThan(PUNTOS.coronilla[1]);
      expect(Math.abs(m[0])).toBeLessThan(0.12);
    }
    expect(bajando.palmaD.normal[0]).toBeGreaterThan(0.9);
    expect(bajando.palmaI.normal[0]).toBeLessThan(-0.9);
    // Mientras entra, las manos la acompañan hacia adentro.
    const entrando = en(INICIO_MANOS + subir + tomar + bajar + entrar * 0.5);
    expect(entrando.esferas[1].radio).toBeLessThan(R_UNIDA);
    // Ya adentro, las palmas quedan sobre la coronilla, hacia abajo y hacia el centro, sin apoyarse en la cabeza.
    const dentro = en(INICIO_MANOS + subir + tomar + bajar + entrar + 0.5);
    const esq = resolverEsqueleto(dentro.figuras[0].pose);
    expect(esq.palmaD.normal[1]).toBeLessThan(-0.5);
    expect(esq.palmaI.normal[1]).toBeLessThan(-0.5);
    expect(esq.palmaD.normal[0]).toBeGreaterThan(0.5);
    expect(esq.palmaI.normal[0]).toBeLessThan(-0.5);
    for (const m of [esq.munecaD, esq.munecaI]) {
      expect(m[1]).toBeGreaterThan(1.62);
      expect(Math.abs(m[0])).toBeGreaterThan(0.09);
      expect(Math.abs(m[0])).toBeLessThan(0.16);
    }
    expect(dentro.esferas[1].activa).toBe(false);
    const fin = evaluar(sec, ultimo, 1, OPCIONES_INICIALES);
    expect(fin.esferas[1].activa).toBe(false);
    expect(fin.centros.coronilla).toBeGreaterThan(0.9);
    const f = resolverEsqueleto(fin.figuras[0].pose);
    expect(f.munecaD[1]).toBeLessThan(1);
    expect(f.munecaI[1]).toBeLessThan(1);
  });

  it('cuenta los 11 puntos en orden y la esfera se forma con las barras como en el ejercicio 03', () => {
    let previo = 0;
    for (const paso of [2, 3]) {
      for (let i = 0; i <= 300; i++) {
        const v = evaluar(sec, paso, i / 300, OPCIONES_INICIALES).hud.contador?.valor ?? 0;
        expect(v).toBeGreaterThanOrEqual(previo);
        previo = v;
      }
    }
    expect(previo).toBe(11);
    const formada = evaluar(sec, 0, 1, OPCIONES_INICIALES);
    expect(formada.esferas[1].activa).toBe(true);
    expect(formada.esferas[1].radio).toBeCloseTo(R_UNIDA, 6);
  });
});

describe('Sensibilización de manos (descrito en el taller)', () => {
  const sec = SECUENCIAS['sensibilizacion-manos'];
  const {
    BRAZOS,
    R,
    DIST,
    FASES_DELANTE,
    FASES_ATRAS,
    FASES_TOMAR,
    FASES_TRASPASO,
    SEG_TRASPASO,
    PAUSA_TRASPASO,
    ORDEN_TRASPASOS,
    ORDEN_TRASPASOS_2,
    PRIMERO,
    SEGUNDO,
    CIERRE_CUBRIR,
    PALMA_SOBRE,
    GOMA_DEDO,
    GOMA,
    TRAMOS_BRAZO,
    SEG_PUNTO,
  } = sensibilizarInterno;
  const muestras = (paso: number, n = 120) => Array.from({ length: n + 1 }, (_, i) => evaluar(sec, paso, i / n, OPCIONES_INICIALES));
  /** Punto del hueco de cada palma, según el esqueleto resuelto. */
  const palmas = (e: Estado) => {
    const q = resolverEsqueleto(e.figuras[0].pose);
    return { D: huecoPalma(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 0), I: huecoPalma(q.munecaI, q.palmaI.dedos, q.palmaI.normal, 0), q };
  };
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  it('los brazos llegan siempre a donde se los pide (la mano no se queda corta)', () => {
    for (let paso = 0; paso < sec.pasos.length; paso++) {
      for (const e of muestras(paso, 80)) {
        const p = e.figuras[0].pose;
        const q = resolverEsqueleto(p);
        expect(dist(q.munecaD, p.manoD), `paso ${paso + 1}, derecha`).toBeLessThan(0.003);
        expect(dist(q.munecaI, p.manoI), `paso ${paso + 1}, izquierda`).toBeLessThan(0.003);
      }
    }
  });

  it('primero carga de las barras, como los demás ejercicios: una esfera en cada mano, se unen y se juega como goma', () => {
    const total = FASES_TOMAR.reduce((a, f) => a + f.dur, 0);
    const inicio = (id: string) => FASES_TOMAR.slice(0, FASES_TOMAR.findIndex((f) => f.id === id)).reduce((a, f) => a + f.dur, 0);
    const en = (id: string, k: number) => evaluar(sec, 0, (inicio(id) + FASES_TOMAR.find((f) => f.id === id)!.dur * k) / total, OPCIONES_INICIALES);
    expect(FASES_TOMAR.map((f) => f.id)).toEqual(['agarrar', 'tomar', 'juntar', 'unir', 'jugar', 'bajar', 'quedarse']);
    // Agarra las barras y la energía sube de las barras a las manos.
    const tomando = en('tomar', 0.5);
    expect(tomando.barras.activa).toBe(true);
    expect(tomando.barras.opacidad).toBe(1);
    expect(tomando.flujos.filter((f) => f.activo && f.intensidad > 0.5)).toHaveLength(2);
    // Una esfera en cada mano al juntarlas; después una sola, que se estira y se aplasta como goma.
    const juntando = en('juntar', 0.8);
    expect(juntando.esferas[1].activa && juntando.esferas[2].activa).toBe(true);
    const est = Array.from({ length: 41 }, (_, i) => en('jugar', i / 40).esferas[0].estirar);
    expect(Math.max(...est)).toBeGreaterThan(1.4);
    expect(Math.min(...est)).toBeLessThan(0.88);
    // Al terminar el paso las barras se desvanecieron y la derecha tiene la esfera en la palma.
    const fin = evaluar(sec, 0, 1, OPCIONES_INICIALES);
    expect(fin.barras.opacidad).toBe(0);
    expect(dist(fin.esferas[0].pos, palmas(fin).D)).toBeLessThan(R + 0.016);
    // Desde que la bajan hasta que la derecha se queda con ella, siempre la sostiene alguna palma.
    for (let i = 0; i <= 60; i++) {
      const e = evaluar(sec, 0, (inicio('bajar') + ((total - inicio('bajar')) * i) / 60) / total, OPCIONES_INICIALES);
      const { D, I } = palmas(e);
      expect(Math.min(dist(e.esferas[0].pos, D), dist(e.esferas[0].pos, I))).toBeLessThan(R + 0.016);
    }
  });

  it('al pasarla de mano en mano nunca la sueltan: siempre hay una palma tocándola y, al pasarla, las dos', () => {
    // Si la esfera se estira (goma), las palmas la tocan aunque estén más lejos de su centro.
    const tocaEn = (e: Estado) => R * Math.max(1, e.esferas[0].estirar) + 0.016;
    let ambas = 0;
    for (const e of muestras(1, 300)) {
      const c = e.esferas[0].pos;
      const { D, I } = palmas(e);
      const dD = dist(c, D);
      const dI = dist(c, I);
      expect(Math.min(dD, dI)).toBeLessThan(tocaEn(e));
      if (dD < tocaEn(e) && dI < tocaEn(e)) ambas++;
    }
    // Hay momentos en que la sostienen entre las dos (en cada traspaso).
    expect(ambas).toBeGreaterThan(20);
    // Al ir a cubrir los dedos de cada brazo, tampoco la sueltan.
    for (const [paso, A] of [
      [2, PRIMERO],
      [6, SEGUNDO],
    ] as const) {
      const total = FASES_DELANTE[A].reduce((a, f) => a + f.dur, 0);
      for (let i = 0; i <= 80; i++) {
        const e = evaluar(sec, paso, (FASES_DELANTE[A][0].dur * i) / 80 / total, OPCIONES_INICIALES);
        const { D, I } = palmas(e);
        // Al ir a cubrir, la esfera crece hasta llenar la mano: se mide con su radio.
        const tocaR = e.esferas[0].radio + 0.016;
        expect(Math.min(dist(e.esferas[0].pos, D), dist(e.esferas[0].pos, I)), `paso ${paso + 1}`).toBeLessThan(tocaR);
      }
    }
  });

  it('al pasarla, las dos manos van al medio al mismo tiempo: una la pone arriba y la otra se pone abajo', () => {
    const total = sec.pasos[1].dur;
    const dur = FASES_TRASPASO[0].dur;
    const mitad = evaluar(sec, 1, dur / 2 / total, OPCIONES_INICIALES);
    const ini = evaluar(sec, 1, 0, OPCIONES_INICIALES);
    // A mitad del camino, las dos muñecas ya se movieron (ninguna espera a la otra).
    const q0 = resolverEsqueleto(ini.figuras[0].pose);
    const q1 = resolverEsqueleto(mitad.figuras[0].pose);
    expect(dist(q0.munecaD, q1.munecaD)).toBeGreaterThan(0.03);
    expect(dist(q0.munecaI, q1.munecaI)).toBeGreaterThan(0.03);
  });

  it('cada traspaso es lento y, con una mano arriba y otra abajo, juegan con ella como goma; queda en la de abajo', () => {
    expect(FASES_TRASPASO.map((f) => f.id)).toEqual(['juntar', 'goma', 'quedarse']);
    expect(SEG_TRASPASO).toBeGreaterThanOrEqual(8);
    const total = sec.pasos[1].dur;
    const ini = FASES_TRASPASO[0].dur;
    const dur = FASES_TRASPASO[1].dur;
    for (let n = 0; n < ORDEN_TRASPASOS.length; n++) {
      const est: number[] = [];
      for (let i = 0; i <= 40; i++) {
        const seg = n * (SEG_TRASPASO + PAUSA_TRASPASO) + ini + (dur * i) / 40;
        const e = evaluar(sec, 1, seg / total, OPCIONES_INICIALES);
        const { D, I } = palmas(e);
        const toca = R * Math.max(1, e.esferas[0].estirar) + 0.016;
        // Las dos palmas la sostienen todo el juego.
        expect(dist(e.esferas[0].pos, D), `traspaso ${n + 1}`).toBeLessThan(toca);
        expect(dist(e.esferas[0].pos, I), `traspaso ${n + 1}`).toBeLessThan(toca);
        est.push(e.esferas[0].estirar);
        // Una mano arriba (la que la da, palma hacia abajo) y otra abajo (la que la recibe, palma hacia arriba).
        const q = resolverEsqueleto(e.figuras[0].pose);
        const normal = { D: q.palmaD.normal, I: q.palmaI.normal };
        const da = ORDEN_TRASPASOS[n];
        const rec = da === 'D' ? 'I' : 'D';
        expect(normal[da][1], `traspaso ${n + 1}: la de arriba`).toBeLessThan(-0.9);
        expect(normal[rec][1], `traspaso ${n + 1}: la de abajo`).toBeGreaterThan(0.9);
        // Cuando se estira o se aplasta, es hacia arriba, entre las dos palmas.
        if (Math.abs(e.esferas[0].estirar - 1) > 1e-6) expect(e.esferas[0].eje).toEqual([0, 1, 0]);
      }
      // Al terminar el traspaso, la esfera quedó en la palma de la mano que estaba abajo.
      const fin = evaluar(sec, 1, Math.min(1, ((n + 1) * SEG_TRASPASO + n * PAUSA_TRASPASO) / total), OPCIONES_INICIALES);
      const rec = ORDEN_TRASPASOS[n] === 'D' ? 'I' : 'D';
      expect(dist(fin.esferas[0].pos, palmas(fin)[rec]), `traspaso ${n + 1}: queda en la de abajo`).toBeLessThan(R + 0.016);
      // Se estira al alejar las manos y se aplasta al acercarlas.
      expect(Math.max(...est), `traspaso ${n + 1}`).toBeGreaterThan(1.4);
      expect(Math.min(...est), `traspaso ${n + 1}`).toBeLessThan(0.88);
    }
  });

  it('la mano que palpa queda a 7,5 cm de la piel y el recorrido hasta el hombro es sin tocar, a 5–10 cm', () => {
    expect(DIST).toBeGreaterThanOrEqual(0.05);
    expect(DIST).toBeLessThanOrEqual(0.1);
    for (const [paso, A] of [
      [3, PRIMERO],
      [7, SEGUNDO],
    ] as const) {
      const fases = FASES_ATRAS[A];
      const total = fases.reduce((a, f) => a + f.dur, 0);
      // La ida (dedos → hombro) y la vuelta (hombro → dedos).
      const ini = fases.slice(0, fases.findIndex((f) => f.id === 'recorrer')).reduce((a, f) => a + f.dur, 0);
      const dur = fases.find((f) => f.id === 'recorrer')!.dur + fases.find((f) => f.id === 'volver')!.dur;
      const B = A === 'I' ? 'D' : 'I';
      for (let i = 0; i <= 40; i++) {
        const e = evaluar(sec, paso, (ini + (dur * i) / 40) / total, OPCIONES_INICIALES);
        const { q } = palmas(e);
        const h = palmas(e)[B];
        // Piel del brazo palpado: mano, antebrazo y brazo como cilindros sobre sus huesos.
        const W = A === 'I' ? q.munecaI : q.munecaD;
        const E = A === 'I' ? q.codoI : q.codoD;
        const H = A === 'I' ? q.hombroI : q.hombroD;
        const F = A === 'I' ? q.palmaI.dedos : q.palmaD.dedos;
        const yema = [0, 1, 2].map((k) => W[k] + F[k] * 0.17);
        const aSeg = (p: number[], a: number[], b: number[]) => {
          const ab = [0, 1, 2].map((k) => b[k] - a[k]);
          const t = Math.max(0, Math.min(1, [0, 1, 2].reduce((x, k) => x + (p[k] - a[k]) * ab[k], 0) / [0, 1, 2].reduce((x, k) => x + ab[k] * ab[k], 0)));
          return dist(p, [0, 1, 2].map((k) => a[k] + ab[k] * t));
        };
        const d = Math.min(aSeg(h, yema, W) - 0.013, aSeg(h, W, E) - 0.033, aSeg(h, E, H) - 0.045);
        expect(d, `${A} ${i}`).toBeGreaterThan(0.05);
        expect(d, `${A} ${i}`).toBeLessThan(0.1);
      }
    }
  });

  it('las manos no se atraviesan al formar la esfera, al pasarla ni al palpar (tolerancia 4 mm)', () => {
    const holgura = (A: { pos: number[]; dir: number[]; largo: number; radio: number }, B: typeof A) => {
      let m = 1e9;
      for (let i = 0; i <= 6; i++)
        for (let j = 0; j <= 6; j++) {
          const a = [0, 1, 2].map((k) => A.pos[k] + A.dir[k] * A.largo * (i / 6));
          const b = [0, 1, 2].map((k) => B.pos[k] + B.dir[k] * B.largo * (j / 6));
          m = Math.min(m, dist(a, b));
        }
      return m - A.radio - B.radio;
    };
    for (let paso = 0; paso < sec.pasos.length; paso++) {
      for (const e of muestras(paso, paso < 2 ? 200 : 60)) {
        const p = e.figuras[0].pose;
        const q = resolverEsqueleto(p);
        // Las manos como se dibujan: con el dedo aislado y separado, si lo hay.
        const sD = segmentosMano(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 1, p.cierreD, p.pinzaD, p.tipoPinzaD, p.aisladoD, p.aislarD, p.separarD);
        const sI = segmentosMano(q.munecaI, q.palmaI.dedos, q.palmaI.normal, -1, p.cierreI, p.pinzaI, p.tipoPinzaI, p.aisladoI, p.aislarI, p.separarI);
        let m = 1e9;
        for (const a of sD) for (const b of sI) m = Math.min(m, holgura(a, b));
        expect(m, `paso ${paso + 1}`).toBeGreaterThan(-0.004);
      }
    }
  }, 60000);

  it('la esfera, aun estirada como goma, no atraviesa el brazo que se palpa (tolerancia 4 mm)', () => {
    /** Distancia a un hueso con su grosor (de r0 en `a` a r1 en `b`, como en la malla del maniquí). */
    const aSeg = (p: number[], a: number[], b: number[], r0: number, r1 = r0) => {
      const ab = [0, 1, 2].map((k) => b[k] - a[k]);
      const t = Math.max(0, Math.min(1, [0, 1, 2].reduce((x, k) => x + (p[k] - a[k]) * ab[k], 0) / [0, 1, 2].reduce((x, k) => x + ab[k] * ab[k], 0)));
      return dist(p, [0, 1, 2].map((k) => a[k] + ab[k] * t)) - (r0 + (r1 - r0) * t);
    };
    // Al cubrir los dedos la esfera envuelve la yema a propósito (descrito en el taller): esa fase no se mide aquí.
    const enDedos = (paso: number, A: 'D' | 'I', t: number) => {
      if (paso !== 2 && paso !== 6) return false;
      const f = FASES_DELANTE[A];
      const total = f.reduce((a, x) => a + x.dur, 0);
      return t * total >= f[0].dur - 1e-9 && t * total <= f[0].dur + f[1].dur + 1e-9;
    };
    for (const [paso, A] of [
      [2, PRIMERO],
      [3, PRIMERO],
      [6, SEGUNDO],
      [7, SEGUNDO],
    ] as const) {
      for (const [i, e] of muestras(paso, 120).entries()) {
        const esf = e.esferas[0];
        if (!esf.activa || !esf.eje || enDedos(paso, A, i / 120)) continue;
        const q = resolverEsqueleto(e.figuras[0].pose);
        const W = A === 'I' ? q.munecaI : q.munecaD;
        const E = A === 'I' ? q.codoI : q.codoD;
        const H = A === 'I' ? q.hombroI : q.hombroD;
        const F = A === 'I' ? q.palmaI.dedos : q.palmaD.dedos;
        const yema = [0, 1, 2].map((k) => W[k] + F[k] * 0.17);
        const rh = esf.radio / Math.sqrt(esf.estirar);
        const largo = esf.radio * esf.estirar - rh;
        for (const u of [-1, -0.5, 0, 0.5, 1]) {
          const c = [0, 1, 2].map((k) => esf.pos[k] + esf.eje![k] * largo * u);
          const libre = Math.min(aSeg(c, yema, W, 0.012), aSeg(c, W, E, 0.023, 0.035), aSeg(c, E, H, 0.035, 0.046)) - rh;
          expect(libre, `paso ${paso + 1}`).toBeGreaterThan(-0.004);
        }
      }
    }
  });

  it('palpa en orden: dedos; por delante, de la muñeca al codo en 4 tramos; por atrás, del codo a la muñeca; hasta el hombro', () => {
    expect(FASES_DELANTE[PRIMERO].map((f) => f.id)).toEqual(['preparar', 'dedos', 'aMuneca', 'linea']);
    // Por atrás: los puntos, el recorrido de ida y vuelta y la esfera que se absorbe (en los dos brazos).
    for (const A of [PRIMERO, SEGUNDO]) expect(FASES_ATRAS[A].map((f) => f.id)).toEqual(['girar', 'linea', 'aYemas', 'recorrer', 'volver', 'quieto', 'absorber']);
    // Empieza la mano izquierda con la mano derecha: primero se palpa el brazo derecho y después el izquierdo.
    expect([PRIMERO, SEGUNDO]).toEqual(['D', 'I']);
    // El recorrido termina en el hombro.
    expect(sec.pasos).toHaveLength(8);
    for (const A of ['I', 'D'] as const) {
      const r = BRAZOS[A].recorrido;
      const q = resolverEsqueleto(SERENA);
      const hombro = A === 'I' ? q.hombroI : q.hombroD;
      expect(dist(r[r.length - 1].piel, hombro)).toBeLessThan(0.08);
    }
  });

  it('la mano izquierda, con forma de agarrar, cubre los dedos de la derecha uno por uno (del meñique al pulgar) con la yema en el centro de la esfera, el dedo separado de los demás, hace goma y no los toca', () => {
    expect(BRAZOS[PRIMERO].cubrir.map((d) => d.nombre)).toEqual(['meñique', 'anular', 'medio', 'índice', 'pulgar']);
    // Forma de agarrar: bastante más cerrada que al palpar el brazo (0,15).
    expect(CIERRE_CUBRIR).toBeGreaterThanOrEqual(0.35);
    for (const [paso, A] of [
      [2, PRIMERO],
      [6, SEGUNDO],
    ] as const) {
      const fases = FASES_DELANTE[A];
      const total = fases.reduce((a, f) => a + f.dur, 0);
      const ini = fases[0].dur;
      const dur = fases[1].dur;
      const n = BRAZOS[A].cubrir.length;
      // Lento: al menos 2 s por dedo.
      expect(dur / n).toBeGreaterThanOrEqual(2);
      const B = A === 'D' ? 'I' : 'D';
      const en = (j: number, kj: number) => evaluar(sec, paso, (ini + ((j + kj) / n) * dur) / total, OPCIONES_INICIALES);
      for (let j = 0; j < n; j++) {
        // Quieto sobre el dedo, después de la goma.
        const e = en(j, 0.86);
        const p = e.figuras[0].pose;
        const q = resolverEsqueleto(p);
        const W = A === 'D' ? q.munecaD : q.munecaI;
        const pal = A === 'D' ? q.palmaD : q.palmaI;
        const seg =
          A === 'D'
            ? segmentosMano(W, pal.dedos, pal.normal, 1, p.cierreD, p.pinzaD, p.tipoPinzaD, p.aisladoD, p.aislarD, p.separarD)
            : segmentosMano(W, pal.dedos, pal.normal, -1, p.cierreI, p.pinzaI, p.tipoPinzaI, p.aisladoI, p.aislarI, p.separarI);
        const yema = (i: number) => [0, 1, 2].map((k) => seg[i].pos[k] + seg[i].dir[k] * seg[i].largo * 0.75);
        const yemas = [12, 9, 6, 3, 15].map(yema);
        const esf = e.esferas[0];
        // La yema del dedo que toca está en el centro de la esfera.
        const cerca = yemas.map((y) => dist(esf.pos, y));
        expect(cerca.indexOf(Math.min(...cerca)), `${A}: dedo ${j + 1}`).toBe(j);
        expect(cerca[j], `${A}: dedo ${j + 1}, yema al centro`).toBeLessThan(0.005);
        // La esfera mantiene su tamaño y la mano la agarra: la palma, justo encima (5 mm), más cerrada que al palpar.
        expect(esf.radio).toBeCloseTo(R, 4);
        expect(Math.abs(dist(palmas(e)[B], esf.pos) - esf.radio - PALMA_SOBRE), `${A}: dedo ${j + 1}, palma sobre la esfera`).toBeLessThan(0.004);
        // El dedo que se cubre está separado de los demás: aislado, y su yema por encima de las otras.
        expect(A === 'D' ? p.aisladoD : p.aisladoI).toBe([3, 2, 1, 0, 4][j]);
        expect(A === 'D' ? p.separarD : p.separarI).toBeGreaterThan(0.95);
        if (j < 4) {
          const n = pal.normal;
          const alto = (y: number[]) => y[0] * n[0] + y[1] * n[1] + y[2] * n[2];
          const otras = yemas.filter((_, i) => i !== j && i < 4).map(alto);
          // Un poco: al menos 1 cm por encima (el meñique, más corto, sube menos).
          expect(alto(yemas[j]) - Math.max(...otras), `${A}: dedo ${j + 1}, separado`).toBeGreaterThan(0.01);
        }
        expect(B === 'I' ? p.cierreI : p.cierreD).toBeGreaterThanOrEqual(0.35);
        // Sin tocar la otra mano.
        const otra = segmentosMano(
          B === 'I' ? q.munecaI : q.munecaD,
          B === 'I' ? q.palmaI.dedos : q.palmaD.dedos,
          B === 'I' ? q.palmaI.normal : q.palmaD.normal,
          B === 'D' ? 1 : -1,
          B === 'I' ? p.cierreI : p.cierreD,
        );
        let libre = 1e9;
        for (const a of seg)
          for (const b of otra)
            for (let u = 0; u <= 4; u++)
              for (let v = 0; v <= 4; v++) {
                const pa = [0, 1, 2].map((k) => a.pos[k] + a.dir[k] * a.largo * (u / 4));
                const pb = [0, 1, 2].map((k) => b.pos[k] + b.dir[k] * b.largo * (v / 4));
                libre = Math.min(libre, dist(pa, pb) - a.radio - b.radio);
              }
        expect(libre, `${A}: dedo ${j + 1}, sin tocar`).toBeGreaterThan(0);
        // Goma: a mitad del dedo la mano subió y la esfera se estiró con ella.
        const g = en(j, 0.55);
        expect(g.esferas[0].estirar, `${A}: dedo ${j + 1}, goma`).toBeGreaterThan(1 + (0.8 * GOMA_DEDO) / (2 * R));
        expect(palmas(g)[B][1] - palmas(e)[B][1], `${A}: dedo ${j + 1}, la mano sube`).toBeGreaterThan(0.8 * GOMA_DEDO);
      }
    }
  });

  it('de la muñeca al codo, la distancia dividida en 4: la mano los recorre de forma continua y hace goma en cada punto, por delante y por atrás', () => {
    expect(TRAMOS_BRAZO).toBe(4);
    // Ágil: unos 2 s por punto.
    expect(SEG_PUNTO).toBeGreaterThanOrEqual(1.8);
    expect(SEG_PUNTO).toBeLessThanOrEqual(2.4);
    for (const A of [PRIMERO, SEGUNDO]) {
      const linea = BRAZOS[A].linea;
      expect(linea).toHaveLength(5);
      // Empieza en la muñeca y termina en el codo, con tramos iguales (±3 mm).
      expect(linea[0]).toEqual(BRAZOS[A].puntos.muneca);
      expect(linea[4]).toEqual(BRAZOS[A].puntos.codo);
      const tramos = linea.slice(1).map((p, i) => dist(p.piel, linea[i].piel));
      for (const d of tramos) expect(Math.abs(d - tramos[0]), `${A}: tramos iguales`).toBeLessThan(0.003);
    }
    /** Base de la esfera (apoyada en la piel). */
    const base = (e: Estado) => {
      const esf = e.esferas[0];
      return esf.pos.map((x, k) => x - esf.eje![k] * esf.radio * esf.estirar);
    };
    for (const [paso, A, fases, delante] of [
      [2, PRIMERO, FASES_DELANTE[PRIMERO], true],
      [3, PRIMERO, FASES_ATRAS[PRIMERO], false],
      [6, SEGUNDO, FASES_DELANTE[SEGUNDO], true],
      [7, SEGUNDO, FASES_ATRAS[SEGUNDO], false],
    ] as const) {
      const total = fases.reduce((a, f) => a + f.dur, 0);
      const j = fases.findIndex((f) => f.id === 'linea');
      const ini = fases.slice(0, j).reduce((a, f) => a + f.dur, 0);
      const dur = fases[j].dur;
      // `x`: punto en curso (0 = el primero … 4 = el último).
      const en = (x: number) => evaluar(sec, paso, (ini + (dur * (x + 0.5)) / 5) / total, OPCIONES_INICIALES);
      const B = A === 'D' ? 'I' : 'D';
      const linea = BRAZOS[A].linea;
      for (let i = 0; i <= 4; i++) {
        // Por delante va de la muñeca al codo; por atrás, del codo a la muñeca.
        const pp = linea[delante ? i : 4 - i];
        const arriba = en(i);
        const abajo = en(i - 0.5);
        // En cada punto, la esfera está sobre él, la mano subió y la esfera se estiró (goma).
        expect(dist(base(arriba), pp.piel), `paso ${paso + 1}, punto ${i}`).toBeLessThan(0.006);
        expect(arriba.esferas[0].estirar, `paso ${paso + 1}, punto ${i}: goma`).toBeGreaterThan(1 + (0.9 * GOMA) / (2 * R));
        const sube = [0, 1, 2].reduce((a, k) => a + (palmas(arriba)[B][k] - palmas(abajo)[B][k]) * pp.normal[k], 0);
        expect(sube, `paso ${paso + 1}, punto ${i}: la mano sube`).toBeGreaterThan(0.8 * GOMA);
      }
      // Continuo: entre el primer punto y el último, la esfera avanza siempre (no se detiene).
      const ida = [0, 1, 2].map((k) => linea[delante ? 4 : 0].piel[k] - linea[delante ? 0 : 4].piel[k]);
      const largo = Math.hypot(...ida);
      const avance = (e: Estado) => [0, 1, 2].reduce((a, k) => a + (base(e)[k] - linea[delante ? 0 : 4].piel[k]) * (ida[k] / largo), 0);
      let antes = avance(en(0));
      for (let x = 0.05; x <= 4.001; x += 0.05) {
        const ahora = avance(en(x));
        expect(ahora - antes, `paso ${paso + 1}, x ${x.toFixed(2)}: avanza`).toBeGreaterThan(0.0002);
        antes = ahora;
      }
    }
  });

  it('al terminar el primer brazo la esfera se absorbe y el otro brazo empieza otra vez desde las barras y los traspasos', () => {
    // Fin del paso 4: la esfera se absorbió en la palma.
    expect(evaluar(sec, 3, 1, OPCIONES_INICIALES).esferas[0].activa).toBe(false);
    // Paso 5: otra vez las barras, con la energía que sube a las manos.
    const total = FASES_TOMAR.reduce((a, f) => a + f.dur, 0);
    const iniTomar = FASES_TOMAR.slice(0, FASES_TOMAR.findIndex((f) => f.id === 'tomar')).reduce((a, f) => a + f.dur, 0);
    const tomando = evaluar(sec, 4, (iniTomar + 0.8) / total, OPCIONES_INICIALES);
    expect(tomando.barras.opacidad).toBe(1);
    expect(tomando.flujos.filter((f) => f.activo && f.intensidad > 0.5)).toHaveLength(2);
    // Al formarla de nuevo se queda la izquierda; después de los traspasos, la derecha (que cubre los dedos de la izquierda).
    const fin5 = evaluar(sec, 4, 1, OPCIONES_INICIALES);
    expect(dist(fin5.esferas[0].pos, palmas(fin5).I)).toBeLessThan(R + 0.016);
    expect(ORDEN_TRASPASOS_2[0]).toBe('I');
    const fin6 = evaluar(sec, 5, 1, OPCIONES_INICIALES);
    expect(dist(fin6.esferas[0].pos, palmas(fin6).D)).toBeLessThan(R + 0.016);
    // En los traspasos de la segunda vuelta tampoco la suelta nunca.
    for (const e of muestras(5, 200)) {
      const { D, I } = palmas(e);
      expect(Math.min(dist(e.esferas[0].pos, D), dist(e.esferas[0].pos, I))).toBeLessThan(R * Math.max(1, e.esferas[0].estirar) + 0.016);
    }
    // Al final del ejercicio también se absorbe.
    expect(evaluar(sec, 7, 1, OPCIONES_INICIALES).esferas[0].activa).toBe(false);
  });

  it('el recorrido es de ida y vuelta (dedos → hombro → dedos) y la mano que recorre no atraviesa el cuerpo', () => {
    const piel = pielDelCuerpo;
    const conSigno = distanciaConSigno;
    for (const [paso, A] of [
      [3, PRIMERO],
      [7, SEGUNDO],
    ] as const) {
      const fases = FASES_ATRAS[A];
      const total = fases.reduce((a, f) => a + f.dur, 0);
      const ini = fases.slice(0, fases.findIndex((f) => f.id === 'recorrer')).reduce((a, f) => a + f.dur, 0);
      const ida = fases.find((f) => f.id === 'recorrer')!.dur;
      const vuelta = fases.find((f) => f.id === 'volver')!.dur;
      const en = (seg: number) => evaluar(sec, paso, (ini + seg) / total, OPCIONES_INICIALES);
      const B = A === 'D' ? 'I' : 'D';
      const r = BRAZOS[A].recorrido;
      const sobre = (pp: { piel: number[]; normal: number[] }) => pp.piel.map((x, k) => x + pp.normal[k] * DIST);
      // Ida y vuelta: empieza sobre los dedos, llega al hombro y vuelve a los dedos.
      expect(dist(palmas(en(0))[B], sobre(r[0])), `${A}: empieza en los dedos`).toBeLessThan(0.01);
      expect(dist(palmas(en(ida))[B], sobre(r[r.length - 1])), `${A}: llega al hombro`).toBeLessThan(0.01);
      expect(dist(palmas(en(ida + vuelta))[B], sobre(r[0])), `${A}: vuelve a los dedos`).toBeLessThan(0.01);
      // La mano y el antebrazo que recorren no se meten en el torso, el cuello ni la cabeza.
      for (let i = 0; i <= 16; i++) {
        const e = en(((ida + vuelta) * i) / 16);
        const p = e.figuras[0].pose;
        const q = resolverEsqueleto(p);
        const W = B === 'I' ? q.munecaI : q.munecaD;
        const E = B === 'I' ? q.codoI : q.codoD;
        const pal = B === 'I' ? q.palmaI : q.palmaD;
        const mano = segmentosMano(W, pal.dedos, pal.normal, B === 'D' ? 1 : -1, B === 'I' ? p.cierreI : p.cierreD);
        const muestrasBrazo: [number[], number][] = [];
        for (const g of mano.slice(1)) for (const u of [0, 0.5, 1]) muestrasBrazo.push([g.pos.map((x, k) => x + g.dir[k] * g.largo * u), g.radio]);
        for (const u of [0, 0.25, 0.5, 0.75]) muestrasBrazo.push([W.map((x, k) => x + (E[k] - x) * u), 0.03]);
        // El brazo, del codo hasta la mitad (más arriba nace del hombro).
        const H = B === 'I' ? q.hombroI : q.hombroD;
        for (const u of [0, 0.25, 0.5]) muestrasBrazo.push([E.map((x, k) => x + (H[k] - x) * u), 0.04]);
        const s = piel(e);
        const valores = muestrasBrazo.map(([c, rad]) => conSigno(c, s) - rad);
        const peor = Math.min(...valores);
        const donde = valores.indexOf(peor) >= muestrasBrazo.length - 7 ? (valores.indexOf(peor) >= muestrasBrazo.length - 3 ? 'el brazo' : 'el antebrazo') : 'la mano';
        expect(peor, `${A}: recorrido ${i}/16, ${donde} dentro del cuerpo`).toBeGreaterThan(-0.005);
      }
    }
  });
});

describe('Cargar las ingles (descrito en el taller)', () => {
  const sec = SECUENCIAS['cargar-ingles'];
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  /** Estado en `x` ciclos desde la primera carga del paso 2. */
  const enCiclo = (x: number) => evaluar(sec, 1, (SEG_ANTES + x * SEG_CICLO) / DUR_CARGAS, OPCIONES_INICIALES);
  const palmas = (e: Estado) => {
    const q = resolverEsqueleto(e.figuras[0].pose);
    return { D: huecoPalma(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 0), I: huecoPalma(q.munecaI, q.palmaI.dedos, q.palmaI.normal, 0), q };
  };
  const cuenta = (t: number) => {
    const c = evaluar(sec, 1, t, OPCIONES_INICIALES).hud.contador;
    const m = c?.etiqueta.match(/derecha (\d+) · izquierda (\d+)/);
    return m ? { d: Number(m[1]), i: Number(m[2]), total: c!.valor } : null;
  };

  it('alterna las manos, empezando por la derecha, hasta 15 por cada una', () => {
    let previa = { d: 0, i: 0 };
    for (let k = 0; k <= 400; k++) {
      const c = cuenta(k / 400);
      if (!c) continue;
      expect(Math.abs(c.d - c.i), `t=${k / 400}`).toBeLessThanOrEqual(1);
      expect(c.d).toBeGreaterThanOrEqual(c.i);
      expect(c.d).toBeGreaterThanOrEqual(previa.d);
      expect(c.i).toBeGreaterThanOrEqual(previa.i);
      previa = c;
    }
    expect(previa).toMatchObject({ d: 15, i: 15 });
  });

  it('cada mano lleva su esfera a la ingle del otro lado: la derecha a la izquierda y la izquierda a la derecha', () => {
    // Primera carga de la derecha (ciclo 0) y de la izquierda (ciclo 1), a mitad de la entrega.
    const d = enCiclo(0.82);
    const pd = palmas(d);
    expect(pd.D[0], 'la derecha cruza al lado izquierdo').toBeGreaterThan(0.03);
    expect(dist(pd.D, INGLE_IZQ)).toBeLessThan(0.07);
    expect(dist(d.esferas[1].pos, INGLE_IZQ)).toBeLessThan(0.05);
    // Mientras tanto, la izquierda espera agarrando su barra.
    expect(pd.q.munecaI[1]).toBeGreaterThan(1.3);
    const i = enCiclo(DESFASE + 0.82);
    const pi = palmas(i);
    expect(pi.I[0], 'la izquierda cruza al lado derecho').toBeLessThan(-0.03);
    expect(dist(pi.I, INGLE_DER)).toBeLessThan(0.07);
    expect(dist(i.esferas[2].pos, INGLE_DER)).toBeLessThan(0.05);
    expect(pi.q.munecaD[1]).toBeGreaterThan(1.3);
  });

  it('las cargas se acumulan en cada ingle (15 en cada una) y las dos ingles se encienden', () => {
    const fin = evaluar(sec, 1, 1, OPCIONES_INICIALES);
    expect(dist(fin.esferas[0].pos, INGLE_IZQ)).toBeLessThan(1e-6);
    expect(dist(fin.esferas[3].pos, INGLE_DER)).toBeLessThan(1e-6);
    expect(fin.esferas[0].radio).toBeCloseTo(0.04, 5);
    expect(fin.esferas[3].radio).toBeCloseTo(0.04, 5);
    expect(fin.centros.ingleI).toBeCloseTo(1, 5);
    expect(fin.centros.ingleD).toBeCloseTo(1, 5);
    // Las ingles quedan a cada lado, a la misma altura.
    expect(INGLE_IZQ[0]).toBeGreaterThan(0);
    expect(INGLE_DER[0]).toBeLessThan(0);
    expect(INGLE_IZQ[1]).toBe(INGLE_DER[1]);
  });

  it('la luz que alumbra el cuerpo va con la esfera que viaja, nunca con una ingle (si no, una ingle se encendía más que la otra)', () => {
    // La única luz va a la esfera más brillante que puede llevarla (como en Energia.tsx).
    const conLuz = (e: Estado) => {
      let mejor = -1;
      let valor = 0;
      e.esferas.forEach((s, i) => {
        const v = s.activa && s.ilumina ? s.brillo * s.opacidad * s.radio : 0;
        if (v > valor) [valor, mejor] = [v, i];
      });
      return mejor;
    };
    for (let k = 0; k <= 600; k++) {
      const e = enCiclo(-0.2 + (4 * k) / 600);
      const i = conLuz(e);
      expect([-1, 1, 2], `x ${(-0.2 + (4 * k) / 600).toFixed(3)}: la luz está en la esfera ${i}`).toContain(i);
    }
    const fin = evaluar(sec, 1, 1, OPCIONES_INICIALES);
    expect(conLuz(fin), 'al final las dos ingles quedan iguales, sin luz en ninguna').toBe(-1);
  });

  it('con la espalda recta: no se inclina; el hombro de la mano que cruza se adelanta y el torso gira un poco hacia esa ingle; los brazos llegan siempre', () => {
    // La espalda recta: nunca se inclina.
    for (let paso = 0; paso < sec.pasos.length; paso++)
      for (let k = 0; k <= 100; k++) expect(evaluar(sec, paso, k / 100, OPCIONES_INICIALES).figuras[0].pose.inclinar).toBe(0);
    // El hombro de la mano que cruza se adelanta del todo; el de la que espera, menos.
    const d = enCiclo(0.82).figuras[0].pose;
    expect(d.adelantarD).toBeCloseTo(1, 5);
    expect(d.adelantarI).toBeLessThan(1);
    const i = enCiclo(DESFASE + 0.82).figuras[0].pose;
    expect(i.adelantarI).toBeCloseTo(1, 5);
    expect(i.adelantarD).toBeLessThan(1);
    // Un giro chico: menos de 15°.
    expect(GIRAR_INGLES).toBeLessThan(0.27);
    // La derecha va a la ingle izquierda: el torso gira hacia la izquierda (+); la izquierda, hacia la derecha (−).
    expect(enCiclo(0.82).figuras[0].pose.girar).toBeCloseTo(GIRAR_INGLES, 2);
    expect(enCiclo(DESFASE + 0.82).figuras[0].pose.girar).toBeCloseTo(-GIRAR_INGLES, 2);
    expect(evaluar(sec, 1, 1, OPCIONES_INICIALES).figuras[0].pose.girar).toBeCloseTo(0, 5);
    expect(evaluar(sec, 1, 1, OPCIONES_INICIALES).figuras[0].pose.inclinar).toBeCloseTo(0, 5);
    for (let paso = 0; paso < sec.pasos.length; paso++) {
      for (let k = 0; k <= 200; k++) {
        const p = evaluar(sec, paso, k / 200, OPCIONES_INICIALES).figuras[0].pose;
        const q = resolverEsqueleto(p);
        expect(dist(q.munecaD, p.manoD), `paso ${paso + 1}, t ${k / 200}, derecha`).toBeLessThan(0.003);
        expect(dist(q.munecaI, p.manoI), `paso ${paso + 1}, t ${k / 200}, izquierda`).toBeLessThan(0.003);
      }
    }
  });

  it('el hombro se adelanta en arco con la clavícula, sin arrugar el pecho ni la espalda', () => {
    // El hombro avanza (más de 7 cm) sin irse hacia el centro ni subir o bajar.
    const reposo = resolverEsqueleto(NEUTRA);
    for (const [L, s] of [
      ['D', -1],
      ['I', 1],
    ] as const) {
      const q = resolverEsqueleto({ ...NEUTRA, adelantarD: L === 'D' ? 1 : 0, adelantarI: L === 'I' ? 1 : 0 });
      const h = L === 'D' ? q.hombroD : q.hombroI;
      const h0 = L === 'D' ? reposo.hombroD : reposo.hombroI;
      expect(h[2] - h0[2], `hombro ${L} adelante`).toBeGreaterThan(0.07);
      expect(s * (h[0] - h0[0]), `hombro ${L} no va hacia el centro`).toBeGreaterThan(-0.005);
      expect(h[1]).toBeCloseTo(h0[1], 6);
    }
    // La piel acompaña sin pliegues: entre vértices vecinos de la parte alta del torso, el ángulo
    // entre normales no crece más de 15° respecto del reposo (desplazar la zona en bloque daba 35–40°).
    const angulos = (e: ReturnType<typeof resolverEsqueleto>) => {
      const t = crearTorso();
      const y0 = Array.from(t.geometry.getAttribute('position').array).filter((_, i) => i % 3 === 1);
      t.deformar(e);
      const n = t.geometry.getAttribute('normal');
      const idx = t.geometry.index!.array;
      const out: number[] = [];
      for (let k = 0; k < idx.length; k += 3)
        for (const [a, b] of [
          [idx[k], idx[k + 1]],
          [idx[k + 1], idx[k + 2]],
          [idx[k + 2], idx[k]],
        ]) {
          const d = n.getX(a) * n.getX(b) + n.getY(a) * n.getY(b) + n.getZ(a) * n.getZ(b);
          out.push(y0[a] < 1.05 || y0[b] < 1.05 ? 0 : (Math.acos(Math.min(1, d)) * 180) / Math.PI);
        }
      return out;
    };
    const base = angulos(reposo);
    for (const [d, i] of [
      [1, 0],
      [0, 1],
      [1, 1],
      [0.5, 0.2],
    ]) {
      const a = angulos(resolverEsqueleto({ ...NEUTRA, adelantarD: d, adelantarI: i }));
      const peor = Math.max(...a.map((v, j) => v - base[j]));
      expect(peor, `adelantar D ${d} · I ${i}`).toBeLessThan(15);
    }
  });

  it('el brazo que cruza no se mete en el cuerpo ni en los muslos, ni choca con el otro brazo', () => {
    for (let k = 0; k <= 40; k++) {
      const x = (2 * DESFASE * k) / 40;
      const e = enCiclo(x);
      const p = e.figuras[0].pose;
      const q = resolverEsqueleto(p);
      const s = pielDelCuerpo(e);
      for (const L of ['D', 'I'] as const) {
        const W = L === 'D' ? q.munecaD : q.munecaI;
        const E = L === 'D' ? q.codoD : q.codoI;
        const H = L === 'D' ? q.hombroD : q.hombroI;
        const pal = L === 'D' ? q.palmaD : q.palmaI;
        const mano = segmentosMano(W, pal.dedos, pal.normal, L === 'D' ? 1 : -1, L === 'D' ? p.cierreD : p.cierreI);
        const puntos: [number[], number][] = [];
        for (const g of mano.slice(1)) for (const u of [0, 0.5, 1]) puntos.push([g.pos.map((v, i) => v + g.dir[i] * g.largo * u), g.radio]);
        for (const u of [0, 0.25, 0.5, 0.75]) puntos.push([W.map((v, i) => v + (E[i] - v) * u), 0.03]);
        for (const u of [0, 0.25, 0.5]) puntos.push([E.map((v, i) => v + (H[i] - v) * u), 0.04]);
        // Torso, cuello y cabeza (malla real).
        const peor = Math.min(...puntos.map(([c, r]) => distanciaConSigno(c, s) - r));
        expect(peor, `x ${x.toFixed(2)}, brazo ${L} dentro del cuerpo`).toBeGreaterThan(-0.005);
        // Muslos: cilindros de 7,2 cm de radio de la cadera a la rodilla.
        for (const [C, Rd] of [
          [q.caderaD, q.rodillaD],
          [q.caderaI, q.rodillaI],
        ]) {
          for (const [c, r] of puntos) {
            const ab = Rd.map((v, i) => v - C[i]);
            const tt = Math.max(0, Math.min(1, ab.reduce((a, v, i) => a + (c[i] - C[i]) * v, 0) / ab.reduce((a, v) => a + v * v, 0)));
            const d = dist(c, C.map((v, i) => v + ab[i] * tt)) - 0.072 - r;
            expect(d, `x ${x.toFixed(2)}, brazo ${L} en el muslo`).toBeGreaterThan(-0.005);
          }
        }
      }
      // Las dos manos no se tocan.
      const sD = segmentosMano(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 1, p.cierreD);
      const sI = segmentosMano(q.munecaI, q.palmaI.dedos, q.palmaI.normal, -1, p.cierreI);
      let libre = 1e9;
      for (const a of sD)
        for (const b of sI)
          for (let u = 0; u <= 4; u++)
            for (let v = 0; v <= 4; v++) {
              const pa = a.pos.map((w, i) => w + a.dir[i] * a.largo * (u / 4));
              const pb = b.pos.map((w, i) => w + b.dir[i] * b.largo * (v / 4));
              libre = Math.min(libre, dist(pa, pb) - a.radio - b.radio);
            }
      expect(libre, `x ${x.toFixed(2)}: las manos se tocan`).toBeGreaterThan(0);
    }
  });
});

/**
 * Distancia con signo de un punto a las piernas (muslo y canilla con su perfil, y el pie por
 * encima de su contorno, girado con la punta): negativa si está adentro.
 */
function distanciaPiernas(c: number[], q: ReturnType<typeof resolverEsqueleto>) {
  let peor = 1e9;
  for (const [C, K, T, punta] of [
    [q.caderaD, q.rodillaD, q.tobilloD, q.puntaD],
    [q.caderaI, q.rodillaI, q.tobilloI, q.puntaI],
  ] as const) {
    for (const [a, b, f, pl] of [
      [C, K, PERFIL_MUSLO, PLANO_MUSLO],
      [K, T, PERFIL_PIERNA, PLANO_PIERNA],
    ] as const) {
      const ab = restaV(b, a);
      const L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      const u = Math.max(0, Math.min(1, ((c[0] - a[0]) * ab[0] + (c[1] - a[1]) * ab[1] + (c[2] - a[2]) * ab[2]) / L2));
      const p = [a[0] + ab[0] * u, a[1] + ab[1] * u, a[2] + ab[2] * u];
      peor = Math.min(peor, Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]) - radioMiembro(f, u) * pl);
    }
    // El pie, en su propio marco (sin la punta): apoyado en el piso, debajo del tobillo.
    const l = rotarX([c[0] - T[0], c[1] - T[1], c[2] - T[2]], -punta, [0, 0, 0]);
    if (Math.abs(l[0]) < 0.05 && l[2] > -0.07 && l[2] < 0.19) peor = Math.min(peor, l[1] + PROP.tobilloY - altoPie(l[2]));
  }
  return peor;
}

/** La parte más baja de un pie (con su punta), en el mundo. */
function bajoDelPie(T: number[], punta: number) {
  let m = 1e9;
  for (let z = -0.07; z <= 0.19; z += 0.0025) m = Math.min(m, T[1] + rotarX([0, bajoPie(z) - PROP.tobilloY, z], punta, [0, 0, 0])[1]);
  return m;
}

describe('Sensibilización de piernas (descrito en el taller)', () => {
  const sec = SECUENCIAS['sensibilizacion-piernas'];
  const P = piernasInterno;
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const durPuntos = P.FASES_PUNTOS.reduce((a, f) => a + f.dur, 0);
  const durRecorrido = P.FASES_RECORRIDO.reduce((a, f) => a + f.dur, 0);
  const prep = P.FASES_PUNTOS[0].dur;
  const tramoPuntos = P.FASES_PUNTOS[1].dur;
  /** Instante (t del paso) en que la mano está en el punto `i` al bajar, o al volver. */
  const enPunto = (i: number, bajando: boolean) => (prep + (bajando ? 0 : tramoPuntos) + (tramoPuntos * ((bajando ? i : P.N_PUNTOS - 1 - i) + 0.5)) / P.N_PUNTOS) / durPuntos;
  const pasoPuntos = (A: 'D' | 'I') => (A === PRIMERA ? 2 : 6);
  const huecoDe = (q: ReturnType<typeof resolverEsqueleto>, B: 'D' | 'I') =>
    B === 'D' ? huecoPalma(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 0) : huecoPalma(q.munecaI, q.palmaI.dedos, q.palmaI.normal, 0);

  it('8 pasos: barras, traspasos, los puntos y el recorrido de cada pierna; primero la derecha, con la mano izquierda', () => {
    expect(sec.pasos).toHaveLength(8);
    expect(PRIMERA).toBe('D');
    expect(SEGUNDA).toBe('I');
    // Los traspasos dejan la esfera en la mano que pasa por la pierna: la izquierda para la derecha.
    for (const [paso, B] of [
      [1, 'I'],
      [5, 'D'],
    ] as const) {
      const e = evaluar(sec, paso, 1, OPCIONES_INICIALES);
      const q = resolverEsqueleto(e.figuras[0].pose);
      expect(dist(e.esferas[0].pos, huecoDe(q, B)), `paso ${paso + 1}`).toBeLessThan(0.06);
    }
    // La otra pierna empieza otra vez desde las barras.
    expect(evaluar(sec, 4, 0.2, OPCIONES_INICIALES).barras.opacidad).toBeGreaterThan(0.5);
  });

  it('la mano pasa por los 6 puntos en orden, al bajar y al volver, y en cada uno juega como goma', () => {
    for (const A of [PRIMERA, SEGUNDA]) {
      const B = A === 'D' ? 'I' : 'D';
      for (const bajando of [true, false]) {
        for (let i = 0; i < P.N_PUNTOS; i++) {
          const e = evaluar(sec, pasoPuntos(A), enPunto(i, bajando), OPCIONES_INICIALES);
          const pp = P.puntoEn(A, i).pp;
          const q = resolverEsqueleto(e.figuras[0].pose);
          const hueco = huecoDe(q, B);
          // La palma, sobre el punto: a DIST + la goma (la mano arriba), por la normal de la piel.
          const lejos = hueco.map((v, j) => v - pp.piel[j]).reduce((a, v, j) => a + v * pp.normal[j], 0);
          expect(lejos, `${A} punto ${i}, ${bajando ? 'bajando' : 'volviendo'}`).toBeGreaterThan(P.DIST + 0.02);
          expect(dist(hueco, pp.piel.map((v, j) => v + pp.normal[j] * lejos))).toBeLessThan(0.01);
          // La esfera se estira con la goma.
          expect(e.esferas[0].estirar).toBeGreaterThan(1.4);
          expect(e.hud.aviso).toContain('Como goma');
        }
      }
      // Entre punto y punto la goma baja: la esfera vuelve a ser redonda.
      const entre = evaluar(sec, pasoPuntos(A), (prep + tramoPuntos * (2 / P.N_PUNTOS)) / durPuntos, OPCIONES_INICIALES);
      expect(entre.esferas[0].estirar).toBeLessThan(1.05);
    }
  });

  it('la esfera no se suelta: va entre la palma y la piel hasta que se introduce en el muslo', () => {
    for (const A of [PRIMERA, SEGUNDA]) {
      const B = A === 'D' ? 'I' : 'D';
      for (const [paso, dur] of [
        [pasoPuntos(A), durPuntos],
        [pasoPuntos(A) + 1, durRecorrido],
      ] as const) {
        const hasta = paso === pasoPuntos(A) ? 1 : (11.5 + 1.2) / dur;
        for (let k = 0; k <= 120; k++) {
          const t = (k / 120) * hasta;
          const e = evaluar(sec, paso, t, OPCIONES_INICIALES);
          const q = resolverEsqueleto(e.figuras[0].pose);
          const s = e.esferas[0];
          expect(s.activa, `${A} paso ${paso + 1} t ${t.toFixed(3)}`).toBe(true);
          const alto = s.radio * s.estirar;
          expect(dist(s.pos, huecoDe(q, B)), `${A} paso ${paso + 1} t ${t.toFixed(3)}: la palma la lleva`).toBeLessThan(alto + 0.02);
        }
      }
      // Al final se introduce en el muslo: se achica, se hunde y desaparece, con un pulso en el muslo.
      const intro = evaluar(sec, pasoPuntos(A) + 1, (11.5 + 3.6 * 0.6) / durRecorrido, OPCIONES_INICIALES);
      const muslo = P.puntoEn(A, 0).pp;
      expect(intro.esferas[0].radio).toBeLessThan(P.R);
      expect(dist(intro.esferas[0].pos, muslo.piel)).toBeLessThan(P.R);
      expect(intro.pulsos.length).toBeGreaterThan(0);
      expect(evaluar(sec, pasoPuntos(A) + 1, (11.5 + 3.6) / durRecorrido, OPCIONES_INICIALES).esferas[0].activa).toBe(false);
    }
  });

  it('después la mano recorre la pierna y el pie a 5–10 cm de la piel, de ida y vuelta, hasta la parte delantera del pie', () => {
    for (const A of [PRIMERA, SEGUNDA]) {
      const B = A === 'D' ? 'I' : 'D';
      let sobrePie = 1e9;
      for (let k = 0; k <= 80; k++) {
        const t = ((k / 80) * 11) / durRecorrido;
        const e = evaluar(sec, pasoPuntos(A) + 1, t, OPCIONES_INICIALES);
        const q = resolverEsqueleto(e.figuras[0].pose);
        const hueco = huecoDe(q, B);
        // La palma, a 5–10 cm de la piel de la pierna o del pie (la más cercana).
        const d = distanciaPiernas(hueco, q);
        expect(d, `${A} t ${t.toFixed(3)}`).toBeGreaterThan(0.05);
        expect(d, `${A} t ${t.toFixed(3)}`).toBeLessThan(0.1);
        const empeine = P.pielEn(A, q, P.N_PUNTOS - 1);
        sobrePie = Math.min(sobrePie, dist(hueco, empeine.piel));
      }
      // Pasa por encima del pie: sobre el empeine, a la misma distancia que en los puntos.
      expect(sobrePie).toBeLessThan(P.DIST + 0.015);
    }
  });

  it('la pierna que se trabaja va estirada adelante a 45° y sigue pisando el piso (el pie apoyado); la otra rodilla se dobla', () => {
    for (const A of [PRIMERA, SEGUNDA]) {
      const paso = pasoPuntos(A);
      for (const [p, t0, t1] of [
        [paso, prep / durPuntos, 1],
        [paso + 1, 0, (11.5 + 3.6) / durRecorrido],
      ] as const) {
        for (let k = 0; k <= 30; k++) {
          const t = t0 + ((t1 - t0) * k) / 30;
          const q = resolverEsqueleto(evaluar(sec, p, t, OPCIONES_INICIALES).figuras[0].pose);
          const [C, T, punta, Co, To, puntaO] =
            A === 'D' ? [q.caderaD, q.tobilloD, q.puntaD, q.caderaI, q.tobilloI, q.puntaI] : [q.caderaI, q.tobilloI, q.puntaI, q.caderaD, q.tobilloD, q.puntaD];
          const donde = `${A} paso ${p + 1} t ${t.toFixed(3)}`;
          const pierna = restaV(T, C);
          // 45° hacia adelante (desde la vertical) y casi estirada.
          expect((Math.acos(-pierna[1] / largoV(pierna)) * 180) / Math.PI, donde).toBeCloseTo(45, 0);
          expect(pierna[2], donde).toBeGreaterThan(0.5);
          expect(largoV(pierna), donde).toBeGreaterThan(PROP.muslo + PROP.pierna - 0.01);
          // El pie pisa el piso: apoyado, plano (ni flota ni se hunde).
          expect(punta, donde).toBeCloseTo(0, 5);
          expect(T[1], donde).toBeCloseTo(PROP.tobilloY, 4);
          expect(bajoDelPie(T, punta), donde).toBeGreaterThan(-0.002);
          expect(bajoDelPie(T, punta), donde).toBeLessThan(0.008);
          // La otra pierna apoyada, con la rodilla doblada.
          expect(puntaO, donde).toBeCloseTo(0, 5);
          expect(To[1], donde).toBeCloseTo(PROP.tobilloY, 5);
          expect(largoV(restaV(To, Co)), donde).toBeLessThan(PROP.muslo + PROP.pierna - 0.05);
        }
      }
      // Al empezar y al terminar, los dos pies en el piso.
      for (const [p, t] of [
        [pasoPuntos(A), 0],
        [pasoPuntos(A) + 1, 1],
      ] as const) {
        const q = resolverEsqueleto(evaluar(sec, p, t, OPCIONES_INICIALES).figuras[0].pose);
        expect(q.tobilloD[1]).toBeCloseTo(PROP.tobilloY, 3);
        expect(q.tobilloI[1]).toBeCloseTo(PROP.tobilloY, 3);
        expect(q.puntaD + q.puntaI).toBeCloseTo(0, 3);
      }
    }
  });

  it('se inclina a medida que la mano baja y al final queda de pie', () => {
    let antes = P.posturaEn(0);
    for (let x = 0.25; x <= P.N_PUNTOS - 1; x += 0.25) {
      const ahora = P.posturaEn(x);
      expect(ahora.inclinar + 1e-9, `x ${x}`).toBeGreaterThanOrEqual(antes.inclinar);
      antes = ahora;
    }
    for (const paso of [3, 7]) {
      const fin = evaluar(sec, paso, 1, OPCIONES_INICIALES).figuras[0].pose;
      expect(fin.inclinar).toBeLessThan(0.02);
      expect(fin.agachar).toBeLessThan(0.01);
    }
  });

  it('los brazos llegan siempre y nada se mete en el cuerpo ni en las piernas; el torso no se apoya en los muslos', () => {
    for (const paso of [2, 3, 6, 7]) {
      for (let k = 0; k <= 60; k++) {
        const t = k / 60;
        const e = evaluar(sec, paso, t, OPCIONES_INICIALES);
        const p = e.figuras[0].pose;
        const q = resolverEsqueleto(p);
        const donde = `paso ${paso + 1}, t ${t.toFixed(3)}`;
        expect(dist(q.munecaD, p.manoD), `${donde}, derecha`).toBeLessThan(0.003);
        expect(dist(q.munecaI, p.manoI), `${donde}, izquierda`).toBeLessThan(0.003);
        const s = pielDelCuerpo(e);
        for (const L of ['D', 'I'] as const) {
          const W = L === 'D' ? q.munecaD : q.munecaI;
          const E = L === 'D' ? q.codoD : q.codoI;
          const H = L === 'D' ? q.hombroD : q.hombroI;
          const pal = L === 'D' ? q.palmaD : q.palmaI;
          const mano = segmentosMano(W, pal.dedos, pal.normal, L === 'D' ? 1 : -1, L === 'D' ? p.cierreD : p.cierreI);
          const puntos: [number[], number][] = [];
          for (const g of mano.slice(1)) for (const u of [0, 0.5, 1]) puntos.push([g.pos.map((v, i) => v + g.dir[i] * g.largo * u), g.radio]);
          for (const u of [0, 0.25, 0.5, 0.75]) puntos.push([W.map((v, i) => v + (E[i] - v) * u), 0.03]);
          for (const u of [0, 0.25, 0.5]) puntos.push([E.map((v, i) => v + (H[i] - v) * u), 0.04]);
          for (const [c, r] of puntos) {
            expect(distanciaConSigno(c, s) - r, `${donde}: brazo ${L} en el cuerpo`).toBeGreaterThan(-0.005);
            expect(distanciaPiernas(c, q) - r, `${donde}: brazo ${L} en las piernas`).toBeGreaterThan(-0.005);
          }
        }
        // El torso no se apoya en los muslos (salvo la pelvis, que los une).
        const torso = crearTorso();
        torso.deformar(q);
        const pos = torso.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i += 3) {
          const v = [pos.getX(i), pos.getY(i), pos.getZ(i)];
          if (dist(v, q.pelvis) < 0.22) continue;
          expect(distanciaPiernas(v, q), `${donde}: el torso en los muslos`).toBeGreaterThan(0);
        }
        // Las manos no se tocan.
        const sD = segmentosMano(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 1, p.cierreD);
        const sI = segmentosMano(q.munecaI, q.palmaI.dedos, q.palmaI.normal, -1, p.cierreI);
        let libre = 1e9;
        for (const a of sD) for (const b of sI) libre = Math.min(libre, dist(a.pos, b.pos) - a.radio - b.radio);
        expect(libre, `${donde}: las manos se tocan`).toBeGreaterThan(0);
      }
    }
  }, 120000);
});

describe('Enraizar · generar lo material (uno por uno, descrito en la revisión)', () => {
  const sec = SECUENCIAS['enraizar-material'];
  const ej = EJERCICIOS.find((x) => x.id === 'enraizar-material')!;
  const I = enraizarInterno;
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const durDe = (f: { dur: number }[]) => f.reduce((a, x) => a + x.dur, 0);
  /** Instante (t del paso) a `seg` segundos del comienzo de la fase `id`. */
  const en = (f: { id: string; dur: number }[], id: string, seg: number) => (durDe(f.slice(0, f.findIndex((x) => x.id === id))) + seg) / durDe(f);
  const huecoD = (q: ReturnType<typeof resolverEsqueleto>) => huecoPalma(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 0);

  it('5 pasos: abajo (−), arriba (+), la dona, el tubo al piso y la frase al final', () => {
    expect(sec.pasos).toHaveLength(5);
    expect(ej.numero).toBe(9);
    expect(ej.origen).toBe('revision');
    expect(ej.pasos[4].frase).toBe('SÁNATE, CONÉCTATE HASTA SANAR');
    // La versión de referencia se conserva aparte.
    expect(EJERCICIOS.find((x) => x.id === 'enraizar')).toBeDefined();
  });

  it('abajo: la mano derecha estirada hacia abajo, la palma al piso, agarra 5 veces en 5 s y se forma la esfera de tierra (−)', () => {
    let cierres = 0;
    let antes = 0;
    let sube = false;
    for (let k = 0; k <= 400; k++) {
      const t = en(I.FASES_ABAJO, 'agarrar', (5 * k) / 400);
      const e = evaluar(sec, 0, t, OPCIONES_INICIALES);
      const p = e.figuras[0].pose;
      const q = resolverEsqueleto(p);
      if (k === 0) {
        expect(dist(q.hombroD, q.munecaD), 'brazo estirado').toBeGreaterThan(0.52);
        expect(q.munecaD[1]).toBeLessThan(1.0);
        expect(q.palmaD.normal[1], 'palma al piso').toBeLessThan(-0.9);
      }
      // Cada agarre: los dedos se cierran y se abren.
      if (p.cierreD > antes) sube = true;
      else if (sube && p.cierreD < antes && antes > 0.55) {
        cierres++;
        sube = false;
      }
      antes = p.cierreD;
      const esf = e.esferas[0];
      expect(esf.color).toBe('tierra');
      expect(dist(esf.pos, huecoD(q)), `t ${t.toFixed(3)}: la esfera en la mano`).toBeLessThan(esf.radio + 0.02);
    }
    expect(cierres).toBe(AGARRES);
    const fin = evaluar(sec, 0, 1, OPCIONES_INICIALES).esferas[0];
    expect(fin.radio).toBeCloseTo(R_TIERRA, 3);
    expect(evaluar(sec, 0, en(I.FASES_ABAJO, 'agarrar', 0.2), OPCIONES_INICIALES).esferas[0].radio).toBeLessThan(R_TIERRA * 0.6);
  });

  it('arriba: la mano estirada hacia arriba, la palma al cielo, agarra 5 veces y la esfera se fortalece con el cielo (+)', () => {
    let cierres = 0;
    let antes = 0;
    let sube = false;
    for (let k = 0; k <= 400; k++) {
      const t = en(I.FASES_ARRIBA, 'agarrar', (5 * k) / 400);
      const e = evaluar(sec, 1, t, OPCIONES_INICIALES);
      const p = e.figuras[0].pose;
      const q = resolverEsqueleto(p);
      if (k === 0) {
        expect(dist(q.hombroD, q.munecaD), 'brazo estirado').toBeGreaterThan(0.52);
        expect(q.munecaD[1]).toBeGreaterThan(1.85);
        expect(q.palmaD.normal[1], 'palma al cielo').toBeGreaterThan(0.9);
      }
      if (p.cierreD > antes) sube = true;
      else if (sube && p.cierreD < antes && antes > 0.55) {
        cierres++;
        sube = false;
      }
      antes = p.cierreD;
      const esf = e.esferas[0];
      expect(dist(esf.pos, huecoD(q)), `t ${t.toFixed(3)}: la esfera en la mano`).toBeLessThan(esf.radio + 0.02);
    }
    expect(cierres).toBe(AGARRES);
    const fin = evaluar(sec, 1, 1, OPCIONES_INICIALES).esferas[0];
    expect(fin.radio).toBeCloseTo(R_CIELO, 3);
    expect(fin.color2).toBe('cielo');
    expect(fin.mezcla).toBeGreaterThan(0.5);
  });

  it('al frente del pecho, el índice izquierdo atraviesa la esfera por el centro y queda una dona', () => {
    let cerca = 1e9;
    for (let k = 0; k <= 100; k++) {
      const t = en(I.FASES_DONA, 'hueco', (2.5 * k) / 100);
      const e = evaluar(sec, 2, t, OPCIONES_INICIALES);
      const p = e.figuras[0].pose;
      const q = resolverEsqueleto(p);
      expect(p.aisladoI).toBe(0);
      const seg = segmentosMano(q.munecaI, q.palmaI.dedos, q.palmaI.normal, -1, p.cierreI, 0, 0, p.aisladoI, p.aislarI);
      const punta = seg[3].pos.map((v, i) => v + seg[3].dir[i] * seg[3].largo);
      cerca = Math.min(cerca, dist(punta, PECHO));
      expect(dist(e.esferas[0].pos, PECHO)).toBeLessThan(1e-6);
    }
    expect(cerca, 'el índice pasa por el centro').toBeLessThan(0.012);
    const antes = evaluar(sec, 2, en(I.FASES_DONA, 'hueco', 0), OPCIONES_INICIALES).esferas[0];
    const fin = evaluar(sec, 2, 1, OPCIONES_INICIALES);
    expect(antes.dona).toBeCloseTo(0, 5);
    expect(fin.esferas[0].dona).toBeCloseTo(1, 5);
    // La esfera, sobre la palma derecha; la izquierda volvió a su costado.
    const q = resolverEsqueleto(fin.figuras[0].pose);
    expect(dist(fin.esferas[0].pos, huecoD(q))).toBeLessThan(R_CIELO + 0.02);
    expect(q.munecaI[1]).toBeLessThan(1.0);
  });

  /** Distancia de un punto al eje del tubo, que baja recto de la boca `boca` al piso. */
  const alEje = (c: number[], boca: number[]) => Math.hypot(c[0] - boca[0], c[2] - boca[2]);
  /** La boca del tubo según el manto: su base más el eje por el largo. */
  const bocaDe = (m: { centro: number[]; eje: number[] | null; alto: number }) => m.centro.map((v, i) => v + (m.eje ? m.eje[i] : i === 1 ? 1 : 0) * m.alto);

  it('en cuclillas, el tubo nace en el perineo y la dona baja con la mano hasta el piso: el tubo queda formado del perineo al piso', () => {
    const fin = evaluar(sec, 3, 1, OPCIONES_INICIALES);
    const p = fin.figuras[0].pose;
    const q = resolverEsqueleto(p);
    expect(p.agachar).toBeGreaterThan(0.55);
    // Las rodillas, abiertas.
    expect(q.rodillaI[0] - q.rodillaD[0]).toBeGreaterThan(0.4);
    // El tubo, completo: de la boca, en el perineo, al ancla en el piso.
    const tubo = fin.mantos[0];
    expect(tubo.activo).toBe(true);
    expect(tubo.forma).toBe('tubo');
    expect(tubo.cobertura).toBeCloseTo(1, 5);
    expect(dist(tubo.centro, ANCLA)).toBeLessThan(1e-6);
    expect(ANCLA[1]).toBe(0);
    const boca = bocaDe(tubo);
    expect(dist(boca, BOCA_CUCLILLAS)).toBeLessThan(1e-6);
    // Nace del perineo: la boca está en la piel (apenas adentro), junto al punto del perineo.
    const perineo = transformarPunto(PUNTOS.perineo, p.agachar, p.inclinar, p.girar, p.atrasar);
    expect(dist(boca, perineo)).toBeLessThan(0.03);
    const piel = pielDelCuerpo(fin);
    expect(distanciaConSigno(boca, piel), 'el tubo sale del cuerpo').toBeLessThan(0.005);
    expect(distanciaConSigno(boca.map((v, i) => v - (tubo.eje as number[])[i] * 0.03), piel), 'debajo de la boca, afuera del cuerpo').toBeGreaterThan(0);
    // Recto: vertical, del perineo al piso justo debajo.
    expect((tubo.eje as number[])[1]).toBeCloseTo(1, 6);
    // Cuando el tubo queda formado, la dona ya desapareció.
    expect(fin.esferas[0].activa).toBe(false);
    // Al llegar al piso, la dona estaba apoyada en él, con el tubo por su hueco.
    const llega = evaluar(sec, 3, en(I.FASES_TUBO, 'bajar', 3.4), OPCIONES_INICIALES);
    const dona = llega.esferas[0];
    expect(dona.dona).toBeCloseTo(1, 5);
    expect(dona.pos[1]).toBeLessThan(0.05);
    expect(alEje(dona.pos, boca)).toBeLessThan(1e-6);
    expect(llega.mantos[0].cobertura).toBeCloseTo(1, 5);
    // La mano bajó con ella: la punta de los dedos en su borde, cerca del piso; la izquierda, en la rodilla.
    const seg = segmentosMano(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 1, p.cierreD);
    const puntas = [3, 6, 9, 12].map((j) => seg[j].pos.map((v, i) => v + seg[j].dir[i] * seg[j].largo));
    expect(Math.min(...puntas.map((c) => c[1]))).toBeLessThan(0.06);
    expect(Math.min(...puntas.map((c) => dist(c, dona.pos)))).toBeLessThan(R_CIELO + 0.04);
    expect(dist(q.munecaI, q.rodillaI)).toBeLessThan(0.12);
    // Mientras baja, la dona va con la mano y el tubo se forma detrás de ella, hasta la dona.
    let antes = 1e9;
    for (let k = 0; k <= 20; k++) {
      const e = evaluar(sec, 3, en(I.FASES_TUBO, 'bajar', 0.8 + (2.6 * k) / 20), OPCIONES_INICIALES);
      const d = e.esferas[0].pos;
      expect(d[1]).toBeLessThanOrEqual(antes + 1e-9);
      antes = d[1];
      const m = e.mantos[0];
      const fondo = bocaDe(m)[1] * (1 - m.cobertura);
      expect(Math.abs(fondo - d[1]), `bajar k ${k}: el tubo llega a la dona`).toBeLessThan(0.035);
    }
  });

  it('la mano baja al costado del tubo, sin meterse en él, y así se lo ve formarse', () => {
    for (let k = 0; k <= 60; k++) {
      const seg = 0.6 + 2.8 * (k / 60);
      const e = evaluar(sec, 3, en(I.FASES_TUBO, 'bajar', seg), OPCIONES_INICIALES);
      const p = e.figuras[0].pose;
      const q = resolverEsqueleto(p);
      const m = e.mantos[0];
      const boca = bocaDe(m);
      const fondo = boca[1] * (1 - m.cobertura);
      const mano = segmentosMano(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 1, p.cierreD);
      for (const g of mano)
        for (const u of [0, 0.5, 1]) {
          const c = g.pos.map((v, i) => v + g.dir[i] * g.largo * u);
          // Solo lo que está a la altura del tubo ya formado.
          if (c[1] > boca[1] || c[1] < fondo) continue;
          expect(alEje(c, boca) - g.radio, `bajar ${seg.toFixed(2)} s: la mano en el tubo`).toBeGreaterThan(R_TUBO);
        }
    }
  });

  it('al final se dice la frase y la figura se para: el tubo sigue recto y conectado del perineo al suelo', () => {
    const fin = evaluar(sec, 4, 1, OPCIONES_INICIALES);
    const p = fin.figuras[0].pose;
    expect(p.agachar).toBeLessThan(0.01);
    expect(p.inclinar).toBeLessThan(0.02);
    expect(p.abrirRodillas).toBeLessThan(0.01);
    // El tubo sigue: completo y recto, de la boca en el perineo (ya de pie) al piso justo debajo.
    const tubo = fin.mantos[0];
    expect(tubo.activo).toBe(true);
    expect(tubo.cobertura).toBeCloseTo(1, 5);
    expect(tubo.centro[1]).toBeCloseTo(0, 6);
    expect((tubo.eje as number[])[1]).toBeCloseTo(1, 6);
    const boca = bocaDe(tubo);
    expect(dist(boca, I.bocaTubo(p))).toBeLessThan(1e-6);
    expect(boca[1]).toBeGreaterThan(0.8);
    expect(distanciaConSigno(boca, pielDelCuerpo(fin))).toBeLessThan(0.005);
    // La dona ya no está: queda solo el tubo.
    expect(fin.esferas.some((s) => s.activa)).toBe(false);
    // Mientras se para, la boca acompaña al perineo en todo momento.
    for (let k = 0; k <= 20; k++) {
      const t = en(I.FASES_FRASE, 'pararse', (3.6 * k) / 20);
      const e = evaluar(sec, 4, t, OPCIONES_INICIALES);
      expect(dist(bocaDe(e.mantos[0]), I.bocaTubo(e.figuras[0].pose))).toBeLessThan(1e-6);
      expect(e.mantos[0].cobertura).toBeCloseTo(1, 5);
      expect((e.mantos[0].eje as number[])[1], 'recto también al pararse').toBeCloseTo(1, 6);
    }
  });

  it('la dona arranca pegada al perineo, baja con la mano por el tubo y, formado el tubo, desaparece: el tubo se mantiene', () => {
    /** Puntos de la superficie de la dona (el hueco a lo largo del tubo, vertical). */
    const anillo = (c: number[], r: number) => {
      const out: number[][] = [];
      for (let a = 0; a < 24; a++)
        for (let b = 0; b < 8; b++) {
          const th = (2 * Math.PI * a) / 24;
          const ph = (2 * Math.PI * b) / 8;
          const R = (DONA_ANILLO + DONA_GROSOR * Math.cos(ph)) * r;
          out.push([c[0] + R * Math.cos(th), c[1] + DONA_GROSOR * r * Math.sin(ph), c[2] + R * Math.sin(th)]);
        }
      return out;
    };
    // El tubo es más fino que el hueco: pasa por él.
    expect(R_TUBO).toBeLessThan(HUECO_DONA - 0.002);
    // Al empezar a bajar, la dona toca la piel del perineo, sin meterse.
    const e0 = evaluar(sec, 3, en(I.FASES_TUBO, 'bajar', 0), OPCIONES_INICIALES);
    const d0 = e0.esferas[0];
    const toca = Math.min(...anillo(d0.pos, d0.radio).map((c) => distanciaConSigno(c, pielDelCuerpo(e0))));
    expect(toca, 'pegada al perineo').toBeLessThan(0.005);
    expect(toca, 'sin meterse en el cuerpo').toBeGreaterThan(0);
    expect(alEje(d0.pos, bocaDe(e0.mantos[0]))).toBeLessThan(1e-6);
    // Del perineo al piso, la dona sigue entera y a la vista, en el tubo, sin meterse en el cuerpo ni en las piernas.
    const instantes: number[] = [];
    for (let k = 0; k <= 30; k++) instantes.push(en(I.FASES_TUBO, 'llevar', 1 + (k / 30) * 1));
    for (let k = 0; k <= 30; k++) instantes.push(en(I.FASES_TUBO, 'bajar', (k / 30) * 3.4));
    for (const t of instantes) {
      const e = evaluar(sec, 3, t, OPCIONES_INICIALES);
      const d = e.esferas[0];
      const donde = `paso 4, t ${t.toFixed(3)}`;
      expect(d.activa, donde).toBe(true);
      expect(d.dona, donde).toBeCloseTo(1, 5);
      expect(d.opacidad, donde).toBeCloseTo(1, 5);
      const q = resolverEsqueleto(e.figuras[0].pose);
      const piel = pielDelCuerpo(e);
      for (const c of anillo(d.pos, d.radio)) {
        expect(distanciaConSigno(c, piel), `${donde}: la dona en el cuerpo`).toBeGreaterThan(0);
        expect(distanciaPiernas(c, q), `${donde}: la dona en las piernas`).toBeGreaterThan(0);
      }
      if (e.mantos[0].activo && e.mantos[0].cobertura > 0.001) expect(alEje(d.pos, bocaDe(e.mantos[0])), `${donde}: la dona en el tubo`).toBeLessThan(1e-6);
    }
    // Formado el tubo, la dona se desvanece en el piso y desaparece; el tubo queda completo.
    let antes = 1;
    for (let k = 0; k <= 20; k++) {
      const e = evaluar(sec, 3, en(I.FASES_TUBO, 'sostener', (k / 20) * 2.2), OPCIONES_INICIALES);
      const d = e.esferas[0];
      const op = d.activa ? d.opacidad : 0;
      expect(op, `sostener k ${k}: se apaga`).toBeLessThanOrEqual(antes + 1e-9);
      antes = op;
      if (d.activa) expect(d.pos[1]).toBeLessThan(0.05);
      expect(e.mantos[0].activo).toBe(true);
      expect(e.mantos[0].cobertura, `sostener k ${k}: tubo completo`).toBeCloseTo(1, 5);
    }
    expect(evaluar(sec, 3, en(I.FASES_TUBO, 'sostener', 0.2), OPCIONES_INICIALES).esferas[0].activa, 'empieza a apagarse visible').toBe(true);
    expect(evaluar(sec, 3, en(I.FASES_TUBO, 'sostener', 1.1), OPCIONES_INICIALES).esferas[0].activa, 'al segundo ya no está').toBe(false);
    // En la frase y al pararse, solo el tubo.
    for (let k = 0; k <= 20; k++) {
      const e = evaluar(sec, 4, k / 20, OPCIONES_INICIALES);
      expect(e.esferas.some((s) => s.activa), `paso 5, t ${k / 20}: sin dona`).toBe(false);
      expect(e.mantos[0].activo).toBe(true);
      expect(e.mantos[0].cobertura, `paso 5, t ${k / 20}: tubo completo`).toBeCloseTo(1, 5);
    }
  }, 120000);

  it('los brazos llegan siempre y nada se mete en el cuerpo ni en las piernas; las manos no se tocan', () => {
    for (let paso = 0; paso < sec.pasos.length; paso++) {
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        const e = evaluar(sec, paso, t, OPCIONES_INICIALES);
        const p = e.figuras[0].pose;
        const q = resolverEsqueleto(p);
        const donde = `paso ${paso + 1}, t ${t.toFixed(3)}`;
        expect(dist(q.munecaD, p.manoD), `${donde}, derecha`).toBeLessThan(0.003);
        expect(dist(q.munecaI, p.manoI), `${donde}, izquierda`).toBeLessThan(0.003);
        const s = pielDelCuerpo(e);
        for (const L of ['D', 'I'] as const) {
          const W = L === 'D' ? q.munecaD : q.munecaI;
          const E = L === 'D' ? q.codoD : q.codoI;
          const H = L === 'D' ? q.hombroD : q.hombroI;
          const pal = L === 'D' ? q.palmaD : q.palmaI;
          const mano = segmentosMano(W, pal.dedos, pal.normal, L === 'D' ? 1 : -1, L === 'D' ? p.cierreD : p.cierreI, 0, 0, L === 'D' ? p.aisladoD : p.aisladoI, L === 'D' ? p.aislarD : p.aislarI);
          const puntos: [number[], number][] = [];
          for (const g of mano.slice(1)) for (const u of [0, 0.5, 1]) puntos.push([g.pos.map((v, i) => v + g.dir[i] * g.largo * u), g.radio]);
          for (const u of [0, 0.25, 0.5, 0.75]) puntos.push([W.map((v, i) => v + (E[i] - v) * u), 0.03]);
          for (const u of [0, 0.25, 0.5]) puntos.push([E.map((v, i) => v + (H[i] - v) * u), 0.04]);
          for (const [c, r] of puntos) {
            expect(distanciaConSigno(c, s) - r, `${donde}: brazo ${L} en el cuerpo`).toBeGreaterThan(-0.005);
            expect(distanciaPiernas(c, q) - r, `${donde}: brazo ${L} en las piernas`).toBeGreaterThan(-0.005);
          }
        }
        const torso = crearTorso();
        torso.deformar(q);
        const pos = torso.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i += 3) {
          const v = [pos.getX(i), pos.getY(i), pos.getZ(i)];
          if (dist(v, q.pelvis) < 0.22) continue;
          expect(distanciaPiernas(v, q), `${donde}: el torso en los muslos`).toBeGreaterThan(0);
        }
        const sD = segmentosMano(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 1, p.cierreD);
        const sI = segmentosMano(q.munecaI, q.palmaI.dedos, q.palmaI.normal, -1, p.cierreI, 0, 0, p.aisladoI, p.aislarI);
        let libre = 1e9;
        for (const a of sD) for (const b of sI) libre = Math.min(libre, dist(a.pos, b.pos) - a.radio - b.radio);
        expect(libre, `${donde}: las manos se tocan`).toBeGreaterThan(0);
      }
    }
  }, 120000);
});

describe('Activación de centros energéticos (uno por uno, descrito en la revisión)', () => {
  const sec = SECUENCIAS['activacion-centros'];
  const ej = EJERCICIOS.find((x) => x.id === 'activacion-centros')!;
  const A = activacionInterno;
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const durDe = (f: { dur: number }[]) => f.reduce((a, x) => a + x.dur, 0);
  /** Instante (t del paso de un centro) a `seg` segundos del comienzo de la fase `id`. */
  const en = (id: string, seg: number) => (durDe(A.FASES_CENTRO.slice(0, A.FASES_CENTRO.findIndex((x) => x.id === id))) + seg) / durDe(A.FASES_CENTRO);
  const durFase = (id: string) => A.FASES_CENTRO.find((x) => x.id === id)!.dur;
  const PASOS: [number, IdCentro][] = [
    [1, 'pecho'],
    [3, 'garganta'],
    [5, 'frente'],
  ];
  const huecoD = (q: ReturnType<typeof resolverEsqueleto>) => huecoPalma(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 0);
  /** Puntos de la superficie de la esfera, estirada a lo largo de su eje como la dibuja la escena. */
  const superficie = (e: Estado) => {
    const d = e.esferas[0];
    const ej3 = d.eje ?? [1, 0, 0];
    const u = Math.abs(ej3[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const p1 = [ej3[1] * u[2] - ej3[2] * u[1], ej3[2] * u[0] - ej3[0] * u[2], ej3[0] * u[1] - ej3[1] * u[0]];
    const n1 = Math.hypot(p1[0], p1[1], p1[2]);
    const a1 = p1.map((v) => v / n1);
    const a2 = [ej3[1] * a1[2] - ej3[2] * a1[1], ej3[2] * a1[0] - ej3[0] * a1[2], ej3[0] * a1[1] - ej3[1] * a1[0]];
    const largo = d.radio * d.estirar;
    const ancho = d.radio / Math.sqrt(d.estirar);
    const out: number[][] = [];
    for (let i = 0; i <= 12; i++)
      for (let j = 0; j < 16; j++) {
        const th = (Math.PI * i) / 12;
        const ph = (2 * Math.PI * j) / 16;
        out.push([0, 1, 2].map((x) => d.pos[x] + ej3[x] * largo * Math.cos(th) + (a1[x] * Math.cos(ph) + a2[x] * Math.sin(ph)) * ancho * Math.sin(th)));
      }
    return out;
  };

  it('6 pasos: barras y centro, tres veces (pecho, garganta y frente), con las frases de referencia', () => {
    expect(sec.pasos).toHaveLength(6);
    expect(ej.numero).toBe(10);
    expect(ej.origen).toBe('revision');
    expect(ej.pasos.map((p) => p.id)).toEqual(['barras-pecho', 'pecho', 'barras-garganta', 'garganta', 'barras-frente', 'frente']);
    expect(ej.pasos[1].frase).toBe(FRASES.pecho);
    expect(ej.pasos[3].frase).toBe(FRASES.garganta);
    expect(ej.pasos[5].frase).toBe(FRASES.frente);
    expect(FRASES.pecho).toBe('CON ESTA ESFERA DE LUZ ACTIVO EL PODER DEL AMOR QUE RADICA EN MÍ');
    // Las frases de garganta y frente son las del ejercicio de referencia, que se conserva aparte.
    const ref = EJERCICIOS.find((x) => x.id === 'activar-centros')!;
    expect(ref.pasos.map((p) => p.frase).filter(Boolean)).toEqual([FRASES.pecho, FRASES.garganta, FRASES.frente]);
  });

  it('después de cada carga de las barras, la mano derecha sostiene la esfera', () => {
    for (const paso of [0, 2, 4]) {
      const e = evaluar(sec, paso, 1, OPCIONES_INICIALES);
      const q = resolverEsqueleto(e.figuras[0].pose);
      expect(e.esferas[0].activa, `paso ${paso + 1}`).toBe(true);
      expect(dist(e.esferas[0].pos, huecoD(q)), `paso ${paso + 1}`).toBeLessThan(0.06);
    }
  });

  it('goma (5 s): la esfera queda pegada al centro y se estira hacia la palma, que mira al cuerpo y nunca lo toca', () => {
    for (const [paso, id] of PASOS) {
      const c = A.CENTROS[id];
      let min = 1e9;
      let max = 0;
      let redonda = 0;
      let antes = 0;
      let subiendo = true;
      for (let k = 0; k <= 50; k++) {
        const e = evaluar(sec, paso, en('goma', (SEG_GOMA * k) / 50), OPCIONES_INICIALES);
        const q = resolverEsqueleto(e.figuras[0].pose);
        const donde = `${id}, goma k ${k}`;
        // Pegada al centro: la esfera toca la piel sin meterse. En la garganta la piel baja en
        // pendiente hacia el pecho: al estirarse, la esfera se afina y queda a unos 6 mm.
        const piel = pielDelCuerpo(e);
        const toca = Math.min(...superficie(e).map((p) => distanciaConSigno(p, piel)));
        expect(toca, `${donde}: se mete en el cuerpo`).toBeGreaterThan(0);
        expect(toca, `${donde}: despegada del centro`).toBeLessThan(0.007);
        // La palma mira al cuerpo y queda delante de la esfera; nunca toca el cuerpo.
        expect(q.palmaD.normal[2], donde).toBeLessThan(-0.95);
        const h = huecoD(q);
        const d = h[2] - c.piel;
        expect(d, `${donde}: la palma toca el cuerpo`).toBeGreaterThan(0.07);
        // La esfera llega a la palma: su punta está en el hueco de la mano.
        const punta = e.esferas[0].pos[2] + e.esferas[0].radio * e.esferas[0].estirar;
        expect(Math.abs(punta - h[2]), `${donde}: la esfera se separa de la palma`).toBeLessThan(0.006);
        min = Math.min(min, d);
        max = Math.max(max, d);
        const est = e.esferas[0].estirar;
        if (k > 0 && subiendo && est < antes) subiendo = false;
        if (k > 0 && !subiendo && est > antes) {
          redonda++;
          subiendo = true;
        }
        antes = est;
      }
      expect(min, id).toBeCloseTo(dJunto(c), 2);
      expect(max, id).toBeGreaterThan(D_LEJOS - 0.005);
      // Se aleja y vuelve dos veces (la esfera vuelve a quedar redonda) y termina lejos.
      expect(redonda, id).toBe(2);
      const fin = evaluar(sec, paso, en('goma', SEG_GOMA - 1e-6), OPCIONES_INICIALES);
      expect(fin.esferas[0].estirar, id).toBeGreaterThan(1.6);
      expect(fin.hud.contador?.valor, id).toBeGreaterThanOrEqual(4);
      expect(evaluar(sec, paso, en('frase', 0), OPCIONES_INICIALES).hud.contador, id).toBeNull();
    }
  }, 120000);

  it('la frase se dice con la esfera quieta frente al centro, después de la goma', () => {
    for (const [paso, id] of PASOS) {
      // Antes no se dice (no se revela), y después queda entera.
      expect(evaluar(sec, paso, en('acercar', 1), OPCIONES_INICIALES).hud.frase, id).toBe(0);
      expect(evaluar(sec, paso, en('goma', 2), OPCIONES_INICIALES).hud.frase, id).toBe(0);
      expect(evaluar(sec, paso, en('introducir', 1), OPCIONES_INICIALES).hud.frase, id).toBe(1);
      const ini = evaluar(sec, paso, en('frase', 0.01), OPCIONES_INICIALES);
      const w0 = resolverEsqueleto(ini.figuras[0].pose).munecaD;
      let antes = -1;
      for (let k = 0; k <= 20; k++) {
        const e = evaluar(sec, paso, en('frase', (durFase('frase') * 0.999 * k) / 20), OPCIONES_INICIALES);
        expect(dist(resolverEsqueleto(e.figuras[0].pose).munecaD, w0), `${id}: la mano se mueve`).toBeLessThan(1e-6);
        expect(dist(e.esferas[0].pos, ini.esferas[0].pos), `${id}: la esfera se mueve`).toBeLessThan(1e-6);
        const f = e.hud.frase ?? -1;
        expect(f).toBeGreaterThanOrEqual(antes);
        antes = f;
      }
      expect(antes, id).toBe(1);
    }
  });

  it('la mano empuja hasta quedar a 10 cm, sin tocar el cuerpo: la esfera entra y el centro se enciende', () => {
    for (const [paso, id] of PASOS) {
      const c = A.CENTROS[id];
      let min = 1e9;
      for (let k = 0; k <= 30; k++) {
        const e = evaluar(sec, paso, en('introducir', (durFase('introducir') * k) / 30), OPCIONES_INICIALES);
        const d = huecoD(resolverEsqueleto(e.figuras[0].pose))[2] - c.piel;
        min = Math.min(min, d);
        // La esfera, mientras está, se aleja de la palma hacia el centro.
        if (e.esferas[0].activa && k > 15) expect(e.esferas[0].pos[2] + e.esferas[0].radio * e.esferas[0].estirar).toBeLessThan(huecoD(resolverEsqueleto(e.figuras[0].pose))[2] - 0.01);
      }
      expect(min, `${id}: la mano se acerca a menos de 10 cm`).toBeGreaterThan(D_ENTRA - 0.003);
      const fin = evaluar(sec, paso, en('introducir', durFase('introducir')), OPCIONES_INICIALES);
      expect(huecoD(resolverEsqueleto(fin.figuras[0].pose))[2] - c.piel, id).toBeCloseTo(D_ENTRA, 2);
      expect(fin.esferas[0].activa, `${id}: la esfera sigue afuera`).toBe(false);
      expect(fin.centros[c.punto] ?? 0, id).toBeGreaterThan(1);
      // Al terminar el paso, la mano vuelve a su costado y el centro queda encendido.
      const despues = evaluar(sec, paso, 1, OPCIONES_INICIALES);
      expect(despues.centros[c.punto] ?? 0, id).toBeGreaterThan(0.7);
      expect(dist(despues.figuras[0].pose.manoD, SERENA.manoD), id).toBeLessThan(1e-6);
    }
    // Al final, los tres centros encendidos.
    const fin = evaluar(sec, 5, 1, OPCIONES_INICIALES);
    for (const [, id] of PASOS) expect(fin.centros[A.CENTROS[id].punto] ?? 0, id).toBeGreaterThan(0.7);
  });

  it('los brazos llegan siempre; ni las manos ni la esfera se meten en el cuerpo; las manos no se tocan', () => {
    for (let paso = 0; paso < sec.pasos.length; paso++) {
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        const e = evaluar(sec, paso, t, OPCIONES_INICIALES);
        const p = e.figuras[0].pose;
        const q = resolverEsqueleto(p);
        const donde = `paso ${paso + 1}, t ${t.toFixed(3)}`;
        expect(dist(q.munecaD, p.manoD), `${donde}, derecha`).toBeLessThan(0.003);
        expect(dist(q.munecaI, p.manoI), `${donde}, izquierda`).toBeLessThan(0.003);
        const s = pielDelCuerpo(e);
        for (const L of ['D', 'I'] as const) {
          const W = L === 'D' ? q.munecaD : q.munecaI;
          const E = L === 'D' ? q.codoD : q.codoI;
          const H = L === 'D' ? q.hombroD : q.hombroI;
          const pal = L === 'D' ? q.palmaD : q.palmaI;
          const mano = segmentosMano(W, pal.dedos, pal.normal, L === 'D' ? 1 : -1, L === 'D' ? p.cierreD : p.cierreI);
          const puntos: [number[], number][] = [];
          for (const g of mano.slice(1)) for (const u of [0, 0.5, 1]) puntos.push([g.pos.map((v, i) => v + g.dir[i] * g.largo * u), g.radio]);
          for (const u of [0, 0.25, 0.5, 0.75]) puntos.push([W.map((v, i) => v + (E[i] - v) * u), 0.03]);
          for (const u of [0, 0.25, 0.5]) puntos.push([E.map((v, i) => v + (H[i] - v) * u), 0.04]);
          for (const [c, r] of puntos) expect(distanciaConSigno(c, s) - r, `${donde}: brazo ${L} en el cuerpo`).toBeGreaterThan(-0.005);
        }
        // La esfera no se mete en el cuerpo, salvo cuando entra en el centro.
        const fase = paso % 2 === 1 ? activacionFase(t) : '';
        if (e.esferas[0].activa && fase !== 'introducir') for (const c of superficie(e)) expect(distanciaConSigno(c, s), `${donde}: la esfera en el cuerpo`).toBeGreaterThan(-0.002);
        const sD = segmentosMano(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 1, p.cierreD);
        const sI = segmentosMano(q.munecaI, q.palmaI.dedos, q.palmaI.normal, -1, p.cierreI);
        let libre = 1e9;
        for (const a of sD) for (const b of sI) libre = Math.min(libre, dist(a.pos, b.pos) - a.radio - b.radio);
        expect(libre, `${donde}: las manos se tocan`).toBeGreaterThan(0);
      }
    }
  }, 120000);

  /** La fase de un paso de centro en el instante `t`. */
  function activacionFase(t: number) {
    let x = t * durDe(A.FASES_CENTRO);
    for (const f of A.FASES_CENTRO) {
      if (x < f.dur) return f.id;
      x -= f.dur;
    }
    return A.FASES_CENTRO[A.FASES_CENTRO.length - 1].id;
  }
});

describe('Sellado final (uno por uno, descrito en la revisión)', () => {
  const sec = SECUENCIAS['sellado-ombligo'];
  const ej = EJERCICIOS.find((x) => x.id === 'sellado-ombligo')!;
  const S = selladoInterno;
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const durDe = (f: { dur: number }[]) => f.reduce((a, x) => a + x.dur, 0);
  const enManos = (id: string, seg: number) => (durDe(S.FASES_MANOS.slice(0, S.FASES_MANOS.findIndex((x) => x.id === id))) + seg) / durDe(S.FASES_MANOS);
  const enResp = (id: string, seg: number) => (durDe(S.FASES_RESPIRAR.slice(0, S.FASES_RESPIRAR.findIndex((x) => x.id === id))) + seg) / durDe(S.FASES_RESPIRAR);
  const huecos = (e: Estado) => {
    const q = resolverEsqueleto(e.figuras[0].pose);
    return {
      q,
      D: huecoPalma(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 0),
      I: huecoPalma(q.munecaI, q.palmaI.dedos, q.palmaI.normal, 0),
    };
  };
  const imagen = (e: Estado) => e.marcas.find((m) => m.tipo === 'imagen');

  it('4 pasos: manos al ombligo, lengua al paladar, aguantar 30 s y manos a los costados (sin expandir y contraer)', () => {
    expect(sec.pasos).toHaveLength(4);
    expect(ej.numero).toBe(11);
    expect(ej.origen).toBe('revision');
    expect(ej.pasos.map((p) => p.id)).toEqual(['manos-ombligo', 'lengua-paladar', 'aguantar-30', 'manos-costados']);
    expect(ej.pasos[2].cantidad?.valor).toBe(30);
    expect(EJERCICIOS.find((x) => x.id === 'sellado-final')).toBeDefined();
    // No hay esfera que se expanda y se contraiga: en todo el ejercicio no aparece ninguna.
    for (let paso = 0; paso < 4; paso++)
      for (let k = 0; k <= 20; k++) {
        const e = evaluar(sec, paso, k / 20, OPCIONES_INICIALES);
        expect(e.esferas.some((x) => x.activa), `paso ${paso + 1}`).toBe(false);
        expect(e.hud.aviso ?? '').not.toMatch(/xpand|ontra/);
      }
  });

  it('la derecha tapa el ombligo con la palma y la izquierda va encima, sobre su dorso; presionan un poco', () => {
    const apoyada = huecos(evaluar(sec, 0, enManos('presionar', 0), OPCIONES_INICIALES));
    const fin = evaluar(sec, 0, 1, OPCIONES_INICIALES);
    const h = huecos(fin);
    // La palma derecha sobre el ombligo, mirando al cuerpo, con los dedos hacia la izquierda.
    expect(Math.hypot(h.D[0] - OMBLIGO[0], h.D[1] - OMBLIGO[1])).toBeLessThan(0.012);
    expect(h.q.palmaD.normal[2]).toBeLessThan(-0.95);
    expect(h.q.palmaD.dedos[0]).toBeGreaterThan(0.95);
    // Apoyada, la palma toca la piel; al presionar se hunde apenas (de 2 mm afuera a 2 mm adentro).
    expect(apoyada.D[2] - OMBLIGO[2]).toBeGreaterThan(0);
    expect(apoyada.D[2] - OMBLIGO[2]).toBeLessThan(0.004);
    expect(apoyada.D[2] - h.D[2]).toBeCloseTo(0.004, 3);
    expect(h.D[2] - OMBLIGO[2]).toBeGreaterThan(-0.003);
    // La izquierda encima: sobre el dorso de la derecha, mirando al cuerpo, con los dedos hacia la derecha.
    expect(Math.hypot(h.I[0] - h.D[0], h.I[1] - h.D[1])).toBeLessThan(0.012);
    expect(h.I[2] - h.D[2]).toBeCloseTo(GROSOR_MANO, 2);
    expect(h.q.palmaI.normal[2]).toBeLessThan(-0.95);
    expect(h.q.palmaI.dedos[0]).toBeLessThan(-0.95);
    // Las manos siguen así en la lengua y mientras se aguanta la respiración.
    for (const [paso, t] of [
      [1, 0.5],
      [2, 0.1],
      [2, 0.6],
      [2, 0.99],
    ] as const) {
      const o = huecos(evaluar(sec, paso, t, OPCIONES_INICIALES));
      expect(dist(o.D, h.D), `paso ${paso + 1}`).toBeLessThan(1e-6);
      expect(dist(o.I, h.I), `paso ${paso + 1}`).toBeLessThan(1e-6);
    }
  });

  it('el dibujo de la lengua en el paladar se ve junto a la cabeza en la lengua y mientras se aguanta la respiración', () => {
    expect(imagen(evaluar(sec, 0, 1, OPCIONES_INICIALES))).toBeUndefined();
    const enLengua = imagen(evaluar(sec, 1, 0.5, OPCIONES_INICIALES))!;
    expect(enLengua.texto).toBe('lengua-paladar');
    expect(enLengua.opacidad).toBeCloseTo(1, 5);
    // Junto a la boca: a la altura de la cabeza.
    expect(enLengua.pos[1]).toBeGreaterThan(1.5);
    expect(enLengua.pos[1]).toBeLessThan(1.65);
    for (let k = 0; k <= 20; k++) expect(imagen(evaluar(sec, 2, (0.97 * k) / 20, OPCIONES_INICIALES))?.opacidad ?? 0, `respirar ${k}`).toBeGreaterThan(0.5);
    expect(imagen(evaluar(sec, 3, 0.5, OPCIONES_INICIALES))).toBeUndefined();
  });

  it('se inhala, se aguanta la respiración 30 s (contados) y se exhala suave, sin mover las manos', () => {
    expect(sec.pasos[2].dur).toBeGreaterThanOrEqual(SEG_RETENER + 8);
    expect(evaluar(sec, 2, enResp('inhalar', 2), OPCIONES_INICIALES).hud.respiracion?.fase).toBe('Inhala');
    expect(evaluar(sec, 2, enResp('exhalar', 2), OPCIONES_INICIALES).hud.respiracion?.fase).toBe('Exhala');
    let antes = -1;
    for (let k = 0; k <= 60; k++) {
      const e = evaluar(sec, 2, enResp('retener', (SEG_RETENER * 0.999 * k) / 60), OPCIONES_INICIALES);
      const r = e.hud.respiracion!;
      expect(r.fase).toBe('Retén');
      const n = Number(/^(\d+) \/ 30 s$/.exec(r.etiqueta ?? '')?.[1]);
      expect(n).toBeGreaterThanOrEqual(antes);
      expect(n).toBeCloseTo((SEG_RETENER * 0.999 * k) / 60, -0.5);
      antes = n;
    }
    expect(antes).toBe(29);
    // Al terminar de retener, el contador llega a 30.
    expect(evaluar(sec, 2, enResp('retener', SEG_RETENER - 1e-6), OPCIONES_INICIALES).hud.respiracion?.etiqueta).toBe('30 / 30 s');
    expect(evaluar(sec, 2, enResp('exhalar', 0), OPCIONES_INICIALES).hud.respiracion?.fase).toBe('Exhala');
  });

  it('termina con las manos a los costados, de pie', () => {
    const fin = evaluar(sec, 3, 1, OPCIONES_INICIALES);
    const p = fin.figuras[0].pose;
    expect(dist(p.manoD, SERENA.manoD)).toBeLessThan(1e-6);
    expect(dist(p.manoI, SERENA.manoI)).toBeLessThan(1e-6);
    expect(fin.hud.respiracion).toBeNull();
    expect(imagen(fin)).toBeUndefined();
  });

  it('los brazos llegan siempre; las manos no se meten en el cuerpo (salvo apenas al presionar) ni se atraviesan', () => {
    for (let paso = 0; paso < sec.pasos.length; paso++) {
      for (let k = 0; k <= 30; k++) {
        const t = k / 30;
        const e = evaluar(sec, paso, t, OPCIONES_INICIALES);
        const p = e.figuras[0].pose;
        const q = resolverEsqueleto(p);
        const donde = `paso ${paso + 1}, t ${t.toFixed(3)}`;
        expect(dist(q.munecaD, p.manoD), `${donde}, derecha`).toBeLessThan(0.003);
        expect(dist(q.munecaI, p.manoI), `${donde}, izquierda`).toBeLessThan(0.003);
        const s = pielDelCuerpo(e);
        for (const L of ['D', 'I'] as const) {
          const W = L === 'D' ? q.munecaD : q.munecaI;
          const E = L === 'D' ? q.codoD : q.codoI;
          const H = L === 'D' ? q.hombroD : q.hombroI;
          const pal = L === 'D' ? q.palmaD : q.palmaI;
          const mano = segmentosMano(W, pal.dedos, pal.normal, L === 'D' ? 1 : -1, L === 'D' ? p.cierreD : p.cierreI, 0, 0, -1, 0, 0, L === 'D' ? p.apoyarD : p.apoyarI);
          const puntos: [number[], number][] = [];
          for (const g of mano.slice(1)) for (const u of [0, 0.5, 1]) puntos.push([g.pos.map((v, i) => v + g.dir[i] * g.largo * u), g.radio]);
          // El antebrazo con su grosor en la malla: 2,2 cm en la muñeca, 3,7 cm cerca del codo.
          [0.022, 0.027, 0.032, 0.037].forEach((r, j) => puntos.push([W.map((v, i) => v + (E[i] - v) * j * 0.25), r]));
          for (const u of [0, 0.25, 0.5]) puntos.push([E.map((v, i) => v + (H[i] - v) * u), 0.04]);
          for (const [c, r] of puntos) expect(distanciaConSigno(c, s) - r, `${donde}: brazo ${L} en el cuerpo`).toBeGreaterThan(-0.006);
        }
        // Los dedos de una mano no atraviesan la otra mano (la izquierda se apoya en la derecha).
        const sD = segmentosMano(q.munecaD, q.palmaD.dedos, q.palmaD.normal, 1, p.cierreD, 0, 0, -1, 0, 0, p.apoyarD).slice(1);
        const sI = segmentosMano(q.munecaI, q.palmaI.dedos, q.palmaI.normal, -1, p.cierreI, 0, 0, -1, 0, 0, p.apoyarI).slice(1);
        let libre = 1e9;
        for (const a of sD) for (const b of sI) {
          for (let i = 0; i <= 4; i++)
            for (let j = 0; j <= 4; j++) {
              const pa = a.pos.map((v, x) => v + a.dir[x] * a.largo * (i / 4));
              const pb = b.pos.map((v, x) => v + b.dir[x] * b.largo * (j / 4));
              libre = Math.min(libre, dist(pa, pb) - a.radio - b.radio);
            }
        }
        expect(libre, `${donde}: los dedos se atraviesan`).toBeGreaterThan(-0.004);
      }
    }
  }, 120000);
});

describe('Respiraciones conscientes (aclarado en la revisión): ritmos 4-3-4, 3-3-3 y 5-5-5 con pausa de 1 s', () => {
  const RITMOS_TODOS: Ritmo[] = ['4-3-4', '3-3-3', '5-5-5'];
  const CASOS = [
    { id: 'liberar-creencias', paso: 2, total: 15, previo: 1.8 },
    { id: 'equilibrar-organos', paso: 0, total: 30, previo: 1.2 },
  ] as const;
  const con = (ritmo: Ritmo, video: boolean): Opciones => ({ ...OPCIONES_INICIALES, ritmo, video });

  it('cada ritmo: inhalar · retener · exhalar y la pausa de 1 s en todos', () => {
    expect(PAUSA_RESPIRACION).toBe(1);
    expect(RITMOS['4-3-4']).toEqual([4, 3, 4]);
    expect(RITMOS['3-3-3']).toEqual([3, 3, 3]);
    expect(RITMOS['5-5-5']).toEqual([5, 5, 5]);
    expect(cicloRespiracion('4-3-4')).toBe(12);
    expect(cicloRespiracion('3-3-3')).toBe(10);
    expect(cicloRespiracion('5-5-5')).toBe(16);
    expect(OPCIONES_INICIALES.ritmo).toBe('4-3-4');
    expect(OPCIONES_INICIALES.video).toBe(false);
  });

  it('sin video el paso muestra una respiración de muestra; con el video dura todas', () => {
    for (const c of CASOS) {
      const sec = SECUENCIAS[c.id];
      const p = sec.pasos[c.paso];
      const ej = EJERCICIOS.find((x) => x.id === c.id)!;
      expect(ej.pasos[c.paso].respiraciones, c.id).toBe(c.total);
      for (const r of RITMOS_TODOS) {
        expect(durPaso(p, con(r, false)), `${c.id} ${r}`).toBeCloseTo(c.previo + cicloRespiracion(r) + 0.6, 6);
        expect(durPaso(p, con(r, true)), `${c.id} ${r} con video`).toBeCloseTo(c.previo + c.total * cicloRespiracion(r) + 0.6, 6);
      }
      // Los demás pasos no cambian con las opciones; el total sí.
      sec.pasos.forEach((q, i) => {
        if (i !== c.paso) expect(durPaso(q, con('5-5-5', true)), `${c.id} paso ${i + 1}`).toBe(q.dur);
      });
      expect(duracionTotal(sec, con('4-3-4', true)) - duracionTotal(sec, con('4-3-4', false))).toBeCloseTo((c.total - 1) * 12, 6);
      // ubicar e inicios usan las mismas duraciones.
      const o = con('5-5-5', true);
      const ini = inicios(sec, o);
      const u = ubicar(sec, ini[c.paso] + c.previo + 20, o);
      expect(u.paso).toBe(c.paso);
      expect(u.t * durPaso(p, o)).toBeCloseTo(c.previo + 20, 6);
    }
  });

  it('el anillo sigue el ritmo elegido en tiempo real: inhala, retén, exhala y pausa de 1 s', () => {
    for (const c of CASOS) {
      const sec = SECUENCIAS[c.id];
      const p = sec.pasos[c.paso];
      for (const r of RITMOS_TODOS) {
        const o = con(r, false);
        const [i, h, x] = RITMOS[r];
        const fase = (seg: number) => evaluar(sec, c.paso, seg / durPaso(p, o), o).hud.respiracion?.fase ?? null;
        expect(fase(c.previo * 0.5), `${c.id} ${r}: antes de empezar`).toBeNull();
        expect(fase(c.previo + i * 0.5)).toBe('Inhala');
        expect(fase(c.previo + i + h * 0.5)).toBe('Retén');
        expect(fase(c.previo + i + h + x * 0.5)).toBe('Exhala');
        expect(fase(c.previo + i + h + x + 0.5)).toBe('Pausa');
        const e = evaluar(sec, c.paso, (c.previo + 1) / durPaso(p, o), o);
        expect(e.hud.respiracion?.etiqueta).toBe(`× ${c.total} · ritmo ${RITMOS[r].join(' · ')} · pausa 1 s`);
      }
    }
  });

  it('acompañando con el video, el anillo cuenta cada respiración hasta la última', () => {
    for (const c of CASOS) {
      const sec = SECUENCIAS[c.id];
      const p = sec.pasos[c.paso];
      const o = con('3-3-3', true);
      const en = (seg: number) => evaluar(sec, c.paso, seg / durPaso(p, o), o).hud.respiracion!;
      expect(en(c.previo + 1).etiqueta).toBe(`1 / ${c.total} · ritmo 3 · 3 · 3 · pausa 1 s`);
      expect(en(c.previo + 2 * 10 + 1).ciclo).toBe(3);
      expect(en(c.previo + 2 * 10 + 1).fase).toBe('Inhala');
      const ultima = en(c.previo + (c.total - 1) * 10 + 4);
      expect(ultima.ciclo).toBe(c.total);
      expect(ultima.fase).toBe('Retén');
      // Al final del paso, la última respiración terminó (en la pausa).
      const fin = evaluar(sec, c.paso, 1, o).hud.respiracion!;
      expect(fin.ciclo).toBe(c.total);
      expect(fin.fase).toBe('Pausa');
    }
  });

  it('con cualquier ritmo y con o sin video, los estados son finitos', () => {
    for (const c of CASOS) {
      const sec = SECUENCIAS[c.id];
      for (const r of RITMOS_TODOS)
        for (const video of [false, true])
          for (let k = 0; k <= 40; k++) {
            const e = evaluar(sec, c.paso, k / 40, con(r, video));
            expect(buscarNoFinito(e), `${c.id} ${r} video ${video} k ${k}`).toBeNull();
          }
    }
  });
});
