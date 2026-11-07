import { AdditiveBlending, CanvasTexture, Color, DoubleSide, FrontSide, ShaderMaterial, SRGBColorSpace, type Texture } from 'three';

/** Tiempo decorativo compartido (brillos, remolinos). No afecta al contenido. */
export const reloj = { valor: 0 };

// ── Esfera de energía ───────────────────────────────────────────────────

export function crearMaterialEsfera() {
  return new ShaderMaterial({
    uniforms: {
      uTiempo: { value: 0 },
      uColor: { value: new Color('#ffc96b') },
      uColor2: { value: new Color('#7cc8ff') },
      uMezcla: { value: 0 },
      uBrillo: { value: 1 },
      uOpacidad: { value: 1 },
      uAgujero: { value: 0 },
      uSemilla: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTiempo;
      uniform float uSemilla;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vP;
      void main() {
        vec3 p = position;
        float t = uTiempo + uSemilla * 7.0;
        float n = sin(p.x * 7.0 + t * 1.9) * sin(p.y * 6.0 - t * 1.6) * sin(p.z * 6.5 + t * 1.2);
        p += normal * n * 0.045;
        vP = position;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTiempo;
      uniform vec3 uColor;
      uniform vec3 uColor2;
      uniform float uMezcla;
      uniform float uBrillo;
      uniform float uOpacidad;
      uniform float uAgujero;
      uniform float uSemilla;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vP;
      void main() {
        float t = uTiempo + uSemilla * 7.0;
        float borde = -cos(uAgujero * 0.9);
        if (uAgujero > 0.001 && vP.y < borde) discard;
        float ndv = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 2.4);
        float nucleo = pow(ndv, 3.0);
        float remolino = 0.5 + 0.5 * sin(vP.y * 9.0 + t * 2.6 + sin(vP.x * 5.0 + t * 1.3) * 2.2);
        float mezcla = uMezcla * smoothstep(-0.35, 0.35, sin(atan(vP.z, vP.x) * 1.0 + vP.y * 2.0 + t * 1.4));
        vec3 col = mix(uColor, uColor2, mezcla);
        vec3 c = col * (0.35 + 0.9 * nucleo) + col * fres * 1.6 + vec3(1.0, 0.97, 0.9) * pow(nucleo, 5.0) * 1.2;
        c *= uBrillo * (0.82 + 0.28 * remolino);
        // Labio luminoso alrededor del agujero.
        if (uAgujero > 0.001) c += col * (1.0 - smoothstep(borde, borde + 0.12, vP.y)) * 2.5 * uBrillo;
        float a = uOpacidad * clamp(0.35 + 0.65 * nucleo + fres, 0.0, 1.0);
        gl_FragColor = vec4(c * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: FrontSide,
  });
}

// ── Textura de halo (radial) ────────────────────────────────────────────

let halo: Texture | null = null;
export function texturaHalo(): Texture {
  if (halo) return halo;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.14)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  halo = new CanvasTexture(c);
  halo.colorSpace = SRGBColorSpace;
  return halo;
}

let sombra: Texture | null = null;
/** Sombra de contacto falsa: un degradado radial oscuro. */
export function texturaSombra(): Texture {
  if (sombra) return sombra;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,0.85)');
  gr.addColorStop(0.35, 'rgba(0,0,0,0.5)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  sombra = new CanvasTexture(c);
  return sombra;
}

// ── Partículas ──────────────────────────────────────────────────────────

export function crearMaterialParticulas(aditivo: boolean) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color('#ffc96b') },
      uIntensidad: { value: 1 },
      uEscala: { value: 1 },
      uDpr: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aAlfa;
      attribute float aTam;
      uniform float uEscala;
      uniform float uDpr;
      varying float vAlfa;
      void main() {
        vAlfa = aAlfa;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(aTam * uEscala * uDpr * (300.0 / -mv.z), 64.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensidad;
      varying float vAlfa;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        if (r > 0.5) discard;
        float s = 1.0 - smoothstep(0.0, 0.5, r);
        float nucleo = 1.0 - smoothstep(0.0, 0.22, r);
        vec3 c = uColor * (s * 0.8 + nucleo * 1.4) * uIntensidad;
        float a = vAlfa * s;
        ${aditivo ? 'gl_FragColor = vec4(c * a, a);' : 'gl_FragColor = vec4(uColor, a * 0.85);'}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: aditivo ? AdditiveBlending : undefined,
  });
}

// ── Cáscara (manto, pulsos, sellos) ─────────────────────────────────────

export function crearMaterialCascara() {
  return new ShaderMaterial({
    uniforms: {
      uTiempo: { value: 0 },
      uColor: { value: new Color('#a98bff') },
      uOpacidad: { value: 1 },
      uCobertura: { value: 1 },
      uDesdeArriba: { value: 1 },
      uBanda: { value: -1 },
      uAlto: { value: 2 },
      uBase: { value: 0 },
      uMeridianos: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vP;
      varying vec3 vW;
      void main() {
        vP = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vec4 mv = viewMatrix * w;
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTiempo;
      uniform vec3 uColor;
      uniform float uOpacidad;
      uniform float uCobertura;
      uniform float uDesdeArriba;
      uniform float uBanda;
      uniform float uAlto;
      uniform float uBase;
      uniform float uMeridianos;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vP;
      varying vec3 vW;
      void main() {
        float h = clamp((vW.y - uBase) / uAlto, 0.0, 1.0);
        float frente = uDesdeArriba > 0.5 ? 1.0 - uCobertura : uCobertura;
        float m = smoothstep(frente - 0.04, frente + 0.04, h);
        if (uDesdeArriba < 0.5) m = 1.0 - m;
        if (m < 0.002) discard;
        float ndv = abs(dot(normalize(vN), normalize(vV)));
        float fres = pow(1.0 - ndv, 2.2);
        float ang = atan(vP.z, vP.x);
        float mer = uMeridianos * pow(abs(sin(ang * 12.0 + h * 1.5)), 40.0) * 0.6;
        float lineaFrente = exp(-pow((h - frente) * 40.0, 2.0)) * 2.2;
        float banda = uBanda >= 0.0 ? exp(-pow((h - uBanda) * 18.0, 2.0)) * 1.6 : 0.0;
        float a = (0.05 + fres * 0.55 + mer * (0.3 + fres)) * m + (lineaFrente + banda) * (0.35 + fres);
        a *= uOpacidad;
        gl_FragColor = vec4(uColor * a * 1.4, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}
