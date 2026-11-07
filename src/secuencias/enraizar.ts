import { ref } from '../escena/estado';
import { type V3, campana, clamp, lerp, saleAtras, tramo } from '../escena/mate';
import { SERENA, TOCAR_PISO, esferaEnManosEn } from '../escena/poses';
import { TOMAS, apagarFlujos, entrePalmas, esfera, flujo, pulso } from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, toma } from './motor';

const EN_MANOS: V3 = [0, 1.12, 0.34];

export const enraizar: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · Hacer una esfera, cargar − y +
    {
      dur: 11,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.25, 0.2], 2.4, 0.42, 0.1), t, 0, 0.3);
        posar(e, 0, esferaEnManosEn(EN_MANOS, 0.25), t, 0, 0.18);
        const tierra = tramo(t, 0.22, 0.52);
        const cielo = tramo(t, 0.56, 0.86);
        esfera(e, 0, {
          ref: ref('manos', 0, [0, 0.03, 0.035]),
          pegado: 1,
          radio: 0.068 * saleAtras(tramo(t, 0.08, 0.24)),
          brillo: 1.1 + 0.4 * cielo,
          color: tierra > 0 ? 'tierra' : 'oro',
          color2: 'cielo',
          mezcla: cielo * 0.55,
        });
        e.tierra = campana(t, 0.18, 0.56) * 0.9;
        e.cielo = campana(t, 0.52, 0.9);
        flujo(e, 1, [[0, 0.02, 0.45], [0, 0.5, 0.42], ref('manos', 0, [0, 0.0, 0.035])], {
          cabeza: tramo(t, 0.2, 0.4),
          cola: 0.9,
          color: 'tierra',
          intensidad: campana(t, 0.2, 0.56),
          remolino: 0.05,
          ancho: 1.1,
        });
        flujo(e, 2, [[0, 4.2, 0.35], [0, 2.3, 0.36], ref('manos', 0, [0, 0.06, 0.035])], {
          cabeza: tramo(t, 0.55, 0.75),
          cola: 0.9,
          color: 'cielo',
          intensidad: campana(t, 0.55, 0.9),
          remolino: 0.05,
          ancho: 1.1,
        });
        e.hud.aviso = t > 0.22 && t < 0.54 ? 'Carga − (tierra)' : t >= 0.56 && t < 0.9 ? 'Carga + (cielo)' : null;
      },
    },
    // 2 · Hacer un agujero en la esfera
    {
      dur: 7,
      aplicar: (e, t) => {
        apagarFlujos(e);
        e.tierra = 0;
        e.cielo = 0;
        toma(e, encuadre([0, 1.12, 0.3], 0.95, 0.75, -0.22), t, 0, 0.35);
        const s = e.esferas[0];
        s.agujero = tramo(t, 0.25, 0.7);
        s.radio = 0.075;
        s.brillo = 1.4;
        pulso(e, entrePalmas(e, 0), clamp((t - 0.62) / 0.3), 0.25, 'oro');
      },
    },
    // 3 · Conectar desde la pelvis al piso (tocar el piso)
    {
      dur: 11,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.62, 0.2], 1.9, 1.1, 0.16), t, 0, 0.4);
        const inicio = entrePalmas(e, 0);
        posar(e, 0, TOCAR_PISO, t, 0.05, 0.42);
        const s = e.esferas[0];
        s.ref = ref('genital', 0, [0, -0.02, 0.07]);
        s.pos = inicio;
        s.pegado = tramo(t, 0.0, 0.38);
        s.radio = lerp(0.075, 0.06, tramo(t, 0, 0.4));
        flujo(e, 0, [ref('genital', 0, [0, -0.07, 0.07]), [0, 0.12, 0.12], [0, 0.0, 0.1]], {
          cabeza: tramo(t, 0.42, 0.62),
          cola: 1,
          color: 'tierra',
          intensidad: 1,
          remolino: 0.035,
          ancho: 1.3,
        });
        e.tierra = tramo(t, 0.55, 0.75) * 0.9;
        pulso(e, [0, 0.02, 0.33], clamp((t - 0.4) / 0.3), 0.5, 'tierra');
        pulso(e, [0, 0.02, 0.1], clamp((t - 0.62) / 0.35), 0.9, 'tierra');
      },
    },
    // 4 · SÁNATE, CONÉCTATE HASTA SANAR
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 0.75, 0.2], 2.2, 0.75, 0.16), t, 0, 0.4);
        e.tierra = 0.9 - 0.5 * tramo(t, 0.7, 1);
        [0.12, 0.36, 0.6].forEach((a) => pulso(e, [0, 0.02, 0.1], clamp((t - a) / 0.3), 1.1, 'tierra'));
        e.centros.genital = 0.6 + 0.4 * campana(t, 0.1, 0.7);
        const s = e.esferas[0];
        s.radio *= 1 - tramo(t, 0.72, 0.9);
        if (t > 0.9) s.activa = false;
        e.flujos[0].intensidad = 1 - tramo(t, 0.7, 0.85);
        posar(e, 0, SERENA, t, 0.74, 1);
      },
    },
  ],
};
