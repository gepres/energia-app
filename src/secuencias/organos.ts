import { ORGANOS } from '../contenido/ejercicios';
import { POS_ORGANOS } from '../escena/cuerpo';
import { type Estado, ref } from '../escena/estado';
import { type V3, campana, clamp, lerp, lerpV, saleAtras, tramo } from '../escena/mate';
import { SERENA, esferaEnManosEn, manoAOrgano, palmasArriba } from '../escena/poses';
import { TOMAS, apagarFlujos, durRespirando, esfera, flujo, pulso, respirar } from './comunes';
import { OPCIONES_INICIALES, type Opciones, type Secuencia, encuadre, fijarPose, posar, puntoMundo, toma } from './motor';

/** Segundos antes de empezar a respirar (la cámara se acerca al pecho). */
const PREVIO_RESPIRAR = 1.2;
const durRespirar = (o: Opciones) => durRespirando(30, PREVIO_RESPIRAR, o);

function datosOrgano(o: Opciones) {
  const org = ORGANOS.find((x) => x.id === o.organo) ?? ORGANOS[4];
  const pts = POS_ORGANOS[org.id];
  // Centro representativo (el promedio, para pulmones y riñones).
  const c = pts.reduce<V3>((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
  return { org, c, cielo: org.polaridad === 'cielo' };
}

/** Punto delante del órgano, a `dist` de la piel, en coordenadas del cuerpo. */
function frenteOrgano(c: V3, dist: number): V3 {
  return [c[0] * 0.6, Math.max(0.95, c[1]), 0.12 + dist];
}

function tomaOrgano(c: V3) {
  return encuadre([0, Math.max(1.0, c[1]) - 0.02, 0.12], 1.15, 0.55, 0.1);
}

/** Esfera de energía sostenida entre las palmas (sigue a las manos dibujadas). */
function esferaEnLasManos(e: Estado, radio: number, color: 'oro' | 'cielo' | 'tierra', mezcla = 0) {
  esfera(e, 0, {
    ref: ref('manos', 0, [0, 0.03, 0.035]),
    pegado: 1,
    radio,
    brillo: 1.2,
    color: 'oro',
    color2: color === 'oro' ? null : color,
    mezcla,
  });
}

export const equilibrarOrganos: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.camara = { ...TOMAS.general };
  },
  pasos: [
    // 1 · 30 respiraciones conscientes (una de muestra, o todas acompañando con el video)
    {
      dur: durRespirar(OPCIONES_INICIALES),
      durCon: durRespirar,
      aplicar: (e, t, o) => {
        const seg = t * durRespirar(o);
        toma(e, TOMAS.pecho, seg, 0, 2.4);
        respirar(e, seg, 30, o, PREVIO_RESPIRAR);
      },
    },
    // 2 · Tomar dos bolsas de energía, unirlas y darles forma
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, TOMAS.manos, t, 0, 0.3);
        e.centros.corazon = (e.centros.corazon ?? 0) * (1 - tramo(t, 0, 0.2));
        posar(e, 0, palmasArriba(0.44, 1.06, 0.34), t, 0, 0.2);
        const aparece = saleAtras(tramo(t, 0.12, 0.3));
        const junta = tramo(t, 0.38, 0.62);
        posar(e, 0, esferaEnManosEn([0, 1.18, 0.36], 0.25), t, 0.36, 0.62);
        if (junta < 1) {
          esfera(e, 0, { ref: ref('manoD', 0, [0, 0.055, 0]), pegado: 1, radio: 0.04 * aparece, brillo: 1.1, color: 'oro' });
          esfera(e, 1, { ref: ref('manoI', 0, [0, 0.055, 0]), pegado: 1, radio: 0.04 * aparece, brillo: 1.1, color: 'oro' });
          if (junta > 0) {
            // Las dos esferas convergen hacia el centro entre las manos.
            e.esferas[0].ref = ref('manoD', 0, [0.08 * junta, 0.055 - 0.02 * junta, 0.03 * junta]);
            e.esferas[1].ref = ref('manoI', 0, [-0.08 * junta, 0.055 - 0.02 * junta, 0.03 * junta]);
          }
        } else {
          e.esferas[1].activa = false;
          const forma = tramo(t, 0.62, 1);
          esferaEnLasManos(e, lerp(0.05, 0.07, forma), 'oro');
          e.esferas[0].estirar = 1 + 0.22 * campana(t, 0.66, 0.9);
          pulso(e, puntoMundo(e, 0, [0, 1.18, 0.36]), clamp((t - 0.62) / 0.2), 0.3, 'oro');
        }
      },
    },
    // 3 · Dirigir hacia el lugar que corresponde y pedir la energía
    {
      dur: 9,
      aplicar: (e, t, o) => {
        const { cielo } = datosOrgano(o);
        const color = cielo ? 'cielo' : 'tierra';
        toma(e, cielo ? encuadre([0, 1.45, 0.2], 1.9, 0.5, 0.0) : encuadre([0, 0.85, 0.25], 1.7, 0.5, 0.3), t, 0, 0.35);
        posar(e, 0, cielo ? esferaEnManosEn([0, 1.66, 0.34], 0.25) : esferaEnManosEn([0, 0.78, 0.4], 0.25), t, 0, 0.3);
        const carga = tramo(t, 0.3, 0.85);
        esferaEnLasManos(e, 0.07, color, carga);
        if (cielo) e.cielo = tramo(t, 0.2, 0.45) * (1 - tramo(t, 0.88, 1));
        else e.tierra = tramo(t, 0.2, 0.45) * (1 - tramo(t, 0.88, 1));
        const fuente: V3 = cielo ? [0, 4.2, 0.4] : [0, 0.02, 0.45];
        flujo(e, 1, [fuente, cielo ? [0, 2.4, 0.38] : [0, 0.3, 0.42], ref('manos', 0, [0, 0.03, 0.035])], {
          cabeza: tramo(t, 0.25, 0.55),
          cola: 0.9,
          color,
          intensidad: 1 - tramo(t, 0.85, 1),
          remolino: 0.06,
          ancho: 1.1,
        });
      },
    },
    // 4 · Llevar la energía al órgano: alejar y acercar
    {
      dur: 9,
      aplicar: (e, t, o) => {
        const { org, c, cielo } = datosOrgano(o);
        apagarFlujos(e);
        e.cielo = 0;
        e.tierra = 0;
        toma(e, tomaOrgano(c), t, 0, 0.3);
        e.figuras[0].rayos = tramo(t, 0, 0.3);
        e.organos[org.id] = tramo(t, 0.15, 0.35) * 0.55;
        // Alejar y acercar dos veces.
        const vaiven = 0.5 - 0.5 * Math.cos(clamp((t - 0.35) / 0.6) * Math.PI * 4);
        const dist = lerp(0.2, 0.38, t < 0.35 ? 0 : vaiven);
        posar(e, 0, esferaEnManosEn(frenteOrgano(c, 0.2), 0.24), t, 0, 0.3);
        if (t >= 0.3) fijarPoseSuave(e, esferaEnManosEn(frenteOrgano(c, dist), 0.24));
        esferaEnLasManos(e, 0.07, cielo ? 'cielo' : 'tierra', 1);
        e.organos[org.id] = Math.max(e.organos[org.id], 0.55 + 0.4 * (1 - vaiven) * tramo(t, 0.35, 0.45));
      },
    },
    // 5 · Con la mano extendida hacer ingresar la energía: TE AMO, SÁNATE
    {
      dur: 9,
      aplicar: (e, t, o) => {
        const { org, c, cielo } = datosOrgano(o);
        const color = cielo ? 'cielo' : 'tierra';
        toma(e, tomaOrgano(c), t, 0, 0.2);
        e.figuras[0].rayos = 1;
        posar(e, 0, manoAOrgano(org.id, 0.17), t, 0.05, 0.3);
        const entra = tramo(t, 0.3, 0.75);
        const palma = puntoMundo(e, 0, [c[0], c[1], 0.12 + 0.17]);
        const dentro = puntoMundo(e, 0, c);
        esfera(e, 0, {
          ref: null,
          pegado: 0,
          pos: lerpV(palma, dentro, entra),
          radio: lerp(0.07, 0.03, entra),
          brillo: 1.2 + entra,
          color: 'oro',
          color2: color,
          mezcla: 1,
          opacidad: 1 - tramo(t, 0.72, 0.85),
        });
        flujo(e, 1, [ref('manoD', 0, [0, 0, -0.02]), dentro], {
          cabeza: tramo(t, 0.3, 0.6),
          cola: 1,
          color,
          intensidad: campana(t, 0.3, 1),
          remolino: 0.03,
          ancho: 0.9,
        });
        e.organos[org.id] = 0.6 + 0.9 * tramo(t, 0.55, 0.85);
        pulso(e, dentro, clamp((t - 0.75) / 0.25), 0.28, color);
      },
    },
    // 6 · Retirar lentamente la mano
    {
      dur: 6,
      aplicar: (e, t, o) => {
        const { org, c } = datosOrgano(o);
        apagarFlujos(e);
        e.esferas[0].activa = false;
        toma(e, encuadre([0, Math.max(1.0, c[1]), 0.15], 1.5, 0.6, 0.1), t, 0, 0.5);
        e.figuras[0].rayos = 1;
        posar(e, 0, manoAOrgano(org.id, 0.45), t, 0, 0.6, 0);
        posar(e, 0, SERENA, t, 0.65, 1);
        e.organos[org.id] = lerp(1.5, 0.9, tramo(t, 0, 1));
      },
    },
    // 7 · Repetir al menos 2 veces
    {
      dur: 9,
      aplicar: (e, t, o) => {
        const { org, c, cielo } = datosOrgano(o);
        const color = cielo ? 'cielo' : 'tierra';
        toma(e, tomaOrgano(c), t, 0, 0.3);
        e.figuras[0].rayos = 1 - tramo(t, 0.85, 1);
        // Segunda vez, en resumen: esfera, órgano, ingreso.
        posar(e, 0, esferaEnManosEn(frenteOrgano(c, 0.24), 0.24), t, 0, 0.18);
        posar(e, 0, manoAOrgano(org.id, 0.17), t, 0.36, 0.5);
        posar(e, 0, SERENA, t, 0.8, 1);
        if (t < 0.5) esferaEnLasManos(e, 0.065 * saleAtras(tramo(t, 0.05, 0.25)), color, 1);
        else {
          const entra = tramo(t, 0.5, 0.7);
          esfera(e, 0, {
            ref: null,
            pegado: 0,
            pos: lerpV(puntoMundo(e, 0, [c[0], c[1], 0.29]), puntoMundo(e, 0, c), entra),
            radio: lerp(0.065, 0.03, entra),
            color: 'oro',
            color2: color,
            mezcla: 1,
            brillo: 1.6,
            opacidad: 1 - tramo(t, 0.68, 0.76),
          });
        }
        e.organos[org.id] = 0.9 + 0.7 * campana(t, 0.62, 0.95);
        pulso(e, puntoMundo(e, 0, c), clamp((t - 0.7) / 0.22), 0.28, color);
        e.hud.contador = { valor: t < 0.7 ? 1 : 2, total: 2, etiqueta: 'veces como mínimo' };
      },
    },
  ],
};

/** Fija la pose sin arco (para movimientos continuos ya suavizados). */
function fijarPoseSuave(e: Estado, p: ReturnType<typeof esferaEnManosEn>) {
  e.figuras[0].pose = p;
}
