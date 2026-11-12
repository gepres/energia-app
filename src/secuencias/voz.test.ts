import { describe, expect, it } from 'vitest';
import { EJERCICIOS, buscarEjercicio } from '../contenido/ejercicios';
import manifiesto from '../contenido/voz.json';
import { RESPIRO_VOZ, clipVoz, tieneVoz } from '../contenido/voz';
import { SECUENCIAS } from './index';
import { conVoz } from './conVoz';
import { OPCIONES_INICIALES, durPaso, evaluar } from './motor';

const CON_VOZ = { ...OPCIONES_INICIALES, voz: true };
/** Los audios que hay en public/voz (solo las rutas; no se cargan). */
const AUDIOS = new Set(Object.keys(import.meta.glob('../../public/voz/**/*.mp3')).map((r) => r.replace('../../public/', '')));

describe('Narración con voz (ElevenLabs)', () => {
  it('cada audio del manifiesto existe, dura algo y es de un paso real de un ejercicio uno por uno', () => {
    const claves = Object.keys(manifiesto);
    expect(claves.length).toBeGreaterThan(0);
    for (const [clave, c] of Object.entries(manifiesto as Record<string, { audio: string; segundos: number | null }>)) {
      const [ejId, pasoId] = clave.split('/');
      const ej = buscarEjercicio(ejId);
      expect(ej?.origen, clave).toBe('revision');
      expect(ej?.pasos.some((p) => p.id === pasoId), clave).toBe(true);
      expect(c.segundos, clave).toBeGreaterThan(1);
      expect(AUDIOS.has(c.audio), `${clave}: falta ${c.audio}`).toBe(true);
    }
  });

  const conAudio = EJERCICIOS.filter((e) => e.origen === 'revision' && tieneVoz(e));

  it('hay ejercicios con voz en todos sus pasos (la prueba: 01, 02 y 05)', () => {
    expect(conAudio.map((e) => e.id)).toEqual(expect.arrayContaining(['cargar-ombligo', 'sellar-cielo', 'recorrido-por-chakras']));
  });

  it('con la voz apagada, la secuencia es la misma: mismas duraciones y misma escena', () => {
    for (const ej of conAudio) {
      const base = SECUENCIAS[ej.id];
      const sec = conVoz(base, ej);
      for (let i = 0; i < base.pasos.length; i++) {
        expect(durPaso(sec.pasos[i], OPCIONES_INICIALES), `${ej.id} paso ${i + 1}`).toBe(durPaso(base.pasos[i], OPCIONES_INICIALES));
        for (const t of [0, 0.37, 0.8, 1]) {
          const a = evaluar(base, i, t, OPCIONES_INICIALES);
          const b = evaluar(sec, i, t, OPCIONES_INICIALES);
          expect(b.figuras[0].pose, `${ej.id} paso ${i + 1}, t ${t}`).toEqual(a.figuras[0].pose);
          expect(b.hud.aviso).toBe(a.hud.aviso);
        }
      }
    }
  });

  it('con la voz activa, cada paso dura lo más largo entre la animación y la voz; la escena espera quieta a la voz', () => {
    for (const ej of conAudio) {
      const base = SECUENCIAS[ej.id];
      const sec = conVoz(base, ej);
      for (let i = 0; i < base.pasos.length; i++) {
        const voz = clipVoz(ej.id, ej.pasos[i].id)!.segundos! + RESPIRO_VOZ;
        const anim = durPaso(base.pasos[i], CON_VOZ);
        const d = durPaso(sec.pasos[i], CON_VOZ);
        expect(d, `${ej.id} paso ${i + 1}`).toBeCloseTo(Math.max(anim, voz), 6);
        // La animación corre a su velocidad: a mitad de la animación, la escena es la misma.
        const tMitad = (anim * 0.5) / d;
        expect(evaluar(sec, i, tMitad, CON_VOZ).figuras[0].pose, `${ej.id} paso ${i + 1}: a mitad`).toEqual(evaluar(base, i, 0.5, CON_VOZ).figuras[0].pose);
        // Si la voz es más larga, al terminar la animación la escena queda en el final del paso.
        if (d > anim) {
          const fin = evaluar(base, i, 1, CON_VOZ).figuras[0].pose;
          expect(evaluar(sec, i, (anim + 0.01) / d, CON_VOZ).figuras[0].pose, `${ej.id} paso ${i + 1}: espera`).toEqual(fin);
          expect(evaluar(sec, i, 1, CON_VOZ).figuras[0].pose).toEqual(fin);
        }
      }
    }
  });
});
