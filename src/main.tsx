import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilos.css';
import { escena } from './escena/tienda';
import { registro } from './escena/anclas';
import { useReproductor } from './reproductor';

// Gancho para pruebas automáticas (capturas y verificación de poses).
(window as unknown as { __repaso: unknown }).__repaso = { escena, registro, useReproductor };

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
