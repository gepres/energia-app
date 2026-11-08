import { mezclarPose } from '../escena/cuerpo';
import { type Estado, enPalma, ref } from '../escena/estado';
import { type V3, campana, clamp, entraSaleSeno, lerp, suave, tramo } from '../escena/mate';
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
/** Brillo de la nube mientras se rearma (sigue siendo luminosa). */
const NUBE_TRANQUILA = 0.95;
/** Cierre de los dedos: abiertos al tocar, cerrados al agarrar y del todo abiertos al terminar de bajar. */
const CIERRE = { toca: 0.22, agarra: 0.72, abierta: 0 };

/**
 * Velo de tela: cuelga recogido bajo la nube; mientras baja, su ruedo lo llevan
 * las manos; al soltarlo cae hasta el piso y queda envolviendo el cuerpo.
 */
const TELA = { arriba: 2.06, anchoSuelta: 0.45, fondoSuelta: 0.38, fondoAbierta: 0.42, piso: 0.02 };
/** Opacidad de la tela acumulada después de cada vez. */
const VELO_ACUMULADO = [0.45, 0.62, 0.78];

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

/** Muñeca según el ángulo de la bajada: altura y distancia al centro (a cada lado). */
function alturaMano(theta: number) {
  return 1.415 + 0.535 * Math.cos(theta);
}
function separacionMano(theta: number) {
  return 0.182 + 0.535 * Math.sin(theta);
}

/** Ruedo de la tela mientras las manos lo llevan, según el ángulo de la bajada. */
function ruedoEnManos(theta: number) {
  // Antes de la cruz el ancho es el de las manos; después no se cierra más que el cuerpo.
  const ancho = separacionMano(theta) + 0.04;
  return {
    borde: alturaMano(theta) - 0.03,
    ancho: theta < Math.PI / 2 ? ancho : Math.max(0.37, ancho),
    fondo: lerp(0.15, TELA.fondoAbierta, suave(clamp(theta / 1.6))),
    // Entre las manos, la tela cae un poco más adelante y atrás.
    caida: 0.22 * Math.max(0, Math.sin(theta)),
  };
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

type Ruedo = { borde: number; ancho: number; fondo: number; caida: number };
/** La tela ya caída hasta el piso, envolviendo el cuerpo. */
const RUEDO_EN_EL_PISO: Ruedo = { borde: TELA.piso, ancho: TELA.anchoSuelta, fondo: TELA.fondoSuelta, caida: 0 };

function tela(e: Estado, i: 0 | 1, ruedo: Ruedo, opacidad: number, brillo = 1) {
  const f = e.figuras[0];
  Object.assign(e.telas[i], {
    activa: opacidad > 0.003,
    centro: [f.pos[0], 0, f.pos[2]] as V3,
    arriba: TELA.arriba,
    ...ruedo,
    opacidad,
    brillo,
    color: 'violeta',
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

        // Pose y nube según la fase.
        let theta = THETA_ARRIBA;
        if (fase === 'agarrar') {
          e.figuras[0].pose = manosALaNube(lerp(CIERRE.toca, CIERRE.agarra, s));
          // Al agarrarla, la nube se recoge hacia las manos y destella.
          nube(e, 0.9 + 0.15 * k + 0.45 * Math.sin(Math.PI * k), lerp(NUBE_CIELO.radio, 0.3, s), 0.05 * s);
        } else if (fase === 'bajar') {
          theta = lerp(THETA_ARRIBA, THETA_ABAJO, s);
          // Las manos se van soltando poco a poco hasta quedar del todo abiertas (las palmas giran
          // hacia el piso en la pose).
          e.figuras[0].pose = bajarPorLosCostados(theta, lerp(CIERRE.agarra, CIERRE.abierta, suave(clamp(k / 0.9))));
          // La nube queda más tenue y se rearma mientras el velo baja.
          nube(e, lerp(1.05, NUBE_TRANQUILA, s), lerp(0.3, NUBE_CIELO.radio, s), 0.05 * (1 - s));
        } else if (fase === 'asentar') {
          theta = THETA_ABAJO;
          // Las manos se sueltan y quedan relajadas a los costados.
          e.figuras[0].pose = mezclarPose(bajarPorLosCostados(THETA_ABAJO, CIERRE.abierta), SERENA, s, 0);
          nube(e, NUBE_TRANQUILA);
        } else if (fase === 'subir') {
          // Vuelven a subir por delante hasta la nube, que se enciende de nuevo.
          e.figuras[0].pose = mezclarPose(SERENA, manosALaNube(CIERRE.toca), s, 0.3);
          nube(e, lerp(NUBE_TRANQUILA, 0.9, s) + 0.35 * campana(k, 0.8, 1));
          const toque = tramo(k, 0.8, 1);
          pulsoRef(e, ref('manoD'), toque, 0.14, 'blanco');
          pulsoRef(e, ref('manoI'), toque, 0.14, 'blanco');
        } else {
          fijarPose(e, 0, SERENA);
          nube(e, NUBE_TRANQUILA * (1 - tramo(k, 0, 0.7)));
        }

        // Tela de esta vez: sale de la nube entre las manos, su ruedo baja con ellas
        // y, al soltarla, termina de caer hasta el piso.
        const llego = fase === 'subir' || fase === 'fin';
        if (fase === 'agarrar') {
          // Asoma bajo la nube, recogida entre las manos.
          tela(e, 1, { ...ruedoEnManos(THETA_ARRIBA), borde: TELA.arriba - 0.02 - 0.1 * s }, 0.9 * s);
        } else if (fase === 'bajar') {
          tela(e, 1, ruedoEnManos(theta), 0.9);
        } else if (fase === 'asentar') {
          // Cae sola: rápido al principio y se asienta suave en el piso.
          const r0 = ruedoEnManos(THETA_ABAJO);
          const c = 1 - Math.pow(1 - k, 2.2);
          tela(
            e,
            1,
            {
              borde: lerp(r0.borde, TELA.piso, c),
              ancho: lerp(r0.ancho, TELA.anchoSuelta, c),
              fondo: lerp(r0.fondo, TELA.fondoSuelta, c),
              caida: lerp(r0.caida, 0, c),
            },
            0.9,
          );
        } else if (llego) {
          // Ya en el piso, se funde con la tela acumulada (mientras las manos suben, o al terminar).
          tela(e, 1, RUEDO_EN_EL_PISO, 0.9 * (1 - tramo(k, 0, 0.6)));
        }
        // Tela acumulada de las veces anteriores (y de esta, cuando ya llegó al piso).
        const completas = vez + (llego ? 1 : 0);
        if (completas > 0) {
          const antes = completas > 1 ? VELO_ACUMULADO[completas - 2] : 0;
          const ahora = VELO_ACUMULADO[completas - 1];
          const mezcla = llego ? tramo(k, 0, 0.6) : 1;
          const fin = fase === 'fin' ? lerp(1, 0.8, tramo(k, 0.2, 1)) : 1;
          tela(e, 0, RUEDO_EN_EL_PISO, lerp(antes, ahora, mezcla) * fin, 0.5);
        }

        // Luz en las manos: aparece al agarrar, baja con el velo y se apaga al asentar.
        if (fase === 'agarrar') luzEnManos(e, tramo(k, 0.3, 1));
        // Al abrirse las manos, la luz se suelta hacia el velo.
        else if (fase === 'bajar') luzEnManos(e, lerp(1, 0.35, suave(clamp(k / 0.9))));
        else if (fase === 'asentar') luzEnManos(e, 0.35 * (1 - tramo(k, 0, 0.5)));
        if (fase === 'asentar') pulso(e, puntoMundo(e, 0, [0, 0.02, 0]), tramo(k, 0.55, 1), 0.75, 'violeta');

        // Contador: cuenta cuando el velo llega al piso.
        const hechas = completas + (fase === 'asentar' && k > 0.95 ? 1 : 0);
        e.hud.contador = { valor: Math.min(VECES, hechas), total: VECES, etiqueta: 'veces' };
        if (fase === 'bajar' && vez === 0) e.hud.aviso = 'Bajar por los costados: las palmas giran hacia abajo y se abren';
        if (fase === 'fin') e.hud.aviso = 'Sellado 3 veces: el velo cubre todo el cuerpo';
      },
    },
  ],
};
