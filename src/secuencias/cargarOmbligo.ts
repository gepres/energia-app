import { resolverEsqueleto } from '../escena/cuerpo';
import { type Estado, ref } from '../escena/estado';
import { centroAgarre } from '../escena/manos';
import { type V3, campana, clamp, saleAtras, tramo } from '../escena/mate';
import { RADIO_BARRA, SERENA, poseCargaBarras } from '../escena/poses';
import { TOMAS, esfera, flujo, pulso } from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';

/**
 * «Cargar el ombligo», tal como lo describió el taller: brazos bien estirados al
 * frente, a la altura de los hombros, tomando energía de dos barras verticales;
 * las manos, intercaladas, llevan despacio una esfera cada vez al ombligo.
 * 15 por cada mano (30 en total). Empieza la derecha.
 */

const POR_MANO = 15;
const TOTAL = POR_MANO * 2;
/** Segundos de un ciclo completo de una mano (tomar, llevar, entregar, volver): es lento. */
const SEG_CICLO = 3.4;
/** La mano siguiente empieza cuando la anterior comienza a volver a su barra. */
const DESFASE = 0.86;
const CICLOS = (TOTAL - 1) * DESFASE + 1;
const SEG_CARGAS = CICLOS * SEG_CICLO;
const SEG_ANTES = 0.6;
const SEG_DESPUES = 3.5;
const DUR_CARGAS = SEG_ANTES + SEG_CARGAS + SEG_DESPUES;

// Cada barra pasa justo por el puño de la mano que la agarra (con los brazos estirados).
const AGARRE = resolverEsqueleto(poseCargaBarras(null, null));
function barraEnElPuno(p: { dedos: V3; normal: V3 }, muneca: V3): V3 {
  const c = centroAgarre(muneca, p.dedos, p.normal, RADIO_BARRA);
  return [c[0], 0, c[2]];
}
const BARRA_DER = barraEnElPuno(AGARRE.palmaD, AGARRE.munecaD);
const BARRA_IZQ = barraEnElPuno(AGARRE.palmaI, AGARRE.munecaI);
/** Punto de la carga, justo delante del ombligo. */
const OMBLIGO: V3 = [0, 1.04, 0.14];

type Lado = 'D' | 'I';
const LADOS: Lado[] = ['D', 'I'];

function barras(e: Estado, opacidad: number, resalteDer = 0, resalteIzq = 0) {
  Object.assign(e.barras, {
    activa: true,
    izq: [...BARRA_IZQ],
    der: [...BARRA_DER],
    alto: 1.75,
    opacidad,
    resalte: resalteIzq,
    resalteDer,
    radio: RADIO_BARRA,
    // Brilla más al tomar energía, pero casi no se ensancha: si no, se tragaría la mano.
    crece: 0.12,
  });
}

/** La carga acumulada en el ombligo (0–30). */
function cargaOmbligo(e: Estado, cargas: number) {
  const k = cargas / TOTAL;
  esfera(e, 0, {
    ref: null,
    pegado: 0,
    pos: puntoMundo(e, 0, OMBLIGO),
    radio: cargas > 0 ? 0.016 + 0.024 * k : 0,
    brillo: 0.75 + 0.45 * k,
    color: 'oro',
    opacidad: 1,
  });
  e.centros.ombligo = 0.25 + 0.75 * k;
}

/**
 * Fase del ciclo actual de una mano en `x` (unidades de ciclo desde la primera
 * carga). Los ciclos pares son de la derecha y los impares de la izquierda.
 * Devuelve null si esa mano está quieta en su barra.
 */
function faseMano(x: number, lado: Lado): number | null {
  const primero = lado === 'D' ? 0 : 1;
  if (x < primero * DESFASE) return null;
  // Último ciclo de esa mano que ya empezó.
  let i = Math.floor(x / DESFASE);
  if (i % 2 !== primero) i -= 1;
  i = Math.min(i, TOTAL - 2 + primero);
  const u = x - i * DESFASE;
  return u >= 0 && u < 1 ? u : null;
}

/** Cargas ya entregadas en `x` (en total y por mano). */
function entregas(x: number) {
  let d = 0;
  let iz = 0;
  for (let i = 0; i < TOTAL; i++) {
    if (x >= i * DESFASE + 0.82) {
      if (i % 2 === 0) d++;
      else iz++;
    }
  }
  return { d, iz, total: d + iz };
}

export const cargarOmbligo: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Brazos bien estirados al frente, agarrando la energía de las barras
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.16, 0.32], 1.8, 0.62, 0.14), t, 0, 0.4);
        barras(e, tramo(t, 0.05, 0.4));
        posar(e, 0, poseCargaBarras(null, null), t, 0.25, 0.6, 0.02);
        // Las manos toman la energía de sus barras.
        const junta = tramo(t, 0.62, 0.95);
        for (const [i, ancla, barra] of [
          [1, 'manoD', BARRA_DER],
          [2, 'manoI', BARRA_IZQ],
        ] as const) {
          flujo(e, i, [[barra[0], 1.72, barra[2]], [barra[0], 1.5, barra[2]], ref(ancla, 0)], {
            cabeza: 1,
            cola: 1,
            color: 'oro',
            intensidad: campana(t, 0.58, 1),
            remolino: 0.025,
            ancho: 0.9,
          });
        }
        esfera(e, 2, { ref: ref('manoD', 0, [0.02, 0.0, 0.03]), pegado: 1, radio: 0.016 * junta, brillo: 1.2, color: 'oro', opacidad: 1 });
        esfera(e, 3, { ref: ref('manoI', 0, [-0.02, 0.0, 0.03]), pegado: 1, radio: 0.016 * junta, brillo: 1.2, color: 'oro', opacidad: 1 });
        e.centros.ombligo = 0.25 * tramo(t, 0.6, 1);
        e.hud.aviso = t > 0.3 && t < 0.97 ? 'Brazos bien estirados, a la altura de los hombros' : null;
      },
    },
    // 2 · Cargas intercaladas: derecha, izquierda… 15 por cada mano
    {
      dur: DUR_CARGAS,
      aplicar: (e, t) => {
        e.esferas[2].activa = false;
        e.esferas[3].activa = false;
        toma(e, encuadre([0, 1.16, 0.32], 1.62, 0.62, 0.12), t, 0, 0.03);
        const seg = t * DUR_CARGAS;
        const x = (seg - SEG_ANTES) / SEG_CICLO;
        const terminado = x >= CICLOS;
        const fases: Record<Lado, number | null> = {
          D: terminado || x < 0 ? null : faseMano(x, 'D'),
          I: terminado || x < 0 ? null : faseMano(x, 'I'),
        };

        // Pose: cada mano en su fase; la que no carga, estirada en su barra.
        e.figuras[0].pose = poseCargaBarras(fases.D, fases.I);
        if (terminado) posar(e, 0, SERENA, seg, SEG_ANTES + SEG_CARGAS + 0.3, DUR_CARGAS);

        const resalte = { D: 0, I: 0 };
        for (const lado of LADOS) {
          const u = fases[lado];
          const ancla = lado === 'D' ? 'manoD' : 'manoI';
          const barra = lado === 'D' ? BARRA_DER : BARRA_IZQ;
          const tomaEnergia = u === null ? 0 : campana(u, 0, 0.24);
          resalte[lado] = 0.3 + 0.7 * tomaEnergia;
          flujo(e, lado === 'D' ? 1 : 2, [[barra[0], 1.72, barra[2]], [barra[0], 1.5, barra[2]], ref(ancla, 0)], {
            cabeza: 1,
            cola: 1,
            color: 'oro',
            intensidad: tomaEnergia,
            remolino: 0.025,
            ancho: 0.9,
          });
          // La esfera que viaja en la palma y se entrega en el ombligo: nace cuando la mano
          // suelta la barra (antes taparía el puño que la agarra).
          const forma = u === null ? 0 : tramo(u, 0.13, 0.28);
          const entrega = u === null ? 0 : tramo(u, 0.78, 0.86);
          esfera(e, lado === 'D' ? 1 : 2, {
            activa: u !== null && u > 0.13 && u < 0.86,
            ref: ref(ancla, 0, [0, 0.035, 0.015]),
            pegado: 1 - entrega,
            pos: puntoMundo(e, 0, OMBLIGO),
            radio: 0.04 * saleAtras(forma) * (1 - 0.6 * entrega),
            brillo: 1.25,
            color: 'oro',
            color2: 'blanco',
            mezcla: 0.3,
            opacidad: 1,
          });
          if (u !== null) pulso(e, puntoMundo(e, 0, OMBLIGO), clamp((u - 0.82) / 0.18), 0.18, 'oro');
        }
        barras(e, terminado ? 1 - tramo(seg, SEG_ANTES + SEG_CARGAS, DUR_CARGAS) : 1, resalte.D, resalte.I);

        const n = entregas(Math.max(0, x));
        cargaOmbligo(e, n.total);
        if (!terminado && x >= 0) {
          e.hud.contador = { valor: n.total, total: TOTAL, etiqueta: `derecha ${n.d} · izquierda ${n.iz}` };
        } else if (terminado) {
          e.hud.aviso = 'Carga completa: 15 por mano, 30 en el ombligo';
        }
      },
    },
  ],
};
