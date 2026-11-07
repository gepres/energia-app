import { PUNTOS, type PuntoCuerpo, resolverEsqueleto } from '../escena/cuerpo';
import { type Estado, ref } from '../escena/estado';
import { type V3, arco, campana, clamp, lerp, lerpV, rotarY, saleAtras, sumaV, suave, tramo } from '../escena/mate';
import {
  CARGA_OMBLIGO,
  CARGA_PECHO,
  SENSIBILIZAR,
  SERENA,
  empujarHacia,
  esferaEnManosEn,
  palmasArriba,
  sellarCarga,
} from '../escena/poses';
import { TOMAS, apagarFlujos, cargar, esfera, flujo, palmaMundo, pulso, sellarDesdeCielo } from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';

const inicialSerena: Secuencia['inicial'] = (e) => {
  fijarPose(e, 0, SERENA);
  e.camara = { ...TOMAS.general };
};

// ── 8 · Carga del ombligo y del pecho ──────────────────────────────────

export const cargaYSellado: Secuencia = {
  inicial: inicialSerena,
  pasos: [
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, TOMAS.ombligo, t, 0, 0.22);
        cargar(e, t, { pose: CARGA_OMBLIGO, centro: 'ombligo', n: 30, etiqueta: 'cargas en el ombligo' });
      },
    },
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, TOMAS.pecho, t, 0, 0.25);
        // La carga del ombligo queda encendida, más tenue.
        e.esferas[0].brillo = 0.8;
        e.esferas[0].radio = 0.05;
        cargar(e, t, { pose: CARGA_PECHO, centro: 'corazon', n: 30, etiqueta: 'cargas en el pecho', esferaI: 1, flujoI: 1 });
        e.flujos[0].activo = false;
        e.centros.ombligo = 0.6;
      },
    },
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, { pos: [1.35, 1.7, 4.2], mira: [0, 1.08, 0], fov: 34 }, t, 0, 0.3);
        const s1 = e.esferas[1];
        if (s1.activa) {
          s1.radio *= 1 - tramo(t, 0, 0.2);
          if (t > 0.2) s1.activa = false;
        }
        sellarDesdeCielo(e, t);
        e.centros.corazon = (e.centros.corazon ?? 0) * (1 - tramo(t, 0, 0.3));
        e.centros.ombligo = (e.centros.ombligo ?? 0) * (1 - tramo(t, 0, 0.3));
      },
    },
  ],
};

// ── 9 · Sensibilización de manos ────────────────────────────────────────

/** Puntos del antebrazo izquierdo según la pose objetivo: palma, muñeca, antebrazo, codo. */
function brazoIzquierdo(e: Estado) {
  const f = e.figuras[0];
  const esq = resolverEsqueleto(f.pose);
  const m = (p: V3) => sumaV(rotarY(p, f.rotY), f.pos);
  const arriba = (p: V3, h = 0.05): V3 => [p[0], p[1] + h, p[2]];
  return [
    arriba(m(esq.palmaI.centro), 0.05),
    arriba(m(esq.munecaI), 0.055),
    arriba(m(lerpV(esq.munecaI, esq.codoI, 0.5)), 0.06),
    arriba(m(esq.codoI), 0.065),
  ];
}

export const sensibilizarManos: Secuencia = {
  inicial: inicialSerena,
  pasos: [
    // 1 · Tomar dos esferas y juntarlas
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, TOMAS.manos, t, 0, 0.3);
        posar(e, 0, palmasArriba(0.44, 1.06, 0.34), t, 0, 0.2);
        const aparece = saleAtras(tramo(t, 0.12, 0.3));
        const junta = tramo(t, 0.4, 0.68);
        posar(e, 0, esferaEnManosEn([0, 1.16, 0.36], 0.24), t, 0.38, 0.66);
        if (junta < 1) {
          esfera(e, 0, { ref: ref('manoD', 0, [0.08 * junta, 0.055 - 0.02 * junta, 0.03 * junta]), pegado: 1, radio: 0.038 * aparece, color: 'oro', brillo: 1.1 });
          esfera(e, 1, { ref: ref('manoI', 0, [-0.08 * junta, 0.055 - 0.02 * junta, 0.03 * junta]), pegado: 1, radio: 0.038 * aparece, color: 'oro', brillo: 1.1 });
        } else {
          e.esferas[1].activa = false;
          esfera(e, 0, { ref: ref('manos', 0, [0, 0.03, 0.035]), pegado: 1, radio: 0.06, color: 'oro', brillo: 1.25 });
          pulso(e, puntoMundo(e, 0, [0, 1.16, 0.36]), clamp((t - 0.68) / 0.25), 0.28, 'oro');
        }
      },
    },
    // 2 · Pasar de mano en mano
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.1, 0.3], 1.05, 0.25, 0.32), t, 0, 0.3);
        posar(e, 0, palmasArriba(0.4, 1.05, 0.34), t, 0, 0.18);
        const d = palmaMundo(e, 0, 'D');
        const i = palmaMundo(e, 0, 'I');
        const sobre = (p: V3): V3 => [p[0], p[1] + 0.055, p[2]];
        // Derecha → izquierda → derecha → izquierda, en arcos.
        const k = clamp((t - 0.18) / 0.75);
        const tramoN = Math.min(2, Math.floor(k * 3));
        const f = suave(clamp(k * 3 - tramoN));
        const desde = tramoN % 2 === 0 ? sobre(d) : sobre(i);
        const hasta = tramoN % 2 === 0 ? sobre(i) : sobre(d);
        esfera(e, 0, { ref: null, pegado: 0, pos: t < 0.18 ? lerpV(sobre(d), sobre(i), 0.5) : arco(desde, hasta, f, 0.12), radio: 0.055, color: 'oro', brillo: 1.25 });
        if (t < 0.18) esfera(e, 0, { pos: arco(lerpV(sobre(d), sobre(i), 0.5), sobre(d), tramo(t, 0, 0.18), 0.05) });
      },
    },
    // 3 · Deslizar por muñeca, antebrazo y codo
    {
      dur: 10,
      aplicar: (e, t) => {
        toma(e, encuadre([0.1, 1.14, 0.25], 0.95, 1.0, 0.45), t, 0, 0.3);
        posar(e, 0, SENSIBILIZAR, t, 0, 0.2);
        const [palma, muneca, ante, codo] = brazoIzquierdo(e);
        const k = clamp((t - 0.22) / 0.7);
        // Ida hasta el codo y vuelta a la palma.
        const ida = k < 0.6 ? suave(k / 0.6) : 1 - suave((k - 0.6) / 0.4);
        const ruta = [palma, muneca, ante, codo];
        const x = ida * 3;
        const j = Math.min(2, Math.floor(x));
        esfera(e, 0, { ref: null, pegado: 0, pos: lerpV(ruta[j], ruta[j + 1], x - j), radio: 0.045, color: 'oro', brillo: 1.25 });
        const etiquetas = ['muñeca', 'antebrazo', 'codo'];
        etiquetas.forEach((txt, n) =>
          e.marcas.push({ pos: [ruta[n + 1][0], ruta[n + 1][1] + 0.09, ruta[n + 1][2]], texto: txt, opacidad: tramo(t, 0.2, 0.3) * (1 - tramo(t, 0.92, 1)), tipo: 'nombre' }),
        );
      },
    },
    // 4 · Palpar a distancia con la otra mano
    {
      dur: 10,
      aplicar: (e, t) => {
        toma(e, encuadre([0.05, 1.18, 0.3], 1.0, 0.7, 0.3), t, 0, 0.3);
        const [palma, , ante] = brazoIzquierdo(e);
        const centro = lerpV(palma, ante, 0.4);
        esfera(e, 0, { ref: null, pegado: 0, pos: centro, radio: 0.05, color: 'oro', brillo: 1.15 + 0.3 * Math.abs(Math.sin(t * 12)) });
        // La mano derecha se acerca y se aleja sobre la esfera, sin tocarla.
        const k = clamp((t - 0.1) / 0.85);
        const h = lerp(0.2, 0.09, 0.5 - 0.5 * Math.cos(k * Math.PI * 4));
        const p = { ...SENSIBILIZAR };
        const local: V3 = [centro[0] - e.figuras[0].pos[0] - 0.02, centro[1] + h - 0.03, centro[2] - 0.06];
        p.manoD = local;
        posar(e, 0, p, t, 0, 0.15);
        if (t >= 0.15) e.figuras[0].pose = p;
        const sensaciones = ['calor', 'presión', 'hormigueo', 'electricidad'];
        const n = Math.min(3, Math.floor(k * 4));
        e.hud.aviso = k > 0 && k < 1 ? `Sensación: ${sensaciones[n]}` : null;
        pulso(e, centro, (k * 4) % 1, 0.2, 'oro');
      },
    },
  ],
};

// ── 10 · Activación de centros energéticos ──────────────────────────────

/** Hace chicle con la esfera entre las manos (estirar y compactar). */
function chicle(e: Estado, t: number, a: number, b: number, esferaI = 0) {
  const k = clamp((t - a) / (b - a));
  const estira = campana(k, 0, 0.5) * 0.7 + campana(k, 0.45, 1) * 0.45;
  const sep = 0.22 + 0.24 * estira;
  if (k > 0 && k < 1) e.figuras[0].pose = esferaEnManosEn([0, 1.16, 0.36], sep);
  esfera(e, esferaI, {
    ref: ref('manos', 0, [0, 0.03, 0.035]),
    pegado: 1,
    radio: 0.052,
    estirar: 1 + 1.6 * estira,
    color: 'oro',
    brillo: 1.2,
  });
}

function activarCentro(e: Estado, t: number, centro: PuntoCuerpo, color: 'jade' | 'cielo' | 'violeta', esferaI: number) {
  posar(e, 0, esferaEnManosEn([0, 1.16, 0.36], 0.22), t, 0, 0.1);
  chicle(e, t, 0.08, 0.36, esferaI);
  const p = PUNTOS[centro];
  const objetivo: V3 = [p[0], p[1], p[2] + 0.075];
  posar(e, 0, empujarHacia(p, 0.075), t, 0.36, 0.55);
  const empuja = tramo(t, 0.42, 0.62);
  const s = e.esferas[esferaI];
  if (empuja > 0) {
    const desde = puntoMundo(e, 0, [0, 1.19, 0.4]);
    s.ref = null;
    s.pegado = 0;
    s.pos = lerpV(desde, puntoMundo(e, 0, objetivo), empuja);
    s.estirar = 1;
    s.color = color;
    s.brillo = 1.2 + 0.4 * empuja;
  }
  e.centros[centro] = tramo(t, 0.55, 0.75) * 1.2;
  pulso(e, puntoMundo(e, 0, objetivo), clamp((t - 0.62) / 0.25), 0.3, color);
  posar(e, 0, SERENA, t, 0.78, 1);
  e.marcas.push({ pos: [0.2, p[1] + 0.06, p[2] + 0.1], texto: '5–10 cm', opacidad: campana(t, 0.55, 1), tipo: 'distancia' });
}

export const activarCentros: Secuencia = {
  inicial: inicialSerena,
  pasos: [
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, TOMAS.manos, t, 0, 0.3);
        posar(e, 0, esferaEnManosEn([0, 1.16, 0.36], 0.22), t, 0, 0.15);
        chicle(e, t, 0.15, 0.95, 0);
        e.esferas[0].radio *= saleAtras(tramo(t, 0.05, 0.2));
      },
    },
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.25, 0.2], 1.15, 0.7, 0.08), t, 0, 0.3);
        activarCentro(e, t, 'corazon', 'jade', 0);
      },
    },
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.36, 0.18], 1.1, 0.72, 0.06), t, 0, 0.3);
        e.esferas[0].brillo = 0.9;
        activarCentro(e, t, 'garganta', 'cielo', 1);
      },
    },
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.45, 0.18], 1.05, 0.75, 0.04), t, 0, 0.3);
        e.esferas[1].brillo = 0.9;
        activarCentro(e, t, 'tercerOjo', 'violeta', 2);
      },
    },
  ],
};

// ── 11 · Recorrido por chakras ──────────────────────────────────────────

const FRENTE: PuntoCuerpo[] = ['tercerOjo', 'garganta', 'corazon', 'ombligo', 'genital'];
const ESPALDA: PuntoCuerpo[] = ['coxis', 'omoplatos', 'nuca'];

/** Punto del recorrido separado de la piel (por delante o por detrás). */
function fuera(c: PuntoCuerpo): V3 {
  const p = PUNTOS[c];
  const lado = p[2] >= 0 ? 1 : -1;
  return [p[0], p[1], p[2] + lado * 0.07];
}

function recorrer(e: Estado, t: number, a: number, b: number, ruta: V3[], centros: PuntoCuerpo[]) {
  const k = clamp((t - a) / (b - a));
  const x = suave(k) * (ruta.length - 1);
  const j = Math.min(ruta.length - 2, Math.floor(x));
  const pos = lerpV(ruta[j], ruta[j + 1], x - j);
  esfera(e, 0, { ref: null, pegado: 0, pos: puntoMundo(e, 0, pos), radio: 0.045, color: 'violeta', brillo: 1.35 });
  centros.forEach((c, n) => {
    const llega = clamp((x - n) * 3);
    e.centros[c] = Math.max(e.centros[c] ?? 0, 0.25 + 0.75 * llega * (1 - 0.6 * clamp(x - n - 0.4)));
  });
  return pos;
}

export const recorridoChakras: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = encuadre([0, 1.1, 0], 2.2, 1.2, 0.12);
  },
  pasos: [
    {
      dur: 6,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.25, 0], 1.6, 1.15, 0.12), t, 0, 0.4);
        const sobre = PUNTOS.coronilla;
        esfera(e, 0, { pos: puntoMundo(e, 0, [0, sobre[1] + 0.09, 0]), radio: 0.05 * saleAtras(tramo(t, 0.15, 0.45)), color: 'violeta', brillo: 1.4 });
        e.centros.coronilla = tramo(t, 0.3, 0.6);
      },
    },
    {
      dur: 11,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.22, 0.05], 1.6, 0.95, 0.1), t, 0, 0.3);
        const ruta: V3[] = [[0, PUNTOS.coronilla[1] + 0.09, 0.02], ...FRENTE.map(fuera)];
        recorrer(e, t, 0.08, 0.95, ruta, FRENTE);
      },
    },
    {
      dur: 10,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.22, -0.05], 1.6, 2.35, 0.1), t, 0.05, 0.4);
        const ruta: V3[] = [fuera('genital'), [0, 0.8, 0.0], ...ESPALDA.map(fuera)];
        recorrer(e, t, 0.1, 0.95, ruta, ESPALDA);
      },
    },
    {
      dur: 10,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.42, 0], 1.25, 1.2, 0.2), t, 0, 0.35);
        const desde = fuera('nuca');
        const sobre: V3 = [0, PUNTOS.coronilla[1] + 0.09, 0];
        const sube = tramo(t, 0.05, 0.35);
        const absorbe = tramo(t, 0.35, 0.55);
        esfera(e, 0, {
          ref: null,
          pegado: 0,
          pos: puntoMundo(e, 0, arco(desde, lerpV(sobre, [0, PUNTOS.coronilla[1] - 0.03, 0], absorbe), sube, 0.08)),
          radio: 0.045 * (1 - absorbe),
          color: 'violeta',
          brillo: 1.4,
        });
        if (absorbe >= 1) e.esferas[0].activa = false;
        pulso(e, puntoMundo(e, 0, PUNTOS.coronilla), clamp((t - 0.5) / 0.25), 0.35, 'violeta');
        e.centros.coronilla = 0.4 + 0.8 * tramo(t, 0.45, 0.6);
        // Sensación descrita: «un gorrito con punta que daba vueltas».
        const giro = tramo(t, 0.58, 0.75);
        const vueltas = 9;
        const puntos: V3[] = Array.from({ length: vueltas * 6 + 1 }, (_, i) => {
          const u = i / (vueltas * 6);
          const r = 0.13 * (1 - u);
          const ang = u * vueltas * Math.PI * 2;
          return puntoMundo(e, 0, [Math.cos(ang) * r, PUNTOS.coronilla[1] - 0.01 + u * 0.24, Math.sin(ang) * r]);
        });
        flujo(e, 0, puntos, { cabeza: 1, cola: 1, color: 'violeta', intensidad: giro * 0.9, remolino: 0.005, ancho: 0.8 });
        e.hud.aviso = giro > 0.3 ? 'Sensación descrita: «un gorrito con punta que daba vueltas»' : null;
      },
    },
  ],
};

// ── 12 · Sellado final ──────────────────────────────────────────────────

export const selladoFinal: Secuencia = {
  inicial: inicialSerena,
  pasos: [
    {
      dur: 7,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.08, 0.2], 1.0, 0.55, 0.22), t, 0, 0.35);
        posar(e, 0, sellarCarga(0.13), t, 0.05, 0.4);
        e.marcas.push({ pos: puntoMundo(e, 0, [-0.2, 0.98, 0.3]), texto: 'derecha · debajo', opacidad: campana(t, 0.4, 1), tipo: 'nombre' });
        e.marcas.push({ pos: puntoMundo(e, 0, [0.22, 1.18, 0.3]), texto: 'izquierda · encima', opacidad: campana(t, 0.45, 1), tipo: 'nombre' });
        esfera(e, 0, { ref: null, pegado: 0, pos: puntoMundo(e, 0, [0, 1.06, 0.29]), radio: 0.04 * tramo(t, 0.45, 0.7), color: 'oro', brillo: 1.2 });
      },
    },
    {
      dur: 11,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.1, 0.25], 1.05, 0.5, 0.15), t, 0, 0.3);
        const k = clamp((t - 0.08) / 0.84);
        // Dos ciclos de expandir y contraer.
        const ciclo = 0.5 - 0.5 * Math.cos(k * Math.PI * 4);
        const sep = lerp(0.12, 0.3, ciclo);
        if (t > 0.05) e.figuras[0].pose = sellarCarga(sep);
        const centro = puntoMundo(e, 0, [0, 1.0 + sep / 2 + 0.01, 0.29]);
        esfera(e, 0, { ref: null, pegado: 0, pos: centro, radio: lerp(0.04, 0.11, ciclo), color: 'oro', brillo: 1.1 + 0.3 * ciclo });
        e.hud.aviso = k > 0 && k < 1 ? (Math.sin(k * Math.PI * 4) > 0 ? 'Expandir' : 'Contraer') : null;
        if (t > 0.94) {
          posar(e, 0, SERENA, t, 0.94, 1);
          e.esferas[0].radio *= 1 - tramo(t, 0.94, 1);
        }
        apagarFlujos(e);
      },
    },
  ],
};
