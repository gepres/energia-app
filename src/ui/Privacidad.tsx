import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { MOTIVOS } from '../analitica/config';
import { dejarDeMedir, estadoAnalitica, volverAMedir } from '../analitica';
import { irA } from './ruta';

/** Qué se mide del uso de la app, con qué y cómo dejar de medirlo (aviso informativo, elegido por el usuario). */
export function Privacidad() {
  const [estado, setEstado] = useState(estadoAnalitica);
  const cambiar = (medir: boolean) => {
    if (medir) volverAMedir();
    else dejarDeMedir();
    setEstado(estadoAnalitica());
  };
  return (
    <main className="pagina privacidad">
      <header className="pagina-cabecera">
        <button className="boton-icono" onClick={() => irA('#/')} aria-label="Volver al inicio">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="inicio-antetitulo">Repaso energético</p>
          <h1>Privacidad</h1>
        </div>
      </header>
      <p className="pagina-intro">
        Para mejorar la app medimos cómo se usa, con{' '}
        <a href="https://posthog.com" target="_blank" rel="noreferrer">
          PostHog
        </a>
        . No te pedimos el nombre ni el correo, y los datos no se usan para publicidad.
      </p>

      <h2>Qué se registra</h2>
      <ul>
        <li>Las pantallas que visitas y desde qué sitio llegaste.</li>
        <li>Qué ejercicios y rutinas abres, hasta qué paso llegas y si los terminas.</li>
        <li>Las opciones que eliges: voz, velocidad, ritmo de respiración y tema.</li>
        <li>Dónde tocas y hasta dónde bajas en cada pantalla, para el mapa de calor.</li>
        <li>Grabaciones de la interfaz, sin lo que escribes ni los nombres de tus rutinas.</li>
        <li>El tipo de dispositivo y de navegador, y el país y la ciudad aproximados.</li>
      </ul>

      <h2>Cómo se guarda</h2>
      <p>
        No usamos cookies. Tu navegador guarda un identificador al azar, que no dice quién eres, para reconocer la misma
        visita. Los datos se guardan en los servidores de PostHog (
        <a href="https://posthog.com/privacy" target="_blank" rel="noreferrer">
          su política de privacidad
        </a>
        ).
      </p>

      <h2>Si no quieres que se mida</h2>
      <p>
        Si tu navegador pide «no rastrear» (Do Not Track o Global Privacy Control), no se mide nada. También puedes
        desactivarlo aquí: vale para este navegador.
      </p>
      <div className="privacidad-estado" role="status">
        <p>{estado.midiendo ? 'Ahora se mide el uso en este navegador.' : estado.motivo ? MOTIVOS[estado.motivo] : 'No se mide.'}</p>
        {estado.midiendo && (
          <button className="boton" onClick={() => cambiar(false)}>
            No medir mi uso
          </button>
        )}
        {estado.motivo === 'excluido' && (
          <button className="boton" onClick={() => cambiar(true)}>
            Volver a permitirlo
          </button>
        )}
      </div>
    </main>
  );
}
