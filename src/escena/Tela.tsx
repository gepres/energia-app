import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  type Mesh,
  ShaderMaterial,
  Vector3,
} from 'three';
import { MAX_TELAS, type Tela } from './estado';
import { colorEnergia } from './paleta';
import { reloj } from './shaders';
import { escena } from './tienda';

/**
 * Velo de tela: una superficie que cuelga recogida desde arriba y se abre hasta
 * el ruedo, con pliegues verticales que ondulan despacio y un brillo satinado.
 * La forma se recalcula en CPU cada fotograma (72 × 44 vértices).
 */

const LADOS = 72;
const FILAS = 44;
/** Radio de la tela recogida arriba. */
const RECOGIDA = 0.09;

function crearGeometria() {
  const g = new BufferGeometry();
  const n = LADOS * FILAS;
  const pos = new BufferAttribute(new Float32Array(n * 3), 3);
  pos.setUsage(DynamicDrawUsage);
  g.setAttribute('position', pos);
  const v = new Float32Array(n);
  for (let j = 0; j < FILAS; j++) for (let k = 0; k < LADOS; k++) v[j * LADOS + k] = j / (FILAS - 1);
  g.setAttribute('aV', new BufferAttribute(v, 1));
  const idx: number[] = [];
  for (let j = 0; j < FILAS - 1; j++) {
    for (let k = 0; k < LADOS; k++) {
      const a = j * LADOS + k;
      const b = j * LADOS + ((k + 1) % LADOS);
      idx.push(a, a + LADOS, b, b, a + LADOS, b + LADOS);
    }
  }
  g.setIndex(idx);
  return g;
}

/** Coloca cada vértice: de la recogida (v = 0) al ruedo (v = 1), con pliegues y ondulación. */
function formar(g: BufferGeometry, t: Tela, tiempo: number) {
  const pos = g.getAttribute('position') as BufferAttribute;
  const [cx, , cz] = t.centro;
  for (let j = 0; j < FILAS; j++) {
    const v = j / (FILAS - 1);
    // Se abre rápido bajo la recogida y después cae casi vertical, como una campana de tela.
    const abre = Math.pow(Math.sin((v * Math.PI) / 2), 0.8);
    const amp = 0.004 + 0.03 * v;
    for (let k = 0; k < LADOS; k++) {
      const a = (k / LADOS) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // El ruedo: a la altura de las manos a los costados y algo más abajo adelante y atrás, ondulado.
      const ruedo = t.borde - t.caida * sa * sa + 0.012 * v * Math.sin(9 * a + tiempo * 0.8);
      const y = t.arriba + (ruedo - t.arriba) * v;
      // Pliegues verticales que ondulan despacio, más marcados hacia el ruedo.
      const pliegue = amp * (0.65 * Math.sin(14 * a + tiempo * 0.7 + v * 2.2) + 0.35 * Math.sin(31 * a - tiempo * 0.5 + v * 3.1));
      const rx = RECOGIDA + (t.ancho - RECOGIDA) * abre + pliegue;
      const rz = RECOGIDA + (t.fondo - RECOGIDA) * abre + pliegue;
      const vaiven = 0.012 * v * v * Math.sin(tiempo * 0.6);
      pos.setXYZ(j * LADOS + k, cx + ca * rx + vaiven, y, cz + 0.02 + sa * rz);
    }
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
}

function crearMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color() },
      uOpacidad: { value: 0 },
      uBrillo: { value: 1 },
      uLuz: { value: new Vector3(-0.5, 0.7, 0.5).normalize() },
    },
    vertexShader: /* glsl */ `
      attribute float aV;
      varying float vV;
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vV = aV;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vP = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacidad;
      uniform float uBrillo;
      uniform vec3 uLuz;
      varying float vV;
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vec3 vista = normalize(cameraPosition - vP);
        vec3 n = normalize(vN);
        if (dot(n, vista) < 0.0) n = -n;
        float ndv = clamp(dot(n, vista), 0.0, 1.0);
        // Tela fina: más opaca de canto (en los pliegues y la silueta) que de frente.
        float canto = pow(1.0 - ndv, 1.8);
        float difusa = 0.45 + 0.55 * clamp(dot(n, uLuz), 0.0, 1.0);
        // Brillo satinado de seda sobre las crestas de los pliegues.
        float satin = pow(clamp(dot(n, normalize(uLuz + vista)), 0.0, 1.0), 16.0);
        float ruedo = smoothstep(0.9, 1.0, vV) * uBrillo;
        // Nace de la nube: arriba se desvanece.
        float nace = smoothstep(0.0, 0.14, vV);
        vec3 c = uColor * (difusa * 0.9 + canto * 0.7 + ruedo * 1.6) + vec3(1.0, 0.97, 1.0) * satin * 0.45;
        float a = (0.16 + 0.5 * canto + 0.25 * satin + 0.45 * ruedo) * nace * uOpacidad;
        gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}

function UnaTela({ i }: { i: number }) {
  const malla = useRef<Mesh>(null);
  const geo = useMemo(crearGeometria, []);
  const mat = useMemo(crearMaterial, []);
  useFrame(() => {
    const t = escena.estado.telas[i];
    const me = malla.current!;
    me.visible = t.activa && t.opacidad > 0.003;
    if (!me.visible) return;
    formar(geo, t, escena.reducido ? 0 : reloj.valor);
    mat.uniforms.uColor.value.copy(colorEnergia(t.color));
    mat.uniforms.uOpacidad.value = t.opacidad;
    mat.uniforms.uBrillo.value = t.brillo;
  }, -5);
  return <mesh ref={malla} geometry={geo} material={mat} visible={false} frustumCulled={false} renderOrder={8} />;
}

export function Telas() {
  return (
    <>
      {Array.from({ length: MAX_TELAS }, (_, i) => (
        <UnaTela key={i} i={i} />
      ))}
    </>
  );
}
