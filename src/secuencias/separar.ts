import { type Estado, ref } from '../escena/estado';
import { type V3, campana, clamp, lerp, tramo } from '../escena/mate';
import { MANOS_PECHO, OFRECER, SERENA, VISUALIZAR, brazoExtendidoD } from '../escena/poses';
import {
  TOMAS,
  apagarFlujos,
  cota,
  cuboCompleto,
  devolverRosa,
  flujo,
  pulso,
  recogerEnRosa,
  sacarRosa,
  sellarRosaDisparando,
} from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';

// ── Utilidades compartidas ──────────────────────────────────────────────

/** Toma lateral que abarca a quien practica y lo que tiene delante. */
const tomaLateral = (hasta: number, alto = 2.7) => encuadre([0, 0.6, hasta / 2], alto, 2.35, 0.42);

/** Cuenta de 5 características con un gesto de mano en cada una. */
function cincoRasgos(e: Estado, t: number) {
  const k = clamp((t - 0.1) / 0.8);
  const n = Math.min(5, Math.floor(k * 5) + (k > 0 ? 1 : 0));
  const fase = (k * 5) % 1;
  posar(e, 0, MANOS_PECHO, t, 0, 0.12);
  if (t > 0.12 && t < 0.92) {
    // La mano derecha toca el pecho y se abre: «esto soy yo».
    const p = { ...MANOS_PECHO };
    const abre = campana(fase, 0, 1);
    p.manoD = [lerp(-0.05, -0.22, abre), lerp(1.22, 1.3, abre), lerp(0.2, 0.38, abre)];
    p.palmaD = [0.2, 0.8, 0.5];
    e.figuras[0].pose = p;
    pulso(e, puntoMundo(e, 0, [0, 1.3, 0.14]), fase, 0.32, 'oro');
  }
  posar(e, 0, SERENA, t, 0.92, 1);
  e.hud.contador = k > 0 ? { valor: n, total: 5, etiqueta: 'características tuyas' } : null;
  e.hud.aviso = k > 0 && k < 1 ? ['tu nombre', 'un lunar', 'una cicatriz', '…', '…'][n - 1] ?? null : null;
  e.centros.corazon = 0.4 + 0.4 * campana(fase, 0, 1);
}

// ── 5 · Separar tu energía de la de otra persona ───────────────────────

const FOTO: V3 = [0, 0, 2.0];
const ROSA_1: V3 = [0, 0.07, 1.5];
const ROSA_2: V3 = [0, 0.07, 1.0];

export const separarOtraPersona: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Foto, dibujo o nombre a 2 m
    {
      dur: 7,
      aplicar: (e, t) => {
        toma(e, tomaLateral(2.0), t, 0, 0.35);
        Object.assign(e.objetos.foto, { activo: true, pos: FOTO, rotY: Math.PI, opacidad: tramo(t, 0.05, 0.35), escala: 1 });
        cota(e, [0.42, 0, 0.1], [0.42, 0, FOTO[2]], '2 m', tramo(t, 0.35, 0.75));
      },
    },
    // 2 · Visualizar a esa persona
    {
      dur: 6,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.05, 1.1], 2.6, 0.55, 0.16), t, 0, 0.4);
        posar(e, 0, VISUALIZAR, t, 0, 0.3);
        e.penumbra = 0.35 * tramo(t, 0, 0.4);
        const v = e.figuras[1];
        Object.assign(v, { activa: t > 0.15, tono: 'vision', pos: [0, 0, FOTO[2] + 0.32], rotY: Math.PI, opacidad: tramo(t, 0.15, 0.6) });
        fijarPose(e, 1, SERENA);
      },
    },
    // 3 · Sacar del pecho una rosa y colocarla entre tú y la otra persona
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, tomaLateral(1.9), t, 0, 0.35);
        sacarRosa(e, 0, t, ROSA_1);
        cota(e, [0.42, 0, 0.1], [0.42, 0, ROSA_1[2]], '1,5 m', tramo(t, 0.78, 1));
      },
    },
    // 4 · TODA MI ENERGÍA… QUE CAIGA DENTRO DE ESTA ROSA
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.85, 1.25], 2.6, 0.7, 0.3), t, 0, 0.35);
        recogerEnRosa(e, 0, t, [ref('corazon', 1, [0, 0, 0.1]), [0, 0.85, 1.85], [0, 0.45, 1.6]], 'oro');
        e.figuras[1].opacidad = 1;
      },
    },
    // 5 · Segunda rosa a 1 m de la otra persona
    {
      dur: 8,
      aplicar: (e, t) => {
        apagarFlujos(e);
        e.rosas[0].recoge = 0;
        toma(e, tomaLateral(2.2), t, 0, 0.35);
        sacarRosa(e, 1, t, ROSA_2);
        cota(e, [0.38, 0, ROSA_2[2]], [0.38, 0, FOTO[2]], '1 m', tramo(t, 0.78, 1));
      },
    },
    // 6 · TODA LA ENERGÍA DE … QUE ESTÉ EN MI CAMPO, A ESTA ROSA
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.9, 0.55], 2.4, 0.85, 0.25), t, 0, 0.35);
        recogerEnRosa(e, 1, t, [ref('corazon', 0, [0, 0, 0.12]), [0, 1.0, 0.55], [0, 0.5, 0.9]], 'cielo');
      },
    },
    // 7 · Describir lo que la diferencia y colocarlo en su rosa con un gesto
    {
      dur: 9,
      aplicar: (e, t) => {
        apagarFlujos(e);
        e.rosas[1].recoge = campana(t, 0.1, 1) * 0.8;
        toma(e, encuadre([0, 0.95, 0.7], 2.3, 0.7, 0.22), t, 0, 0.35);
        // Tres gestos de la mano derecha hacia la segunda rosa.
        const k = clamp((t - 0.12) / 0.78);
        const fase = (k * 3) % 1;
        const gesto = campana(fase, 0, 1);
        posar(e, 0, brazoExtendidoD([-0.1, -0.35, 1], [0, 0.5, 0.85]), t, 0.04, 0.14);
        if (t > 0.14 && t < 0.9) {
          e.figuras[0].pose = brazoExtendidoD([lerp(0.25, -0.15, gesto), lerp(-0.05, -0.45, gesto), 1], [0, 0.5, 0.85]);
        }
        flujo(e, 0, [ref('manoD', 0, [0, 0, 0.05]), [0, 0.5, 0.9], [ROSA_2[0], ROSA_2[1] + 0.06, ROSA_2[2]]], {
          cabeza: 1,
          cola: 0.7,
          color: 'cielo',
          intensidad: k > 0 && k < 1 ? gesto : 0,
          remolino: 0.03,
          ancho: 1,
        });
        posar(e, 0, SERENA, t, 0.9, 1);
        e.hud.aviso = k > 0 && k < 1 ? 'Lo que la diferencia de ti → su rosa' : null;
      },
    },
    // 8 · Disparar una esfera sobre la segunda rosa para sellar
    {
      dur: 7,
      aplicar: (e, t) => {
        apagarFlujos(e);
        toma(e, encuadre([0, 0.75, 0.6], 2.6, 0.6, 0.3), t, 0, 0.3);
        sellarRosaDisparando(e, 1, t, 4);
      },
    },
    // 9 · Luego otra esfera sobre la primera rosa
    {
      dur: 7,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.75, 0.45], 2.5, 0.55, 0.3), t, 0, 0.3);
        sellarRosaDisparando(e, 0, t, 4);
      },
    },
    // 10 · Devolver cada rosa a su dueño
    {
      dur: 10,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.0, 1.15], 2.9, 0.75, 0.2), t, 0, 0.3);
        posar(e, 0, OFRECER, t, 0.02, 0.18);
        devolverRosa(e, 1, t, 1, 0.08, 0.55);
        posar(e, 0, MANOS_PECHO, t, 0.5, 0.62);
        devolverRosa(e, 0, t, 0, 0.5, 0.95);
        posar(e, 0, SERENA, t, 0.9, 1);
        e.figuras[1].opacidad = 1 - tramo(t, 0.75, 1);
        e.penumbra = 0.35 * (1 - tramo(t, 0.7, 1));
      },
    },
  ],
};

// ── 6 · Separar tu energía de la sangre que donas ──────────────────────

const DIBUJO: V3 = [0, 0, 1.8];
const ROSA_S: V3 = [0, 0.07, 0.9];

export const separarSangre: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Dibujo de la bolsa de sangre
    {
      dur: 7,
      aplicar: (e, t) => {
        toma(e, tomaLateral(1.8), t, 0, 0.35);
        Object.assign(e.objetos.dibujoSangre, { activo: true, pos: DIBUJO, rotY: Math.PI, opacidad: tramo(t, 0.05, 0.35), escala: 1 });
        e.marcas.push({ pos: [0, 1.0, DIBUJO[2]], texto: 'Todos los que pueden recibir tu sangre', opacidad: campana(t, 0.3, 1), tipo: 'nombre' });
      },
    },
    // 2 · Rosa entre ambos
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.85, 0.85], 2.4, 0.9, 0.26), t, 0, 0.35);
        sacarRosa(e, 0, t, ROSA_S);
      },
    },
    // 3 · Tu energía en quienes recibieron tu sangre → a la rosa
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.8, 1.1], 2.4, 0.75, 0.3), t, 0, 0.35);
        recogerEnRosa(e, 0, t, [[0, 0.62, DIBUJO[2] - 0.05], [0, 0.5, 1.35]], 'oro');
        pulso(e, [0, 0.62, DIBUJO[2]], clamp((t - 0.05) / 0.3), 0.4, 'rosa');
      },
    },
    // 4 · Mencionar 5 características tuyas
    {
      dur: 10,
      aplicar: (e, t) => {
        apagarFlujos(e);
        e.rosas[0].recoge = 0.3;
        toma(e, TOMAS.pecho, t, 0, 0.3);
        cincoRasgos(e, t);
      },
    },
    // 5 · Esfera disparada sobre la rosa para sellarla
    {
      dur: 7,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.75, 0.5], 2.5, 0.6, 0.3), t, 0, 0.3);
        sellarRosaDisparando(e, 0, t, 4);
      },
    },
    // 6 · Devolver la rosa a tu pecho
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.0, 0.5], 2.2, 0.75, 0.15), t, 0, 0.3);
        posar(e, 0, MANOS_PECHO, t, 0.05, 0.25);
        devolverRosa(e, 0, t, 0, 0.1, 0.9);
        posar(e, 0, SERENA, t, 0.9, 1);
      },
    },
  ],
};

// ── 7 · Separar la energía de una ex pareja ────────────────────────────

const YO_EX: V3 = [0, 0, -2.0];
const ROSA_EX: V3 = [0, 0.07, -1.0];

export const separarExPareja: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.figuras[0].pos = [...YO_EX];
    cuboCompleto(e, [0, 0, 0], 2.4, 0.55);
    e.camara = encuadre([0, 1.0, -0.9], 3.6, 0.7, 0.25, 34);
  },
  pasos: [
    // 1 · Recipiente con la foto en la columna del cubo
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.9, -0.9], 3.4, 0.75, 0.26, 34), t, 0, 0.4);
        Object.assign(e.objetos.recipiente, { activo: true, pos: [0, 0, 0] as V3, opacidad: 1, escala: 1, valor: 0 });
        e.objetos.recipiente.escala = tramo(t, 0.1, 0.4);
        e.cubo.columna = 1;
        e.cubo.opacidad = 0.55;
        pulso(e, [0, 0.1, 0], clamp((t - 0.35) / 0.3), 0.5, 'violeta');
      },
    },
    // 2 · Rosa entre ambos
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.8, -1.05], 2.5, 0.95, 0.28), t, 0, 0.35);
        sacarRosa(e, 0, t, ROSA_EX);
      },
    },
    // 3 · Tu energía en su campo → a la rosa
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.75, -0.85], 2.5, 0.75, 0.3), t, 0, 0.35);
        recogerEnRosa(e, 0, t, [[0, 0.95, 0], [0, 0.6, -0.45]], 'oro');
      },
    },
    // 4 · Mencionar 5 características tuyas
    {
      dur: 10,
      aplicar: (e, t) => {
        apagarFlujos(e);
        e.rosas[0].recoge = 0.3;
        toma(e, encuadre([0, 1.22, -1.9], 1.35, 0.4, 0.1), t, 0, 0.3);
        cincoRasgos(e, t);
      },
    },
    // 5 · Sellar la rosa con una esfera
    {
      dur: 7,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.75, -1.5], 2.5, 0.6, 0.3), t, 0, 0.3);
        sellarRosaDisparando(e, 0, t, 4);
      },
    },
    // 6 · Devolver la rosa a tu pecho
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.0, -1.5], 2.2, 0.75, 0.15), t, 0, 0.3);
        posar(e, 0, MANOS_PECHO, t, 0.05, 0.25);
        devolverRosa(e, 0, t, 0, 0.1, 0.9);
        posar(e, 0, SERENA, t, 0.9, 1);
      },
    },
    // 7 · Quemar la foto
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.45, -0.2], 1.3, 0.6, 0.35), t, 0, 0.35);
        const fuego = tramo(t, 0.15, 0.3) * (1 - tramo(t, 0.78, 0.95));
        Object.assign(e.objetos.llama, { activo: true, pos: [0, 0.06, 0] as V3, valor: fuego });
        e.objetos.recipiente.valor = tramo(t, 0.22, 0.8, (x) => x);
        pulso(e, [0, 0.15, 0], clamp((t - 0.82) / 0.18), 0.6, 'oro');
      },
    },
  ],
};
