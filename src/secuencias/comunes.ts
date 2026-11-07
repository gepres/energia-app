import { type Pose, PUNTOS, type PuntoCuerpo, resolverEsqueleto } from '../escena/cuerpo';
import { type ColorEnergia, type Estado, type Punto, ref } from '../escena/estado';
import { type V3, arco, campana, clamp, lerp, lerpV, rotarY, saleAtras, sumaV, tramo } from '../escena/mate';
import { BRAZOS_CIELO, CARGA_OMBLIGO, DEJAR_EN_PISO, DISPARAR, MANO_CORAZON, MANOS_PECHO, SERENA, palmasAbajo } from '../escena/poses';
import { encuadre, posar, puntoMundo } from './motor';

// ── Tomas de cámara ─────────────────────────────────────────────────────

export const TOMAS = {
  general: encuadre([0, 0.95, 0], 2.3, 0.32, 0.1),
  amplia: encuadre([0.2, 0.75, 0.8], 3.8, 0.5, 0.32, 34),
  pecho: encuadre([0, 1.22, 0.1], 1.35, 0.4, 0.1),
  ombligo: encuadre([0, 1.1, 0.12], 1.4, 0.6, 0.14),
  cabeza: encuadre([0, 1.42, 0.05], 1.05, 0.32, 0.06),
  manos: encuadre([0, 1.16, 0.25], 1.15, 0.5, 0.2),
  lateral: encuadre([0, 1.0, 0.1], 2.1, 1.15, 0.08),
};

// ── Ayudas de posición ──────────────────────────────────────────────────

/** Muñeca de una figura en el mundo según su pose objetivo. */
export function manoMundo(e: Estado, fig: 0 | 1, lado: 'D' | 'I'): V3 {
  const f = e.figuras[fig];
  const p = lado === 'D' ? f.pose.manoD : f.pose.manoI;
  return sumaV(rotarY(p, f.rotY), f.pos);
}

/** Centro aproximado entre las palmas (pose objetivo). */
export function centroManos(e: Estado, fig: 0 | 1): V3 {
  const a = manoMundo(e, fig, 'D');
  const b = manoMundo(e, fig, 'I');
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.05, (a[2] + b[2]) / 2 + 0.02];
}

/** Punto delante de un centro del cuerpo (fuera de la piel). */
export function delante(e: Estado, fig: 0 | 1, punto: PuntoCuerpo, dist: number): V3 {
  const p = PUNTOS[punto];
  return puntoMundo(e, fig, [p[0], p[1], p[2] + dist]);
}

// ── Esferas ─────────────────────────────────────────────────────────────

export function esfera(
  e: Estado,
  i: number,
  datos: Partial<Estado['esferas'][number]> & { pos?: V3 },
) {
  Object.assign(e.esferas[i], { activa: true }, datos);
  return e.esferas[i];
}

export function apagarEsfera(e: Estado, i: number, t: number, a: number, b: number) {
  const k = tramo(t, a, b);
  if (k <= 0) return;
  const s = e.esferas[i];
  s.opacidad *= 1 - k;
  if (k >= 1) s.activa = false;
}

export function flujo(
  e: Estado,
  i: number,
  puntos: Punto[],
  datos: Partial<Estado['flujos'][number]>,
) {
  Object.assign(e.flujos[i], { activo: true, puntos }, datos);
  return e.flujos[i];
}

export function apagarFlujos(e: Estado) {
  for (const f of e.flujos) f.activo = false;
}

export function pulso(e: Estado, pos: V3, k: number, radio = 0.4, color: ColorEnergia = 'oro') {
  if (k > 0 && k < 1) e.pulsos.push({ pos, ref: null, k, radio, color });
}

export function pulsoRef(e: Estado, r: ReturnType<typeof ref>, k: number, radio = 0.4, color: ColorEnergia = 'oro') {
  if (k > 0 && k < 1) e.pulsos.push({ pos: [0, 0, 0], ref: r, k, radio, color });
}

// ── Bloques reutilizables de los ejercicios ─────────────────────────────

/**
 * Carga en un centro (ombligo o pecho): manos que giran frente al centro,
 * esfera que crece y contador. `n` es la cantidad que pide el apunte.
 */
export function cargar(
  e: Estado,
  t: number,
  opts: { pose: Pose; centro: PuntoCuerpo; n: number; etiqueta: string; esferaI?: number; flujoI?: number },
) {
  const { pose: base, centro, n, etiqueta } = opts;
  const ei = opts.esferaI ?? 0;
  const fi = opts.flujoI ?? 0;
  posar(e, 0, base, t, 0, 0.14);
  const k = tramo(t, 0.12, 0.92, (x) => x);
  // Manos que giran a un ritmo visible; la cuenta sigue al apunte.
  if (t > 0.1) {
    const giro = clamp((t - 0.1) / 0.85) * Math.PI * 2 * 7;
    const amp = 0.035 * tramo(t, 0.1, 0.2) * (1 - tramo(t, 0.9, 1));
    const p = e.figuras[0].pose;
    const dx = Math.cos(giro) * amp;
    const dy = Math.sin(giro) * amp;
    p.manoD = [p.manoD[0] + dx * 0.6, p.manoD[1] + dy, p.manoD[2] + Math.sin(giro + 1) * amp * 0.5];
    p.manoI = [p.manoI[0] - dx * 0.6, p.manoI[1] + dy, p.manoI[2] + Math.sin(giro + 1) * amp * 0.5];
  }
  const cuenta = Math.min(n, Math.floor(k * n + 1e-6) + (k > 0 ? 1 : 0));
  const p = puntoMundo(e, 0, [PUNTOS[centro][0], PUNTOS[centro][1], PUNTOS[centro][2] + 0.05]);
  esfera(e, ei, {
    pos: p,
    ref: null,
    pegado: 0,
    color: 'oro',
    radio: lerp(0.018, 0.06, k) * tramo(t, 0.08, 0.16),
    brillo: 0.9 + 0.8 * k,
    opacidad: 1,
  });
  flujo(e, fi, [ref('manoD', 0), ref('manos', 0, [0, 0.0, 0.03]), ref('manoI', 0)], {
    cabeza: 1,
    cola: 1,
    color: 'oro',
    intensidad: 0.7 * tramo(t, 0.12, 0.25) * (1 - tramo(t, 0.9, 1)),
    remolino: 0.03,
    ancho: 0.8,
  });
  // Pulso por cada carga (los últimos se agrupan).
  const fase = (k * n) % 1;
  if (k > 0 && k < 1) pulso(e, p, fase, 0.16, 'oro');
  e.hud.contador = k > 0 ? { valor: cuenta, total: n, etiqueta } : null;
  e.centros[centro] = 0.4 + 0.6 * k;
}

/**
 * Sellar desde el cielo (lectura ilustrativa): brazos arriba, haz del cielo y
 * descenso de las palmas cerrando un manto de arriba hacia abajo.
 */
export function sellarDesdeCielo(e: Estado, t: number) {
  posar(e, 0, BRAZOS_CIELO, t, 0.02, 0.28);
  e.cielo = tramo(t, 0.12, 0.35) * (1 - tramo(t, 0.82, 1));
  const baja = tramo(t, 0.36, 0.86, (x) => x);
  if (t > 0.34) {
    const y = lerp(1.78, 0.62, baja);
    const zp = 0.44 - 0.05 * Math.sin(Math.PI * baja);
    posar(e, 0, palmasAbajo(y, zp, 0.17), t, 0.34, 0.42);
    if (t >= 0.42) e.figuras[0].pose = { ...palmasAbajo(y, zp, 0.17) };
  }
  posar(e, 0, SERENA, t, 0.88, 1);
  const m = e.mantos[0];
  Object.assign(m, {
    activo: true,
    centro: [e.figuras[0].pos[0], 0, e.figuras[0].pos[2]] as V3,
    radio: 0.58,
    alto: 2.02,
    desdeArriba: true,
    cobertura: baja,
    banda: t > 0.36 && t < 0.9 ? lerp(0.9, 0.3, baja) : -1,
    color: 'violeta' as ColorEnergia,
    opacidad: lerp(1, 0.13, tramo(t, 0.86, 1)),
  });
  // La carga del ombligo queda dentro.
  const s = e.esferas[0];
  if (s.activa) {
    s.radio *= 1 - tramo(t, 0.0, 0.2);
    if (t > 0.2) s.activa = false;
  }
  apagarFlujos(e);
}

/** Respiración consciente con ritmo 4-3-4-4 (lectura ilustrativa). */
export function respirar(e: Estado, t: number, total: number, a = 0.18, b = 0.96) {
  const k = clamp((t - a) / (b - a));
  // Se muestra un ciclo completo con sus cuatro tiempos.
  const tiempos = [4, 3, 4, 4];
  const suma = 15;
  let acc = 0;
  let fase: 'Inhala' | 'Retén' | 'Exhala' | 'Pausa' = 'Inhala';
  let kf = 0;
  const nombres = ['Inhala', 'Retén', 'Exhala', 'Pausa'] as const;
  for (let i = 0; i < 4; i++) {
    const d = tiempos[i] / suma;
    if (k <= acc + d || i === 3) {
      fase = nombres[i];
      kf = clamp((k - acc) / d);
      break;
    }
    acc += d;
  }
  let amp = 0;
  if (fase === 'Inhala') amp = Math.sin((kf * Math.PI) / 2);
  else if (fase === 'Retén') amp = 1;
  else if (fase === 'Exhala') amp = Math.cos((kf * Math.PI) / 2);
  if (t > a) e.hud.respiracion = { fase, k: kf, ciclo: 1, total };
  e.centros.corazon = 0.35 + 0.65 * amp * tramo(t, a, a + 0.05);
  return amp;
}

/** Mano en el corazón con respiración. */
export function manoCorazonRespirando(e: Estado, t: number, total: number) {
  posar(e, 0, MANO_CORAZON, t, 0, 0.18);
  const amp = respirar(e, t, total);
  // El pecho «respira»: la mano se adelanta un poco al inhalar.
  if (t > 0.18) e.figuras[0].pose.manoD[2] += 0.012 * amp;
  return amp;
}

/** Trayectoria en arco de un objeto que vuela de A a B. */
export function vuelo(a: V3, b: V3, k: number, altura = 0.5): V3 {
  return arco(a, b, k, altura);
}

export { campana, CARGA_OMBLIGO };

/** Centro de la palma según la pose objetivo (coincide con la dibujada en reposo). */
export function palmaMundo(e: Estado, fig: 0 | 1, lado: 'D' | 'I'): V3 {
  const f = e.figuras[fig];
  const esq = resolverEsqueleto(f.pose);
  const p = lado === 'D' ? esq.palmaD.centro : esq.palmaI.centro;
  return sumaV(rotarY(p, f.rotY), f.pos);
}

export function entrePalmas(e: Estado, fig: 0 | 1): V3 {
  return lerpV(palmaMundo(e, fig, 'D'), palmaMundo(e, fig, 'I'), 0.5);
}

// ── Rosas ───────────────────────────────────────────────────────────────

/** Saca una rosa del pecho y la deja en el piso en `destino`. */
export function sacarRosa(e: Estado, i: number, t: number, destino: V3) {
  posar(e, 0, MANOS_PECHO, t, 0, 0.18);
  const r = e.rosas[i];
  const pecho = delante(e, 0, 'corazon', 0.09);
  r.activa = t > 0.12;
  r.ref = null;
  r.pegado = 0;
  const sale = tramo(t, 0.12, 0.35);
  r.escala = lerp(0.25, 1, tramo(t, 0.12, 0.75));
  r.apertura = lerp(0.05, 1, tramo(t, 0.3, 0.85));
  r.opacidad = tramo(t, 0.12, 0.22);
  posar(e, 0, DEJAR_EN_PISO, t, 0.38, 0.58);
  const vuela = tramo(t, 0.4, 0.78);
  const inicio: V3 = [pecho[0], pecho[1], pecho[2] + 0.12 * sale];
  r.pos = vuela > 0 ? arco(inicio, [destino[0], 0.18, destino[2]], vuela, 0.18) : inicio;
  posar(e, 0, SERENA, t, 0.8, 1);
  if (t >= 0.78) pulso(e, [destino[0], 0.12, destino[2]], (t - 0.78) / 0.22, 0.35, 'rosa');
}

/** Energía que viaja desde `origen` hasta la rosa i y la rosa la recoge. */
export function recogerEnRosa(e: Estado, i: number, t: number, origen: Punto[], color: ColorEnergia, flujoI = 0) {
  const r = e.rosas[i];
  const destino: V3 = [r.pos[0], r.pos[1] + 0.06, r.pos[2]];
  flujo(e, flujoI, [...origen, destino], {
    cabeza: tramo(t, 0.08, 0.5),
    cola: 0.85,
    color,
    intensidad: 1.3 * (1 - tramo(t, 0.86, 1)),
    remolino: 0.06,
    ancho: 1.7,
  });
  r.recoge = campana(t, 0.2, 1);
}

/** Forma una esfera en la mano derecha y la dispara sobre la rosa i para sellarla. */
export function sellarRosaDisparando(e: Estado, rosaI: number, t: number, esferaI = 4) {
  posar(e, 0, MANOS_PECHO, t, 0, 0.15);
  posar(e, 0, DISPARAR, t, 0.22, 0.4);
  const r = e.rosas[rosaI];
  const blanco: V3 = [r.pos[0], r.pos[1] + 0.07, r.pos[2]];
  const s = e.esferas[esferaI];
  const forma = tramo(t, 0.05, 0.3);
  const vuelo = tramo(t, 0.42, 0.62, (x) => x * x);
  s.activa = t > 0.05 && t < 0.64;
  s.color = 'violeta';
  s.brillo = 1.3;
  s.radio = 0.045 * saleAtras(forma);
  s.opacidad = 1;
  if (vuelo <= 0) {
    s.ref = t < 0.3 ? ref('manos', 0, [0, 0.02, 0.05]) : ref('manoD', 0, [0, 0, 0.06]);
    s.pegado = 1;
  } else {
    const desde = palmaMundo(e, 0, 'D');
    s.ref = null;
    s.pegado = 0;
    s.pos = arco([desde[0], desde[1], desde[2] + 0.06], blanco, vuelo, 0.22);
  }
  pulso(e, blanco, clamp((t - 0.62) / 0.25), 0.5, 'violeta');
  r.sello = tramo(t, 0.62, 0.9);
  r.recoge *= 1 - tramo(t, 0.6, 0.8);
  posar(e, 0, SERENA, t, 0.72, 0.95);
}

/** La rosa i vuela hasta el pecho de una figura y se absorbe. */
export function devolverRosa(e: Estado, i: number, t: number, fig: 0 | 1, a = 0, b = 1) {
  const k = (x: number) => a + (b - a) * x;
  const r = e.rosas[i];
  if (!r.activa) return;
  const pecho = delante(e, fig, 'corazon', 0.04);
  const vuelo = tramo(t, k(0.1), k(0.7));
  if (vuelo > 0) r.pos = arco(r.pos, pecho, vuelo, 0.35);
  r.escala *= lerp(1, 0.35, tramo(t, k(0.45), k(0.85)));
  r.opacidad *= 1 - tramo(t, k(0.72), k(0.9));
  pulso(e, pecho, clamp((t - k(0.7)) / (k(1) - k(0.7))), 0.45, 'rosa');
  if (t >= k(0.9)) r.activa = false;
  if (fig === 0) e.centros.corazon = Math.max(e.centros.corazon ?? 0, campana(t, k(0.65), k(1)));
}

// ── Cubo (versión resumida de «mejorar-apuntes») ───────────────────────

export function construirCubo(e: Estado, t: number, centro: V3 = [0, 0, 0], lado = 2.4) {
  const c = e.cubo;
  Object.assign(c, { activo: true, centro, lado, opacidad: 1 });
  c.grupos = 8 * tramo(t, 0.04, 0.5, (x) => x);
  c.inferior = tramo(t, 0.5, 0.64, (x) => x);
  c.superior = tramo(t, 0.64, 0.78, (x) => x);
  c.verticales = tramo(t, 0.78, 0.88);
  c.columna = tramo(t, 0.86, 1);
}

export function cuboCompleto(e: Estado, centro: V3 = [0, 0, 0], lado = 2.4, opacidad = 1) {
  Object.assign(e.cubo, {
    activo: true,
    centro,
    lado,
    grupos: 8,
    inferior: 1,
    superior: 1,
    verticales: 1,
    columna: 1,
    opacidad,
  });
}

/** Cota sobre el piso con su rótulo. */
export function cota(e: Estado, desde: V3, hasta: V3, texto: string, k: number) {
  if (k <= 0) return;
  e.cotas.push({ desde, hasta, texto, k });
  e.marcas.push({
    pos: [(desde[0] + hasta[0]) / 2 + 0.14, 0.1, (desde[2] + hasta[2]) / 2],
    texto,
    opacidad: tramo(k, 0.6, 1),
    tipo: 'distancia',
  });
}
