import { type Esqueleto, type Pose, PROP, resolverEsqueleto } from '../escena/cuerpo';
import { PERFIL_MUSLO, PERFIL_PIERNA, PLANO_MUSLO, PLANO_PIERNA, altoPie, radioMiembro } from '../escena/cuerpoGeo';
import type { Camara, Estado } from '../escena/estado';
import { type V3, clamp, cruzV, entraSaleSeno, escalaV, lerp, lerpV, masSuave, normV, restaV, rotarX, rotarY, sumaV, tramo, ventana } from '../escena/mate';
import { HUECO, SERENA } from '../escena/poses';
import { TOMAS, esfera, pulso } from './comunes';
import { type Secuencia, encuadre, enMundo, fijarPose, toma } from './motor';
import {
  type Fase,
  type Lado,
  type Mano,
  type Manos,
  type PuntoPiel,
  CIERRE_RECORRER,
  DIST,
  FRENO,
  GOMA,
  LUZ_PALMA,
  LUZ_PIEL,
  NOMBRE_MANO,
  ORDEN_TRASPASOS,
  ORDEN_TRASPASOS_2,
  OTRO,
  R,
  SEG_PUNTO,
  SIGNO,
  armar,
  duracion,
  enFase,
  enPalma,
  manos,
  mezclarDir,
  mezclarMano,
  ortogonal,
  pasoCargar,
  pasoPasar,
  reposo,
  sostener,
  suelta,
} from './sensibilizarManos';

/**
 * «Sensibilización de piernas», descrita en el taller: como «Sensibilización de manos»,
 * pero con las piernas.
 *  - Se generan las esferas con las manos tomando energía de las barras, se juntan en una
 *    y se pasa de una mano a otra jugando como goma (igual que en «Sensibilización de manos»).
 *  - Con la mano que tiene la esfera se pasa por la pierna, la rodilla, el tobillo y la
 *    parte alta del pie, y se regresa de la misma forma: la pierna y el pie divididos en 6
 *    puntos (elegido en la revisión), y en cada uno se juega como goma.
 *  - Después la mano pasa a 5–10 cm, sin tocar, por toda la pierna y el pie, de ida y vuelta.
 *  - Al terminar, la esfera se introduce en el muslo, y se empieza con la otra pierna
 *    otra vez desde las barras.
 * Elegido en la revisión: la figura está de pie y se agacha (flexiona las rodillas y dobla
 * la cintura) a medida que la mano baja; primero la pierna derecha, con la mano izquierda
 * (la mano contraria, como en «Sensibilización de manos»).
 */

// ── La pierna ───────────────────────────────────────────────────────────

/** Los 6 puntos de goma, de arriba abajo; el recorrido llega además hasta la parte delantera del pie. */
const NOMBRES = ['muslo', 'mitad del muslo', 'rodilla', 'mitad de la canilla', 'tobillo', 'empeine'];
const DONDE = ['arriba del muslo', 'la mitad del muslo', 'la rodilla', 'la mitad de la canilla', 'el tobillo', 'el empeine'];
const N_PUNTOS = NOMBRES.length;
/** La parte delantera del pie, en la misma escala que los puntos (solo para el recorrido a distancia). */
const DEDOS_PIE = N_PUNTOS;
/** Por delante de la rótula, la piel queda a 4,7 cm del centro de la rodilla (medido sobre la malla). */
const RODILLA = 0.047;
/** Entre el tobillo y el empeine, el camino se abomba un poco: así no corta el empeine por dentro. */
const BULTO = 0.012;
/**
 * Dónde están, sobre el pie, el empeine y el final del recorrido (desde el tobillo hacia
 * adelante). Con la pierna a 45° y abierta, el recorrido llega justo pasando el empeine, antes
 * de los dedos: más adelante la mano ya no alcanza sin apoyar el pecho en la pierna.
 */
const Z_EMPEINE = 0.07;
const Z_DEDOS = 0.09;

/** El frente de un segmento que baja en `d` (la normal hacia adelante, o hacia arriba si el segmento está acostado). */
const frente = (d: V3): V3 => normV(cruzV(d, [1, 0, 0]));

/**
 * El punto de la piel de la pierna `A` (con su normal) a la altura `x`: 0 arriba del muslo,
 * 1 mitad del muslo, 2 rodilla, 3 mitad de la canilla, 4 tobillo, 5 empeine y 6 dedos del pie;
 * entre medio, continuo. Se mide sobre la malla (los perfiles del muslo, la pierna y el pie), y
 * entre un punto y otro sigue la piel: así la esfera queda siempre a la misma distancia aunque
 * las rodillas se doblen, y no corta la rodilla ni el empeine por dentro.
 */
function pielPorTramos(A: Lado, q: Esqueleto, x: number): PuntoPiel {
  const C = A === 'D' ? q.caderaD : q.caderaI;
  const K = A === 'D' ? q.rodillaD : q.rodillaI;
  const T = A === 'D' ? q.tobilloD : q.tobilloI;
  const nm = frente(normV(restaV(K, C)));
  const np = frente(normV(restaV(T, K)));
  const nRodilla = normV(sumaV(nm, np));
  // Delante del tobillo, la mano llega un poco desde arriba.
  const nTobillo = normV(sumaV(np, [0, 0.35, 0]));
  const rM = (t: number) => radioMiembro(PERFIL_MUSLO, t) * PLANO_MUSLO;
  const rP = (t: number) => radioMiembro(PERFIL_PIERNA, t) * PLANO_PIERNA;
  const sobre = (c: V3, n: V3, r: number): PuntoPiel => ({ piel: sumaV(c, escalaV(n, r)), normal: n });
  // El pie, debajo del tobillo; estirado en punta, girado alrededor del tobillo.
  const punta = A === 'D' ? q.puntaD : q.puntaI;
  const pie = (z: number): PuntoPiel => {
    const pendiente = (altoPie(z + 0.005) - altoPie(z - 0.005)) / 0.01;
    return {
      piel: sumaV(T, rotarX([0, altoPie(z) - PROP.tobilloY, z], punta, [0, 0, 0])),
      normal: normV(rotarX([0, 1, -pendiente], punta, [0, 0, 0])),
    };
  };
  const tobillo = sobre(lerpV(K, T, 0.86), np, rP(0.86));
  const i = Math.max(0, Math.min(5, Math.floor(x)));
  const f = clamp(x - i);
  if (i === 0) {
    const t = lerp(0.22, 0.55, f);
    return sobre(lerpV(C, K, t), nm, rM(t));
  }
  if (i === 1) {
    const t = lerp(0.55, 1, f);
    const w = f * f;
    return sobre(lerpV(C, K, t), normV(lerpV(nm, nRodilla, w)), lerp(rM(t), RODILLA, w));
  }
  if (i === 2) {
    const t = lerp(0, 0.5, f);
    const w = 1 - (1 - f) * (1 - f);
    return sobre(lerpV(K, T, t), normV(lerpV(nRodilla, np, w)), Math.max(rP(t), lerp(RODILLA, rP(t), w)));
  }
  if (i === 3) {
    const t = lerp(0.5, 0.86, f);
    return { piel: sobre(lerpV(K, T, t), np, rP(t)).piel, normal: normV(lerpV(np, nTobillo, f)) };
  }
  if (i === 4) {
    const b = pie(Z_EMPEINE);
    const n = normV(lerpV(nTobillo, b.normal, f));
    return { piel: sumaV(lerpV(tobillo.piel, b.piel, f), escalaV(n, BULTO * Math.sin(Math.PI * f))), normal: n };
  }
  return pie(lerp(Z_EMPEINE, Z_DEDOS, f));
}

/** Redondea las uniones sin mover los seis puntos medidos ni cortar las articulaciones. */
export function pielEn(A: Lado, q: Esqueleto, x: number): PuntoPiel {
  const j = Math.round(x);
  const ancho = 0.14;
  if (j < 1 || j > 5 || Math.abs(x - j) >= ancho) return pielPorTramos(A, q, x);
  const a = x < j ? j - ancho : j;
  const b = a + ancho;
  const pa = pielPorTramos(A, q, a);
  const pb = pielPorTramos(A, q, b);
  const h = 0.0001;
  const tangente = (u: number, campo: 'piel' | 'normal') =>
    escalaV(restaV(pielPorTramos(A, q, u + h)[campo], pielPorTramos(A, q, u - h)[campo]), ancho / (2 * h));
  const interpolar = (campo: 'piel' | 'normal'): V3 => {
    const da = tangente(a, campo);
    const db = tangente(b, campo);
    return pa[campo].map((v, i) => hermite(v, pb[campo][i], da[i], db[i], (x - a) / ancho)) as V3;
  };
  return { piel: interpolar('piel'), normal: normV(interpolar('normal')) };
}

/** Los 6 puntos de goma y los dedos del pie, en la postura `q`. */
export const puntosPierna = (A: Lado, q: Esqueleto): PuntoPiel[] => Array.from({ length: DEDOS_PIE + 1 }, (_, i) => pielEn(A, q, i));

// ── La pierna que se trabaja: estirada adelante, a 45°, pisando el piso ──

/**
 * La pierna que se trabaja va estirada hacia adelante a 45° (desde la vertical) y sigue
 * pisando el piso: el pie queda apoyado, así que respecto de la pierna queda estirado. La
 * otra rodilla se dobla para bajar la cadera (descrito en la revisión).
 */
const ANGULO_PIERNA = Math.PI / 4;
/** La pierna se abre un poco hacia su lado, como abriéndose (descrito en la revisión): la derecha a la derecha, la izquierda a la izquierda. */
const ABRIR_PIERNA = (15 * Math.PI) / 180;
/** La pierna casi estirada: la rodilla apenas flexionada. */
const LARGO_PIERNA = PROP.muslo + PROP.pierna - 0.003;
/** Hacia dónde va la pierna estirada: adelante y abajo, a 45° desde la vertical, abierta ABRIR_PIERNA hacia su lado. */
const dirPierna = (A: Lado): V3 => [
  SIGNO[A] * Math.sin(ANGULO_PIERNA) * Math.sin(ABRIR_PIERNA),
  -Math.cos(ANGULO_PIERNA),
  Math.sin(ANGULO_PIERNA) * Math.cos(ABRIR_PIERNA),
];

/** Cuánto baja la cadera para que, con la pierna a 45°, el pie quede apoyado en el piso (el tobillo a su altura de siempre). */
const AGACHAR_PIERNA = PROP.caderaY - (PROP.tobilloY - dirPierna('D')[1] * LARGO_PIERNA);

/** El tobillo de la pierna estirada, desde la cadera (que baja `agachar` y va atrás `atrasar`). */
function tobilloAdelante(A: Lado, agachar: number, atrasar: number): V3 {
  const cadera: V3 = [SIGNO[A] * PROP.caderaX, PROP.caderaY - agachar, -0.36 * agachar - atrasar];
  return sumaV(cadera, escalaV(dirPierna(A), LARGO_PIERNA));
}

// ── La postura: se inclina a medida que la mano baja ────────────────────

interface Postura {
  /** Cuánto está estirada adelante la pierna que se trabaja (0 debajo de la cadera, 1 a 45°; el pie siempre en el piso). */
  pierna: number;
  agachar: number;
  /** La cadera va hacia atrás: las canillas quedan casi verticales y el torso pasa por encima de los muslos. */
  atrasar: number;
  inclinar: number;
  /** Giro del torso hacia la pierna que se trabaja (rad, sin signo). */
  girar: number;
  /** Cuánto se adelanta el hombro de la mano que pasa por la pierna (0–1). */
  adelantar: number;
  cabeza: number;
}

/**
 * La postura en cada punto (y en los dedos del pie), elegida en la revisión: de pie,
 * agachándose a medida que la mano baja. La cintura se dobla y las rodillas se flexionan
 * de a poco, con la cadera hacia atrás, como quien se agacha a tocarse el pie: las canillas
 * quedan casi verticales. Medido para que la mano contraria llegue a cada punto, también al
 * hacer goma, y para que el torso no se apoye en los muslos.
 */
const POSTURAS: Postura[] = [
  // [atrasar, inclinar, girar, adelantar, cabeza]
  [0, 0.4, 0.05, 0.5, 0.4],
  [0, 0.55, 0.15, 1, 0.4],
  [0, 0.9, 0.2, 1, 0.45],
  [0, 1.3, 0.3, 1, 0.5],
  [0, 1.5, 0.5, 1, 0.5],
  [0, 1.7, 0.7, 1, 0.5],
  [0, 1.75, 0.75, 1, 0.5],
].map(([atrasar, inclinar, girar, adelantar, cabeza]) => ({ pierna: 1, agachar: AGACHAR_PIERNA, atrasar, inclinar, girar, adelantar, cabeza }));
const ERGUIDO: Postura = { pierna: 0, agachar: 0, atrasar: 0, inclinar: 0, girar: 0, adelantar: 0, cabeza: 0.38 };

function mezclarPostura(a: Postura, b: Postura, k: number): Postura {
  return {
    pierna: lerp(a.pierna, b.pierna, k),
    agachar: lerp(a.agachar, b.agachar, k),
    atrasar: lerp(a.atrasar, b.atrasar, k),
    inclinar: lerp(a.inclinar, b.inclinar, k),
    girar: lerp(a.girar, b.girar, k),
    adelantar: lerp(a.adelantar, b.adelantar, k),
    cabeza: lerp(a.cabeza, b.cabeza, k),
  };
}

/** La postura con la mano a la altura `x` de la pierna (0 = muslo … 6 = dedos del pie, continuo). */
export function posturaEn(x: number): Postura {
  const i = Math.max(0, Math.min(POSTURAS.length - 2, Math.floor(x)));
  const f = clamp(x - i);
  const P = { ...POSTURAS[i] };
  // Hermite monótona: conserva los valores medidos y comparte la tangente entre tramos.
  // La media armónica evita sobrepasar la inclinación o el alcance en las mesetas.
  for (const campo of Object.keys(P) as (keyof Postura)[]) {
    const pendiente = (j: number) => {
      if (j <= 0 || j >= POSTURAS.length - 1) return 0;
      const a = POSTURAS[j][campo] - POSTURAS[j - 1][campo];
      const b = POSTURAS[j + 1][campo] - POSTURAS[j][campo];
      return a * b > 0 ? (2 * a * b) / (a + b) : 0;
    };
    P[campo] = hermite(POSTURAS[i][campo], POSTURAS[i + 1][campo], pendiente(i), pendiente(i + 1), f);
  }
  return P;
}

/** Interpolación cúbica con tangentes expresadas en unidades del tramo. */
function hermite(a: number, b: number, da: number, db: number, t: number): number {
  return lerp(a, b, t * t * (3 - 2 * t)) + t * (1 - t) * ((1 - t) * da - t * db);
}

/** La pose con la postura `P` para la pierna `A` (gira hacia ella y adelanta el hombro de la otra mano). */
function conPostura(m: Manos, P: Postura, A: Lado): Pose {
  const B = OTRO[A];
  // La pierna da un paso adelante (el pie se levanta apenas al pasar y vuelve a pisar) y queda a 45°.
  const base = armar(m, P.cabeza);
  const apoyado = A === 'D' ? base.pieD : base.pieI;
  // El destino se calcula con la pelvis ya baja: interpolar también su altura con la
  // cadera en tránsito añadía hasta 6 cm al arco. El pie despega y aterriza sin golpe.
  const destino = tobilloAdelante(A, AGACHAR_PIERNA, 0);
  const pie = lerpV(apoyado, destino, P.pierna);
  pie[1] = PROP.tobilloY + 0.045 * Math.sin(Math.PI * P.pierna) ** 2;
  // Una vez apoyado, el pie permanece fijo aunque la cadera retroceda al llegar al empeine.
  return {
    ...base,
    ...(A === 'D' ? { pieD: pie } : { pieI: pie }),
    agachar: P.agachar,
    atrasar: P.atrasar,
    inclinar: P.inclinar,
    girar: SIGNO[A] * P.girar,
    adelantarD: B === 'D' ? P.adelantar : 0,
    adelantarI: B === 'I' ? P.adelantar : 0,
  };
}

/** El esqueleto de la postura (las piernas y los hombros no dependen de dónde van las manos). */
const esqueletoDe = (P: Postura, A: Lado) => resolverEsqueleto(conPostura({ D: reposo('D'), I: reposo('I') }, P, A));

/**
 * Una dirección del mundo en el marco del torso: las pistas del codo giran con el torso, así
 * que con el cuerpo doblado hay que pasarlas a su marco para que el codo vaya adonde se quiere.
 */
const enTorso = (d: V3, P: Postura, A: Lado): V3 => normV(rotarX(rotarY(d, -SIGNO[A] * P.girar), -P.inclinar, [0, 0, 0]));

// ── Las manos ───────────────────────────────────────────────────────────

/**
 * Los dedos de la mano que pasa por la pierna: sobre el muslo y la rodilla la cruzan hacia
 * afuera y abajo; de la canilla al pie van a lo largo de la pierna, hacia el pie (así la muñeca
 * queda del lado del hombro y la mano llega al empeine).
 */
function dedosSobre(A: Lado, x: number): V3 {
  const w = clamp((x - 2) / 2);
  return normV(lerpV(normV([SIGNO[A] * 0.7, -0.7, 0.25]), dirPierna(A), w));
}
/** Su codo va hacia afuera y adelante: el brazo pasa por delante de las rodillas, no entre ellas. */
const codoSobre = (B: Lado): V3 => normV([SIGNO[B] * 0.55, -0.25, 0.8]);

/**
 * La mano `OTRO[A]` sobre el punto `pp` de la pierna `A`, con la palma hacia la piel a DIST +
 * `alza`. Con la goma (como en «Sensibilización de manos»): al subir, la muñeca se dobla un poco (los dedos hacia
 * la pierna) y los dedos se cierran levemente, como tirando de la goma.
 */
function manoSobre(A: Lado, P: Postura, x: number, pp: PuntoPiel, alza: number, cierre = 0.15): Mano {
  const f = clamp(alza / GOMA);
  const palma0 = escalaV(pp.normal, -1);
  const dedos0 = ortogonal(dedosSobre(A, x), palma0);
  const beta = 0.28 * f;
  const dedos = normV(sumaV(escalaV(dedos0, Math.cos(beta)), escalaV(palma0, Math.sin(beta))));
  const palma = normV(restaV(escalaV(palma0, Math.cos(beta)), escalaV(dedos0, Math.sin(beta))));
  const hueco = sumaV(pp.piel, escalaV(pp.normal, DIST + alza));
  return {
    mano: restaV(restaV(hueco, escalaV(dedos, HUECO.dedos)), escalaV(palma, HUECO.piel)),
    palma,
    dedos,
    cierre: lerp(cierre, Math.max(cierre, 0.32), f),
    codo: enTorso(codoSobre(OTRO[A]), P, A),
  };
}

/** La mano del lado de la pierna cuelga relajada, hacia afuera: no delante de la pierna que se trabaja. */
function colgando(A: Lado, P: Postura, q: Esqueleto): Mano {
  const s = SIGNO[A];
  const H = A === 'D' ? q.hombroD : q.hombroI;
  return {
    mano: sumaV(H, [s * 0.17, -0.47, -0.02]),
    palma: [-s, 0, 0],
    dedos: [0, -1, 0],
    cierre: 0.22,
    codo: enTorso(normV([s * 0.35, 0.1, -1]), P, A),
  };
}

/** Sigue la palma con la cabeza, descontando el giro y la inclinación que ya aporta el torso. */
function mirarMano(e: Estado, A: Lado, peso: number) {
  const p = e.figuras[0].pose;
  const q = resolverEsqueleto(p);
  const B = OTRO[A];
  const m = B === 'D' ? q.munecaD : q.munecaI;
  const pal = B === 'D' ? q.palmaD : q.palmaI;
  const objetivo = sumaV(m, sumaV(escalaV(pal.dedos, HUECO.dedos), escalaV(pal.normal, HUECO.piel)));
  const d = rotarY(restaV(objetivo, q.cabeza), -p.girar);
  const pitch = Math.atan2(-d[1], d[2]) - p.inclinar;
  // Saturación suave del cuello (±0,7 rad): evita doblarlo de más al mirar el muslo.
  p.cabezaPitch = lerp(p.cabezaPitch, 0.7 * Math.tanh(pitch / 0.7), peso);
}

/** La esfera entre la piel y la palma: se estira (goma) cuando la mano sube. */
function esferaSobre(e: Estado, pp: PuntoPiel, alza: number, r = R, hundir = 0) {
  const alto = 2 * r + alza;
  esfera(e, 0, {
    ref: null,
    pegado: 0,
    pos: enMundo(e, 0, sumaV(pp.piel, escalaV(pp.normal, LUZ_PIEL + alto / 2 - hundir))),
    radio: r,
    estirar: alto / (2 * Math.max(r, 1e-4)),
    eje: pp.normal,
    brillo: 1.25 + 0.3 * clamp(alza / GOMA),
    color: 'oro',
    color2: 'blanco',
    mezcla: 0.3,
    opacidad: 1,
  });
}

/** Nombre del punto, al costado de afuera de la pierna. */
function rotulo(e: Estado, A: Lado, pp: PuntoPiel, texto: string, opacidad: number, tipo: 'nombre' | 'distancia' = 'nombre') {
  if (opacidad > 0) e.marcas.push({ pos: enMundo(e, 0, sumaV(pp.piel, [SIGNO[A] * 0.11, 0.02, 0.02])), texto, opacidad, tipo });
}

// ── Paso 3 (y 7) · Los 6 puntos, al bajar y al volver ───────────────────

type IdPuntos = 'preparar' | 'bajar' | 'subir';
const PREPARAR = 3;
const FASES_PUNTOS: Fase<IdPuntos>[] = [
  { id: 'preparar', dur: PREPARAR },
  { id: 'bajar', dur: N_PUNTOS * SEG_PUNTO },
  { id: 'subir', dur: N_PUNTOS * SEG_PUNTO },
];

/** La postura y el punto de la piel con la mano a la altura `x` de la pierna. */
function puntoEn(A: Lado, x: number): { P: Postura; q: Esqueleto; pp: PuntoPiel } {
  const P = posturaEn(x);
  const q = esqueletoDe(P, A);
  return { P, q, pp: pielEn(A, q, x) };
}

/**
 * La ola de los 6 puntos (`k` de 0 a 1): `x`, el punto en curso, continuo (de −0,5 a 5,5: la
 * goma está arriba en cada punto entero); `u`, por dónde va la mano, que afloja en cada punto
 * y avanza más rápido entre uno y otro, sin detenerse del todo.
 */
function ola(k: number): { x: number; u: number } {
  const n = N_PUNTOS;
  const x = -0.5 + n * clamp(k);
  // Los medios pulsos de los extremos arrancan y frenan con tangente nula;
  // los cuatro puntos interiores conservan el avance continuo y el freno de la goma.
  let xc = clamp(x, 0, n - 1);
  if (xc < 0.5) xc = hermite(0, 0.5, 0, 0.5, xc * 2);
  else if (xc > n - 1.5) xc = n - 1 - hermite(0, 0.5, 0, 0.5, (n - 1 - xc) * 2);
  return { x, u: xc - (FRENO * Math.sin(2 * Math.PI * xc)) / (2 * Math.PI) };
}

/** A qué altura de la pierna está la mano en el paso de los puntos (para la cámara). */
function alturaPuntos(seg: number): number {
  const { id, k } = enFase(FASES_PUNTOS, seg);
  if (id === 'preparar') return 0;
  const { u } = ola(k);
  return id === 'bajar' ? u : N_PUNTOS - 1 - u;
}

/** A qué altura de la pierna está la mano en el recorrido (para la cámara). */
function alturaRecorrido(seg: number): number {
  const { id, k } = enFase(FASES_RECORRIDO, seg);
  if (id === 'recorrer') return entraSaleSeno(k) * DEDOS_PIE;
  if (id === 'volver') return (1 - entraSaleSeno(k)) * DEDOS_PIE;
  return 0;
}

/**
 * La mano baja (o sube) por los 6 puntos de forma continua, como una ola: en cada punto sube y
 * baja (la esfera se estira con ella) y sigue al siguiente sin detenerse del todo; la figura
 * se agacha a medida que la mano baja y se endereza al subir.
 */
function recorrerPuntos(e: Estado, A: Lado, k: number, bajando: boolean) {
  const n = N_PUNTOS;
  const { x, u } = ola(k);
  const donde = bajando ? u : n - 1 - u;
  const alza = GOMA * (0.5 + 0.5 * Math.cos(2 * Math.PI * x));
  const { P, q, pp } = puntoEn(A, donde);
  e.figuras[0].pose = conPostura(manos(A, colgando(A, P, q), manoSobre(A, P, donde, pp, alza)), P, A);
  esferaSobre(e, pp, alza);
  const ip = Math.max(0, Math.min(n - 1, Math.round(x)));
  const cual = bajando ? ip : n - 1 - ip;
  rotulo(e, A, pielEn(A, q, cual), NOMBRES[cual], clamp(1 - Math.abs(x - ip) * 2.2));
  e.hud.contador = { valor: Math.max(0, Math.min(n, Math.floor(x + 0.5))), total: n, etiqueta: bajando ? 'puntos · bajando' : 'puntos · subiendo' };
  e.hud.aviso = `Como goma en ${DONDE[cual]}`;
}

function puntos(e: Estado, A: Lado, seg: number) {
  const B = OTRO[A];
  const { id, k } = enFase(FASES_PUNTOS, seg);
  if (id === 'preparar') {
    // La mano que tiene la esfera la da vuelta sin soltarla (queda pegada a su palma) y la lleva
    // al muslo de la otra pierna; la figura empieza a inclinarse y la otra mano se suelta.
    const s = masSuave(k);
    const P = mezclarPostura(ERGUIDO, POSTURAS[0], s);
    // Primero se descarga el peso sobre la pierna de apoyo; el pie termina de
    // asentarse antes de completar la inclinación hacia el muslo.
    P.agachar = AGACHAR_PIERNA * tramo(k, 0, 0.82, masSuave);
    P.pierna = tramo(k, 0.12, 0.9, masSuave);
    const q = esqueletoDe(P, A);
    const pp = pielEn(A, q, 0);
    const ini = reposo(B);
    const fin = manoSobre(A, P, 0, pp, 0);
    const c0 = enPalma(ini, R);
    const c1 = sumaV(pp.piel, escalaV(pp.normal, LUZ_PIEL + R));
    const c = sumaV(lerpV(c0, c1, s), [0, 0.05 * Math.sin(Math.PI * s), 0]);
    const palma = mezclarDir(ini.palma, fin.palma, s);
    const dedos = ortogonal(mezclarDir(ini.dedos, fin.dedos, s), palma);
    const mB = sostener(c, R + LUZ_PALMA * s, palma, dedos, lerp(ini.cierre, fin.cierre, s), mezclarDir(ini.codo, fin.codo, s));
    const mA = mezclarMano(reposo(A), colgando(A, P, q), s);
    e.figuras[0].pose = conPostura(manos(A, mA, mB), P, A);
    esfera(e, 0, { ref: null, pegado: 0, pos: enMundo(e, 0, c), radio: R, estirar: 1, eje: null, brillo: 1.25, color: 'oro', color2: 'blanco', mezcla: 0.3, opacidad: 1 });
    e.hud.contador = null;
    e.hud.aviso = `La mano ${NOMBRE_MANO[B]} lleva la esfera a la pierna ${NOMBRE_MANO[A]}`;
    return;
  }
  recorrerPuntos(e, A, k, id === 'bajar');
}

// ── Paso 4 (y 8) · Recorrido a 5–10 cm, ida y vuelta, y la esfera entra en el muslo ──

type IdRecorrido = 'recorrer' | 'volver' | 'quieto' | 'introducir' | 'erguirse';
const FASES_RECORRIDO: Fase<IdRecorrido>[] = [
  { id: 'recorrer', dur: 5.5 },
  { id: 'volver', dur: 5.5 },
  { id: 'quieto', dur: 0.5 },
  { id: 'introducir', dur: 3.6 },
  { id: 'erguirse', dur: 3 },
];

/** Cuánto se hunde la esfera en el muslo antes de desaparecer dentro. */
const HUNDIR = 0.03;
/** Al introducirla, la palma se acerca a la piel lo que mide el radio de la esfera, sin tocarla: queda a 4 cm. */
const ACERCAR = R;

function recorrido(e: Estado, A: Lado, seg: number) {
  const { id, k } = enFase(FASES_RECORRIDO, seg);
  e.hud.contador = null;
  if (id === 'recorrer' || id === 'volver' || id === 'quieto') {
    // La mano ahuecada pasa sin tocar, a 5–10 cm, por toda la pierna y el pie: del muslo hasta
    // pasar el empeine y de vuelta al muslo, como cubriéndolos.
    const u = id === 'recorrer' ? entraSaleSeno(k) : id === 'volver' ? 1 - entraSaleSeno(k) : 0;
    const { P, q, pp } = puntoEn(A, u * DEDOS_PIE);
    const cierre = id === 'recorrer' ? lerp(0.15, CIERRE_RECORRER, tramo(k, 0, 0.15)) : id === 'volver' ? CIERRE_RECORRER : lerp(CIERRE_RECORRER, 0.15, masSuave(k));
    e.figuras[0].pose = conPostura(manos(A, colgando(A, P, q), manoSobre(A, P, u * DEDOS_PIE, pp, 0, cierre)), P, A);
    esferaSobre(e, pp, 0);
    rotulo(e, A, pp, '5–10 cm', id === 'quieto' ? 0 : ventana(k, 0, 1, 0.08), 'distancia');
    e.hud.aviso =
      id === 'recorrer' ? 'La mano recorre la pierna y el pie cubriéndolos, sin tocarlos, a 5–10 cm' : 'Y vuelve, sin tocarla, hasta el muslo';
    return;
  }
  const P0 = POSTURAS[0];
  const q0 = esqueletoDe(P0, A);
  const pp = pielEn(A, q0, 0);
  if (id === 'introducir') {
    // La mano acerca la esfera al muslo y la esfera entra en él, achicándose; un pulso en el muslo.
    const acerca = entraSaleSeno(tramo(k, 0, 0.6));
    const r = R * (1 - tramo(k, 0.3, 0.8));
    e.figuras[0].pose = conPostura(manos(A, colgando(A, P0, q0), manoSobre(A, P0, 0, pp, -acerca * ACERCAR)), P0, A);
    if (r > 0.001) esferaSobre(e, pp, 0, r, HUNDIR * acerca);
    else e.esferas[0].activa = false;
    pulso(e, enMundo(e, 0, pp.piel), tramo(k, 0.55, 0.95), 0.16, 'oro');
    e.hud.aviso = 'La esfera se introduce en el muslo';
    return;
  }
  // Se endereza y las manos se sueltan. La mano que introdujo la esfera primero se aparta hacia
  // adelante (así no cruza los muslos) y después baja a su costado.
  e.esferas[0].activa = false;
  const s = masSuave(k);
  const P = mezclarPostura(P0, ERGUIDO, s);
  P.cabeza = lerp(P0.cabeza, 0, s);
  // La cadera sigue baja mientras vuelve el pie y sube al recuperar los dos apoyos.
  P.pierna = 1 - tramo(k, 0.12, 0.8, masSuave);
  P.agachar = AGACHAR_PIERNA * (1 - tramo(k, 0.28, 1, masSuave));
  const q = esqueletoDe(P, A);
  const B = OTRO[A];
  const desde = manoSobre(A, P0, 0, pp, -ACERCAR);
  const aparte: Mano = { ...reposo(B), palma: [-SIGNO[B], 0, 0], dedos: normV([0, -0.3, 1]), cierre: 0.2 };
  const mB = k < 0.5 ? mezclarMano(desde, aparte, masSuave(k / 0.5)) : mezclarMano(aparte, suelta(B), masSuave((k - 0.5) / 0.5));
  // La mano libre acompaña al hombro hasta que el pie vuelve; acercarla antes a
  // SERENA hacía pasar el antebrazo por el muslo durante el último segundo.
  const mA = mezclarMano(colgando(A, P, q), suelta(A), tramo(k, 0.65, 1, masSuave));
  e.figuras[0].pose = conPostura(manos(A, mA, mB), P, A);
  e.hud.aviso = 'Se endereza despacio';
}

// ── Cámaras y pasos ─────────────────────────────────────────────────────

/**
 * De frente y del lado de la pierna que se trabaja; sigue a la postura: con la mano arriba
 * se ve el cuerpo entero, y a medida que baja la cámara baja y se acerca, con el pie por
 * encima de los controles.
 */
function camPierna(A: Lado, x: number): Camara {
  const k = clamp(x / (N_PUNTOS - 1));
  // Más de costado que de frente: así se ve la pierna estirada a 45° y abierta, no de punta.
  return encuadre([SIGNO[A] * 0.12, lerp(0.9, 0.45, k), lerp(0.22, 0.28, k)], lerp(1.95, 1.6, k), SIGNO[A] * 1.2, lerp(0.12, 0.2, k));
}

function pasoPuntos(A: Lado) {
  const dur = duracion(FASES_PUNTOS);
  return {
    dur,
    aplicar: (e: Estado, t: number) => {
      toma(e, camPierna(A, alturaPuntos(t * dur)), t, 0, PREPARAR / dur);
      e.esferas[1].activa = false;
      e.esferas[2].activa = false;
      puntos(e, A, t * dur);
      const fase = enFase(FASES_PUNTOS, t * dur);
      mirarMano(e, A, fase.id === 'preparar' ? tramo(fase.k, 0, 0.6, masSuave) : 1);
    },
  };
}

function pasoRecorrido(A: Lado) {
  const dur = duracion(FASES_RECORRIDO);
  const finIntroducir = duracion(FASES_RECORRIDO.slice(0, 4)) / dur;
  return {
    dur,
    aplicar: (e: Estado, t: number) => {
      toma(e, camPierna(A, alturaRecorrido(t * dur)), t, 0, 1e-3);
      toma(e, TOMAS.general, t, finIntroducir, 1);
      recorrido(e, A, t * dur);
      const fase = enFase(FASES_RECORRIDO, t * dur);
      mirarMano(e, A, fase.id === 'erguirse' ? 1 - tramo(fase.k, 0, 0.8, masSuave) : 1);
    },
  };
}

/** Primero la pierna derecha, con la mano izquierda; después la izquierda, con la derecha (elegido en la revisión). */
export const PRIMERA: Lado = 'D';
export const SEGUNDA: Lado = 'I';

export const sensibilizacionPiernas: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Cargar de las barras y formar la esfera (se queda la derecha)
    pasoCargar('D'),
    // 2 · Pasar de mano en mano como goma (termina en la izquierda)
    pasoPasar(ORDEN_TRASPASOS),
    // 3 · Pierna derecha: la mano izquierda hace goma en los 6 puntos, al bajar y al volver
    pasoPuntos(PRIMERA),
    // 4 · Pierna derecha: recorrido a 5–10 cm, ida y vuelta; la esfera entra en el muslo
    pasoRecorrido(PRIMERA),
    // 5 · Con la otra pierna, otra vez desde las barras (se queda la izquierda)
    pasoCargar('I'),
    // 6 · Pasar de mano en mano (termina en la derecha)
    pasoPasar(ORDEN_TRASPASOS_2),
    // 7 · Pierna izquierda: la mano derecha hace goma en los 6 puntos
    pasoPuntos(SEGUNDA),
    // 8 · Pierna izquierda: recorrido y la esfera entra en el muslo
    pasoRecorrido(SEGUNDA),
  ],
};

export const piernasInterno = { AGACHAR_PIERNA, dirPierna, FASES_PUNTOS, FASES_RECORRIDO, POSTURAS, N_PUNTOS, DEDOS_PIE, NOMBRES, posturaEn, puntoEn, pielEn, esqueletoDe, DIST, R };
