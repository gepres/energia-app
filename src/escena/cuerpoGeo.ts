import { BufferGeometry, DynamicDrawUsage, Float32BufferAttribute, Quaternion, SphereGeometry, Vector3 } from 'three';
import { type Esqueleto, PROP, adelantarHombro } from './cuerpo';

/** Dónde gira la piel con la clavícula: de 0 a 1 según |x| y según la altura (y). */
export const PESO_HOMBRO = { x: [0, 0.17], y: [1.05, 1.38] };
import { type V3, lerp } from './mate';

/**
 * Geometrías esculpidas del maniquí (propuesta de diseño revisada con Codex).
 * Todo se genera por perfiles: secciones superelípticas que varían con la
 * altura e interpolación Hermite monótona entre secciones, así las formas son
 * continuas y sin costuras. Medidas en metros del cuerpo erguido.
 */

/** [altura o parámetro, semiancho, profundidad anterior, profundidad posterior]. */
type Fila = readonly [number, number, number, number];

function pasoSuave(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function gauss(x: number, centro: number, ancho: number): number {
  return Math.exp(-(((x - centro) / ancho) ** 2));
}

function potencia(x: number, p: number): number {
  return Math.sign(x) * Math.abs(x) ** p;
}

/** Hermite monótono: tangentes continuas entre secciones, sin rebasar los valores dados. */
function perfil(f: readonly Fila[], y: number, c: 1 | 2 | 3): number {
  let i = 0;
  while (i < f.length - 2 && y > f[i + 1][0]) i++;
  const a = f[i];
  const b = f[i + 1];
  const h = b[0] - a[0];
  const d = (b[c] - a[c]) / h;
  const pendiente = (j: number): number => {
    if (j === 0 || j === f.length - 1) return 0;
    const p = (f[j][c] - f[j - 1][c]) / (f[j][0] - f[j - 1][0]);
    const q = (f[j + 1][c] - f[j][c]) / (f[j + 1][0] - f[j][0]);
    return p * q <= 0 ? 0 : (2 * p * q) / (p + q);
  };
  const limitar = (m: number): number => (d === 0 ? 0 : Math.sign(d) * Math.min(Math.abs(m), 3 * Math.abs(d)));
  const t = Math.max(0, Math.min(1, (y - a[0]) / h));
  // Tramo que llega a un polo (valor 0): cuarto de elipse, para que la punta
  // sea redonda y no un pico (Hermite llegaría con pendiente nula).
  if (a[c] === 0 && i === 0 && b[c] !== 0) return b[c] * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
  if (b[c] === 0 && i + 1 === f.length - 1 && a[c] !== 0) return a[c] * Math.sqrt(Math.max(0, 1 - t * t));
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * a[c] +
    (t3 - 2 * t2 + t) * h * limitar(pendiente(i)) +
    (-2 * t3 + 3 * t2) * b[c] +
    (t3 - t2) * h * limitar(pendiente(i + 1))
  );
}

/** Superficie cerrada con dos polos únicos y anillos sin costura angular duplicada. */
function superficie(filas: number, lados: number, punto: (u: number, a: number) => V3): BufferGeometry {
  const posiciones: number[] = [...punto(0, 0)];
  for (let j = 1; j < filas; j++) {
    // Filas más juntas cerca de los polos: las puntas redondas no quedan facetadas.
    const u = (1 - Math.cos((Math.PI * j) / filas)) / 2;
    for (let k = 0; k < lados; k++) posiciones.push(...punto(u, (k / lados) * Math.PI * 2));
  }
  const ultimo = posiciones.length / 3;
  posiciones.push(...punto(1, 0));
  const indices: number[] = [];
  for (let k = 0; k < lados; k++) {
    const siguiente = (k + 1) % lados;
    indices.push(0, 1 + k, 1 + siguiente);
    for (let j = 0; j < filas - 2; j++) {
      const a = 1 + j * lados + k;
      const b = 1 + j * lados + siguiente;
      indices.push(a, a + lados, b, b, a + lados, b + lados);
    }
    const base = 1 + (filas - 2) * lados;
    indices.push(ultimo, base + siguiente, base + k);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Oclusión suave por vértice, guardada en el color (lineal); el material la aplica a la luz indirecta. */
export function cavidad(g: BufferGeometry, valor: (x: number, y: number, z: number) => number): void {
  const p = g.getAttribute('position');
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const v = Math.max(0.78, Math.min(1, valor(p.getX(i), p.getY(i), p.getZ(i))));
    c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v;
  }
  g.setAttribute('color', new Float32BufferAttribute(c, 3));
}

// ── Torso continuo (pecho, cintura y pelvis en una sola malla) ──────────

/**
 * Cada figura tiene su propio torso: se deforma en CPU cuando cambia la pose
 * (flexión en la cintura, descenso al agacharse y hombros que acompañan al
 * brazo) y se recalculan las normales.
 */
export function crearTorso() {
  const f: readonly Fila[] = [
    // Entrepierna más alta y recogida: queda entre los muslos y no cuelga.
    [0.848, 0, 0, 0],
    [0.872, 0.062, 0.03, 0.052],
    [0.9, 0.122, 0.066, 0.097],
    [0.93, 0.145, 0.079, 0.104],
    [0.97, 0.136, 0.08, 0.091],
    [1.02, 0.11, 0.078, 0.079],
    [1.1, 0.118, 0.083, 0.082],
    [1.2, 0.144, 0.092, 0.085],
    [1.29, 0.162, 0.098, 0.09],
    [1.355, 0.174, 0.091, 0.084],
    [1.405, 0.205, 0.07, 0.064],
    [1.432, 0.184, 0.058, 0.054],
    [1.452, 0.09, 0.045, 0.046],
    [1.468, 0, 0, 0],
  ];

  const geometry = superficie(56, 48, (u, a) => {
    const y = lerp(f[0][0], f[f.length - 1][0], u);
    const s = Math.sin(a);
    const x = perfil(f, y, 1) * potencia(Math.cos(a), 0.92);
    let z = (s >= 0 ? perfil(f, y, 2) : perfil(f, y, 3)) * potencia(s, 0.92);
    const par = gauss(Math.abs(x), 0.071, 0.047);
    if (s >= 0) {
      // Pectorales.
      z += 0.006 * par * gauss(y, 1.295, 0.07) * s * s;
    } else {
      // Omóplatos y glúteos.
      z -= (0.005 * par * gauss(y, 1.33, 0.065) + 0.007 * gauss(Math.abs(x), 0.067, 0.045) * gauss(y, 0.905, 0.055)) * s * s;
    }
    return [x, y, z];
  });

  // Axilas y entrepierna algo más oscuras.
  cavidad(
    geometry,
    (x, y) => 1 - 0.12 * gauss(Math.abs(x), 0.153, 0.03) * gauss(y, 1.35, 0.04) - 0.08 * gauss(x, 0, 0.035) * gauss(y, 0.847, 0.035),
  );

  const position = geometry.getAttribute('position') as Float32BufferAttribute;
  const reposo = Float32Array.from(position.array);
  const pesos = new Float32Array(position.count);
  position.setUsage(DynamicDrawUsage);
  (geometry.getAttribute('normal') as Float32BufferAttribute).setUsage(DynamicDrawUsage);

  // Lo que acompaña al brazo: el borde superior lateral (nacimiento del deltoides).
  for (let i = 0; i < position.count; i++) {
    pesos[i] = pasoSuave(0.11, 0.185, Math.abs(reposo[i * 3])) * pasoSuave(1.32, 1.4, reposo[i * 3 + 1]);
  }
  // Lo que gira con la clavícula cuando el hombro se adelanta: entero en el hombro y cada vez
  // menos hacia el esternón, la columna y las costillas de abajo (sin pliegues donde termina).
  const pesosHombro = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    pesosHombro[i] = pasoSuave(PESO_HOMBRO.x[0], PESO_HOMBRO.x[1], Math.abs(reposo[i * 3])) * pasoSuave(PESO_HOMBRO.y[0], PESO_HOMBRO.y[1], reposo[i * 3 + 1]);
  }

  const v = new Vector3();
  const direccion = new Vector3();
  const base = new Vector3();
  const qD = new Quaternion();
  const qI = new Quaternion();
  const q = new Quaternion();
  const identidad = new Quaternion();
  let claveAnterior = '';

  return {
    geometry,
    deformar(e: Esqueleto): void {
      const clave = [...e.pelvis, e.inclinar, e.girar, e.adelantarD, e.adelantarI, ...e.codoD, ...e.codoI].join(',');
      if (clave === claveAnterior) return;
      claveAnterior = clave;

      const ci = Math.cos(e.inclinar);
      const si = Math.sin(e.inclinar);
      // Brazo en reposo según la inclinación y el giro del torso.
      base.set(-si * Math.sin(e.girar), -ci, -si * Math.cos(e.girar));
      direccion.set(e.codoD[0] - e.hombroD[0], e.codoD[1] - e.hombroD[1], e.codoD[2] - e.hombroD[2]).normalize();
      qD.setFromUnitVectors(base, direccion);
      direccion.set(e.codoI[0] - e.hombroI[0], e.codoI[1] - e.hombroI[1], e.codoI[2] - e.hombroI[2]).normalize();
      qI.setFromUnitVectors(base, direccion);

      for (let i = 0; i < position.count; i++) {
        let x = reposo[i * 3];
        const y = reposo[i * 3 + 1];
        let z = reposo[i * 3 + 2];
        const adelanto = x < 0 ? e.adelantarD : e.adelantarI;
        if (adelanto && pesosHombro[i] > 0) {
          const d = adelantarHombro([x, y, z], x < 0 ? -1 : 1, adelanto * pesosHombro[i]);
          x = d[0];
          z = d[2];
        }
        const a = e.inclinar * pasoSuave(PROP.pivoteY - 0.04, PROP.pivoteY + 0.04, y);
        const c = Math.cos(a);
        const s = Math.sin(a);
        const dy = y - PROP.pivoteY;
        // e.pivote ya trae el descenso y el retroceso de `agachar`.
        v.set(x + e.pivote[0], e.pivote[1] + c * dy - s * z, e.pivote[2] + s * dy + c * z);
        if (e.girar) {
          // El giro del torso, alrededor de la vertical de la cintura (con la misma mezcla suave).
          const g = e.girar * pasoSuave(PROP.pivoteY - 0.04, PROP.pivoteY + 0.04, y);
          const cg = Math.cos(g);
          const sg = Math.sin(g);
          const gx = v.x - e.pivote[0];
          const gz = v.z - e.pivote[2];
          v.x = e.pivote[0] + gx * cg + gz * sg;
          v.z = e.pivote[2] - gx * sg + gz * cg;
        }
        if (pesos[i] > 0) {
          const h = x < 0 ? e.hombroD : e.hombroI;
          // Solo acompaña en parte: girarlo entero con el brazo levantado arruga el hombro.
          q.slerpQuaternions(identidad, x < 0 ? qD : qI, pesos[i] * 0.6);
          v.x -= h[0];
          v.y -= h[1];
          v.z -= h[2];
          v.applyQuaternion(q);
          v.x += h[0];
          v.y += h[1];
          v.z += h[2];
        }
        position.setXYZ(i, v.x, v.y, v.z);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    },
  };
}

// ── Extremidades, cabeza, cuello y pies (compartidas) ───────────────────

/** Segmento a lo largo de +Y con perfil de radio por tramo (t = 0 en la raíz, 1 en la otra articulación). */
function miembro(largo: number, f: readonly Fila[], plano = 1, lados = 24): BufferGeometry {
  // Más lados = la línea donde la pieza entra en la vecina se ve lisa y no dentada.
  const g = superficie(28, lados, (u, a) => {
    const t = lerp(f[0][0], f[f.length - 1][0], u);
    const r = perfil(f, t, 1);
    return [r * Math.cos(a), t * largo, r * Math.sin(a) * plano];
  });
  cavidad(g, (_x, y) => 1 - 0.035 * (gauss(y, 0, 0.018) + gauss(y, largo, 0.018)));
  return g;
}

/** Cabeza de maniquí: mandíbula más estrecha, frente plana, nariz y mentón insinuados en la misma superficie. */
function crearCabeza(): BufferGeometry {
  const f: readonly Fila[] = [
    [-0.128, 0, 0, 0],
    [-0.112, 0.034, 0.034, 0.038],
    [-0.09, 0.058, 0.06, 0.061],
    [-0.065, 0.07, 0.075, 0.078],
    [-0.025, 0.082, 0.085, 0.091],
    [0.02, 0.086, 0.084, 0.095],
    [0.065, 0.081, 0.078, 0.089],
    [0.105, 0.055, 0.05, 0.061],
    [0.125, 0, 0, 0],
  ];
  return superficie(36, 32, (u, a) => {
    const y = lerp(-0.128, 0.125, u);
    const s = Math.sin(a);
    const x = perfil(f, y, 1) * potencia(Math.cos(a), 0.9);
    let z = (s > 0 ? perfil(f, y, 2) : perfil(f, y, 3)) * potencia(s, s > 0 ? 0.6 : 1);
    if (s > 0) {
      z += s ** 6 * (0.013 * gauss(x, 0, 0.014) * gauss(y, -0.02, 0.027) + 0.008 * gauss(x, 0, 0.032) * gauss(y, -0.095, 0.018));
    }
    return [x, y, z];
  });
}

/** Cuello ahusado: base ancha escondida en el trapecio y extremo superior dentro de la cabeza. */
function crearCuello(): BufferGeometry {
  const f: readonly Fila[] = [
    [-0.053, 0, 0, 0],
    [-0.033, 0.057, 0.044, 0.044],
    [-0.006, 0.039, 0.032, 0.032],
    [0.03, 0.031, 0.03, 0.03],
    [0.06, 0.03, 0.028, 0.028],
    [0.078, 0, 0, 0],
  ];
  return superficie(22, 24, (u, a) => {
    const y = lerp(-0.053, 0.078, u);
    return [perfil(f, y, 1) * Math.cos(a), y, perfil(f, y, 2) * Math.sin(a)];
  });
}

/** Pie en coordenadas de suelo (origen bajo el tobillo): talón, empeine, arco y puntera. */
function crearPie(): BufferGeometry {
  // [Z, semiancho, cota superior, cota inferior].
  const f: readonly Fila[] = [
    [-0.07, 0, 0.027, 0.027],
    [-0.052, 0.032, 0.06, 0.006],
    [-0.012, 0.038, 0.1, 0.005],
    [0.035, 0.035, 0.084, 0.018],
    [0.09, 0.047, 0.06, 0.009],
    [0.135, 0.051, 0.048, 0.005],
    [0.168, 0.038, 0.037, 0.007],
    [0.19, 0, 0.021, 0.021],
  ];
  return superficie(34, 24, (u, a) => {
    const z = lerp(-0.07, 0.19, u);
    const arriba = perfil(f, z, 2);
    const abajo = perfil(f, z, 3);
    return [perfil(f, z, 1) * Math.cos(a), (arriba + abajo) / 2 - ((arriba - abajo) / 2) * potencia(Math.sin(a), 0.7), z];
  });
}

export function crearGeometrias() {
  // Cabeza a ~22,8 × 15,5 cm (proporción de maniquí de diseño); la coronilla queda donde estaba.
  const cabeza = crearCabeza();
  cabeza.scale(0.9, 0.9, 0.96);
  cabeza.translate(0, 0.0125, 0);
  const g = {
    cabeza,
    cuello: crearCuello(),
    articulacion: new SphereGeometry(1, 16, 12),
    pie: crearPie(),
    // [t, radio]: deltoides, bíceps y codo.
    brazo: miembro(
      PROP.brazo,
      [
        [-0.12, 0, 0, 0],
        [-0.05, 0.035, 0, 0],
        [0, 0.046, 0, 0],
        [0.13, 0.05, 0, 0],
        [0.38, 0.046, 0, 0],
        [0.72, 0.038, 0, 0],
        [1, 0.033, 0, 0],
        [1.1, 0, 0, 0],
      ],
      1.04,
    ),
    antebrazo: miembro(
      PROP.antebrazo,
      [
        [-0.11, 0, 0, 0],
        [0, 0.033, 0, 0],
        [0.24, 0.038, 0, 0],
        [0.52, 0.032, 0, 0],
        [0.82, 0.025, 0, 0],
        [1, 0.022, 0, 0],
        [1.08, 0, 0, 0],
      ],
      0.94,
    ),
    muslo: miembro(
      PROP.muslo,
      [
        [-0.12, 0, 0, 0],
        [0, 0.066, 0, 0],
        [0.21, 0.076, 0, 0],
        [0.48, 0.071, 0, 0],
        [0.78, 0.055, 0, 0],
        [1, 0.044, 0, 0],
        [1.09, 0, 0, 0],
      ],
      1.04,
      32,
    ),
    pierna: miembro(
      PROP.pierna,
      [
        [-0.09, 0, 0, 0],
        [0, 0.041, 0, 0],
        [0.28, 0.052, 0, 0],
        [0.47, 0.049, 0, 0],
        [0.72, 0.033, 0, 0],
        [1, 0.027, 0, 0],
        [1.07, 0, 0, 0],
      ],
      1.08,
    ),
  };
  for (const geo of Object.values(g)) if (!geo.hasAttribute('color')) cavidad(geo, () => 1);
  return g;
}
