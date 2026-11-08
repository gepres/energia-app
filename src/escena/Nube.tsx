import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  type Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { azar } from './mate';
import { colorEnergia } from './paleta';
import { reloj } from './shaders';
import { escena } from './tienda';

/**
 * Nube luminosa de energía: un racimo de copos de luz que siempre miran a la
 * cámara, cada uno con ruido animado, sumados en aditivo. Un solo draw call.
 */

const COPOS = 44;

function geometriaNube() {
  const base = new PlaneGeometry(1, 1);
  const g = new InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.getAttribute('position'));
  g.setAttribute('uv', base.getAttribute('uv'));
  // Cada copo: posición dentro de un elipsoide unitario y tamaño relativo. Las
  // direcciones siguen una espiral de Fibonacci (reparto parejo, sin grumos ni
  // huecos) y la distancia al centro varía un poco para que el borde sea irregular.
  const datos = new Float32Array(COPOS * 4);
  for (let i = 0; i < COPOS; i++) {
    const y = 1 - (2 * (i + 0.5)) / COPOS;
    const anillo = Math.sqrt(1 - y * y);
    const fi = i * 2.399963;
    const r = 0.3 + 0.7 * Math.sqrt(azar(i * 3 + 3));
    datos[i * 4] = Math.cos(fi) * anillo * r;
    datos[i * 4 + 1] = y * r;
    datos[i * 4 + 2] = Math.sin(fi) * anillo * r;
    // Los del centro, más grandes: la nube tiene cuerpo y bordes deshilachados.
    datos[i * 4 + 3] = (0.6 + 0.4 * azar(i * 7 + 5)) * (1.2 - 0.5 * r);
  }
  g.setAttribute('aCopo', new InstancedBufferAttribute(datos, 4));
  g.instanceCount = COPOS;
  return g;
}

function materialNube() {
  return new ShaderMaterial({
    uniforms: {
      uCentro: { value: new Vector3() },
      uRadio: { value: new Vector3(0.4, 0.15, 0.24) },
      uTam: { value: 0.4 },
      uTiempo: { value: 0 },
      uIntensidad: { value: 0 },
      uColor: { value: new Color() },
      uColor2: { value: new Color() },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aCopo;
      uniform vec3 uCentro;
      uniform vec3 uRadio;
      uniform float uTam;
      uniform float uTiempo;
      varying vec2 vUv;
      varying float vSemilla;
      varying float vProf;
      void main() {
        vUv = uv;
        vSemilla = aCopo.w + aCopo.x * 3.1;
        vec3 off = aCopo.xyz * uRadio;
        // Deriva lenta: la nube respira sin desarmarse.
        off.x += sin(uTiempo * 0.23 + vSemilla * 17.0) * 0.025;
        off.y += sin(uTiempo * 0.31 + vSemilla * 11.0) * 0.012;
        off.z += cos(uTiempo * 0.19 + vSemilla * 7.0) * 0.015;
        vProf = aCopo.y;
        vec4 mv = viewMatrix * vec4(uCentro + off, 1.0);
        mv.xy += position.xy * uTam * aCopo.w;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTiempo;
      uniform float uIntensidad;
      uniform vec3 uColor;
      uniform vec3 uColor2;
      varying vec2 vUv;
      varying float vSemilla;
      varying float vProf;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruido(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          s += a * ruido(p);
          p *= 2.03;
          a *= 0.5;
        }
        return s;
      }
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        if (r > 1.0) discard;
        float n = fbm(p * 2.4 + vec2(vSemilla * 13.0, -uTiempo * 0.1));
        float a = pow(1.0 - r, 1.7) * (0.35 + 0.85 * n);
        // La base de la nube algo más luminosa: ahí la tocan las manos.
        a *= (0.8 + 0.35 * (1.0 - vProf)) * uIntensidad * 0.36;
        // Corazón casi blanco y borde del color de la energía: brilla (el bloom la envuelve).
        vec3 c = mix(uColor2, uColor, smoothstep(0.15, 1.0, r + (n - 0.5) * 0.5));
        gl_FragColor = vec4(c * a * 2.4, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

export function Nube() {
  const malla = useRef<Mesh>(null);
  const geo = useMemo(geometriaNube, []);
  const mat = useMemo(materialNube, []);
  useFrame(() => {
    const n = escena.estado.nube;
    const me = malla.current!;
    me.visible = n.activa && n.intensidad > 0.005;
    if (!me.visible) return;
    const u = mat.uniforms;
    u.uCentro.value.set(n.centro[0], n.centro[1], n.centro[2]);
    u.uRadio.value.set(n.radio, n.radio * 0.38, n.radio * 0.6);
    u.uTam.value = n.radio * 1.3;
    u.uTiempo.value = reloj.valor;
    u.uIntensidad.value = n.intensidad;
    u.uColor.value.copy(colorEnergia(n.color));
    u.uColor2.value.copy(colorEnergia(n.color2));
  });
  // Se dibuja después de la tela: es luz que se suma encima, no queda velada por ella.
  return <mesh ref={malla} geometry={geo} material={mat} visible={false} frustumCulled={false} renderOrder={9} />;
}
