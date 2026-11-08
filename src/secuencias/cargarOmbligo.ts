import { type Estado, ref } from '../escena/estado';
import { type V3, campana, clamp, saleAtras, tramo } from '../escena/mate';
import { BARRA_CARGA, SERENA, poseCargaBarras } from '../escena/poses';
import { TOMAS, apagarFlujos, esfera, flujo, pulso } from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';

/**
 * «Cargar el ombligo», tal como lo describió el taller: brazos al frente a la
 * altura de los hombros tomando energía de dos barras verticales; cada mano
 * lleva despacio 15 esferas al ombligo (primero la derecha, luego la izquierda).
 */

const POR_MANO = 15;
/** Segundos por carga a velocidad normal: el ejercicio es lento. */
const SEG_POR_CARGA = 3.4;
const INICIO = 0.02;
const FIN = 0.97;

const BARRA_DER: V3 = [-BARRA_CARGA.x, 0, BARRA_CARGA.z];
const BARRA_IZQ: V3 = [BARRA_CARGA.x, 0, BARRA_CARGA.z];
/** Punto de la carga, justo delante del ombligo. */
const OMBLIGO: V3 = [0, 1.04, 0.14];

function barras(e: Estado, opacidad: number, resalteDer = 0, resalteIzq = 0) {
  Object.assign(e.barras, {
    activa: true,
    izq: [...BARRA_IZQ],
    der: [...BARRA_DER],
    alto: 1.75,
    opacidad,
    resalte: resalteIzq,
    resalteDer,
  });
}

/** La carga acumulada en el ombligo (0–30). */
function cargaOmbligo(e: Estado, cargas: number) {
  const k = cargas / (POR_MANO * 2);
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

/** Las 15 cargas de una mano a lo largo del paso. `previas` = cargas ya hechas antes. */
function cargasDeUnaMano(e: Estado, t: number, lado: 'D' | 'I', previas: number) {
  const k = clamp((t - INICIO) / (FIN - INICIO));
  const x = k * POR_MANO;
  const hecho = k >= 1;
  const i = hecho ? POR_MANO : Math.floor(x);
  const u = hecho ? 0 : x - i;
  const entregada = !hecho && u >= 0.82 ? 1 : 0;
  const cuenta = Math.min(POR_MANO, i + entregada);

  // Pose: la mano activa hace su ciclo; la otra queda en su barra.
  if (t < INICIO) posar(e, 0, poseCargaBarras(lado, 0), t, 0, INICIO);
  else e.figuras[0].pose = poseCargaBarras(hecho ? null : lado, u);

  const ancla = lado === 'D' ? 'manoD' : 'manoI';
  const barra = lado === 'D' ? BARRA_DER : BARRA_IZQ;
  const enCiclo = !hecho && t >= INICIO;

  // La barra de la mano activa brilla al tomar la energía.
  const toma = enCiclo ? campana(u, 0, 0.24) : 0;
  barras(e, 1, lado === 'D' ? 0.35 + 0.65 * toma : 0, lado === 'I' ? 0.35 + 0.65 * toma : 0);
  flujo(e, 1, [[barra[0], 1.72, barra[2]], [barra[0], 1.5, barra[2]], ref(ancla, 0)], {
    cabeza: 1,
    cola: 1,
    color: 'oro',
    intensidad: toma,
    remolino: 0.025,
    ancho: 0.9,
  });
  flujo(e, 2, [[barra[0], 0.9, barra[2]], [barra[0], 1.25, barra[2]], ref(ancla, 0)], {
    cabeza: 1,
    cola: 1,
    color: 'oro',
    intensidad: toma * 0.8,
    remolino: 0.025,
    ancho: 0.9,
  });

  // La esfera que viaja en la mano y se entrega en el ombligo.
  const forma = tramo(u, 0.04, 0.2);
  const entrega = tramo(u, 0.78, 0.86);
  esfera(e, 1, {
    activa: enCiclo && u > 0.04 && u < 0.86,
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
  if (enCiclo) pulso(e, puntoMundo(e, 0, OMBLIGO), clamp((u - 0.82) / 0.18), 0.18, 'oro');

  cargaOmbligo(e, previas + cuenta);
  e.hud.contador = t >= INICIO ? { valor: cuenta, total: POR_MANO, etiqueta: lado === 'D' ? 'mano derecha' : 'mano izquierda' } : null;
}

const DUR_CARGAS = POR_MANO * SEG_POR_CARGA / (FIN - INICIO);

export const cargarOmbligo: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Brazos al frente a la altura de los hombros, agarrando la energía de las barras
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.16, 0.3], 1.8, 0.55, 0.14), t, 0, 0.4);
        barras(e, tramo(t, 0.05, 0.4));
        posar(e, 0, poseCargaBarras(null, 0), t, 0.25, 0.6, 0.02);
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
        e.hud.aviso = t > 0.3 && t < 0.97 ? 'Brazos a la altura de los hombros, a 90°' : null;
      },
    },
    // 2 · Mano derecha: 15 cargas lentas
    {
      dur: DUR_CARGAS,
      aplicar: (e, t) => {
        e.esferas[2].activa = false;
        e.esferas[3].activa = false;
        toma(e, encuadre([-0.04, 1.17, 0.3], 1.55, 0.95, 0.12), t, 0, 0.06);
        cargasDeUnaMano(e, t, 'D', 0);
      },
    },
    // 3 · Mano izquierda: 15 cargas lentas
    {
      dur: DUR_CARGAS + 2,
      aplicar: (e, t) => {
        apagarFlujos(e);
        toma(e, encuadre([0.04, 1.17, 0.3], 1.55, -0.95, 0.12), t, 0, 0.06);
        // Las 15 cargas ocupan el mismo tiempo que en el paso anterior; al final, reposo.
        const escala = DUR_CARGAS / (DUR_CARGAS + 2);
        cargasDeUnaMano(e, Math.min(1, t / escala), 'I', POR_MANO);
        if (t > escala) {
          posar(e, 0, SERENA, t, escala, 1);
          e.barras.opacidad = 1 - tramo(t, escala, 1);
          e.hud.contador = null;
          e.hud.aviso = 'Carga completa: 30 en el ombligo';
        }
      },
    },
  ],
};
