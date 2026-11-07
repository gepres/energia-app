import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  type Group,
  type InstancedMesh,
  LatheGeometry,
  Matrix4,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type Sprite,
  Vector2,
  Vector3,
} from 'three';
import { posicionPegada, registro } from './anclas';
import { MAX_ROSAS } from './estado';
import { esquinasCubo } from './geoCubo';
import { type V3, clamp, saleAtras } from './mate';
import { colorEnergia, HEX_ENERGIA } from './paleta';
import { crearMaterialCuerpo } from './materiales';
import { crearMaterialCascara, reloj, texturaHalo } from './shaders';
import { escena } from './tienda';

const _o = new Object3D();
const _m = new Matrix4();
const _q = new Quaternion();
const _v = new Vector3();
const _w = new Vector3();
const _arriba = new Vector3(0, 1, 0);
const _escala = new Vector3();

// ── Rosa de luz ─────────────────────────────────────────────────────────

function geometriaPetalo() {
  const nu = 8;
  const nv = 10;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    const ancho = Math.sin(Math.PI * Math.pow(v, 0.75)) * 0.5 + 0.04 * (1 - v);
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1;
      const x = u * ancho;
      const y = v;
      const z = 0.35 * u * u * ancho - 0.18 * v * v; // ahuecado y curva hacia fuera
      pos.push(x, y, z);
      uv.push(i / nu, v);
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + nu + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const PETALOS = [
  { n: 3, r: 0.004, largo: 0.05, ancho: 0.045, cerrada: 0.04, abierta: 0.16 },
  { n: 5, r: 0.01, largo: 0.062, ancho: 0.055, cerrada: 0.1, abierta: 0.32 },
  { n: 7, r: 0.017, largo: 0.076, ancho: 0.066, cerrada: 0.2, abierta: 0.55 },
  { n: 9, r: 0.024, largo: 0.088, ancho: 0.078, cerrada: 0.32, abierta: 0.85 },
  { n: 11, r: 0.031, largo: 0.094, ancho: 0.084, cerrada: 0.45, abierta: 1.15 },
];
const TALLO = 0.17;
const N_PETALOS = PETALOS.reduce((s, c) => s + c.n, 0);

function materialPetalo() {
  return new ShaderMaterial({
    uniforms: { uBrillo: { value: 1 }, uOpacidad: { value: 1 }, uColor: { value: new Color(HEX_ENERGIA.rosa) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vF;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vF = 1.0 - abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uBrillo;
      uniform float uOpacidad;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vF;
      void main() {
        float borde = smoothstep(0.55, 1.0, vUv.y) + smoothstep(0.35, 0.5, abs(vUv.x - 0.5)) * 0.6;
        vec3 base = uColor * 0.35;
        vec3 c = mix(base, uColor * 1.6 + vec3(0.25, 0.1, 0.15), borde) + uColor * vF * 0.8;
        float a = uOpacidad * (0.45 + 0.45 * borde + vF * 0.3);
        gl_FragColor = vec4(c * uBrillo * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

const MAT_TALLO = new MeshBasicMaterial({
  color: new Color(HEX_ENERGIA.jade).multiplyScalar(0.9),
  transparent: true,
  blending: AdditiveBlending,
  depthWrite: false,
  side: DoubleSide,
});

function UnaRosa({ i }: { i: number }) {
  const grupo = useRef<Group>(null);
  const petalos = useRef<InstancedMesh>(null);
  const brillo = useRef<Sprite>(null);
  const sello = useRef<Mesh>(null);
  const disco = useRef<Mesh>(null);
  const tallo = useRef<Group>(null);
  const geo = useMemo(geometriaPetalo, []);
  const mat = useMemo(materialPetalo, []);
  const matSello = useMemo(() => {
    const m = crearMaterialCascara();
    m.uniforms.uDesdeArriba.value = 0;
    return m;
  }, []);
  useFrame(() => {
    const r = escena.estado.rosas[i];
    const g = grupo.current!;
    g.visible = r.activa && r.opacidad > 0.005;
    if (!g.visible) return;
    const p = posicionPegada(r.pos, r.ref, r.pegado);
    g.position.set(p[0], p[1], p[2]);
    g.scale.setScalar(r.escala);
    g.rotation.y = reloj.valor * (escena.reducido ? 0 : 0.15) + i;
    let k = 0;
    PETALOS.forEach((capa, c) => {
      for (let j = 0; j < capa.n; j++) {
        const yaw = (j / capa.n) * Math.PI * 2 + c * 0.7;
        const tilt = capa.cerrada + (capa.abierta - capa.cerrada) * r.apertura;
        _o.position.set(Math.sin(yaw) * capa.r, 0.0, Math.cos(yaw) * capa.r);
        _o.rotation.set(0, 0, 0);
        _o.rotateY(yaw);
        _o.rotateX(tilt);
        const s = 0.3 + 0.7 * clamp(r.apertura * 1.6 - c * 0.18 + 0.4);
        _o.scale.set(capa.ancho * 2 * s, capa.largo * s, capa.ancho * 2 * s);
        _o.updateMatrix();
        petalos.current!.setMatrixAt(k++, _o.matrix);
      }
    });
    petalos.current!.instanceMatrix.needsUpdate = true;
    const latido = 1 + r.recoge * 0.5 * (0.5 + 0.5 * Math.sin(reloj.valor * 6));
    mat.uniforms.uBrillo.value = (1.1 + r.recoge * 0.8) * latido;
    mat.uniforms.uOpacidad.value = r.opacidad;
    mat.uniforms.uColor.value.copy(colorEnergia(r.sello > 0.5 ? 'rosa' : 'rosa'));
    const b = brillo.current!;
    b.position.set(0, 0.05, 0);
    const tb = 0.32 + 0.25 * r.recoge * latido;
    b.scale.set(tb, tb, 1);
    b.material.opacity = r.opacidad * (0.55 + 0.45 * r.recoge);
    const se = sello.current!;
    se.visible = r.sello > 0.001;
    se.position.set(0, 0.06, 0);
    se.scale.set(0.2, 0.17, 0.2);
    matSello.uniforms.uColor.value.copy(colorEnergia('violeta'));
    matSello.uniforms.uCobertura.value = r.sello;
    matSello.uniforms.uAlto.value = 0.34 * r.escala;
    matSello.uniforms.uBase.value = p[1] - 0.11 * r.escala;
    matSello.uniforms.uOpacidad.value = r.opacidad * 1.2;
    matSello.uniforms.uTiempo.value = reloj.valor;
    const d = disco.current!;
    d.position.set(0, -p[1] + 0.004, 0);
    (d.material as MeshBasicMaterial).opacity = r.opacidad * 0.5 * clamp(1 - (p[1] - TALLO) * 3);
    const ta = tallo.current!;
    ta.visible = r.apertura > 0.02;
    ta.scale.set(1, clamp(r.apertura * 1.5), 1);
  }, -5);
  return (
    <group ref={grupo} visible={false}>
      <instancedMesh ref={petalos} args={[geo, mat, N_PETALOS]} frustumCulled={false} renderOrder={6} />
      <sprite ref={brillo} renderOrder={5}>
        <spriteMaterial map={texturaHalo()} color={HEX_ENERGIA.rosa} blending={AdditiveBlending} depthWrite={false} transparent />
      </sprite>
      <mesh ref={sello} material={matSello} renderOrder={7}>
        <sphereGeometry args={[1, 40, 28]} />
      </mesh>
      <group ref={tallo}>
        <mesh position={[0, -TALLO / 2, 0]} material={MAT_TALLO} renderOrder={5}>
          <cylinderGeometry args={[0.004, 0.006, TALLO, 8, 1, true]} />
        </mesh>
        <mesh position={[0.025, -0.1, 0]} rotation={[0, 0, -0.9]} scale={[0.035, 0.05, 0.035]} geometry={geo} material={MAT_TALLO} renderOrder={5} />
        <mesh position={[-0.022, -0.06, 0.004]} rotation={[0.2, Math.PI, -0.8]} scale={[0.03, 0.045, 0.03]} geometry={geo} material={MAT_TALLO} renderOrder={5} />
      </group>
      <mesh ref={disco} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <circleGeometry args={[0.28, 40]} />
        <meshBasicMaterial map={texturaHalo()} color={HEX_ENERGIA.rosa} blending={AdditiveBlending} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── Bolsa negra ─────────────────────────────────────────────────────────

function torno(perfil: [number, number][], seg = 40) {
  const g = new LatheGeometry(
    perfil.map(([r, y]) => new Vector2(Math.max(1e-4, r), y)),
    seg,
  );
  g.computeVertexNormals();
  return g;
}

/** Arrugas de plástico: perturba el radio con ondas que no rompen la costura. */
function arrugar(g: LatheGeometry) {
  const pos = g.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = Math.min(1, y / 0.04) * Math.min(1, (0.285 - y) / 0.02 + 0.2);
    const f = 1 + k * (0.05 * Math.sin(a * 7 + y * 26) * Math.sin(y * 41 + a * 2) + 0.03 * Math.sin(a * 13 - y * 60));
    pos.setXYZ(i, x * f, y, z * f);
  }
  g.computeVertexNormals();
  return g;
}

function Bolsa() {
  const grupo = useRef<Group>(null);
  const cuerpo = useRef<Mesh>(null);
  const boca = useRef<Mesh>(null);
  const nudo = useRef<Mesh>(null);
  const geos = useMemo(
    () => ({
      cuerpo: arrugar(
        torno(
          [
            [0, 0],
            [0.085, 0.006],
            [0.128, 0.04],
            [0.148, 0.1],
            [0.146, 0.17],
            [0.125, 0.225],
            [0.075, 0.265],
            [0.032, 0.285],
          ],
          56,
        ),
      ),
      boca: torno([
        [0.03, 0.0],
        [0.036, 0.02],
        [0.052, 0.045],
        [0.068, 0.062],
      ]),
    }),
    [],
  );
  const mat = useMemo(() => {
    const m = crearMaterialCuerpo({ color: '#121019', rimColor: '#9a86e0', rim: 1.1, translucido: true });
    m.roughness = 0.34;
    m.metalness = 0.1;
    m.side = DoubleSide;
    return m;
  }, []);
  useFrame(() => {
    const o = escena.estado.objetos.bolsa;
    const g = grupo.current!;
    g.visible = o.activo && o.opacidad > 0.01;
    if (!g.visible) return;
    const p = posicionPegada(o.pos, o.ref, o.pegado);
    g.position.set(p[0], p[1], p[2]);
    g.rotation.y = o.rotY + (o.ref ? registro[o.ref.figura].rotY : 0);
    g.scale.setScalar(o.escala);
    const inflado = 0.5 + 0.55 * o.valor;
    cuerpo.current!.scale.set(inflado, 0.85 + 0.15 * o.valor, inflado * (0.55 + 0.45 * o.valor));
    const atada = o.valor2;
    const top = 0.285 * (0.85 + 0.15 * o.valor);
    boca.current!.position.set(0, top, 0);
    boca.current!.scale.set(1 - 0.5 * atada, 1 - 0.6 * atada, 1 - 0.5 * atada);
    nudo.current!.visible = atada > 0.05;
    nudo.current!.position.set(0, top + 0.01, 0);
    nudo.current!.scale.setScalar(0.028 * clamp(atada * 1.2));
    mat.opacity = o.opacidad;
  }, -5);
  return (
    <group ref={grupo} visible={false}>
      <mesh ref={cuerpo} geometry={geos.cuerpo} material={mat} />
      <mesh ref={boca} geometry={geos.boca} material={mat} />
      <mesh ref={nudo} material={mat}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
    </group>
  );
}

function Tacho() {
  const grupo = useRef<Group>(null);
  const mat = useMemo(() => {
    const m = crearMaterialCuerpo({ color: '#2b2f3a', rimColor: '#8fb6ff', rim: 0.9, translucido: true });
    m.roughness = 0.4;
    m.metalness = 0.6;
    m.side = DoubleSide;
    return m;
  }, []);
  useFrame(() => {
    const o = escena.estado.objetos.tacho;
    const g = grupo.current!;
    g.visible = o.activo && o.opacidad > 0.01;
    if (!g.visible) return;
    g.position.set(o.pos[0], o.pos[1], o.pos[2]);
    g.scale.setScalar(o.escala);
    mat.opacity = o.opacidad;
  });
  return (
    <group ref={grupo} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <circleGeometry args={[0.55, 40]} />
        <meshBasicMaterial map={texturaHalo()} color="#3c4a78" blending={AdditiveBlending} transparent depthWrite={false} />
      </mesh>
      <mesh material={mat} position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.48, 36, 1, true]} />
      </mesh>
      <mesh material={mat} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 36]} />
      </mesh>
      <mesh material={mat} position={[0, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.012, 10, 48]} />
      </mesh>
    </group>
  );
}

// ── Foto / dibujo en un atril ───────────────────────────────────────────

function texturaCuadro(tipo: 'persona' | 'sangre'): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const g = c.getContext('2d')!;
  const fondo = g.createLinearGradient(0, 0, 0, 320);
  fondo.addColorStop(0, '#f4ede2');
  fondo.addColorStop(1, '#e2d6c4');
  g.fillStyle = fondo;
  g.fillRect(0, 0, 256, 320);
  g.strokeStyle = '#3b3346';
  g.fillStyle = '#3b3346';
  g.lineWidth = 6;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (tipo === 'persona') {
    g.beginPath();
    g.arc(128, 120, 46, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(40, 300);
    g.quadraticCurveTo(48, 196, 128, 192);
    g.quadraticCurveTo(208, 196, 216, 300);
    g.closePath();
    g.fill();
  } else {
    g.strokeStyle = '#a3243b';
    g.fillStyle = 'rgba(190, 40, 64, 0.85)';
    g.beginPath();
    g.roundRect(70, 70, 116, 160, 26);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(128, 70);
    g.lineTo(128, 36);
    g.moveTo(128, 230);
    g.bezierCurveTo(128, 270, 170, 268, 176, 300);
    g.stroke();
    g.fillStyle = '#f4ede2';
    g.beginPath();
    g.moveTo(128, 120);
    g.bezierCurveTo(108, 150, 108, 172, 128, 176);
    g.bezierCurveTo(148, 172, 148, 150, 128, 120);
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function Cuadro({ nombre, tipo }: { nombre: 'foto' | 'dibujoSangre'; tipo: 'persona' | 'sangre' }) {
  const grupo = useRef<Group>(null);
  const tex = useMemo(() => texturaCuadro(tipo), [tipo]);
  const matMarco = useMemo(() => new MeshStandardMaterial({ color: '#3a2f28', roughness: 0.5, metalness: 0.2, transparent: true }), []);
  const matImagen = useMemo(
    () => new MeshStandardMaterial({ map: tex, roughness: 0.8, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.18, transparent: true }),
    [tex],
  );
  useFrame(() => {
    const o = escena.estado.objetos[nombre];
    const g = grupo.current!;
    g.visible = o.activo && o.opacidad > 0.01;
    if (!g.visible) return;
    g.position.set(o.pos[0], o.pos[1], o.pos[2]);
    g.rotation.y = o.rotY;
    g.scale.setScalar(o.escala * (0.6 + 0.4 * saleAtras(clamp(o.opacidad))));
    matMarco.opacity = matImagen.opacity = o.opacidad;
  });
  return (
    <group ref={grupo} visible={false}>
      <mesh material={matMarco} position={[0, 0.62, -0.012]}>
        <boxGeometry args={[0.31, 0.38, 0.02]} />
      </mesh>
      <mesh material={matImagen} position={[0, 0.62, 0.0]}>
        <planeGeometry args={[0.26, 0.325]} />
      </mesh>
      {/* Atril */}
      <mesh material={matMarco} position={[0, 0.22, -0.08]} rotation={[0.18, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.5, 8]} />
      </mesh>
      <mesh material={matMarco} position={[-0.1, 0.22, 0.02]} rotation={[-0.08, 0, 0.12]}>
        <cylinderGeometry args={[0.008, 0.008, 0.48, 8]} />
      </mesh>
      <mesh material={matMarco} position={[0.1, 0.22, 0.02]} rotation={[-0.08, 0, -0.12]}>
        <cylinderGeometry args={[0.008, 0.008, 0.48, 8]} />
      </mesh>
    </group>
  );
}

// ── Recipiente con foto y llama ─────────────────────────────────────────

function Recipiente() {
  const grupo = useRef<Group>(null);
  const carta = useRef<Mesh>(null);
  const tex = useMemo(() => texturaCuadro('persona'), []);
  const geo = useMemo(
    () =>
      torno([
        [0, 0],
        [0.09, 0.0],
        [0.15, 0.03],
        [0.18, 0.08],
        [0.19, 0.11],
        [0.18, 0.115],
        [0.165, 0.08],
        [0.13, 0.04],
        [0.0, 0.02],
      ]),
    [],
  );
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#8c5a3c', roughness: 0.38, metalness: 0.55, side: DoubleSide }), []);
  const matCarta = useMemo(() => new MeshStandardMaterial({ map: tex, roughness: 0.9, side: DoubleSide, transparent: true }), [tex]);
  const quemada = useMemo(() => new Color('#120b08'), []);
  const blanco = useMemo(() => new Color('#ffffff'), []);
  useFrame(() => {
    const o = escena.estado.objetos.recipiente;
    const g = grupo.current!;
    g.visible = o.activo && o.opacidad > 0.01;
    if (!g.visible) return;
    g.position.set(o.pos[0], o.pos[1], o.pos[2]);
    g.scale.setScalar(o.escala);
    // valor = combustión de la foto (0 intacta, 1 cenizas)
    const q = o.valor;
    const ca = carta.current!;
    ca.visible = q < 0.98;
    ca.scale.set(1 - 0.7 * q, 1 - 0.85 * q, 1);
    matCarta.color.copy(blanco).lerp(quemada, clamp(q * 1.6));
    matCarta.opacity = 1 - clamp((q - 0.7) / 0.3);
  });
  return (
    <group ref={grupo} visible={false}>
      <mesh geometry={geo} material={mat} />
      <mesh ref={carta} material={matCarta} position={[0, 0.07, 0]} rotation={[-1.1, 0, 0.2]}>
        <planeGeometry args={[0.13, 0.16]} />
      </mesh>
    </group>
  );
}

function Llama() {
  const grupo = useRef<Group>(null);
  const capas = useRef<(Sprite | null)[]>([]);
  useFrame(() => {
    const o = escena.estado.objetos.llama;
    const g = grupo.current!;
    g.visible = o.activo && o.valor > 0.01;
    if (!g.visible) return;
    g.position.set(o.pos[0], o.pos[1], o.pos[2]);
    const t = reloj.valor;
    capas.current.forEach((s, k) => {
      if (!s) return;
      const parpadeo = escena.reducido ? 1 : 0.85 + 0.15 * Math.sin(t * (9 + k * 3) + k);
      const alto = (0.12 + k * 0.07) * o.valor * parpadeo;
      s.position.set(Math.sin(t * 3 + k) * 0.01 * o.valor, 0.05 + alto * 0.55, 0);
      s.scale.set(alto * (0.75 - k * 0.12), alto * 1.6, 1);
      s.material.opacity = o.valor * (0.9 - k * 0.2);
    });
  });
  const colores = ['#ffd27a', '#ff8a3d', '#ff4d2e'];
  return (
    <group ref={grupo} visible={false}>
      {colores.map((c, k) => (
        <sprite key={c} ref={(s) => void (capas.current[k] = s)} renderOrder={9}>
          <spriteMaterial map={texturaHalo()} color={c} blending={AdditiveBlending} depthWrite={false} transparent />
        </sprite>
      ))}
    </group>
  );
}

// ── Cubo de luz (resumen de «mejorar-apuntes») ──────────────────────────

function Cubo() {
  const grupo = useRef<Group>(null);
  const esferas = useRef<InstancedMesh>(null);
  const aristas = useRef<InstancedMesh>(null);
  const columna = useRef<Mesh>(null);
  const geoArista = useMemo(() => {
    const g = new CylinderGeometry(0.008, 0.008, 1, 8, 1, true);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const matEsfera = useMemo(() => new MeshBasicMaterial({ color: new Color(HEX_ENERGIA.oro).multiplyScalar(2.2), transparent: true }), []);
  const matArista = useMemo(
    () => new MeshBasicMaterial({ color: new Color(HEX_ENERGIA.jade).multiplyScalar(1.6), transparent: true, blending: AdditiveBlending, depthWrite: false }),
    [],
  );
  const matColumna = useMemo(() => {
    const m = crearMaterialCascara();
    m.uniforms.uDesdeArriba.value = 1;
    return m;
  }, []);
  const colorBase = useMemo(() => new Color(HEX_ENERGIA.jade).multiplyScalar(1.6), []);
  const colorResalte = useMemo(() => new Color(HEX_ENERGIA.jade).multiplyScalar(4), []);

  useFrame(() => {
    const c = escena.estado.cubo;
    const g = grupo.current!;
    g.visible = c.activo && c.opacidad > 0.01;
    if (!g.visible) return;
    const { inf, sup } = esquinasCubo(c.centro, c.lado);
    // 32 esferas: grupos de 4 en cada esquina (inferiores con la vertical arriba).
    const d = 0.13;
    let k = 0;
    for (let gI = 0; gI < 8; gI++) {
      const esq = gI < 4 ? inf[gI] : sup[gI - 4];
      const arriba = gI < 4 ? 1 : -1;
      const sx = -Math.sign(esq[0] - c.centro[0]);
      const sz = -Math.sign(esq[2] - c.centro[2]);
      const aparece = saleAtras(clamp(c.grupos - gI));
      const offs: V3[] = [
        [0, 0, 0],
        [0, d * arriba, 0],
        [sx * d, 0, 0],
        [0, 0, sz * d],
      ];
      for (const o of offs) {
        const r = 0.032 * aparece;
        _m.compose(_v.set(esq[0] + o[0], esq[1] + o[1] + (1 - aparece) * 0.25 * arriba, esq[2] + o[2]), _q.identity(), _w.set(r, r, r));
        esferas.current!.setMatrixAt(k++, _m);
      }
    }
    esferas.current!.instanceMatrix.needsUpdate = true;

    // 12 aristas: cuadrado inferior en orden, superior en orden, verticales a la vez.
    const tramos: { a: V3; b: V3; k: number; vertical: number }[] = [];
    for (let j = 0; j < 4; j++) tramos.push({ a: inf[j], b: inf[(j + 1) % 4], k: clamp(c.inferior * 4 - j), vertical: -1 });
    for (let j = 0; j < 4; j++) tramos.push({ a: sup[j], b: sup[(j + 1) % 4], k: clamp(c.superior * 4 - j), vertical: -1 });
    for (let j = 0; j < 4; j++) tramos.push({ a: inf[j], b: sup[j], k: c.verticales, vertical: j });
    tramos.forEach((t, j) => {
      _v.set(t.b[0] - t.a[0], t.b[1] - t.a[1], t.b[2] - t.a[2]);
      const largo = _v.length() * t.k;
      _q.setFromUnitVectors(_arriba, _v.normalize());
      const grosor = t.vertical >= 0 && t.vertical === c.resaltada ? 1 + 1.8 * c.resalte : 1;
      _m.compose(_w.set(t.a[0], t.a[1], t.a[2]), _q, _escala.set(grosor, Math.max(1e-4, largo), grosor));
      aristas.current!.setMatrixAt(j, _m);
      aristas.current!.setColorAt(j, t.vertical >= 0 && t.vertical === c.resaltada ? _col.copy(colorBase).lerp(colorResalte, c.resalte) : colorBase);
    });
    aristas.current!.instanceMatrix.needsUpdate = true;
    if (aristas.current!.instanceColor) aristas.current!.instanceColor.needsUpdate = true;
    matArista.opacity = c.opacidad;
    matEsfera.opacity = Math.min(1, 0.35 + c.opacidad);

    // Columna central (tubo) que baja de la coronilla a los pies.
    const col = columna.current!;
    col.visible = c.columna > 0.001;
    col.position.set(c.centro[0], c.centro[1] + 0.86, c.centro[2]);
    col.scale.set(0.16, 0.86, 0.16);
    const u = matColumna.uniforms;
    u.uColor.value.copy(colorEnergia('violeta'));
    u.uCobertura.value = c.columna;
    u.uAlto.value = 1.72;
    u.uBase.value = c.centro[1];
    u.uOpacidad.value = c.opacidad * 0.9;
    u.uTiempo.value = reloj.valor;
  }, -5);

  return (
    <group ref={grupo} visible={false}>
      <instancedMesh ref={esferas} args={[GEO_ESFERITA, matEsfera, 32]} frustumCulled={false} />
      <instancedMesh ref={aristas} args={[geoArista, matArista, 12]} frustumCulled={false} renderOrder={4} />
      <mesh ref={columna} material={matColumna} renderOrder={8}>
        <cylinderGeometry args={[1, 1, 2, 40, 1, true]} />
      </mesh>
    </group>
  );
}

// ── Haces de cielo (+) y tierra (−) ─────────────────────────────────────

function materialHaz(color: string, haciaArriba: boolean) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uIntensidad: { value: 0 }, uTiempo: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensidad;
      uniform float uTiempo;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float y = vUv.y;
        float lado = pow(abs(dot(normalize(vN), normalize(vV))), 1.5);
        float extremo = ${haciaArriba ? '(1.0 - smoothstep(0.55, 1.0, y)) * smoothstep(0.0, 0.08, y)' : 'smoothstep(0.0, 0.5, y) * (1.0 - smoothstep(0.9, 1.0, y))'};
        float flujo = 0.75 + 0.25 * sin(y * 30.0 ${haciaArriba ? '-' : '+'} uTiempo * 4.0);
        float a = lado * extremo * flujo * uIntensidad * 0.55;
        gl_FragColor = vec4(uColor * a * 1.5, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

function Haces() {
  const cielo = useRef<Mesh>(null);
  const tierra = useRef<Mesh>(null);
  const matCielo = useMemo(() => materialHaz(HEX_ENERGIA.cielo, false), []);
  const matTierra = useMemo(() => materialHaz(HEX_ENERGIA.tierra, true), []);
  useFrame(() => {
    const e = escena.estado;
    const r = registro[0];
    cielo.current!.visible = e.cielo > 0.005;
    tierra.current!.visible = e.tierra > 0.005;
    cielo.current!.position.set(r.pos[0], 1.75 + 2.6, r.pos[2]);
    tierra.current!.position.set(r.pos[0], 0.55, r.pos[2]);
    matCielo.uniforms.uIntensidad.value = e.cielo;
    matTierra.uniforms.uIntensidad.value = e.tierra;
    matCielo.uniforms.uTiempo.value = matTierra.uniforms.uTiempo.value = reloj.valor;
  });
  return (
    <>
      <mesh ref={cielo} material={matCielo} renderOrder={3}>
        <cylinderGeometry args={[0.32, 0.12, 5.2, 32, 1, true]} />
      </mesh>
      <mesh ref={tierra} material={matTierra} renderOrder={3}>
        <cylinderGeometry args={[0.16, 0.42, 1.1, 32, 1, true]} />
      </mesh>
    </>
  );
}

// ── Rótulos y cotas ─────────────────────────────────────────────────────

const GEO_EXTREMO = new BoxGeometry(0.012, 0.002, 0.14);
const GEO_ESFERITA = new SphereGeometry(1, 14, 10);
const _col = new Color();

function Cotas() {
  const lineas = useRef<(Mesh | null)[]>([]);
  const extremos = useRef<(InstancedMesh | null)[]>([]);
  const mat = useMemo(
    () => new MeshBasicMaterial({ color: new Color('#e8e2ff').multiplyScalar(1.2), transparent: true, depthWrite: false, opacity: 0.9 }),
    [],
  );
  useFrame(() => {
    const cs = escena.estado.cotas;
    for (let i = 0; i < 3; i++) {
      const l = lineas.current[i];
      const ex = extremos.current[i];
      if (!l || !ex) continue;
      const c = cs[i];
      l.visible = ex.visible = !!c && c.k > 0.001;
      if (!c || !l.visible) continue;
      const dx = c.hasta[0] - c.desde[0];
      const dz = c.hasta[2] - c.desde[2];
      const largo = Math.hypot(dx, dz);
      const ang = Math.atan2(dx, dz);
      l.position.set(c.desde[0] + (dx * c.k) / 2, 0.012, c.desde[2] + (dz * c.k) / 2);
      l.rotation.set(0, ang, 0);
      l.scale.set(1, 1, Math.max(1e-3, largo * c.k));
      [c.desde, [c.desde[0] + dx * c.k, 0, c.desde[2] + dz * c.k] as V3].forEach((p, j) => {
        _o.position.set(p[0], 0.012, p[2]);
        _o.rotation.set(0, ang + Math.PI / 2, 0);
        _o.scale.set(1, 1, 1);
        _o.updateMatrix();
        ex.setMatrixAt(j, _o.matrix);
      });
      ex.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <group key={i}>
          <mesh ref={(m) => void (lineas.current[i] = m)} material={mat} visible={false} renderOrder={2}>
            <boxGeometry args={[0.012, 0.002, 1]} />
          </mesh>
          <instancedMesh ref={(m) => void (extremos.current[i] = m)} args={[GEO_EXTREMO, mat, 2]} visible={false} />
        </group>
      ))}
    </>
  );
}

export function Objetos() {
  return (
    <>
      {Array.from({ length: MAX_ROSAS }, (_, i) => (
        <UnaRosa key={i} i={i} />
      ))}
      <Bolsa />
      <Tacho />
      <Cuadro nombre="foto" tipo="persona" />
      <Cuadro nombre="dibujoSangre" tipo="sangre" />
      <Recipiente />
      <Llama />
      <Cubo />
      <Haces />
      <Cotas />
    </>
  );
}
