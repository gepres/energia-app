import { type Pose, PROP, PUNTOS, mezclarPose, resolverEsqueleto, transformarPunto } from '../escena/cuerpo';
import { DONA_ANILLO, DONA_GROSOR, type Estado } from '../escena/estado';
import { segmentosMano } from '../escena/manos';
import { type V3, clamp, entraSaleSeno, escalaV, lerp, lerpV, normV, restaV, rotarX, sumaV, tramo } from '../escena/mate';
import { SERENA } from '../escena/poses';
import { TOMAS, esfera, flujo, pulso } from './comunes';
import { type Secuencia, encuadre, enMundo, fijarPose, toma } from './motor';
import {
  type Fase,
  type Mano,
  ARRIBA,
  armar,
  duracion,
  enFase,
  enPalma,
  mezclarDir,
  mezclarMano,
  ortogonal,
  sostener,
  suelta,
} from './sensibilizarManos';

/**
 * «Enraizar · generar lo material», versión uno por uno (descrita en la revisión):
 *  1. La mano derecha se estira hacia abajo, con forma de agarrar, y durante 5 s agarra
 *     energía − de la tierra: se forma una esfera en la mano.
 *  2. La mano sube y se estira hacia arriba, y durante 5 s agarra energía + del cielo:
 *     la esfera se fortalece.
 *  3. Al frente del pecho, la mano izquierda le hace un hueco a la esfera: queda en forma
 *     de dona.
 *  4. En cuclillas, la mano derecha lleva la esfera hueca al perineo (pegada a él) y la baja
 *     hasta el piso: se forma un tubo de energía recto del perineo al piso, por el hueco.
 *     Formado el tubo, la dona desaparece y el tubo se mantiene.
 *  5. Se dice la frase «SÁNATE, CONÉCTATE HASTA SANAR» y la figura se para: el tubo sigue
 *     conectado al suelo.
 */

const ABAJO: V3 = [0, -1, 0];
/** Cuántos agarres hace la mano en cada carga: uno por segundo, durante 5 s (descrito en la revisión). */
export const AGARRES = 5;
export const SEG_AGARRAR = 5;
/** Radio de la esfera después de la carga − (abajo) y de la + (arriba). */
export const R_TIERRA = 0.04;
export const R_CIELO = 0.05;

// ── Las manos ───────────────────────────────────────────────────────────

/** La mano derecha estirada hacia abajo, con la palma hacia el piso y los dedos al frente. */
function manoAbajo(): Mano {
  const palma = normV([0, -1, -0.12]);
  return {
    mano: [-0.31, 0.92, 0.15],
    palma,
    dedos: ortogonal(normV([-0.2, -0.25, 1]), palma),
    cierre: 0.3,
    codo: normV([-1, 0, -0.6]),
  };
}

/** La mano derecha estirada hacia arriba, con la palma hacia el cielo y los dedos hacia adentro. */
function manoArriba(): Mano {
  return {
    mano: [-0.25, 1.945, 0.06],
    palma: ARRIBA,
    dedos: ortogonal(normV([0.8, 0.1, -0.35]), ARRIBA),
    cierre: 0.3,
    codo: normV([-1, 0, -0.3]),
  };
}

/**
 * El gesto de agarrar: los dedos se cierran y se abren `AGARRES` veces, y en cada cierre la
 * mano tira un poco de la energía (`tirar`, hacia donde va la esfera). `k` de 0 a 1.
 */
function agarrar(m: Mano, k: number, tirar: V3): { mano: Mano; cerrado: number } {
  const cerrado = 0.5 - 0.5 * Math.cos(2 * Math.PI * AGARRES * clamp(k));
  return { mano: { ...m, mano: sumaV(m.mano, escalaV(tirar, 0.015 * cerrado)), cierre: lerp(0.28, 0.62, cerrado) }, cerrado };
}

/** La mano izquierda suelta al costado y la derecha, también (postura de escucha). */
const izquierdaSuelta = (): Mano => suelta('I');

/** Pose con las dos manos (derecha `d`, izquierda `i`). */
const conManos = (d: Mano, i: Mano, cabeza: number, yaw = 0): Pose => ({ ...armar({ D: d, I: i }, cabeza), cabezaYaw: yaw });

/** Centro de la esfera en la mano (debajo de la palma si mira al piso, encima si mira al cielo). */
const enLaMano = (m: Mano, r: number) => enPalma(m, r);

function esferaEn(e: Estado, c: V3, r: number, mezcla: number, brillo: number, dona = 0, eje: V3 | null = null, opacidad = 1) {
  esfera(e, 0, {
    ref: null,
    pegado: 0,
    pos: enMundo(e, 0, c),
    radio: r,
    estirar: 1,
    eje,
    brillo,
    color: 'tierra',
    color2: 'cielo',
    mezcla,
    dona,
    opacidad,
  });
}

/** Curva cuadrática de Bézier (la mano va en arco). */
function bezier(a: V3, c: V3, b: V3, k: number): V3 {
  const u = 1 - k;
  return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1], u * u * a[2] + 2 * u * k * c[2] + k * k * b[2]];
}

// ── Paso 1 · Abajo: energía − de la tierra ──────────────────────────────

type IdAbajo = 'bajar' | 'agarrar' | 'sostener';
const FASES_ABAJO: Fase<IdAbajo>[] = [
  { id: 'bajar', dur: 1.8 },
  { id: 'agarrar', dur: SEG_AGARRAR },
  { id: 'sostener', dur: 1.2 },
];

function abajo(e: Estado, seg: number) {
  const { id, k } = enFase(FASES_ABAJO, seg);
  const fin = manoAbajo();
  if (id === 'bajar') {
    const s = entraSaleSeno(k);
    const ini = suelta('D');
    e.figuras[0].pose = conManos(mezclarMano(ini, fin, s, [0, 0, 1]), izquierdaSuelta(), lerp(0.1, 0.5, s), -0.35 * s);
    e.hud.aviso = 'La mano derecha se estira hacia abajo, con forma de agarrar';
    return;
  }
  const kk = id === 'agarrar' ? k : 1;
  const g = id === 'agarrar' ? agarrar(fin, k, [0, 1, 0]) : { mano: { ...fin, cierre: 0.45 }, cerrado: 0 };
  e.figuras[0].pose = conManos(g.mano, izquierdaSuelta(), 0.5, -0.35);
  // La esfera se forma en la mano y crece con cada agarre; un pulso al cerrar.
  const r = R_TIERRA * (0.3 + 0.7 * entraSaleSeno(kk)) * (1 + 0.06 * g.cerrado);
  esferaEn(e, enLaMano(g.mano, r), r, 0, 1.1 + 0.3 * g.cerrado);
  const c = enLaMano(fin, R_TIERRA);
  flujo(e, 1, [[c[0], 0.02, c[2]], [c[0], 0.45, c[2]], enMundo(e, 0, c)], {
    cabeza: 1,
    cola: 1,
    color: 'tierra',
    intensidad: id === 'agarrar' ? 0.4 + 0.6 * g.cerrado : 1 - k,
    remolino: 0.03,
    ancho: 1,
  });
  e.tierra = id === 'agarrar' ? 0.35 * tramo(k, 0, 0.15) : 0.35 * (1 - k);
  e.hud.contador = { valor: Math.min(SEG_AGARRAR, Math.floor(kk * SEG_AGARRAR + 1e-6)), total: SEG_AGARRAR, etiqueta: 's · energía − (tierra)' };
  e.hud.aviso = 'Agarra energía − de la tierra: se forma la esfera en la mano';
}

// ── Paso 2 · Arriba: energía + del cielo ────────────────────────────────

type IdArriba = 'subir' | 'agarrar' | 'sostener';
const FASES_ARRIBA: Fase<IdArriba>[] = [
  { id: 'subir', dur: 2.2 },
  { id: 'agarrar', dur: SEG_AGARRAR },
  { id: 'sostener', dur: 1.3 },
];

/** La mano sube por delante: la palma pasa de mirar al piso a mirar al frente y al cielo. */
function subiendo(k: number): Mano {
  const a = { ...manoAbajo(), cierre: 0.45 };
  const b = manoArriba();
  const palma = mezclarDir(a.palma, b.palma, k, [0, 0, 1]);
  return {
    mano: bezier(a.mano, [-0.34, 1.45, 0.62], b.mano, k),
    palma,
    dedos: ortogonal(mezclarDir(a.dedos, b.dedos, k, [0, 1, 0]), palma),
    cierre: lerp(0.45, 0.3, k),
    codo: mezclarDir(a.codo, b.codo, k),
  };
}

function arriba(e: Estado, seg: number) {
  const { id, k } = enFase(FASES_ARRIBA, seg);
  e.flujos[1].activo = false;
  e.tierra = 0;
  if (id === 'subir') {
    const s = entraSaleSeno(k);
    const m = subiendo(s);
    e.figuras[0].pose = conManos(m, izquierdaSuelta(), lerp(0.5, -0.45, s), lerp(-0.35, -0.15, s));
    esferaEn(e, enLaMano(m, R_TIERRA), R_TIERRA, 0, 1.1);
    e.hud.contador = null;
    e.hud.aviso = 'La mano sube con la esfera y se estira hacia arriba';
    return;
  }
  const fin = manoArriba();
  const kk = id === 'agarrar' ? k : 1;
  const g = id === 'agarrar' ? agarrar(fin, k, ABAJO) : { mano: { ...fin, cierre: 0.4 }, cerrado: 0 };
  e.figuras[0].pose = conManos(g.mano, izquierdaSuelta(), -0.45, -0.15);
  // Se fortalece: crece un poco más y se mezcla con el color del cielo.
  const r = lerp(R_TIERRA, R_CIELO, entraSaleSeno(kk)) * (1 + 0.06 * g.cerrado);
  esferaEn(e, enLaMano(g.mano, r), r, 0.55 * entraSaleSeno(kk), 1.2 + 0.3 * g.cerrado);
  const c = enLaMano(fin, R_CIELO);
  flujo(e, 2, [[c[0], 3.4, c[2]], [c[0], 2.5, c[2]], enMundo(e, 0, c)], {
    cabeza: 1,
    cola: 1,
    color: 'cielo',
    intensidad: id === 'agarrar' ? 0.4 + 0.6 * g.cerrado : 1 - k,
    remolino: 0.03,
    ancho: 1,
  });
  e.cielo = id === 'agarrar' ? 0.35 * tramo(k, 0, 0.15) : 0.35 * (1 - k);
  e.hud.contador = { valor: Math.min(SEG_AGARRAR, Math.floor(kk * SEG_AGARRAR + 1e-6)), total: SEG_AGARRAR, etiqueta: 's · energía + (cielo)' };
  e.hud.aviso = 'Agarra energía + del cielo: la esfera se fortalece';
}

// ── Paso 3 · Al frente del pecho, la izquierda le hace el hueco: una dona ──

/** Donde se le hace el hueco: al frente del pecho (elegido en la revisión). */
export const PECHO: V3 = [-0.03, 1.2, 0.36];

type IdDona = 'bajar' | 'acercar' | 'hueco' | 'retirar' | 'quieto';
const FASES_DONA: Fase<IdDona>[] = [
  { id: 'bajar', dur: 2 },
  { id: 'acercar', dur: 1.5 },
  { id: 'hueco', dur: 2.5 },
  { id: 'retirar', dur: 1.5 },
  { id: 'quieto', dur: 0.5 },
];

/** La derecha sostiene la esfera en `c` con la palma hacia arriba, los dedos al frente. */
const sosteniendo = (c: V3, r: number): Mano => sostener(c, r, ARRIBA, normV([0.3, 0, 1]), 0.18, normV([-1, -0.5, -0.4]));

/** Los dedos y la palma de la izquierda que señala hacia abajo con el índice (los otros dedos recogidos). */
const PALMA_SENALA: V3 = [0, 0, -1];
/** Dónde queda la punta del índice respecto de la muñeca, con la mano señalando hacia abajo. */
const PUNTA_INDICE: V3 = (() => {
  const W: V3 = [0, 0, 0];
  const seg = segmentosMano(W, ABAJO, PALMA_SENALA, -1, 0.6, 0, 0, 0, 1);
  const d = seg[3];
  return sumaV(d.pos, escalaV(d.dir, d.largo));
})();
/** La izquierda con la punta del índice en `punta`. */
function senalando(punta: V3): Mano {
  return { mano: restaV(punta, PUNTA_INDICE), palma: PALMA_SENALA, dedos: ABAJO, cierre: 0.6, codo: normV([1, -0.2, -0.4]) };
}

/** Pose con la izquierda señalando (el índice estirado y los demás dedos recogidos). */
function conIndice(d: Mano, i: Mano, cabeza: number, senala: number): Pose {
  const p = conManos(d, i, cabeza);
  return { ...p, aisladoI: 0, aislarI: senala };
}

function dona(e: Estado, seg: number) {
  const { id, k } = enFase(FASES_DONA, seg);
  e.flujos[2].activo = false;
  e.cielo = 0;
  const r = R_CIELO;
  if (id === 'bajar') {
    // La derecha baja la esfera desde arriba al frente del pecho, con la palma hacia arriba.
    const s = entraSaleSeno(k);
    const a = manoArriba();
    const b = sosteniendo(PECHO, r);
    const c = bezier(enLaMano(a, r), [-0.32, 1.6, 0.55], PECHO, s);
    const dedos = ortogonal(mezclarDir(a.dedos, b.dedos, s, [1, 0, 0]), ARRIBA);
    const m = sostener(c, r, ARRIBA, dedos, lerp(0.4, 0.18, s), mezclarDir(a.codo, b.codo, s));
    e.figuras[0].pose = conManos(m, izquierdaSuelta(), lerp(-0.45, 0.45, s), lerp(-0.15, 0, s));
    esferaEn(e, c, r, 0.55, 1.3);
    e.hud.contador = null;
    e.hud.aviso = 'La esfera baja al frente del pecho';
    return;
  }
  const derecha = sosteniendo(PECHO, r);
  const arribaDe = sumaV(PECHO, [0, r + 0.07, 0]);
  const fondo = sumaV(PECHO, [0, -r * 0.35, 0]);
  if (id === 'acercar') {
    // La izquierda sube y se pone arriba de la esfera, señalando hacia abajo con el índice.
    const s = entraSaleSeno(k);
    const i = mezclarMano(izquierdaSuelta(), senalando(arribaDe), s, [1, 0, 0]);
    e.figuras[0].pose = conIndice(derecha, i, 0.45, s);
    esferaEn(e, PECHO, r, 0.55, 1.3);
    e.hud.aviso = 'La mano izquierda se acerca, con el índice';
    return;
  }
  if (id === 'hueco') {
    // El índice atraviesa la esfera por el centro, de arriba abajo: se abre el hueco y queda una dona.
    const s = entraSaleSeno(k);
    const punta = lerpV(arribaDe, fondo, s);
    e.figuras[0].pose = conIndice(derecha, senalando(punta), 0.45, 1);
    const hueco = tramo(k, 0.2, 0.85);
    esferaEn(e, PECHO, r, 0.55, 1.3 + 0.4 * hueco, hueco);
    pulso(e, enMundo(e, 0, PECHO), tramo(k, 0.55, 1), 0.12, 'oro');
    e.hud.aviso = 'La mano izquierda le hace un hueco: queda en forma de dona';
    return;
  }
  // La izquierda sale por arriba y vuelve a su costado; la dona queda en la mano derecha.
  const s = id === 'retirar' ? entraSaleSeno(k) : 1;
  const i =
    s < 0.5
      ? senalando(lerpV(fondo, sumaV(arribaDe, [0.02, 0.04, 0]), entraSaleSeno(s * 2)))
      : mezclarMano(senalando(sumaV(arribaDe, [0.02, 0.04, 0])), izquierdaSuelta(), entraSaleSeno(s * 2 - 1), [1, 0, 0]);
  e.figuras[0].pose = conIndice(derecha, i, 0.45, 1 - clamp(s * 2 - 1));
  esferaEn(e, PECHO, r, 0.55, 1.5, 1);
  e.hud.aviso = 'La esfera queda hueca, como una dona';
}

// ── Paso 4 · En cuclillas: la dona baja del perineo al piso y forma un tubo de energía ──

/**
 * En cuclillas (descrito en la revisión): los pies se abren un poco y las rodillas van hacia
 * afuera, como se hace al agacharse del todo; el torso se inclina para que la mano llegue
 * debajo de la ingle y al piso, entre las rodillas.
 */
export const CUCLILLAS = { agachar: 0.6, atrasar: 0.06, inclinar: 1.1, abrirRodillas: 0.65, pies: 0.24, inclinarPiso: 1.2 };

/** Los campos de la postura en cuclillas, de 0 (de pie) a 1; la mano llega al piso con `piso` 1. */
function postura(k: number, piso = 0): Partial<Pose> {
  const pie = (s: number): V3 => [s * lerp(PROP.tobilloX, CUCLILLAS.pies, k), PROP.tobilloY + 0.04 * Math.sin(Math.PI * clamp(k * 1.6)) * (k < 0.62 ? 1 : 0), 0.02 * k];
  return {
    agachar: CUCLILLAS.agachar * k,
    atrasar: CUCLILLAS.atrasar * k,
    inclinar: lerp(0, lerp(CUCLILLAS.inclinar, CUCLILLAS.inclinarPiso, piso), k),
    abrirRodillas: CUCLILLAS.abrirRodillas * k,
    pieD: pie(-1),
    pieI: pie(1),
  };
}

/**
 * El tubo nace en el perineo (descrito en la revisión): la parte más baja de la pelvis. Debajo
 * del punto del perineo, la piel queda 1,3 cm más arriba (medido sobre la malla, de pie y en
 * cuclillas); la boca del tubo va apenas metida en el cuerpo, así nace de él.
 */
const PIEL_PERINEO = 0.013;
const METIDO = 0.012;
/** La boca del tubo en el perineo, para una pose: sigue al cuerpo (también cuando se para). */
function bocaTubo(p: Pose): V3 {
  return sumaV(transformarPunto(PUNTOS.perineo, p.agachar, p.inclinar, p.girar, p.atrasar), [0, PIEL_PERINEO + METIDO, 0]);
}
/** La boca del tubo en cuclillas. */
export const BOCA_CUCLILLAS: V3 = bocaTubo({ ...SERENA, agachar: CUCLILLAS.agachar, atrasar: CUCLILLAS.atrasar });
/**
 * El tubo baja recto (descrito en la revisión): se conecta con el piso justo debajo del perineo,
 * también al pararse (su base sigue debajo del perineo). En cuclillas, aquí.
 */
export const ANCLA: V3 = [BOCA_CUCLILLAS[0], 0, BOCA_CUCLILLAS[2]];
/** Donde el tubo toca el piso: justo debajo de la boca. */
const baseTubo = (boca: V3): V3 => [boca[0], 0, boca[2]];
/**
 * El tubo pasa por el hueco de la dona (descrito en la revisión): más fino que el hueco, así la dona
 * se ve alrededor del tubo y no queda tapada por él.
 */
export const R_TUBO = 0.016;
/** El radio del hueco de la dona. */
export const HUECO_DONA = (DONA_ANILLO - DONA_GROSOR) * R_CIELO;
/** La altura de la dona apoyada en el piso (su centro), con el tubo pasando por el hueco. */
const Y_DONA_PISO = 0.03;
/**
 * De dónde arranca la dona: pegada al perineo (descrito en la revisión). Su cara de arriba toca la
 * piel, que queda METIDO más abajo que la boca del tubo.
 */
const Y_DONA_ARRIBA = BOCA_CUCLILLAS[1] - METIDO - DONA_GROSOR * R_CIELO + 0.002;

/** El punto del tubo (recto, de la boca `boca` al piso) a la altura `y`. */
const enElTubo = (boca: V3, y: number): V3 => [boca[0], clamp(y, 0, boca[1]), boca[2]];
/** El eje del tubo: recto, vertical. */
const ejeTubo = (): V3 => [0, 1, 0];

/** La mano se pone adelante a la derecha de la dona (lejos de la cadera y sin tapar el tubo). */
const AL_COSTADO = normV([-0.6, 0, 1.2]);

/**
 * Hacia dónde va el codo derecho en cuclillas (en el mundo): adelante, apenas afuera y arriba. Hacia
 * afuera chocaba con el muslo derecho, que en cuclillas sube hacia la rodilla.
 */
const CODO_CUCLILLAS: V3 = [-0.5, 0.15, 1];

/** Una dirección del mundo en el marco del torso inclinado (las pistas del codo giran con el torso). */
const enTorso = (d: V3, inclinar: number): V3 => normV(rotarX(d, -inclinar, [0, 0, 0]));

/** La derecha sostiene la dona desde abajo, la palma hacia arriba y los dedos hacia el perineo. */
function bajoLaDona(c: V3, r: number, inclinar: number): Mano {
  return sostener(c, r, ARRIBA, ortogonal(normV([0.25, 0, -1]), ARRIBA), 0.18, enTorso(normV(CODO_CUCLILLAS), inclinar));
}

/**
 * La derecha empuja la dona hacia abajo por su borde (adelante a la derecha): la punta de los
 * dedos en el borde, los dedos hacia abajo y hacia el tubo, la palma hacia el tubo.
 */
function empujando(c: V3, inclinar: number): Mano {
  const punta = sumaV(c, escalaV(AL_COSTADO, R_CIELO + 0.02));
  const dedos = normV(sumaV(escalaV(ABAJO, 0.75), escalaV(AL_COSTADO, -0.65)));
  const palma = ortogonal(escalaV(AL_COSTADO, -1), dedos);
  return { mano: restaV(punta, escalaV(dedos, PROP.mano - 0.005)), palma, dedos, cierre: 0.12, codo: enTorso(normV(CODO_CUCLILLAS), inclinar) };
}

type IdTubo = 'agacharse' | 'llevar' | 'bajar' | 'sostener';
const FASES_TUBO: Fase<IdTubo>[] = [
  { id: 'agacharse', dur: 2.8 },
  { id: 'llevar', dur: 2 },
  { id: 'bajar', dur: 3.4 },
  { id: 'sostener', dur: 2.2 },
];

/** La izquierda apoyada en la rodilla izquierda (en cuclillas), con la palma hacia abajo. */
function enRodilla(p: Pose): Mano {
  const q = resolverEsqueleto(p);
  return {
    mano: sumaV(q.rodillaI, [0.02, 0.075, -0.035]),
    palma: ABAJO,
    dedos: ortogonal(normV([0.15, -0.2, 1]), ABAJO),
    cierre: 0.3,
    codo: enTorso(normV([1, 0.3, -0.2]), p.inclinar),
  };
}

/** La pose en cuclillas (`k` de 0 a 1), con las manos dadas. */
function enCuclillas(d: Mano, i: Mano, k = 1, piso = 0, cabeza = -0.5): Pose {
  return { ...conManos(d, i, cabeza), ...postura(k, piso) };
}

/**
 * El tubo de energía, de la boca (en el perineo) al ancla en el piso, formado desde la boca hasta
 * la altura `hasta` (0 = completo hasta el piso).
 */
function tubo(e: Estado, boca: V3, hasta: number, opacidad = 1) {
  Object.assign(e.mantos[0], {
    activo: true,
    forma: 'tubo',
    centro: enMundo(e, 0, baseTubo(boca)),
    eje: ejeTubo(),
    radio: R_TUBO,
    alto: boca[1],
    cobertura: clamp((boca[1] - hasta) / boca[1]),
    desdeArriba: true,
    banda: -1,
    color: 'tierra',
    // Más luminoso que un manto: es fino y tiene que verse del perineo al piso.
    opacidad: 1.7 * opacidad,
    lineas: 0.9,
  });
}

/** Las partículas que bajan por dentro del tubo, del perineo al piso. */
function flujoTubo(e: Estado, boca: V3, cabeza: number, intensidad: number) {
  flujo(e, 0, ([boca, lerpV(boca, baseTubo(boca), 0.5), sumaV(baseTubo(boca), [0, 0.01, 0])] as V3[]).map((p) => enMundo(e, 0, p)), {
    cabeza,
    cola: 1,
    color: 'tierra',
    intensidad,
    remolino: 0.016,
    ancho: 0.8,
  });
}

/** La dona en el tubo (su hueco a lo largo del tubo). */
function donaEn(e: Estado, c: V3, r = R_CIELO, opacidad = 1) {
  esferaEn(e, c, r, 0.55, 1.5, 1, ejeTubo(), opacidad);
}
/**
 * Cuando el tubo queda formado, la dona desaparece y el tubo se mantiene (descrito en la revisión).
 * Se desvanece en el piso en este tramo de 'sostener' (lectura: cómo desaparece).
 */
const DESVANECER_DONA: [number, number] = [0, 0.45];

/** Al frente de las rodillas, por donde pasa la dona al agacharse. */
const FRENTE: V3 = [-0.02, 0.45, 0.3];
/** La dona justo debajo del perineo, y apoyada en el piso. */
const DONA_ARRIBA = enElTubo(BOCA_CUCLILLAS, Y_DONA_ARRIBA);
const DONA_PISO = enElTubo(BOCA_CUCLILLAS, Y_DONA_PISO);

function cuclillas(e: Estado, seg: number) {
  const { id, k } = enFase(FASES_TUBO, seg);
  const r = R_CIELO;
  const boca = BOCA_CUCLILLAS;
  if (id === 'agacharse') {
    // Se pone en cuclillas, con la dona en la mano derecha que baja por delante; la izquierda va a la rodilla.
    const s = entraSaleSeno(k);
    const c = bezier(PECHO, [-0.06, 0.95, 0.42], FRENTE, s);
    const d = sostener(c, r, ARRIBA, normV([0.3, 0, 1]), 0.18, mezclarDir(normV([-1, -0.5, -0.4]), enTorso(normV(CODO_CUCLILLAS), CUCLILLAS.inclinar * s), s));
    const base = enCuclillas(d, izquierdaSuelta(), s);
    // La izquierda llega a la rodilla por afuera; se aparta enseguida (el muslo se acerca a la mano que cuelga).
    const ki = entraSaleSeno(k);
    const aparta = Math.sin(Math.PI * Math.sqrt(ki));
    const mi = mezclarMano(izquierdaSuelta(), enRodilla(base), ki);
    const porAfuera: Mano = { ...mi, mano: sumaV(mi.mano, [0.12 * aparta, 0.08 * aparta, 0.04 * aparta]) };
    e.figuras[0].pose = enCuclillas(d, porAfuera, s, 0, lerp(0.45, -0.5, s));
    esferaEn(e, c, r, 0.55, 1.5, 1);
    e.hud.aviso = 'En cuclillas, con la esfera hueca en la mano derecha';
    return;
  }
  const izquierda = enRodilla(enCuclillas(bajoLaDona(DONA_ARRIBA, r, CUCLILLAS.inclinar), izquierdaSuelta()));
  if (id === 'llevar') {
    // La lleva al perineo, entre las rodillas, y la toma por el borde (adelante a la derecha) para
    // bajarla; el hueco de la dona se alinea con el tubo que va a nacer.
    const s = entraSaleSeno(k);
    // Pasa por debajo del perineo y sube hasta tocarlo.
    const c = bezier(FRENTE, [DONA_ARRIBA[0], DONA_ARRIBA[1] - 0.09, DONA_ARRIBA[2] + 0.06], DONA_ARRIBA, s);
    const a = sostener(FRENTE, r, ARRIBA, normV([0.3, 0, 1]), 0.18, enTorso(normV(CODO_CUCLILLAS), CUCLILLAS.inclinar));
    const b = empujando(DONA_ARRIBA, CUCLILLAS.inclinar);
    const d = mezclarMano(a, b, s, [1, 0, 0]);
    // La mano acompaña a la dona: corrige su posición para que la dona siga en ella.
    const enLaPalma = lerpV(enLaMano(a, r), sumaV(b.mano, escalaV(b.dedos, PROP.mano - 0.005)), s);
    d.mano = sumaV(d.mano, restaV(lerpV(c, sumaV(c, escalaV(AL_COSTADO, R_CIELO + 0.02)), s), enLaPalma));
    e.figuras[0].pose = enCuclillas(d, izquierda);
    esferaEn(e, c, r, 0.55, 1.5, 1, ejeTubo());
    e.hud.aviso = 'La esfera hueca, al perineo';
    return;
  }
  // La mano lleva la dona por el borde hacia abajo, por el tubo, hasta el piso: el tubo nace del
  // perineo (asoma hasta la dona al empezar) y se forma detrás de ella.
  const asoma = id === 'bajar' ? entraSaleSeno(tramo(k, 0, 0.15, (x) => x)) : 1;
  const baja = id === 'bajar' ? entraSaleSeno(tramo(k, 0.1, 1, (x) => x)) : 1;
  const c = enElTubo(boca, lerp(Y_DONA_ARRIBA, Y_DONA_PISO, baja));
  const inclinar = lerp(CUCLILLAS.inclinar, CUCLILLAS.inclinarPiso, baja);
  e.figuras[0].pose = enCuclillas(empujando(c, inclinar), izquierda, 1, baja);
  // Ya formado el tubo, la dona se desvanece en el piso (se abre apenas mientras se apaga).
  const seVa = id === 'sostener' ? tramo(k, DESVANECER_DONA[0], DESVANECER_DONA[1], entraSaleSeno) : 0;
  if (seVa < 1) donaEn(e, c, R_CIELO * (1 + 0.15 * seVa), 1 - seVa);
  else e.esferas[0].activa = false;
  // El tubo llega hasta la dona y, al apoyarse ella en el piso, hasta el piso: queda formado al terminar de bajar.
  const hasta = id === 'bajar' ? lerp(boca[1], c[1] - Y_DONA_PISO * baja, asoma) : 0;
  tubo(e, boca, hasta);
  flujoTubo(e, boca, 1 - hasta / boca[1], 0.9);
  if (id === 'sostener') {
    pulso(e, enMundo(e, 0, sumaV(ANCLA, [0, 0.01, 0])), tramo(k, 0, 0.7), 0.35, 'tierra');
    e.tierra = 0.4 * tramo(k, 0, 0.5);
  }
  e.centros.perineo = 0.4 + 0.6 * (id === 'bajar' ? tramo(k, 0, 0.4) : 1);
  e.hud.aviso = id === 'bajar' ? 'La mano baja la dona hasta el piso: se forma un tubo de energía del perineo al piso' : 'Conectado al piso';
}

// ── Paso 5 · La frase, y de pie (el tubo sigue conectado al suelo) ──────

type IdFrase = 'frase' | 'pararse';
const FASES_FRASE: Fase<IdFrase>[] = [
  { id: 'frase', dur: 5.5 },
  { id: 'pararse', dur: 3.6 },
];

function frase(e: Estado, seg: number) {
  const { id, k } = enFase(FASES_FRASE, seg);
  const r = R_CIELO;
  const izquierda = enRodilla(enCuclillas(bajoLaDona(DONA_ARRIBA, r, CUCLILLAS.inclinar), izquierdaSuelta()));
  const abajo = enCuclillas(empujando(DONA_PISO, CUCLILLAS.inclinarPiso), izquierda, 1, 1);
  e.centros.perineo = 1;
  // La dona ya desapareció: queda solo el tubo.
  e.esferas[0].activa = false;
  if (id === 'frase') {
    e.figuras[0].pose = abajo;
    tubo(e, BOCA_CUCLILLAS, 0);
    flujoTubo(e, BOCA_CUCLILLAS, 1, 0.9);
    [0.1, 0.45, 0.8].forEach((a) => pulso(e, enMundo(e, 0, sumaV(ANCLA, [0, 0.01, 0])), clamp((k - a) / 0.3), 0.45, 'tierra'));
    e.tierra = 0.4;
    e.hud.aviso = null;
    return;
  }
  // Se pone de pie (los pies vuelven a su lugar). El tubo sigue conectado al suelo: su boca
  // acompaña al perineo mientras sube y el tubo baja recto hasta el piso.
  const s = entraSaleSeno(k);
  const alFrente: Mano = { ...sostener(FRENTE, 0.03, [-1, 0, 0], ABAJO, 0.25, enTorso(normV(CODO_CUCLILLAS), CUCLILLAS.inclinar)) };
  const mano =
    k < 0.45
      ? mezclarMano(empujando(DONA_PISO, CUCLILLAS.inclinarPiso), alFrente, entraSaleSeno(k / 0.45))
      : mezclarMano(alFrente, suelta('D'), entraSaleSeno((k - 0.45) / 0.55));
  const mi = mezclarMano(izquierda, izquierdaSuelta(), tramo(k, 0.3, 1, entraSaleSeno));
  // La cadera sube después de que la mano sale de entre las rodillas.
  const sube = tramo(k, 0.3, 1, entraSaleSeno);
  const pose = enCuclillas(mano, mi, 1 - sube, 1 - s);
  e.figuras[0].pose = k > 0.7 ? mezclarPose(pose, SERENA, entraSaleSeno((k - 0.7) / 0.3), 0.02) : pose;
  const boca = bocaTubo(e.figuras[0].pose);
  tubo(e, boca, 0);
  flujoTubo(e, boca, 1, 0.9);
  e.tierra = 0.4 - 0.15 * s;
  e.hud.aviso = k > 0.6 ? 'De pie, el tubo sigue conectado al suelo' : null;
}

// ── Pasos ───────────────────────────────────────────────────────────────

/** De frente, baja, apenas desde la izquierda: el tubo entre las piernas, del perineo al piso. */
const CAM_TUBO = encuadre([0, 0.36, -0.08], 1.15, 0.22, 0.1);
/**
 * De pie, entero y algo desde arriba: los pies quedan por encima del aviso y de los controles,
 * así se ve dónde el tubo se conecta con el piso.
 */
const CAM_DE_PIE = encuadre([0, 0.72, 0], 2.7, 0.32, 0.2);
const durDe = (f: { dur: number }[]) => f.reduce((a, x) => a + x.dur, 0);

function paso<T extends string>(fases: Fase<T>[], aplicar: (e: Estado, seg: number) => void, camara: (e: Estado, t: number) => void) {
  const dur = duracion(fases);
  return {
    dur,
    aplicar: (e: Estado, t: number) => {
      camara(e, t);
      aplicar(e, t * dur);
    },
  };
}

export const enraizarMaterial: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · La mano derecha abajo: energía − de la tierra, 5 s; se forma la esfera
    paso(FASES_ABAJO, abajo, (e, t) => toma(e, encuadre([-0.1, 1.0, 0.1], 2.1, -0.45, 0.1), t, 0, 0.25)),
    // 2 · La mano arriba: energía + del cielo, 5 s; la esfera se fortalece
    paso(FASES_ARRIBA, arriba, (e, t) => toma(e, encuadre([-0.1, 1.2, 0.1], 2.5, -0.45, 0.08), t, 0, 0.3)),
    // 3 · Al frente del pecho, la izquierda le hace el hueco: una dona
    paso(FASES_DONA, dona, (e, t) => toma(e, encuadre([-0.02, 1.25, 0.3], 0.75, -0.35, 0.22), t, 0, 0.3)),
    // 4 · En cuclillas: la dona baja del perineo al piso y forma el tubo de energía
    paso(FASES_TUBO, cuclillas, (e, t) => {
      toma(e, encuadre([0, 0.48, 0.15], 1.5, -0.7, 0.14), t, 0, 0.25);
      // De frente y baja (apenas desde la izquierda, así el brazo derecho no tapa el tubo): se ve
      // la dona en el perineo y el tubo que baja entre las piernas.
      const llevar = durDe(FASES_TUBO.slice(0, 1)) / durDe(FASES_TUBO);
      toma(e, CAM_TUBO, t, llevar - 0.02, llevar + 0.15);
    }),
    // 5 · SÁNATE, CONÉCTATE HASTA SANAR, y de pie
    paso(FASES_FRASE, frase, (e, t) => {
      toma(e, CAM_TUBO, t, 0, 0.01);
      toma(e, CAM_DE_PIE, t, 0.65, 1);
    }),
  ],
};

export const enraizarInterno = { FASES_ABAJO, FASES_ARRIBA, FASES_DONA, FASES_TUBO, FASES_FRASE, PUNTA_INDICE, CUCLILLAS, DONA_ARRIBA, DONA_PISO, bocaTubo, manoAbajo, manoArriba };
