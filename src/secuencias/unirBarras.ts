import { PUNTOS, type PuntoCuerpo, mezclarPose } from '../escena/cuerpo';
import { type Estado, enPalma, ref } from '../escena/estado';
import { type V3, campana, clamp, entraSaleSeno, lerp, lerpV, saleAtras, tramo } from '../escena/mate';
import { SERENA, esferaEntrePalmas, poseCargaBarras } from '../escena/poses';
import { BARRA_DER, BARRA_IZQ, barrasEnPuno } from './barras';
import { TOMAS, esfera, flujo, pulso } from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';

/**
 * «Unir la energía de las barras», tal como lo describió el taller: cada mano
 * toma energía de su barra (brazos estirados) y forma una esfera; las manos se
 * juntan al frente y las dos esferas se unen en una más grande; las manos la
 * llevan y la entran en el centro. Una vez al ombligo, una al centro del pecho
 * y una al centro de la frente.
 */

interface Centro {
  id: PuntoCuerpo;
  aviso: string;
}
const CENTROS: Centro[] = [
  { id: 'ombligo', aviso: 'Unir la energía de las barras y llevarla al ombligo' },
  { id: 'corazon', aviso: 'Unir la energía de las barras y llevarla al centro del pecho' },
  { id: 'frente', aviso: 'Unir la energía de las barras y llevarla a la frente' },
];

/**
 * Tiempos (s) de cada centro: tomar de las barras, juntar las manos al frente
 * con los brazos estirados, unir las esferas, jugar con la esfera como si fuera
 * de goma, llevarla, rodearla, entrarla y volver a las barras.
 */
const SEG = { tomar: 1.6, juntar: 2.2, unir: 0.9, jugar: 4, llevar: 2.4, rodear: 0.7, entrar: 1.2, volver: 2 };
type Fase = keyof typeof SEG;
const FASES = Object.keys(SEG) as Fase[];
const SEG_CENTRO = FASES.reduce((a, f) => a + SEG[f], 0);

/** Fase y avance (0–1) a los `seg` segundos del ciclo de un centro. */
export function faseUnir(seg: number): { fase: Fase; k: number } {
  let x = Math.max(0, seg);
  for (const f of FASES) {
    if (x < SEG[f] || f === 'volver') return { fase: f, k: clamp(x / SEG[f]) };
    x -= SEG[f];
  }
  return { fase: 'volver', k: 1 };
}

/** Radio de la esfera de cada mano y de la esfera unida («más grande»). */
const R_MANO = 0.035;
const R_UNIDA = 0.065;
/** Donde se juntan las manos: entre las barras, a su misma altura, con los brazos estirados. */
const JUNTAR: V3 = [0, 1.41, 0.55];
/** Separación de cada palma al centro cuando cada una trae su esfera (antes de unirlas). */
const SEP_ABIERTAS = 0.095;
/** Juego de goma: 2 idas y vueltas; las palmas se alejan hasta +3 cm y se acercan hasta −1,5 cm. */
const GOMA = { vueltas: 2, afuera: 0.03, adentro: 0.015 };

/** Separación de las palmas durante el juego (vuelve a R_UNIDA al principio y al final). */
function separacionGoma(k: number) {
  // Empieza alejándose: la onda arranca en 0 y sube.
  const onda = Math.sin(2 * Math.PI * GOMA.vueltas * k);
  const envolvente = Math.sin(Math.PI * k);
  const d = onda > 0 ? onda * GOMA.afuera : onda * GOMA.adentro;
  return R_UNIDA + d * envolvente;
}

const ENCUADRE = encuadre([0, 1.32, 0.3], 1.8, 0.62, 0.12);

/** Punto de cada centro, apenas delante de la piel. */
function puntoCentro(id: PuntoCuerpo): V3 {
  const p = PUNTOS[id];
  return [p[0], p[1], p[2] + 0.01];
}

/** Pose al agarrar las dos barras; `apriete` cierra un poco más los dedos. */
function agarre(apriete = 0) {
  const p = poseCargaBarras(null, null);
  p.cierreD += 0.07 * apriete;
  p.cierreI += 0.07 * apriete;
  return p;
}

function flujosDeBarras(e: Estado, intensidad: number) {
  for (const [i, ancla, barra] of [
    [1, 'manoD', BARRA_DER],
    [2, 'manoI', BARRA_IZQ],
  ] as const) {
    flujo(e, i, [[barra[0], 1.72, barra[2]], [barra[0], 1.5, barra[2]], ref(ancla, 0)], {
      cabeza: 1,
      cola: 1,
      color: 'oro',
      intensidad,
      remolino: 0.025,
      ancho: 0.9,
    });
  }
}

/** Esfera de cada mano, en el hueco de su palma. */
function esferasEnManos(e: Estado, radio: number) {
  for (const [i, ancla] of [
    [2, 'manoD'],
    [3, 'manoI'],
  ] as const) {
    esfera(e, i, {
      activa: radio > 0.001,
      ref: enPalma(ancla, radio * 0.92 + 0.002),
      pegado: 1,
      radio,
      brillo: 1.25,
      color: 'oro',
      color2: 'blanco',
      mezcla: 0.3,
      opacidad: 1,
    });
  }
}

function esferaUnida(e: Estado, c: V3, radio: number, estirar = 1) {
  esfera(e, 1, {
    estirar,
    activa: radio > 0.001,
    ref: null,
    pegado: 0,
    pos: puntoMundo(e, 0, c),
    radio,
    brillo: 1.35,
    color: 'oro',
    color2: 'blanco',
    mezcla: 0.35,
    opacidad: 1,
  });
}

/**
 * Un centro completo: tomar de las barras, juntar las manos al frente (brazos
 * estirados, a la altura de las barras), unir las esferas, jugar con la esfera
 * de goma, llevarla y entrarla; después las manos vuelven a las barras (o, en
 * el último centro, se sueltan).
 */
function cicloCentro(e: Estado, t: number, n: number) {
  const centro = CENTROS[n];
  const ultimo = n === CENTROS.length - 1;
  const destino = puntoCentro(centro.id);
  // Se acerca de frente al centro y queda justo delante antes de entrar.
  const delante: V3 = [destino[0], destino[1], destino[2] + R_UNIDA + 0.05];
  const { fase, k } = faseUnir(t * SEG_CENTRO);
  const s = entraSaleSeno(k);

  let pose = agarre();
  let resalte = 0.3;
  // Esfera unida: centro, radio y estiramiento (goma). Nula si no está.
  let unida: { c: V3; r: number; estirar: number } | null = null;
  let rMano = 0;

  if (fase === 'tomar') {
    // Aprieta las barras y toma energía.
    pose = agarre(Math.sin(Math.PI * k));
    flujosDeBarras(e, campana(k, 0, 1));
    resalte = 0.3 + 0.7 * campana(k, 0, 1);
  } else if (fase === 'juntar') {
    // Suelta las barras y, con los brazos estirados, las manos se acercan al frente con su esfera.
    pose = mezclarPose(agarre(), esferaEntrePalmas(JUNTAR, SEP_ABIERTAS, 0, 0.3, 1), s, 0);
    rMano = R_MANO * saleAtras(tramo(k, 0, 0.45));
  } else if (fase === 'unir') {
    // Las palmas se acercan hasta que las dos esferas se tocan y se unen en una más grande.
    pose = esferaEntrePalmas(JUNTAR, lerp(SEP_ABIERTAS, R_UNIDA, s), 0, 0.3, 1);
    rMano = R_MANO * (1 - tramo(k, 0.55, 1));
    const crece = saleAtras(tramo(k, 0.5, 1));
    if (crece > 0) unida = { c: JUNTAR, r: R_UNIDA * crece, estirar: 1 };
  } else if (fase === 'jugar') {
    // Juega con la esfera como si fuera de goma: se estira al alejar las manos y se aplasta al acercarlas.
    const sep = separacionGoma(k);
    pose = esferaEntrePalmas(JUNTAR, sep, 0, 0.3, 1);
    unida = { c: JUNTAR, r: R_UNIDA, estirar: sep / R_UNIDA };
  } else if (fase === 'llevar') {
    // La llevan entre las palmas hasta delante del centro.
    const c = lerpV(JUNTAR, delante, s);
    pose = esferaEntrePalmas(c, R_UNIDA, 0, 0.3, 1);
    unida = { c, r: R_UNIDA, estirar: 1 };
  } else if (fase === 'rodear') {
    // Las manos rodean la esfera hasta quedar delante, con los dedos hacia arriba.
    pose = esferaEntrePalmas(delante, R_UNIDA, s, lerp(0.3, 0.05, s), 1 - s);
    unida = { c: delante, r: R_UNIDA, estirar: 1 };
  } else if (fase === 'entrar') {
    // La entran en el cuerpo: la esfera avanza hasta el centro y se achica al entrar.
    const c = lerpV(delante, destino, s);
    pose = esferaEntrePalmas(c, R_UNIDA * (1 - 0.85 * s), 1, 0.05, 0);
    unida = { c, r: R_UNIDA * (1 - s), estirar: 1 };
  } else {
    // Vuelven a tomar las barras (o, en el último centro, se sueltan a los costados).
    const entrada = esferaEntrePalmas(destino, R_UNIDA * 0.15, 1, 0.05, 0);
    pose = mezclarPose(entrada, ultimo ? SERENA : agarre(), s, 0.05);
  }
  e.figuras[0].pose = pose;

  esferasEnManos(e, rMano);
  if (unida) esferaUnida(e, unida.c, unida.r, unida.estirar);
  const entro = fase === 'volver' || (fase === 'entrar' && k > 0.98);
  if (fase === 'unir') pulso(e, puntoMundo(e, 0, JUNTAR), tramo(k, 0.45, 1), 0.2, 'oro');
  if (fase === 'entrar') pulso(e, puntoMundo(e, 0, destino), tramo(k, 0.6, 1), 0.3, 'oro');
  if (fase === 'volver') pulso(e, puntoMundo(e, 0, destino), 0.4 + 0.6 * tramo(k, 0, 0.5), 0.3, 'oro');

  // El centro se enciende al entrar la energía y queda encendido.
  const orden = FASES.indexOf(fase);
  const iEntrar = FASES.indexOf('entrar');
  const lleno = orden > iEntrar ? 1 : orden === iEntrar ? s : 0;
  const anticipo = orden >= FASES.indexOf('llevar') ? 0.2 : 0;
  // Por encima de 1 el punto crece: los centros cargados se ven claramente al final.
  e.centros[centro.id] = Math.max(e.centros[centro.id] ?? 0, anticipo + 1.3 * lleno);

  // La carga queda brillando en el centro (esferas 4–6: una por centro, persisten en los pasos siguientes).
  if (lleno > 0) {
    esfera(e, 4 + n, {
      ref: null,
      pegado: 0,
      pos: puntoMundo(e, 0, destino),
      radio: 0.024 * saleAtras(lleno),
      brillo: 1.1,
      color: 'oro',
      color2: 'blanco',
      mezcla: 0.3,
      opacidad: 1,
    });
  }

  // Barras: siguen ahí; al terminar el último centro se desvanecen.
  barrasEnPuno(e, ultimo && fase === 'volver' ? 1 - s : 1, resalte, resalte);

  e.hud.contador = { valor: n + (entro ? 1 : 0), total: CENTROS.length, etiqueta: 'centros' };
  e.hud.aviso = fase === 'jugar' ? 'Alejar y acercar las manos, como una esfera de goma' : centro.aviso;
  if (ultimo && fase === 'volver' && k > 0.4) e.hud.aviso = 'Ombligo, centro del pecho y frente cargados';
}

export const unirBarras: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Brazos estirados al frente, cada mano agarrando su barra
    {
      dur: 7,
      aplicar: (e, t) => {
        toma(e, ENCUADRE, t, 0, 0.4);
        barrasEnPuno(e, tramo(t, 0.05, 0.4), 0.3, 0.3);
        posar(e, 0, agarre(), t, 0.25, 0.6, 0.02);
        flujosDeBarras(e, campana(t, 0.6, 1));
        e.hud.aviso = t > 0.3 && t < 0.97 ? 'Cada mano agarra su barra, con los brazos estirados' : null;
      },
    },
    ...CENTROS.map((_, n) => ({
      dur: SEG_CENTRO,
      aplicar: (e: Estado, t: number) => {
        toma(e, ENCUADRE, t, 0, 0.02);
        cicloCentro(e, t, n);
      },
    })),
  ],
};
