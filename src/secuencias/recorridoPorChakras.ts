import { type Pose, type PuntoCuerpo, mezclarPose } from '../escena/cuerpo';
import type { Camara, Estado } from '../escena/estado';
import { type V3, campana, clamp, entraSaleSeno, lerp, lerpV, saleCubica, suave, tramo, ventana } from '../escena/mate';
import { SERENA, THETA_ABAJO, bajarPorLosCostados, esferaEntrePalmas, manosSobreCoronilla, subirPorLosCostados } from '../escena/poses';
import { barrasEnPuno } from './barras';
import { TOMAS, pulso } from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';
import {
  ENCUADRE as ENCUADRE_BARRAS,
  type FaseFormar,
  JUNTAR,
  R_UNIDA,
  SEG,
  agarre,
  esferaUnida,
  esferasEnManos,
  flujosDeBarras,
  formarEsfera,
} from './unirBarras';

/**
 * «Recorrido por chakras», tal como lo describió el taller: se une la energía
 * de las dos barras en una esfera (como en «Colocar energía en los 3 puntos»)
 * y se coloca arriba, sobre la coronilla. La esfera va sola, guiada con la
 * mente: baja por detrás de la cabeza y por la espalda, pasa por debajo (el
 * centro de abajo, entre las piernas) hacia la ingle, sube por el frente y
 * vuelve a la coronilla, donde las dos manos, entre las palmas, la introducen.
 * En cada punto importante se detiene 2 s para recalcarlo.
 */

// ── La esfera sobre la coronilla ────────────────────────────────────────

/** Donde queda la esfera, sobre la coronilla (6 cm por encima de la cabeza). */
const ARRIBA: V3 = [0, 1.84, 0];
/** Por donde suben las manos con la esfera: por delante y por encima de la cara. */
const SUBIDA_CONTROL: V3 = [0, 1.8, 0.4];
/** Ángulo de los brazos (desde arriba) al abrirse por los costados sobre la cabeza. */
const THETA_ALTO = 0.5;
/** Hasta donde la bajan las manos: apoyada sobre la coronilla (2 cm de luz). */
const SOBRE: V3 = [0, 1.8, 0];
/** Hasta dónde entra la esfera: dentro de la cabeza, bajo la coronilla. */
const DENTRO: V3 = [0, 1.69, 0];

// ── El recorrido ────────────────────────────────────────────────────────

interface Parada {
  id: PuntoCuerpo;
  nombre: string;
  /** Centro de la esfera detenida: pegada a la piel (≈ 1 cm de luz). */
  pos: V3;
  /** Puntos de paso desde la parada anterior (o desde arriba). */
  antes: V3[];
}

/**
 * Las paradas, en orden. Las posiciones salen de la malla del maniquí (plano
 * medio, de pie): la piel más el radio de la esfera y 1,2 cm de luz.
 */
const PARADAS: Parada[] = [
  // Detrás de la cabeza, a la altura del centro de la frente.
  { id: 'trasFrente', nombre: 'detrás de la frente', pos: [0, 1.66, -0.161], antes: [[0, 1.755, -0.12]] },
  { id: 'trasGarganta', nombre: 'detrás de la garganta', pos: [0, 1.455, -0.127], antes: [[0, 1.56, -0.158]] },
  { id: 'trasPecho', nombre: 'detrás del pecho', pos: [0, 1.3, -0.172], antes: [[0, 1.39, -0.151]] },
  { id: 'trasOmbligo', nombre: 'detrás del ombligo', pos: [0, 1.04, -0.156], antes: [[0, 1.17, -0.161]] },
  // Por detrás de los glúteos, a la altura de la ingle.
  { id: 'trasIngle', nombre: 'detrás de la ingle', pos: [0, 0.885, -0.175], antes: [[0, 0.96, -0.179]] },
  // Debajo del cuerpo, entre las piernas, en la misma vertical que la coronilla (se ve a través).
  { id: 'perineo', nombre: 'centro de abajo', pos: [0, 0.771, 0], antes: [[0, 0.81, -0.12]] },
  { id: 'ingle', nombre: 'ingle', pos: [0, 0.885, 0.144], antes: [[0, 0.81, 0.12]] },
  { id: 'ombligo', nombre: 'ombligo', pos: [0, 1.04, 0.155], antes: [[0, 0.96, 0.157]] },
  { id: 'corazon', nombre: 'centro del pecho', pos: [0, 1.3, 0.176], antes: [[0, 1.17, 0.166]] },
  { id: 'garganta', nombre: 'garganta', pos: [0, 1.455, 0.125], antes: [[0, 1.39, 0.158]] },
  // Por delante de la barbilla y la nariz.
  { id: 'frente', nombre: 'centro de la frente', pos: [0, 1.66, 0.159], antes: [[0, 1.56, 0.175]] },
];
/** De la frente vuelve arriba, sobre la coronilla. */
const VUELTA: V3[] = [[0, 1.765, 0.115]];

/** Velocidad de la esfera (m/s), tiempo mínimo de cada tramo y pausa en cada punto (s). */
const VELOCIDAD = 0.18;
const VIAJE_MIN = 1;
const PAUSA = 2;

/** Puntos de control de la curva y el índice de cada parada entre ellos. */
const CONTROL: V3[] = [ARRIBA];
const I_PARADA: number[] = [];
for (const p of PARADAS) {
  CONTROL.push(...p.antes, p.pos);
  I_PARADA.push(CONTROL.length - 1);
}
CONTROL.push(...VUELTA, ARRIBA);

/** Catmull-Rom centrípeta: pasa por cada punto sin pasarse de largo. */
function catmull(p0: V3, p1: V3, p2: V3, p3: V3, u: number): V3 {
  const nudo = (a: V3, b: V3) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])));
  const t1 = nudo(p0, p1);
  const t2 = t1 + nudo(p1, p2);
  const t3 = t2 + nudo(p2, p3);
  const t = lerp(t1, t2, u);
  const mezcla = (a: V3, b: V3, ta: number, tb: number) => lerpV(a, b, (t - ta) / (tb - ta));
  const a1 = mezcla(p0, p1, 0, t1);
  const a2 = mezcla(p1, p2, t1, t2);
  const a3 = mezcla(p2, p3, t2, t3);
  const b1 = mezcla(a1, a2, 0, t2);
  const b2 = mezcla(a2, a3, t1, t3);
  return mezcla(b1, b2, t1, t2);
}

const MUESTRAS_TRAMO = 16;
/** La curva muestreada y su largo acumulado (m). */
const CURVA: V3[] = [];
const LARGO: number[] = [];
{
  const n = CONTROL.length;
  const reflejo = (a: V3, b: V3): V3 => [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? CONTROL[i - 1] : reflejo(CONTROL[0], CONTROL[1]);
    const p3 = i + 2 < n ? CONTROL[i + 2] : reflejo(CONTROL[n - 1], CONTROL[n - 2]);
    for (let j = 0; j < MUESTRAS_TRAMO; j++) CURVA.push(catmull(p0, CONTROL[i], CONTROL[i + 1], p3, j / MUESTRAS_TRAMO));
  }
  CURVA.push(CONTROL[n - 1]);
  CURVA.forEach((p, i) => {
    const q = CURVA[i - 1] ?? p;
    LARGO.push((LARGO[i - 1] ?? 0) + Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
  });
}
const LARGO_TOTAL = LARGO[LARGO.length - 1];

/** Punto de la curva a `s` metros del comienzo (arriba de la coronilla). */
function puntoEnCurva(s: number): V3 {
  const x = clamp(s, 0, LARGO_TOTAL);
  let a = 0;
  let b = LARGO.length - 1;
  while (b - a > 1) {
    const m = (a + b) >> 1;
    if (LARGO[m] <= x) a = m;
    else b = m;
  }
  const k = (x - LARGO[a]) / Math.max(1e-9, LARGO[b] - LARGO[a]);
  return lerpV(CURVA[a], CURVA[b], k);
}

interface Tramo {
  /** Parada a la que llega (−1: vuelve arriba). */
  i: number;
  desde: number;
  hasta: number;
  /** Segundo del recorrido en que sale. */
  inicio: number;
  viaje: number;
  pausa: number;
}

/** Los tramos del recorrido, con sus tiempos (segundos desde que la esfera sale de arriba). */
const TRAMOS: Tramo[] = [];
{
  let t = 0;
  let desde = 0;
  PARADAS.forEach((_, i) => {
    const hasta = LARGO[I_PARADA[i] * MUESTRAS_TRAMO];
    const viaje = Math.max(VIAJE_MIN, (hasta - desde) / VELOCIDAD);
    TRAMOS.push({ i, desde, hasta, inicio: t, viaje, pausa: PAUSA });
    t += viaje + PAUSA;
    desde = hasta;
  });
  TRAMOS.push({ i: -1, desde, hasta: LARGO_TOTAL, inicio: t, viaje: Math.max(VIAJE_MIN, (LARGO_TOTAL - desde) / VELOCIDAD), pausa: 0 });
}
/** Paradas de la espalda (paso 3) y la del centro de abajo. */
const N_ESPALDA = 5;
const I_ABAJO = PARADAS.findIndex((p) => p.id === 'perineo');
/** Fin de la pausa detrás de la ingle (paso de la espalda) y fin de la pausa en la frente. */
const T_ESPALDA = TRAMOS[N_ESPALDA].inicio;
const T_FRENTE = TRAMOS[PARADAS.length].inicio;
const VIAJE_VUELTA = TRAMOS[PARADAS.length].viaje;

/** Dónde está la esfera en el segundo `tau` del recorrido y si está detenida. */
function enRecorrido(tau: number) {
  let n = 0;
  while (n + 1 < TRAMOS.length && TRAMOS[n + 1].inicio <= tau) n++;
  const tr = TRAMOS[n];
  const local = Math.max(0, tau - tr.inicio);
  if (local < tr.viaje || tr.pausa === 0) {
    const k = clamp(local / tr.viaje);
    return { tramo: tr, s: lerp(tr.desde, tr.hasta, entraSaleSeno(k)), viaje: k, pausa: null as number | null };
  }
  return { tramo: tr, s: tr.hasta, viaje: 1, pausa: clamp((local - tr.viaje) / tr.pausa) };
}

/** Brillo de cada punto: se enciende al llegar la esfera y queda marcado después. */
function nivelParada(i: number, tau: number) {
  const llega = TRAMOS[i].inicio + TRAMOS[i].viaje;
  const sale = llega + PAUSA;
  if (tau < llega) return 0;
  if (tau < sale) return 1.3 * tramo((tau - llega) / PAUSA, 0, 0.25);
  return lerp(1.3, 1, clamp((tau - sale) / 0.8));
}

function centrosRecorrido(e: Estado, tau: number) {
  PARADAS.forEach((p, i) => {
    e.centros[p.id] = nivelParada(i, tau);
  });
}

function avisoViaje(i: number) {
  if (i < 0) return 'Vuelve arriba de la coronilla';
  if (i === 0) return 'La esfera baja sola por detrás de la cabeza';
  if (i < N_ESPALDA) return 'Se desliza por la espalda';
  if (i === I_ABAJO) return 'Pasa por debajo, entre las piernas';
  if (i === I_ABAJO + 1) return 'Sale por delante, hacia la ingle';
  return 'Sube por el frente';
}

/** Debajo del cuerpo, entre las piernas, la esfera se ve a través (como energía que pasa por dentro). */
function atraves(pos: V3) {
  return clamp((0.865 - pos[1]) / 0.03);
}

/** La esfera en el segundo `tau` del recorrido, con sus pausas, rótulos y contador. */
function pintarRecorrido(e: Estado, tau: number): V3 {
  const r = enRecorrido(tau);
  const pos = puntoEnCurva(r.s);
  esferaUnida(e, pos, R_UNIDA, 1);
  e.esferas[1].atraves = atraves(pos);
  centrosRecorrido(e, tau);
  const llegadas = TRAMOS.filter((tr) => tr.i >= 0 && tau >= tr.inicio + tr.viaje).length;
  e.hud.contador = { valor: llegadas, total: PARADAS.length, etiqueta: 'puntos' };
  if (r.pausa !== null) {
    const p = PARADAS[r.tramo.i];
    // Se detiene: la esfera late, el punto se enciende con un pulso y aparece su nombre.
    e.esferas[1].brillo = 1.35 + 0.35 * campana(r.pausa, 0, 1);
    pulso(e, puntoMundo(e, 0, p.id), tramo(r.pausa, 0.05, 0.8, saleCubica), 0.22, 'oro');
    e.marcas.push({
      pos: puntoMundo(e, 0, [pos[0], pos[1] + R_UNIDA + 0.05, pos[2]]),
      texto: p.nombre,
      opacidad: ventana(r.pausa, 0, 1, 0.15),
      tipo: 'nombre',
    });
    e.hud.aviso = `Se detiene: ${p.nombre}`;
  } else {
    e.hud.aviso = avisoViaje(r.tramo.i);
  }
  return pos;
}

/** Ángulos de cámara: por detrás (espalda) y por delante (frente), del lado izquierdo de la persona. */
const ANG_ESPALDA = 2.3;
const ANG_FRENTE = 0.85;

/**
 * Cámara que acompaña a la esfera: sube y baja con ella y da la vuelta cuando
 * pasa al frente: de costado en el centro de abajo y de frente desde la ingle.
 */
function camaraRecorrido(pos: V3, tau: number): Camara {
  const abajo = TRAMOS[I_ABAJO];
  const ingle = TRAMOS[I_ABAJO + 1];
  const giro = 0.5 * entraSaleSeno(clamp((tau - abajo.inicio) / abajo.viaje)) + 0.5 * entraSaleSeno(clamp((tau - ingle.inicio) / ingle.viaje));
  const cy = clamp(lerp(1.25, pos[1], 0.75), 0.92, 1.6);
  return encuadre([0, cy, pos[2] * 0.8], 0.95, lerp(ANG_ESPALDA, ANG_FRENTE, giro), 0.1);
}

// ── Manos ───────────────────────────────────────────────────────────────

/**
 * Las manos se sueltan desde arriba de la cabeza: se abren hacia los costados,
 * bajan por los costados y quedan sueltas, como al terminar «Sellar desde el cielo».
 */
function soltarDesdeArriba(desde: Pose, k: number): Pose {
  const abiertas = bajarPorLosCostados(THETA_ALTO, 0.05);
  if (k < 0.22) return mezclarPose(desde, abiertas, tramo(k, 0, 0.22, entraSaleSeno), 0);
  if (k < 0.8) return bajarPorLosCostados(lerp(THETA_ALTO, THETA_ABAJO, tramo(k, 0.22, 0.8, entraSaleSeno)), 0.05);
  return mezclarPose(bajarPorLosCostados(THETA_ABAJO, 0.05), SERENA, tramo(k, 0.8, 1, entraSaleSeno), 0);
}

function bezier(a: V3, b: V3, c: V3, s: number): V3 {
  return lerpV(lerpV(a, b, s), lerpV(b, c, s), s);
}

// ── Pasos ───────────────────────────────────────────────────────────────

/** Paso 1: agarrar las barras y formar la esfera (tomar, juntar, unir y jugar con ella). */
const AGARRAR = 3.5;
const FASES_FORMAR: FaseFormar[] = ['tomar', 'juntar', 'unir', 'jugar'];
const DUR_FORMAR = AGARRAR + FASES_FORMAR.reduce((a, f) => a + SEG[f], 0);

function formar(e: Estado, seg: number) {
  if (seg < AGARRAR) {
    const t = seg / AGARRAR;
    barrasEnPuno(e, tramo(t, 0.05, 0.45), 0.3, 0.3);
    posar(e, 0, agarre(), t, 0.2, 0.75, 0.02);
    e.hud.aviso = t > 0.2 ? 'Cada mano agarra su barra, con los brazos estirados' : null;
    return;
  }
  let x = seg - AGARRAR;
  let fase: FaseFormar = 'jugar';
  for (const f of FASES_FORMAR) {
    fase = f;
    if (x < SEG[f] || f === 'jugar') break;
    x -= SEG[f];
  }
  const k = clamp(x / SEG[fase]);
  const f = formarEsfera(fase, k);
  e.figuras[0].pose = f.pose;
  esferasEnManos(e, f.rMano);
  if (f.unida) esferaUnida(e, f.unida.c, f.unida.r, f.unida.estirar);
  if (fase === 'tomar') flujosDeBarras(e, f.flujos);
  if (fase === 'unir') pulso(e, puntoMundo(e, 0, JUNTAR), tramo(k, 0.45, 1), 0.2, 'oro');
  barrasEnPuno(e, 1, f.resalte, f.resalte);
  e.hud.aviso = fase === 'jugar' ? 'Alejar y acercar las manos, como una esfera de goma' : 'Unir la energía de las dos barras en una esfera';
}

/** Paso 2: llevar la esfera sobre la coronilla, dejarla y soltar las manos. */
const SEG_CORONILLA = { subir: 2.6, dejar: 0.8, soltar: 3.6 };
const DUR_CORONILLA = SEG_CORONILLA.subir + SEG_CORONILLA.dejar + SEG_CORONILLA.soltar;
const SEP_DEJAR = R_UNIDA + 0.035;
const ENCUADRE_CORONILLA = encuadre([0, 1.5, 0.12], 1.2, 0.7, 0.14);

function llevarArriba(e: Estado, seg: number) {
  const { subir, dejar } = SEG_CORONILLA;
  if (seg < subir) {
    // Entre las palmas, por delante de la cara y hasta arriba de la cabeza; los dedos pasan de al frente a arriba.
    const k = seg / subir;
    const c = bezier(JUNTAR, SUBIDA_CONTROL, ARRIBA, entraSaleSeno(k));
    e.figuras[0].pose = esferaEntrePalmas(c, R_UNIDA, 0, 0.3, 1 - tramo(k, 0.1, 0.9));
    esferaUnida(e, c, R_UNIDA, 1);
    barrasEnPuno(e, 1 - tramo(k, 0, 0.6), 0.3, 0.3);
    e.hud.aviso = 'Llevar la esfera arriba de la cabeza';
    return;
  }
  e.barras.activa = false;
  esferaUnida(e, ARRIBA, R_UNIDA, 1);
  if (seg < subir + dejar) {
    // La deja sobre la coronilla: las palmas se separan un poco.
    const k = (seg - subir) / dejar;
    const s = entraSaleSeno(k);
    e.figuras[0].pose = esferaEntrePalmas(ARRIBA, lerp(R_UNIDA, SEP_DEJAR, s), 0, lerp(0.3, 0.1, s), 0);
    pulso(e, puntoMundo(e, 0, ARRIBA), tramo(k, 0.2, 1), 0.18, 'oro');
  } else {
    const k = clamp((seg - subir - dejar) / SEG_CORONILLA.soltar);
    e.figuras[0].pose = soltarDesdeArriba(esferaEntrePalmas(ARRIBA, SEP_DEJAR, 0, 0.1, 0), k);
  }
  e.hud.aviso = 'La esfera queda sobre la coronilla; desde aquí va sola';
}

/** Paso 5: la esfera vuelve arriba y las dos manos, entre las palmas, la bajan y ayudan a introducirla por la coronilla. */
const SEG_FINAL = { subir: 2.2, tomar: 1, bajar: 1, entrar: 1.8, sostener: 1, soltar: 3.6, quieto: 1 };
const INICIO_MANOS = 0.4;
const DUR_FINAL = INICIO_MANOS + Object.values(SEG_FINAL).reduce((a, b) => a + b, 0);
const ENCUADRE_CABEZA = encuadre([0, 1.62, 0.04], 0.85, 0.75, 0.3);

function introducir(e: Estado, seg: number) {
  centrosRecorrido(e, T_FRENTE + Math.min(seg, VIAJE_VUELTA));
  e.hud.contador = { valor: PARADAS.length, total: PARADAS.length, etiqueta: 'puntos' };
  // La esfera termina el recorrido y vuelve arriba de la coronilla.
  if (seg < VIAJE_VUELTA) pintarRecorrido(e, T_FRENTE + seg);
  else esferaUnida(e, ARRIBA, R_UNIDA, 1);

  const { subir, tomar, bajar, entrar, sostener, soltar } = SEG_FINAL;
  let x = seg - INICIO_MANOS;
  if (x < 0) return;
  if (x < subir) {
    // Las dos manos suben por los costados.
    const k = x / subir;
    const sube = subirPorLosCostados(lerp(THETA_ABAJO, THETA_ALTO, entraSaleSeno(k)), 0.1);
    e.figuras[0].pose = mezclarPose(SERENA, sube, suave(clamp(k / 0.18)), 0);
    if (seg >= VIAJE_VUELTA) e.hud.aviso = 'Las dos manos suben por los costados';
    return;
  }
  x -= subir;
  if (x < tomar) {
    // La toman entre las palmas, como cuando la subieron.
    const k = x / tomar;
    e.figuras[0].pose = mezclarPose(subirPorLosCostados(THETA_ALTO, 0.1), esferaEntrePalmas(ARRIBA, R_UNIDA, 0, 0.3, 0), entraSaleSeno(k), 0);
    e.hud.aviso = 'Las dos manos toman la esfera entre las palmas';
    return;
  }
  x -= tomar;
  if (x < bajar) {
    // La bajan entre las palmas hasta apoyarla sobre la coronilla.
    const c = lerpV(ARRIBA, SOBRE, entraSaleSeno(x / bajar));
    e.figuras[0].pose = esferaEntrePalmas(c, R_UNIDA, 0, 0.3, 0);
    esferaUnida(e, c, R_UNIDA, 1);
    e.hud.aviso = 'La bajan sobre la coronilla';
    return;
  }
  x -= bajar;
  if (x < entrar) {
    // Las manos ayudan a introducirla: la acompañan hacia adentro y terminan sobre la
    // coronilla, palmas hacia abajo; la esfera entra y se achica un poco detrás de las manos.
    const k = x / entrar;
    const s = entraSaleSeno(k);
    const sEsfera = entraSaleSeno(tramo(k, 0.1, 1, (u) => u));
    const c = lerpV(SOBRE, DENTRO, sEsfera);
    const r = R_UNIDA * (1 - sEsfera);
    e.figuras[0].pose = mezclarPose(esferaEntrePalmas(SOBRE, R_UNIDA, 0, 0.3, 0), manosSobreCoronilla(), s, 0);
    esferaUnida(e, c, r, 1);
    e.centros.coronilla = 1.3 * tramo(k, 0.5, 1);
    pulso(e, puntoMundo(e, 0, 'coronilla'), tramo(k, 0.6, 1), 0.3, 'oro');
    e.hud.aviso = 'Las manos ayudan a introducirla por la coronilla';
    return;
  }
  x -= entrar;
  esferaUnida(e, DENTRO, 0, 1);
  const encima = manosSobreCoronilla();
  if (x < sostener) {
    e.figuras[0].pose = encima;
    e.centros.coronilla = 1.3;
    pulso(e, puntoMundo(e, 0, 'coronilla'), 0.4 + 0.6 * tramo(x / sostener, 0, 0.6), 0.3, 'oro');
    e.hud.aviso = 'La esfera entró por la coronilla';
    return;
  }
  x -= sostener;
  // Las manos se sueltan a los costados; la coronilla queda encendida.
  const k = clamp(x / soltar);
  e.figuras[0].pose = soltarDesdeArriba(encima, k);
  e.centros.coronilla = lerp(1.3, 1, clamp(k / 0.5));
  e.hud.aviso = k > 0.5 ? 'Recorrido completo: la esfera entró por la coronilla' : 'Las manos se sueltan a los costados';
}

export const recorridoPorChakras: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Unir la energía de las barras en una esfera
    {
      dur: DUR_FORMAR,
      aplicar: (e, t) => {
        toma(e, ENCUADRE_BARRAS, t, 0, 0.25);
        formar(e, t * DUR_FORMAR);
      },
    },
    // 2 · La esfera sobre la coronilla
    {
      dur: DUR_CORONILLA,
      aplicar: (e, t) => {
        toma(e, ENCUADRE_CORONILLA, t, 0.05, 0.45);
        llevarArriba(e, t * DUR_CORONILLA);
      },
    },
    // 3 · Baja por detrás: de la frente, de la garganta, del pecho, del ombligo y de la ingle
    {
      dur: T_ESPALDA,
      aplicar: (e, t) => {
        const tau = t * T_ESPALDA;
        const pos = pintarRecorrido(e, tau);
        toma(e, camaraRecorrido(pos, tau), t, 0, 0.15);
      },
    },
    // 4 · Centro de abajo, ingle y sube por el frente: ombligo, pecho, garganta y frente
    {
      dur: T_FRENTE - T_ESPALDA,
      aplicar: (e, t) => {
        const tau = lerp(T_ESPALDA, T_FRENTE, t);
        const pos = pintarRecorrido(e, tau);
        Object.assign(e.camara, camaraRecorrido(pos, tau));
      },
    },
    // 5 · Vuelve arriba y las dos manos la introducen por la coronilla
    {
      dur: DUR_FINAL,
      aplicar: (e, t) => {
        const seg = t * DUR_FINAL;
        const tau = T_FRENTE + Math.min(seg, VIAJE_VUELTA);
        Object.assign(e.camara, camaraRecorrido(puntoEnCurva(enRecorrido(tau).s), tau));
        toma(e, ENCUADRE_CABEZA, t, VIAJE_VUELTA / DUR_FINAL, 0.3);
        toma(e, TOMAS.general, t, 0.6, 0.85);
        introducir(e, seg);
      },
    },
  ],
};

export const chakrasInterno = { PARADAS, TRAMOS, PAUSA, ARRIBA, CURVA, LARGO_TOTAL, puntoEnCurva, enRecorrido, atraves, DUR_FINAL, SEG_FINAL, INICIO_MANOS, T_ESPALDA, T_FRENTE };
