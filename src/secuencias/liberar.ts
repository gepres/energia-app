import { ref } from '../escena/estado';
import { type V3, arco, campana, clamp, lerp, tramo } from '../escena/mate';
import { ATAR, BOLSA_IZQUIERDA, CARGA_OMBLIGO, SERENA, SOPLAR, brazoExtendidoD } from '../escena/poses';
import { TOMAS, apagarFlujos, cargar, flujo, manoCorazonRespirando, manoMundo, pulso, sellarDesdeCielo } from './comunes';
import { type Secuencia, ciclos, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';

const TACHO: V3 = [-2.3, 0, -1.5];

/** Nube oscura de la creencia alrededor de la cabeza. */
function creencia(e: Parameters<Secuencia['inicial']>[0], intensidad: number) {
  const n = 7;
  const puntos = Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return ref('coronilla', 0, [Math.cos(a) * 0.2, -0.1 + Math.sin(a * 2) * 0.03, Math.sin(a) * 0.2]);
  });
  flujo(e, 2, puntos, { cabeza: 1, cola: 1, color: 'sombra', intensidad, remolino: 0.07, ancho: 3.4 });
}

export const liberarCreencias: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Cargar el ombligo 30 veces
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, TOMAS.ombligo, t, 0, 0.22);
        cargar(e, t, { pose: CARGA_OMBLIGO, centro: 'ombligo', n: 30, porLado: true, etiqueta: 'ombligo' });
      },
    },
    // 2 · Sellar desde el cielo
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, { pos: [1.35, 1.7, 4.2], mira: [0, 1.08, 0], fov: 34 }, t, 0, 0.3);
        sellarDesdeCielo(e, t);
        e.centros.ombligo = (e.centros.ombligo ?? 0) * (1 - tramo(t, 0, 0.3));
      },
    },
    // 3 · Mano en el corazón y 15 respiraciones (4,3,4,4)
    {
      dur: 10,
      aplicar: (e, t) => {
        toma(e, TOMAS.pecho, t, 0, 0.25);
        manoCorazonRespirando(e, t, 15);
      },
    },
    // 4 · Sostener una bolsa negra con la mano izquierda
    {
      dur: 6,
      aplicar: (e, t) => {
        toma(e, { pos: [1.0, 1.35, 2.0], mira: [0.12, 1.0, 0.2], fov: 32 }, t, 0, 0.35);
        posar(e, 0, BOLSA_IZQUIERDA, t, 0, 0.4);
        e.centros.corazon = (e.centros.corazon ?? 0) * (1 - tramo(t, 0, 0.3));
        Object.assign(e.objetos.bolsa, {
          activo: true,
          ref: ref('manoI', 0, [0, -0.29, 0]),
          pegado: 1,
          valor: 0.12,
          valor2: 0,
          opacidad: tramo(t, 0.15, 0.45),
          escala: 1,
        });
      },
    },
    // 5 · Pensar la creencia negativa
    {
      dur: 7,
      aplicar: (e, t) => {
        toma(e, TOMAS.cabeza, t, 0, 0.35);
        e.penumbra = tramo(t, 0, 0.35);
        e.figuras[0].pose.cabezaPitch = lerp(e.figuras[0].pose.cabezaPitch, 0.32, tramo(t, 0, 0.4));
        creencia(e, tramo(t, 0.15, 0.6) * 1.4);
      },
    },
    // 6 · Decir GRACIAS, TE LIBERO, TE DEJO IR
    {
      dur: 7,
      aplicar: (e, t) => {
        toma(e, { pos: [0.3, 1.55, 1.45], mira: [0, 1.42, 0.1], fov: 30 }, t, 0, 0.3);
        e.figuras[0].pose.cabezaPitch = lerp(e.figuras[0].pose.cabezaPitch, 0.05, tramo(t, 0, 0.3));
        creencia(e, 1.1 - 0.3 * tramo(t, 0.2, 0.9));
        const boca = puntoMundo(e, 0, 'boca');
        [0.18, 0.45, 0.72].forEach((a) => pulso(e, [boca[0], boca[1], boca[2] + 0.06], clamp((t - a) / 0.22), 0.32, 'oro'));
      },
    },
    // 7 · Soplar con fuerza 3 veces dentro de la bolsa
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, { pos: [1.25, 1.5, 1.2], mira: [0.05, 1.33, 0.2], fov: 30 }, t, 0, 0.25);
        posar(e, 0, SOPLAR, t, 0, 0.18);
        const c = ciclos(t, 0.2, 0.95, 3);
        const soplo = c.indice < 3 ? tramo(c.fase, 0, 0.55) : 1;
        const activo = c.k > 0 && c.indice < 3 && c.fase < 0.75;
        const b = e.objetos.bolsa;
        b.valor = lerp(0.12, 1, clamp((Math.min(c.indice, 3) + (c.indice < 3 ? soplo : 0)) / 3));
        // El cuerpo se inclina un poco en cada soplido.
        e.figuras[0].pose.inclinar = 0.06 * (activo ? campana(c.fase, 0, 0.6) : 0);
        flujo(e, 0, [ref('boca', 0, [0, -0.01, 0.03]), ref('manoI', 0, [-0.02, 0.0, 0.03])], {
          cabeza: soplo,
          cola: 0.9,
          color: 'sombra',
          intensidad: activo ? 1 : 0,
          remolino: 0.02,
          ancho: 1.6,
        });
        creencia(e, 0.8 * (1 - c.k));
        e.hud.contador = c.k > 0 ? { valor: Math.min(3, c.indice + (soplo > 0.5 ? 1 : 0)), total: 3, etiqueta: 'soplidos' } : null;
      },
    },
    // 8 · Amarrar la bolsa y dejarla en un tacho lejano
    {
      dur: 10,
      aplicar: (e, t) => {
        apagarFlujos(e);
        toma(e, encuadre([-1.1, 0.75, -0.55], 2.9, -0.62, 0.2), t, 0.3, 0.55);
        posar(e, 0, ATAR, t, 0, 0.16);
        const b = e.objetos.bolsa;
        b.valor2 = tramo(t, 0.1, 0.3);
        Object.assign(e.objetos.tacho, { activo: true, pos: TACHO, opacidad: tramo(t, 0.25, 0.45), escala: 1 });
        // Señala el tacho y la bolsa vuela hasta él.
        posar(e, 0, brazoExtendidoD([-0.85, 0.08, -0.5]), t, 0.34, 0.46);
        const vuelo = tramo(t, 0.46, 0.8);
        if (t > 0.46) {
          const desde = manoMundo(e, 0, 'D');
          const hasta: V3 = [TACHO[0], 0.62, TACHO[2]];
          b.ref = null;
          b.pegado = 0;
          b.pos = arco([desde[0], desde[1] - 0.3, desde[2]], hasta, vuelo, 0.9);
          b.pos[1] -= 0.12 * tramo(t, 0.8, 0.9);
          b.rotY = vuelo * 2.4;
          b.opacidad = 1 - tramo(t, 0.82, 0.92);
          b.escala = 1 - 0.1 * vuelo;
        }
        if (t > 0.92) b.activo = false;
        e.penumbra = 1 - tramo(t, 0.6, 1);
        posar(e, 0, SERENA, t, 0.84, 1);
        e.hud.aviso = t > 0.85 ? 'La creencia queda lejos, amarrada.' : null;
      },
    },
  ],
};
