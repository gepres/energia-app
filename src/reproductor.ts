import { create } from 'zustand';
import { type Opciones, OPCIONES_INICIALES, type Secuencia, duracionTotal, durPaso, inicios, ubicar } from './secuencias/motor';
import { SECUENCIAS } from './secuencias';
import { conVoz } from './secuencias/conVoz';
import { buscarEjercicio } from './contenido/ejercicios';
import { leerPreferenciaVoz } from './contenido/voz';
import { escena } from './escena/tienda';

/** La secuencia de un ejercicio, con su narración si la tiene (con la voz apagada no cambia nada). */
function secuenciaDe(id: string): Secuencia | null {
  const sec = SECUENCIAS[id];
  const ej = buscarEjercicio(id);
  if (!sec) return null;
  return ej ? conVoz(sec, ej) : sec;
}

export interface EstadoReproductor {
  ejercicioId: string | null;
  secuencia: Secuencia | null;
  opciones: Opciones;
  /** Tiempo global dentro del ejercicio (s). */
  tiempo: number;
  total: number;
  paso: number;
  t: number;
  reproduciendo: boolean;
  velocidad: number;
  camaraLibre: boolean;
  /** Se incrementa cuando hay que reevaluar aunque el tiempo no cambie. */
  revision: number;

  abrir: (id: string) => void;
  cerrar: () => void;
  alternar: () => void;
  pausar: () => void;
  reproducir: () => void;
  irAPaso: (i: number, reproducir?: boolean) => void;
  buscar: (tiempo: number) => void;
  siguiente: () => void;
  anterior: () => void;
  setVelocidad: (v: number) => void;
  setOpciones: (o: Partial<Opciones>) => void;
  setCamaraLibre: (v: boolean) => void;
  avanzar: (dt: number) => void;
}

const FIN = 1e-3;

export const useReproductor = create<EstadoReproductor>((set, get) => ({
  ejercicioId: null,
  secuencia: null,
  opciones: { ...OPCIONES_INICIALES, voz: leerPreferenciaVoz() },
  tiempo: 0,
  total: 0,
  paso: 0,
  t: 0,
  reproduciendo: false,
  velocidad: 1,
  camaraLibre: false,
  revision: 0,

  abrir: (id) => {
    const sec = secuenciaDe(id);
    escena.cortePendiente = true;
    set({
      ejercicioId: id,
      secuencia: sec,
      tiempo: 0,
      total: sec ? duracionTotal(sec, get().opciones) : 0,
      paso: 0,
      t: 0,
      reproduciendo: !!sec && !escena.reducido,
      camaraLibre: false,
      revision: get().revision + 1,
    });
  },
  cerrar: () => set({ ejercicioId: null, secuencia: null, reproduciendo: false }),
  alternar: () => {
    const s = get();
    if (!s.secuencia) return;
    if (!s.reproduciendo && s.tiempo >= s.total - FIN) {
      set({ tiempo: 0, paso: 0, t: 0, reproduciendo: true });
      return;
    }
    set({ reproduciendo: !s.reproduciendo });
  },
  pausar: () => set({ reproduciendo: false }),
  reproducir: () => set({ reproduciendo: true }),
  irAPaso: (i, reproducir) => {
    const s = get();
    if (!s.secuencia) return;
    const n = s.secuencia.pasos.length;
    const paso = Math.max(0, Math.min(n - 1, i));
    const tiempo = inicios(s.secuencia, s.opciones)[paso];
    // Con movimiento reducido solo arranca el botón «Reproducir».
    const arrancar = escena.reducido ? s.reproduciendo : (reproducir ?? s.reproduciendo);
    set({ tiempo, paso, t: 0, reproduciendo: arrancar, camaraLibre: false });
  },
  buscar: (tiempo) => {
    const s = get();
    if (!s.secuencia) return;
    const tt = Math.max(0, Math.min(s.total, tiempo));
    const u = ubicar(s.secuencia, tt, s.opciones);
    set({ tiempo: tt, paso: u.paso, t: u.t });
  },
  siguiente: () => {
    const s = get();
    if (!s.secuencia) return;
    if (s.paso >= s.secuencia.pasos.length - 1) {
      s.buscar(s.total);
      set({ reproduciendo: false });
      return;
    }
    s.irAPaso(s.paso + 1);
  },
  anterior: () => {
    const s = get();
    if (!s.secuencia) return;
    // Si ya avanzó dentro del paso, vuelve a su inicio; si no, al anterior.
    if (s.t > 0.12) s.irAPaso(s.paso);
    else s.irAPaso(s.paso - 1);
  },
  setVelocidad: (v) => set({ velocidad: v }),
  setOpciones: (o) => {
    const s = get();
    const opciones = { ...s.opciones, ...o };
    if (!s.secuencia) {
      set({ opciones, revision: s.revision + 1 });
      return;
    }
    // Si cambia la duración del paso (p. ej. el ritmo), se sigue en el mismo segundo del paso.
    const antes = durPaso(s.secuencia.pasos[s.paso], s.opciones);
    const ahora = durPaso(s.secuencia.pasos[s.paso], opciones);
    const t = Math.max(0, Math.min(1, (s.t * antes) / ahora));
    const tiempo = inicios(s.secuencia, opciones)[s.paso] + t * ahora;
    set({ opciones, total: duracionTotal(s.secuencia, opciones), tiempo, t, revision: s.revision + 1 });
  },
  setCamaraLibre: (v) => set({ camaraLibre: v }),
  avanzar: (dt) => {
    const s = get();
    if (!s.secuencia || !s.reproduciendo) return;
    let tiempo = s.tiempo + dt * s.velocidad;
    let reproduciendo = true;
    if (tiempo >= s.total) {
      tiempo = s.total;
      reproduciendo = false;
    }
    const u = ubicar(s.secuencia, tiempo, s.opciones);
    set({ tiempo, paso: u.paso, t: u.t, reproduciendo });
  },
}));
