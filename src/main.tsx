import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilos.css';
import { escena } from './escena/tienda';
import { registro } from './escena/anclas';
import { useReproductor } from './reproductor';
import { aplicarTema, temaInicial } from './ui/Tema';
import { estadoAnalitica, iniciarAnalitica } from './analitica';

// El tema (claro u oscuro) antes de pintar, para que no parpadee.
aplicarTema(temaInicial());

// Gancho para pruebas automáticas (capturas y verificación de poses).
(window as unknown as { __repaso: unknown }).__repaso = { escena, registro, useReproductor, analitica: estadoAnalitica };

// Analítica de uso (PostHog): solo en el dominio publicado y si la persona no la desactivó.
iniciarAnalitica();

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
