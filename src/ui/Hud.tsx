import { useEffect, useRef } from 'react';
import { escena } from '../escena/tienda';

/**
 * Indicadores sobre la escena (contador, respiración, aviso). Leen el estado de
 * la escena en cada fotograma y escriben el DOM directamente: sin renders.
 */
export function Hud() {
  const contador = useRef<HTMLDivElement>(null);
  const valor = useRef<HTMLSpanElement>(null);
  const total = useRef<HTMLSpanElement>(null);
  const etiqueta = useRef<HTMLSpanElement>(null);
  const resp = useRef<HTMLDivElement>(null);
  const anillo = useRef<SVGCircleElement>(null);
  const fase = useRef<HTMLSpanElement>(null);
  const ciclo = useRef<HTMLSpanElement>(null);
  const aviso = useRef<HTMLDivElement>(null);
  const marcas = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const bucle = () => {
      const h = escena.estado.hud;
      if (contador.current) {
        const on = !!h.contador;
        contador.current.dataset.visible = String(on);
        if (h.contador) {
          const v = String(h.contador.valor);
          if (valor.current && valor.current.textContent !== v) {
            valor.current.textContent = v;
            valor.current.animate?.([{ transform: 'translateY(4px)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], {
              duration: escena.reducido ? 0 : 180,
              easing: 'cubic-bezier(.2,.8,.2,1)',
            });
          }
          if (total.current) total.current.textContent = String(h.contador.total);
          if (etiqueta.current) etiqueta.current.textContent = h.contador.etiqueta;
        }
      }
      if (resp.current) {
        const r = h.respiracion;
        resp.current.dataset.visible = String(!!r);
        if (r) {
          if (fase.current && fase.current.textContent !== r.fase) fase.current.textContent = r.fase;
          if (ciclo.current) ciclo.current.textContent = `× ${r.total} · ritmo 4·3·4·4`;
          const escala = r.fase === 'Inhala' ? 0.55 + 0.45 * r.k : r.fase === 'Retén' ? 1 : r.fase === 'Exhala' ? 1 - 0.45 * r.k : 0.55;
          if (anillo.current) anillo.current.style.transform = `scale(${escala})`;
        }
      }
      if (aviso.current) {
        aviso.current.dataset.visible = String(!!h.aviso);
        if (h.aviso && aviso.current.textContent !== h.aviso) aviso.current.textContent = h.aviso;
      }
      marcas.current.forEach((d, i) => {
        if (!d) return;
        const m = escena.marcasPantalla[i];
        if (!m || m.opacidad < 0.01) {
          d.style.opacity = '0';
          return;
        }
        if (d.textContent !== m.texto) d.textContent = m.texto;
        d.dataset.tipo = m.tipo;
        d.style.opacity = String(m.opacidad);
        d.style.transform = `translate(${m.x}px, ${m.y}px) translate(-50%, -50%)`;
      });
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="hud" aria-hidden="true">
      <div ref={contador} className="hud-contador" data-visible="false">
        <div className="hud-contador-cifras">
          <span ref={valor} className="hud-contador-valor">0</span>
          <span className="hud-contador-sep">/</span>
          <span ref={total} className="hud-contador-total">0</span>
        </div>
        <span ref={etiqueta} className="hud-contador-etiqueta" />
      </div>
      <div ref={resp} className="hud-resp" data-visible="false">
        <svg viewBox="0 0 100 100" className="hud-resp-svg">
          <circle cx="50" cy="50" r="46" className="hud-resp-guia" />
          <circle ref={anillo} cx="50" cy="50" r="46" className="hud-resp-anillo" />
        </svg>
        <span ref={fase} className="hud-resp-fase">Inhala</span>
        <span ref={ciclo} className="hud-resp-ciclo" />
      </div>
      <div ref={aviso} className="hud-aviso" data-visible="false" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} ref={(d) => void (marcas.current[i] = d)} className="marca3d" style={{ opacity: 0 }} />
      ))}
    </div>
  );
}
