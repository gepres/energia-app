import type { PuntoCuerpo } from '../escena/cuerpo';
import { type Estado, enPalma, ref } from '../escena/estado';
import { type V3, campana, clamp, saleAtras, tramo } from '../escena/mate';
import { INCLINAR_INGLES, INGLE_DER, INGLE_IZQ, SERENA, poseCargaBarras, poseCargaIngles } from '../escena/poses';
import { BARRA_DER, BARRA_IZQ, barrasEnPuno } from './barras';
import { CICLOS, DUR_CARGAS, POR_MANO, SEG_ANTES, SEG_CARGAS, SEG_CICLO, TOTAL, entregas, faseMano } from './cargarOmbligo';
import { TOMAS, esfera, flujo, pulso } from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';

/**
 * «Cargar las ingles», descrito en el taller: como «Cargar el ombligo» (brazos bien
 * estirados al frente tomando energía de dos barras verticales, manos intercaladas,
 * 15 por cada mano), pero cada mano lleva su esfera a la ingle del otro lado: la
 * derecha a la ingle izquierda y la izquierda a la ingle derecha, colocando la esfera
 * en cada una. Empieza la derecha. Para llegar a la ingle del otro lado, el torso se
 * inclina un poco hacia adelante y gira hacia esa ingle mientras la mano lleva la esfera.
 */

type Lado = 'D' | 'I';
const LADOS: Lado[] = ['D', 'I'];

/** A qué ingle lleva su esfera cada mano: a la del otro lado. */
const DESTINO: Record<Lado, V3> = { D: INGLE_IZQ, I: INGLE_DER };
/** El centro que se enciende con las cargas de cada mano. */
const CENTRO: Record<Lado, PuntoCuerpo> = { D: 'ingleI', I: 'ingleD' };
/** La esfera que se acumula en cada ingle (la 1 y la 2 son las que viajan en cada palma). */
const ACUMULA: Record<Lado, number> = { D: 0, I: 3 };

const ENCUADRE_BARRAS = encuadre([0, 1.12, 0.32], 1.85, 0.62, 0.14);
const ENCUADRE_CARGAS = encuadre([0, 1.1, 0.3], 1.7, 0.62, 0.12);

/** La carga acumulada en la ingle a la que lleva `lado` (0–15). */
function cargaIngle(e: Estado, lado: Lado, cargas: number) {
  const k = cargas / POR_MANO;
  esfera(e, ACUMULA[lado], {
    ref: null,
    pegado: 0,
    pos: puntoMundo(e, 0, DESTINO[lado]),
    radio: cargas > 0 ? 0.016 + 0.024 * k : 0,
    estirar: 1,
    eje: null,
    brillo: 0.75 + 0.45 * k,
    color: 'oro',
    opacidad: 1,
  });
  e.centros[CENTRO[lado]] = 0.25 + 0.75 * k;
}

export const cargarIngles: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Brazos bien estirados al frente, agarrando la energía de las barras (como en «Cargar el ombligo»)
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, ENCUADRE_BARRAS, t, 0, 0.4);
        barrasEnPuno(e, tramo(t, 0.05, 0.4));
        posar(e, 0, poseCargaBarras(null, null), t, 0.25, 0.6, 0.02);
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
        esfera(e, 2, { ref: enPalma('manoD', 0.012), pegado: 1, radio: 0.016 * junta, brillo: 1.2, color: 'oro', opacidad: 1 });
        esfera(e, 3, { ref: enPalma('manoI', 0.012), pegado: 1, radio: 0.016 * junta, brillo: 1.2, color: 'oro', opacidad: 1 });
        // Las dos ingles se encienden suave: ahí van las cargas.
        e.centros.ingleD = 0.25 * tramo(t, 0.6, 1);
        e.centros.ingleI = 0.25 * tramo(t, 0.6, 1);
        e.hud.aviso = t > 0.3 && t < 0.97 ? 'Brazos bien estirados, a la altura de los hombros' : null;
      },
    },
    // 2 · Cargas cruzadas e intercaladas: la derecha a la ingle izquierda, la izquierda a la derecha… 15 por cada mano
    {
      dur: DUR_CARGAS,
      aplicar: (e, t) => {
        e.esferas[2].activa = false;
        e.esferas[3].activa = false;
        toma(e, ENCUADRE_CARGAS, t, 0, 0.03);
        const seg = t * DUR_CARGAS;
        const x = (seg - SEG_ANTES) / SEG_CICLO;
        const terminado = x >= CICLOS;
        const fases: Record<Lado, number | null> = {
          D: terminado || x < 0 ? null : faseMano(x, 'D'),
          I: terminado || x < 0 ? null : faseMano(x, 'I'),
        };

        // El torso se inclina un poco hacia adelante mientras carga, y vuelve al terminar.
        const inclinar = INCLINAR_INGLES * tramo(seg, 0, SEG_ANTES + 0.5 * SEG_CICLO);
        e.figuras[0].pose = poseCargaIngles(fases.D, fases.I, inclinar);
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
          // La esfera nace en la palma al soltar la barra, viaja en el hueco de la palma y se
          // entrega en la ingle del otro lado.
          const forma = u === null ? 0 : tramo(u, 0.17, 0.32);
          const entrega = u === null ? 0 : tramo(u, 0.78, 0.86);
          const radio = 0.04 * saleAtras(forma) * (1 - 0.6 * entrega);
          esfera(e, lado === 'D' ? 1 : 2, {
            activa: u !== null && u > 0.17 && u < 0.86,
            ref: enPalma(ancla, radio * 0.92 + 0.002),
            pegado: 1 - entrega,
            pos: puntoMundo(e, 0, DESTINO[lado]),
            radio,
            brillo: 1.25,
            color: 'oro',
            color2: 'blanco',
            mezcla: 0.3,
            opacidad: 1,
          });
          if (u !== null) pulso(e, puntoMundo(e, 0, DESTINO[lado]), clamp((u - 0.82) / 0.18), 0.18, 'oro');
        }
        barrasEnPuno(e, terminado ? 1 - tramo(seg, SEG_ANTES + SEG_CARGAS, DUR_CARGAS) : 1, resalte.D, resalte.I);

        const n = entregas(Math.max(0, x));
        cargaIngle(e, 'D', n.d);
        cargaIngle(e, 'I', n.iz);
        if (!terminado && x >= 0) {
          e.hud.contador = { valor: n.total, total: TOTAL, etiqueta: `derecha ${n.d} · izquierda ${n.iz}` };
          // La mano que está llevando su esfera (la otra vuelve a su barra o espera).
          const lleva = LADOS.find((l) => fases[l] !== null && (fases[l] as number) < 0.86);
          if (lleva) e.hud.aviso = lleva === 'D' ? 'La mano derecha lleva la esfera a la ingle izquierda' : 'La mano izquierda lleva la esfera a la ingle derecha';
        } else if (terminado) {
          e.hud.aviso = 'Carga completa: 15 por mano, en cada ingle';
        }
      },
    },
  ],
};
