import { ref } from '../escena/estado';
import { type V3, campana, clamp, lerp, suave, tramo } from '../escena/mate';
import { SERENA, TOMAR_BARRA_IZQUIERDA, atraerCampo, brazoExtendidoD, sanar } from '../escena/poses';
import { apagarFlujos, construirCubo, esfera, flujo } from './comunes';
import { type Secuencia, encuadre, fijarPose, posar, toma } from './motor';

const LADO = 2.4;
const SANADOR: V3 = [0, 0, -0.85];
/** Barras frente a quien sana (mira al norte, +Z; su izquierda es +X). */
const BARRA_IZQ: V3 = [SANADOR[0] + 0.2, 0, SANADOR[2] + 0.5];
const BARRA_DER: V3 = [SANADOR[0] - 0.2, 0, SANADOR[2] + 0.5];
const GRADOS = Math.PI / 180;

/** Ángulo para mirar la esquina del grupo g (giro horario visto desde arriba). */
const anguloGrupo = (g: number) => (45 - 90 * g) * GRADOS;

export const sanarOtraPersona: Secuencia = {
  inicial: (e) => {
    fijarPose(e, 0, SERENA);
    e.figuras[0].rotY = anguloGrupo(0);
    e.camara = encuadre([0, 1.15, 0], 3.9, 0.55, 0.32, 36);
    e.marcas.push({ pos: [0, 0.03, LADO / 2 + 0.35], texto: 'N', opacidad: 1, tipo: 'brujula' });
  },
  pasos: [
    // 1 · Hacer cubo (resumen de la construcción de 14 pasos)
    {
      dur: 14,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.15, 0], 3.9, 0.55, 0.32, 36), t, 0, 0.2);
        construirCubo(e, t, [0, 0, 0], LADO);
        const u = e.cubo.grupos;
        const g = Math.min(7, Math.floor(u));
        const f = u - g;
        const giro = suave(clamp((f - 0.72) / 0.28));
        const yo = e.figuras[0];
        yo.agilidad = 6;
        if (t < 0.5) yo.rotY = lerp(anguloGrupo(g), anguloGrupo(g + 1), g < 7 ? giro : 0);
        else yo.rotY = lerp(anguloGrupo(7), -4 * Math.PI, tramo(t, 0.5, 0.62));
        // El brazo derecho señala cada grupo: abajo los cuatro primeros, arriba los otros.
        const arriba = g >= 4;
        posar(e, 0, brazoExtendidoD([-0.05, arriba ? 0.75 : -0.55, 1]), t, 0.02, 0.08);
        if (t > 0.08 && t < 0.5) e.figuras[0].pose = brazoExtendidoD([-0.05, lerp(-0.55, 0.75, tramo(u, 3.8, 4.1)), 1]);
        posar(e, 0, SERENA, t, 0.5, 0.6);
        e.marcas.push({
          pos: [0, 2.75, 0],
          texto: t < 0.5 ? `Esquina ${g < 4 ? 'B' : 'T'}${(g % 4) + 1}` : t < 0.88 ? 'Cuadrados y verticales' : 'Columna central',
          opacidad: tramo(t, 0.04, 0.1) * (1 - tramo(t, 0.94, 1)),
          tipo: 'nombre',
        });
      },
    },
    // 2 · Colocar a la persona en la columna orientada al N
    {
      dur: 7,
      aplicar: (e, t) => {
        construirCubo(e, 1, [0, 0, 0], LADO);
        toma(e, encuadre([0, 1.0, -0.35], 2.7, 0.75, 0.2), t, 0, 0.45);
        const yo = e.figuras[0];
        yo.agilidad = 40;
        yo.opacidad = 1 - tramo(t, 0, 0.18) + tramo(t, 0.3, 0.5);
        if (t > 0.2) yo.pos = [...SANADOR];
        const otro = e.figuras[1];
        Object.assign(otro, { activa: t > 0.22, tono: 'otro', pos: [0, 0, 0], rotY: 0, opacidad: tramo(t, 0.22, 0.6) });
        fijarPose(e, 1, SERENA);
        e.marcas.push({ pos: [0, 1.95, 0], texto: 'La persona mira al norte', opacidad: campana(t, 0.4, 1), tipo: 'nombre' });
      },
    },
    // 3 · Cierras tu campo energético (confirmado: atraer la energía esparcida con la mano)
    {
      dur: 10,
      aplicar: (e, t) => {
        toma(e, encuadre([0, 1.05, -0.8], 2.8, -1.35, 0.18), t, 0, 0.35);
        e.figuras[0].opacidad = 1;
        e.figuras[0].agilidad = 9;
        // Tres veces: la mano sale, «agarra» el campo y lo trae hacia ti.
        const DIRS: V3[] = [
          [-0.9, 0.15, 0.45],
          [-0.35, 0.35, 0.95],
          [-0.95, -0.25, -0.1],
        ];
        const k = clamp((t - 0.08) / 0.8);
        const n = Math.min(2, Math.floor(k * 3));
        const f = k * 3 - n;
        const ida = f < 0.4 ? suave(f / 0.4) : 1;
        const vuelta = f < 0.4 ? 0 : suave((f - 0.4) / 0.6);
        if (t < 0.12) posar(e, 0, atraerCampo(DIRS[0], 0.6), t, 0, 0.12);
        else if (k < 1) e.figuras[0].pose = atraerCampo(DIRS[n], ida < 1 ? 1 - ida : vuelta);
        posar(e, 0, SERENA, t, 0.9, 1);
        // El campo, esparcido al principio, se acerca y se condensa con cada tirón.
        const atraido = (n + (f < 0.4 ? 0 : vuelta)) / 3;
        const total = k >= 1 ? 1 : atraido;
        Object.assign(e.mantos[1], {
          activo: true,
          centro: [SANADOR[0], 0, SANADOR[2]] as V3,
          radio: lerp(1.15, 0.52, total),
          alto: lerp(2.5, 1.95, total),
          desdeArriba: true,
          cobertura: 1,
          banda: -1,
          color: 'violeta',
          opacidad: lerp(0.35, 0.9, total) * (1 - 0.6 * tramo(t, 0.92, 1)),
          lineas: lerp(0.15, 0.6, total),
        });
        // Energía que vuelve a la mano en cada tirón.
        flujo(e, 2, [ref('manoD', 0, [-0.35, 0.05, 0.2]), ref('manoD', 0, [-0.15, 0.02, 0.08]), ref('manoD', 0)], {
          cabeza: 1,
          cola: 1,
          color: 'violeta',
          intensidad: t > 0.08 && k < 1 && f >= 0.4 ? 0.9 : 0,
          remolino: 0.06,
          ancho: 1.2,
        });
        e.hud.aviso = k > 0 && k < 1 ? 'Atraer la energía esparcida, como agarrando tu campo' : null;
      },
    },
    // 4 · Tomar energía de la columna izquierda y pasar a la mano derecha
    {
      dur: 9,
      aplicar: (e, t) => {
        toma(e, encuadre([0.1, 1.15, -0.5], 2.3, 1.2, 0.2), t, 0, 0.3);
        posar(e, 0, TOMAR_BARRA_IZQUIERDA, t, 0.15, 0.4);
        // Dos barras verticales, del tamaño del cuerpo, donde quedan las manos estiradas al frente.
        Object.assign(e.barras, {
          activa: true,
          izq: [...BARRA_IZQ],
          der: [...BARRA_DER],
          alto: 1.75,
          opacidad: tramo(t, 0, 0.2),
          resalte: tramo(t, 0.25, 0.45),
        });
        e.marcas.push(
          { pos: [BARRA_IZQ[0] + 0.05, 1.9, BARRA_IZQ[2]], texto: 'columna izquierda', opacidad: campana(t, 0.1, 1), tipo: 'nombre' },
          { pos: [BARRA_DER[0] - 0.05, 1.9, BARRA_DER[2]], texto: 'columna derecha', opacidad: 0.6 * campana(t, 0.1, 0.6), tipo: 'nombre' },
        );
        flujo(e, 0, [[BARRA_IZQ[0], 1.62, BARRA_IZQ[2]], [BARRA_IZQ[0], 1.42, BARRA_IZQ[2]], ref('manoI', 0)], {
          cabeza: tramo(t, 0.25, 0.5),
          cola: 0.9,
          color: 'jade',
          intensidad: 1,
          remolino: 0.04,
          ancho: 1.1,
        });
        flujo(e, 1, [ref('manoI', 0), ref('corazon', 0, [0, 0.02, 0.04]), ref('manoD', 0)], {
          cabeza: tramo(t, 0.5, 0.8),
          cola: 0.8,
          color: 'jade',
          intensidad: tramo(t, 0.5, 0.6),
          remolino: 0.03,
          ancho: 1,
        });
        esfera(e, 0, { ref: ref('manoD', 0, [0, 0.05, 0]), pegado: 1, radio: 0.04 * tramo(t, 0.72, 0.9), color: 'jade', brillo: 1.3 });
      },
    },
    // 5 · Mano izquierda a la tierra; con la derecha pasar energía o peinar
    {
      dur: 14,
      aplicar: (e, t) => {
        apagarFlujos(e);
        e.barras.resalte = 1 - tramo(t, 0, 0.2);
        e.barras.opacidad = lerp(1, 0.55, tramo(t, 0, 0.3));
        toma(e, encuadre([0, 1.1, -0.42], 2.4, -1.25, 0.2), t, 0, 0.3);
        posar(e, 0, sanar(1.3, 0.48), t, 0, 0.15);
        // La mano izquierda queda conectada a la tierra.
        flujo(e, 0, [ref('manoI', 0), [SANADOR[0] + 0.42, 0.01, SANADOR[2] + 0.12]], {
          cabeza: tramo(t, 0.08, 0.25),
          cola: 1,
          color: 'tierra',
          intensidad: 0.8,
          remolino: 0.02,
          ancho: 0.9,
        });
        e.tierra = 0.35 * tramo(t, 0.1, 0.25);
        const s = e.esferas[0];
        Object.assign(s, { activa: true, ref: ref('manoD', 0, [0, 0, 0.04]), pegado: 1, radio: 0.035, color: 'jade', brillo: 1.2, opacidad: 1 });
        if (t < 0.5) {
          // Pasar energía hacia la espalda de la persona.
          flujo(e, 1, [ref('manoD', 0, [0, 0, 0.03]), ref('omoplatos', 1, [0, 0, -0.02])], {
            cabeza: tramo(t, 0.15, 0.32),
            cola: 1,
            color: 'jade',
            intensidad: 1 - tramo(t, 0.45, 0.5),
            remolino: 0.035,
            ancho: 1.1,
          });
          e.hud.aviso = t > 0.12 ? 'Pasar energía' : null;
          e.centros.omoplatos = 0;
        } else {
          // Peinar: la mano recorre la espalda de arriba abajo, tres veces.
          const k = clamp((t - 0.52) / 0.43);
          const fase = (k * 3) % 1;
          const baja = k >= 1 ? 1 : suave(Math.min(1, fase / 0.8));
          const y = lerp(1.62, 0.95, baja);
          const p = sanar(y, 0.42);
          p.inclinar = 0.45 * clamp((1.25 - y) / 0.3);
          p.agachar = 0.08 * clamp((1.2 - y) / 0.25);
          if (t > 0.55) e.figuras[0].pose = p;
          else posar(e, 0, p, t, 0.5, 0.55);
          flujo(e, 1, [ref('manoD', 0, [0, 0.08, 0.02]), ref('manoD', 0, [0, -0.22, 0.04])], {
            cabeza: 1,
            cola: 1,
            color: 'jade',
            intensidad: 0.7 * (k < 1 ? 1 : 0),
            remolino: 0.03,
            ancho: 0.9,
          });
          e.hud.aviso = 'Peinar';
        }
        posar(e, 0, SERENA, t, 0.95, 1);
      },
    },
  ],
};
