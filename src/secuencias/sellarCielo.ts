import { mezclarPose } from '../escena/cuerpo';
import { type Estado, enPalma, ref } from '../escena/estado';
import { type V3, campana, clamp, entraSaleSeno, lerp, tramo } from '../escena/mate';
import { NUBE_CIELO, SERENA, THETA_ABAJO, bajarPorLosCostados, manosALaNube } from '../escena/poses';
import { TOMAS, esfera, pulso, pulsoRef } from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';

/**
 * «Sellar desde el cielo», tal como lo describió el taller: las dos manos
 * estiradas hacia arriba tocan una nube luminosa de energía; se la agarra y,
 * bajando los brazos abiertos por los costados, la energía cubre el cuerpo
 * como un velo. Tres veces; al final las manos quedan sueltas a los costados.
 */

const VECES = 3;
/** Tiempos de cada vez (s): agarrar la nube, bajar abriendo, asentar el velo y volver a subir. */
const SEG = { agarrar: 1.4, bajar: 5.2, asentar: 1.6, subir: 2.8 };
const SEG_VEZ = SEG.agarrar + SEG.bajar + SEG.asentar;
/** Entre una vez y la siguiente las manos vuelven a subir a la nube. */
const SEG_CICLO = SEG_VEZ + SEG.subir;
const SEG_FIN = 3.5;
const DUR_SELLAR = VECES * SEG_VEZ + (VECES - 1) * SEG.subir + SEG_FIN;

const THETA_ARRIBA = -0.04;
/** Cierre de los dedos: abiertos al tocar, cerrados al agarrar, sosteniendo al bajar. */
const CIERRE = { toca: 0.22, agarra: 0.72, sostiene: 0.6 };

/** Velo: un aura alrededor del cuerpo que cae desde la nube hasta el piso. */
const VELO = { radio: 0.66, alto: 2.35 };
/** Brillo del velo acumulado después de cada vez. */
const VELO_ACUMULADO = [0.32, 0.46, 0.6];

// Del piso a la nube completa (≈ 2,45 m), con aire para los brazos en cruz.
const ENCUADRE = encuadre([0, 1.26, 0.1], 2.85, 0.45, 0.14);

type Fase = 'agarrar' | 'bajar' | 'asentar' | 'subir' | 'fin';

/** En qué vez (0–2) y en qué fase está el gesto a los `seg` segundos del paso 2. */
export function faseSellado(seg: number): { vez: number; fase: Fase; k: number } {
  const vez = Math.min(VECES - 1, Math.floor(Math.max(0, seg) / SEG_CICLO));
  let x = Math.max(0, seg) - vez * SEG_CICLO;
  const tramos: [Fase, number][] = [
    ['agarrar', SEG.agarrar],
    ['bajar', SEG.bajar],
    ['asentar', SEG.asentar],
  ];
  if (vez < VECES - 1) tramos.push(['subir', SEG.subir]);
  for (const [fase, d] of tramos) {
    if (x < d) return { vez, fase, k: x / d };
    x -= d;
  }
  return { vez, fase: 'fin', k: clamp(x / SEG_FIN) };
}

/** Altura (y) del borde del velo según la mano que lo baja. */
function alturaMano(theta: number) {
  return 1.415 + 0.535 * Math.cos(theta);
}

function nube(e: Estado, intensidad: number, radio = NUBE_CIELO.radio, bajar = 0) {
  const c = puntoMundo(e, 0, NUBE_CIELO.centro);
  Object.assign(e.nube, {
    activa: intensidad > 0.003,
    centro: [c[0], c[1] - bajar, c[2]] as V3,
    radio,
    intensidad,
    color: 'violeta',
    color2: 'blanco',
  });
}

function velo(e: Estado, i: 0 | 1, cobertura: number, opacidad: number, banda = -1) {
  const f = e.figuras[0];
  Object.assign(e.mantos[i], {
    activo: opacidad > 0.003 && cobertura > 0.001,
    centro: [f.pos[0], 0, f.pos[2]] as V3,
    radio: VELO.radio,
    alto: VELO.alto,
    desdeArriba: true,
    cobertura: clamp(cobertura),
    banda,
    color: 'violeta',
    opacidad,
    lineas: 0.3,
  });
}

/** Luz que llevan las manos al bajar el velo (en el hueco de cada palma). */
function luzEnManos(e: Estado, k: number) {
  for (const [i, ancla] of [
    [1, 'manoD'],
    [2, 'manoI'],
  ] as const) {
    esfera(e, i, {
      activa: k > 0.01,
      ref: enPalma(ancla, 0.012),
      pegado: 1,
      radio: 0.024 * k,
      brillo: 1.4,
      color: 'blanco',
      color2: 'violeta',
      mezcla: 0.45,
      opacidad: 1,
    });
  }
}

export const sellarCielo: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Las dos manos estiradas hacia arriba, tocando la nube luminosa
    {
      dur: 8,
      aplicar: (e, t) => {
        toma(e, ENCUADRE, t, 0, 0.4);
        // La nube aparece y se enciende más cuando las manos la tocan.
        nube(e, 0.9 * tramo(t, 0.05, 0.45) + 0.4 * campana(t, 0.64, 1));
        // Suben por delante (arco hacia el frente) hasta quedar estiradas arriba.
        posar(e, 0, manosALaNube(CIERRE.toca), t, 0.15, 0.68, 0.3);
        const toque = tramo(t, 0.64, 0.92);
        pulsoRef(e, ref('manoD'), toque, 0.14, 'blanco');
        pulsoRef(e, ref('manoI'), toque, 0.14, 'blanco');
        e.hud.aviso = t > 0.3 && t < 0.97 ? 'Las dos manos estiradas hacia arriba, tocando la nube' : null;
      },
    },
    // 2 · Agarrar la nube y bajar el velo abriendo por los costados · 3 veces
    {
      dur: DUR_SELLAR,
      aplicar: (e, t) => {
        toma(e, ENCUADRE, t, 0, 0.02);
        const seg = t * DUR_SELLAR;
        const { vez, fase, k } = faseSellado(seg);
        const s = entraSaleSeno(k);
        const bajada = alturaMano(THETA_ABAJO);

        // Pose y nube según la fase.
        let theta = THETA_ARRIBA;
        if (fase === 'agarrar') {
          e.figuras[0].pose = manosALaNube(lerp(CIERRE.toca, CIERRE.agarra, s));
          // Al agarrarla, la nube se recoge hacia las manos y destella.
          nube(e, 0.9 + 0.45 * Math.sin(Math.PI * k), lerp(NUBE_CIELO.radio, 0.3, s), 0.05 * s);
        } else if (fase === 'bajar') {
          theta = lerp(THETA_ARRIBA, THETA_ABAJO, s);
          e.figuras[0].pose = bajarPorLosCostados(theta, lerp(CIERRE.agarra, CIERRE.sostiene, s));
          // La nube queda más tenue y se rearma mientras el velo baja.
          nube(e, lerp(0.9, 0.42, s), lerp(0.3, NUBE_CIELO.radio, s), 0.05 * (1 - s));
        } else if (fase === 'asentar') {
          theta = THETA_ABAJO;
          // Las manos se sueltan y quedan relajadas a los costados.
          e.figuras[0].pose = mezclarPose(bajarPorLosCostados(THETA_ABAJO, CIERRE.sostiene), SERENA, s, 0);
          nube(e, 0.42);
        } else if (fase === 'subir') {
          // Vuelven a subir por delante hasta la nube, que se enciende de nuevo.
          e.figuras[0].pose = mezclarPose(SERENA, manosALaNube(CIERRE.toca), s, 0.3);
          nube(e, lerp(0.42, 0.9, s) + 0.35 * campana(k, 0.8, 1));
          const toque = tramo(k, 0.8, 1);
          pulsoRef(e, ref('manoD'), toque, 0.14, 'blanco');
          pulsoRef(e, ref('manoI'), toque, 0.14, 'blanco');
        } else {
          fijarPose(e, 0, SERENA);
          nube(e, 0.42 * (1 - tramo(k, 0, 0.7)));
        }

        // Velo de esta vez: su borde baja con las manos y después termina de caer hasta el piso.
        let borde = -1;
        if (fase === 'bajar') borde = alturaMano(theta) - 0.04;
        else if (fase === 'asentar') borde = lerp(bajada - 0.04, 0, entraSaleSeno(k));
        const llego = fase === 'subir' || fase === 'fin';
        if (borde >= 0) {
          velo(e, 1, 1 - borde / VELO.alto, 0.9, borde / VELO.alto);
        } else if (llego) {
          // Ya en el piso, se funde con el velo acumulado (mientras las manos suben, o al terminar).
          velo(e, 1, 1, 0.9 * (1 - tramo(k, 0, 0.6)));
        }
        // Velo acumulado de las veces anteriores (y de esta, cuando ya llegó al piso).
        const completas = vez + (llego ? 1 : 0);
        if (completas > 0) {
          const antes = completas > 1 ? VELO_ACUMULADO[completas - 2] : 0;
          const ahora = VELO_ACUMULADO[completas - 1];
          const mezcla = llego ? tramo(k, 0, 0.6) : 1;
          const fin = fase === 'fin' ? lerp(1, 0.75, tramo(k, 0.2, 1)) : 1;
          velo(e, 0, 1, lerp(antes, ahora, mezcla) * fin);
        }

        // Luz en las manos: aparece al agarrar, baja con el velo y se apaga al asentar.
        if (fase === 'agarrar') luzEnManos(e, tramo(k, 0.3, 1));
        else if (fase === 'bajar') luzEnManos(e, 1);
        else if (fase === 'asentar') luzEnManos(e, 1 - tramo(k, 0, 0.5));
        if (fase === 'asentar') pulso(e, puntoMundo(e, 0, [0, 0.02, 0]), tramo(k, 0.55, 1), 0.75, 'violeta');

        // Contador: cuenta cuando el velo llega al piso.
        const hechas = completas + (fase === 'asentar' && k > 0.95 ? 1 : 0);
        e.hud.contador = { valor: Math.min(VECES, hechas), total: VECES, etiqueta: 'veces' };
        if (fase === 'bajar' && vez === 0) e.hud.aviso = 'Bajar los brazos abriendo por los costados: el velo cubre el cuerpo';
        if (fase === 'fin') e.hud.aviso = 'Sellado 3 veces: el velo cubre todo el cuerpo';
      },
    },
  ],
};
