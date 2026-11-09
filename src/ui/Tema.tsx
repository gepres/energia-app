import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export type Tema = 'claro' | 'oscuro';
const CLAVE = 'repaso-energetico:tema';
/** Color de la barra del navegador según el tema. */
const COLOR_BARRA: Record<Tema, string> = { oscuro: '#07080d', claro: '#f4f1ea' };

/** El tema guardado, o el del sistema la primera vez. */
export function temaInicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  } catch {
    /* sin almacenamiento: se usa el del sistema */
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
}

/** Aplica el tema al documento: la interfaz cambia; la escena 3D sigue oscura (elegido en la revisión). */
export function aplicarTema(t: Tema) {
  document.documentElement.dataset.tema = t;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', COLOR_BARRA[t]));
}

let actual: Tema | null = null;
const oyentes = new Set<(t: Tema) => void>();

export function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTema] = useState<Tema>(() => actual ?? (actual = temaInicial()));
  useEffect(() => {
    oyentes.add(setTema);
    return () => void oyentes.delete(setTema);
  }, []);
  const cambiar = (t: Tema) => {
    actual = t;
    try {
      localStorage.setItem(CLAVE, t);
    } catch {
      /* sin almacenamiento: dura hasta recargar */
    }
    aplicarTema(t);
    oyentes.forEach((f) => f(t));
  };
  return [tema, cambiar];
}

/** Botón para pasar de claro a oscuro y al revés. */
export function BotonTema() {
  const [tema, cambiar] = useTema();
  const claro = tema === 'claro';
  return (
    <button
      className="boton-icono boton-tema"
      onClick={() => cambiar(claro ? 'oscuro' : 'claro')}
      aria-label={claro ? 'Pasar al modo oscuro' : 'Pasar al modo claro'}
      title={claro ? 'Modo oscuro' : 'Modo claro'}
    >
      {claro ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
