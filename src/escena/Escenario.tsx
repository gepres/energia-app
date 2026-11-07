import { CameraControls, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { type ReactNode, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { type Mesh, type PerspectiveCamera, PlaneGeometry, ShaderMaterial, Color, type HemisphereLight, type DirectionalLight } from 'three';
import { useReproductor } from '../reproductor';
import { evaluar } from '../secuencias/motor';
import { evaluarPortada } from '../secuencias/portada';
import { registro } from './anclas';
import { Esferas, Flujos, Mantos, OrganosYCentros, Pulsos } from './Energia';
import { Maniqui } from './Maniqui';
import { Objetos } from './Objetos';
import { amortiguar } from './mate';
import { ESCENARIO } from './paleta';
import { reloj, texturaSombra } from './shaders';
import { type Calidad, escena } from './tienda';

// ── Director: evalúa la coreografía una vez por fotograma ──────────────

function Director() {
  const ultimo = useRef({ paso: -1, t: -1, revision: -1, sec: null as unknown });
  useFrame((_, dt) => {
    // El corte (sin transiciones) dura un único fotograma.
    escena.corte = escena.cortePendiente;
    escena.cortePendiente = false;
    reloj.valor += escena.reducido ? dt * 0.25 : dt;
    const r = useReproductor.getState();
    r.avanzar(Math.min(dt, 0.1));
    const s = useReproductor.getState();
    if (!s.secuencia) {
      escena.estado = evaluarPortada(reloj.valor, escena.reducido);
      ultimo.current.sec = null;
      return;
    }
    const u = ultimo.current;
    if (u.paso !== s.paso || u.t !== s.t || u.revision !== s.revision || u.sec !== s.secuencia) {
      escena.estado = evaluar(s.secuencia, s.paso, s.t, s.opciones);
      escena.version++;
      u.paso = s.paso;
      u.t = s.t;
      u.revision = s.revision;
      u.sec = s.secuencia;
    }
  }, -30);
  return null;
}

// ── Cámara ──────────────────────────────────────────────────────────────

function Camara() {
  const controles = useRef<CameraControls>(null);
  const camara = useThree((s) => s.camera) as PerspectiveCamera;
  // Arrastrar la escena pasa a cámara libre; «Volver a la toma» la devuelve.
  const setLibre = useReproductor((s) => s.setCamaraLibre);
  const fov = useRef(34);

  useEffect(() => {
    const c = controles.current;
    if (!c) return;
    const alEmpezar = () => setLibre(true);
    c.addEventListener('controlstart', alEmpezar);
    return () => c.removeEventListener('controlstart', alEmpezar);
  }, [setLibre]);

  const lente = useRef({ x: 0, y: 0 });

  useFrame((state, dtReal) => {
    const c = controles.current;
    if (!c) return;
    const dt = Math.min(dtReal, 0.1);
    c.smoothTime = escena.reducido ? 0.05 : 0.55;
    const cam = escena.estado.camara;
    // En lienzos verticales (móvil) la toma se aleja para que quepa a lo ancho.
    const aspecto = state.size.width / Math.max(1, state.size.height);
    const lejos = aspecto < 1.15 ? Math.pow(1.15 / aspecto, 0.85) : 1;
    if (!useReproductor.getState().camaraLibre) {
      // Respiración muy leve de la cámara para que la escena no quede rígida.
      const vivo = escena.reducido ? 0 : 1;
      const dx = Math.sin(reloj.valor * 0.21) * 0.035 * vivo;
      const dy = Math.sin(reloj.valor * 0.17 + 1) * 0.02 * vivo;
      const px = cam.mira[0] + (cam.pos[0] - cam.mira[0]) * lejos + dx;
      const py = cam.mira[1] + (cam.pos[1] - cam.mira[1]) * lejos + dy;
      const pz = cam.mira[2] + (cam.pos[2] - cam.mira[2]) * lejos;
      c.setLookAt(px, py, pz, cam.mira[0], cam.mira[1], cam.mira[2], !escena.corte);
    }
    fov.current = escena.corte ? cam.fov : amortiguar(fov.current, cam.fov, 3, dt);
    // Desplazamiento de lente amortiguado (deja sitio al panel, al título y a los controles).
    const l = lente.current;
    const k = escena.corte || escena.reducido ? 1 : 1 - Math.exp(-4 * dt);
    l.x += (escena.lente.x - l.x) * k;
    l.y += (escena.lente.y - l.y) * k;
    const w = state.size.width;
    const h = state.size.height;
    camara.setViewOffset(w, h, w * l.x, h * l.y, w, h);
    camara.fov = fov.current;
    camara.updateProjectionMatrix();
  }, -6);

  return (
    <CameraControls
      ref={controles}
      makeDefault
      minDistance={0.6}
      maxDistance={12}
      maxPolarAngle={Math.PI * 0.53}
      draggingSmoothTime={0.12}
    />
  );
}

// ── Piso ────────────────────────────────────────────────────────────────

function Piso() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(ESCENARIO.piso) },
          uLinea: { value: new Color(ESCENARIO.lineas) },
          uFondo: { value: new Color(ESCENARIO.fondo) },
          uLuz: { value: 1 },
          uTierra: { value: 0 },
          uTierraColor: { value: new Color('#ff8648') },
        },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main() {
            vP = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform vec3 uLinea;
          uniform vec3 uFondo;
          uniform float uLuz;
          uniform float uTierra;
          uniform vec3 uTierraColor;
          varying vec2 vP;
          float anillo(float r, float radio, float ancho) {
            return smoothstep(ancho, 0.0, abs(r - radio));
          }
          void main() {
            float r = length(vP);
            float ang = atan(vP.y, vP.x);
            vec3 c = mix(uColor * 1.6, uColor, smoothstep(0.0, 3.2, r));
            float l = 0.0;
            for (int i = 1; i <= 6; i++) l += anillo(r, float(i) * 0.5, 0.006) * (i == 2 || i == 4 ? 0.9 : 0.4);
            // Marcas de rumbo cada 15°, más largas en los cardinales.
            float marca = smoothstep(0.012, 0.0, abs(sin(ang * 12.0)) * r);
            l += marca * smoothstep(2.35, 2.42, r) * smoothstep(2.62, 2.55, r);
            float cardinal = smoothstep(0.014, 0.0, abs(sin(ang * 2.0)) * r);
            l += cardinal * smoothstep(0.6, 0.7, r) * smoothstep(2.7, 2.6, r) * 0.25;
            c += uLinea * l * 0.55;
            c += uTierraColor * uTierra * exp(-r * r * 3.0) * 0.9;
            c *= uLuz;
            float niebla = smoothstep(2.5, 7.5, r);
            gl_FragColor = vec4(mix(c, uFondo, niebla), 1.0);
          }
        `,
      }),
    [],
  );
  const geo = useMemo(() => new PlaneGeometry(18, 18, 1, 1), []);
  useFrame(() => {
    const e = escena.estado;
    mat.uniforms.uLuz.value = 1 - 0.45 * e.penumbra;
    mat.uniforms.uTierra.value = e.tierra;
  });
  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1} />;
}

/** Sombra de contacto falsa bajo cada figura (sigue a la pelvis). */
function SombraFigura({ i }: { i: 0 | 1 }) {
  const m = useRef<Mesh>(null);
  useFrame(() => {
    const f = escena.estado.figuras[i];
    const me = m.current!;
    me.visible = f.activa;
    if (!f.activa) return;
    const r = registro[i];
    me.position.set(r.pos[0], 0.003, r.pos[2] - 0.15 * r.pose.agachar);
    const s = 0.75 + 0.4 * r.pose.agachar;
    me.scale.set(s, s * 0.8, 1);
    (me.material as { opacity: number }).opacity = 0.75 * f.opacidad * (f.tono === 'vision' ? 0.3 : 1);
  });
  return (
    <mesh ref={m} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texturaSombra()} transparent depthWrite={false} opacity={0.75} />
    </mesh>
  );
}

// ── Luces ───────────────────────────────────────────────────────────────

function Luces() {
  const hemi = useRef<HemisphereLight>(null);
  const clave = useRef<DirectionalLight>(null);
  const contra = useRef<DirectionalLight>(null);
  useFrame(() => {
    const p = 1 - 0.55 * escena.estado.penumbra;
    if (hemi.current) hemi.current.intensity = 0.55 * p;
    if (clave.current) clave.current.intensity = 1.5 * p;
    if (contra.current) contra.current.intensity = 1.25 * (0.6 + 0.4 * p);
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={['#b9c6ff', '#1a120c', 0.55]} />
      <directionalLight ref={clave} position={[2.2, 3.6, 3.2]} intensity={1.5} color="#ffe8cf" />
      <directionalLight ref={contra} position={[-2.5, 2.4, -3.2]} intensity={1.25} color="#8fb6ff" />
      <directionalLight position={[3, 0.6, -1]} intensity={0.35} color="#ffb98a" />
    </>
  );
}

/** Polvo suspendido muy tenue: da profundidad (decorativo). */
function Polvo() {
  const ref = useRef<Mesh>(null);
  const datos = useMemo(() => {
    const n = 260;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 0.6 + Math.random() * 4.5;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.random() * 3.2;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    return pos;
  }, []);
  useFrame((_, dt) => {
    if (ref.current && !escena.reducido) ref.current.rotation.y += dt * 0.012;
  });
  return (
    <points ref={ref as never}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.012} color="#c9c2ff" transparent opacity={0.35} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Post({ calidad }: { calidad: Calidad }) {
  return (
    <EffectComposer multisampling={calidad === 'alta' ? 4 : 0} enableNormalPass={false}>
      <Bloom
        mipmapBlur
        intensity={calidad === 'baja' ? 0.6 : 0.95}
        luminanceThreshold={1}
        luminanceSmoothing={0.3}
        radius={0.72}
        levels={calidad === 'alta' ? 7 : 5}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.28} darkness={0.62} />
      {calidad !== 'alta' ? <SMAA /> : <></>}
    </EffectComposer>
  );
}

// ── Raíz ───────────────────────────────────────────────────────────────

const DPR: Record<Calidad, [number, number]> = { alta: [1, 2], media: [1, 1.5], baja: [1, 1] };

export function Escenario({ children }: { children?: ReactNode }) {
  const movil = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const [calidad, setCalidad] = useState<Calidad>(movil ? 'media' : 'alta');
  useEffect(() => {
    escena.calidad = calidad;
  }, [calidad]);

  return (
    <Canvas
      flat
      dpr={DPR[calidad]}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      camera={{ position: [0.9, 1.45, 3.4], fov: 34, near: 0.05, far: 60 }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(ESCENARIO.fondo);
        scene.background = new Color(ESCENARIO.fondo);
      }}
    >
      <PerformanceMonitor
        onDecline={() => setCalidad((c) => (c === 'alta' ? 'media' : 'baja'))}
        onIncline={() => setCalidad((c) => (c === 'baja' ? 'media' : c))}
        flipflops={3}
        onFallback={() => setCalidad('baja')}
      />
      <Director />
      <Camara />
      <Luces />
      <Suspense fallback={null}>
        <Environment resolution={64} frames={1}>
          <Lightformer form="rect" intensity={1.6} color="#ffe2c4" position={[2, 3, 3]} scale={[3, 2, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#8fb6ff" position={[-3, 2, -3]} scale={[3, 2, 1]} />
          <Lightformer form="ring" intensity={0.6} color="#ffffff" position={[0, 5, 0]} scale={2} />
        </Environment>
      </Suspense>
      <Piso />
      <SombraFigura i={0} />
      <SombraFigura i={1} />
      {calidad !== 'baja' && <Polvo />}
      <Maniqui indice={0} />
      <Maniqui indice={1} />
      <OrganosYCentros />
      <Esferas />
      <Flujos />
      <Pulsos />
      <Mantos />
      <Objetos />
      {children}
      <Post calidad={calidad} />
    </Canvas>
  );
}
