import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  type Mesh,
  type PointLight,
  type Points,
  type ShaderMaterial,
  SphereGeometry,
  type Sprite,
  Vector3,
} from 'three';
import { aMundo, posicionPegada, registro, resolver } from './anclas';
import { POS_ORGANOS, PUNTOS, transformarPunto } from './cuerpo';
import { ORGANOS } from '../contenido/ejercicios';
import { MAX_ESFERAS, MAX_FLUJOS } from './estado';
import { type V3, azar } from './mate';
import { colorEnergia } from './paleta';
import { crearMaterialCascara, crearMaterialEsfera, crearMaterialParticulas, reloj, texturaHalo } from './shaders';
import { escena } from './tienda';

const GEO_ESFERA = new SphereGeometry(1, 48, 32);
const _ejeX = new Vector3(1, 0, 0);
const _eje = new Vector3();

// ── Esferas ─────────────────────────────────────────────────────────────

function UnaEsfera({ i }: { i: number }) {
  const malla = useRef<Mesh>(null);
  const halo = useRef<Sprite>(null);
  const mat = useMemo(() => crearMaterialEsfera(), []);
  useFrame(() => {
    const s = escena.estado.esferas[i];
    const m = malla.current!;
    const h = halo.current!;
    const visible = s.activa && s.opacidad > 0.005 && s.radio > 0.001;
    m.visible = h.visible = visible;
    if (!visible) return;
    const p = posicionPegada(s.pos, s.ref, s.pegado);
    m.position.set(p[0], p[1], p[2]);
    const est = Math.max(0.2, s.estirar);
    const r = s.radio;
    m.scale.set(r * est, r / Math.sqrt(est), r / Math.sqrt(est));
    if (s.eje) {
      // Se estira a lo largo de `eje` (p. ej. entre el brazo y la mano que palpa).
      m.quaternion.setFromUnitVectors(_ejeX, _eje.set(s.eje[0], s.eje[1], s.eje[2]).normalize());
    } else {
      m.rotation.set(0, s.ref ? registro[s.ref.figura].rotY : 0, 0);
    }
    const u = mat.uniforms;
    u.uTiempo.value = reloj.valor;
    u.uColor.value.copy(colorEnergia(s.color));
    u.uColor2.value.copy(colorEnergia(s.color2 ?? s.color));
    u.uMezcla.value = s.color2 ? s.mezcla : 0;
    u.uBrillo.value = s.brillo * 1.5;
    // A través del cuerpo: se dibuja por encima de la figura, algo transparente.
    const atraves = s.atraves > 0.5;
    const opacidad = s.opacidad * (1 - 0.35 * s.atraves);
    mat.depthTest = !atraves;
    u.uOpacidad.value = opacidad;
    u.uAgujero.value = s.agujero;
    u.uSemilla.value = i;
    h.position.copy(m.position);
    const tamHalo = r * (3.6 + 1.0 * s.brillo) * Math.max(1, est * 0.8);
    h.scale.set(tamHalo, tamHalo, 1);
    const hm = h.material;
    hm.color.copy(colorEnergia(s.color)).multiplyScalar(0.32 * s.brillo);
    hm.opacity = opacidad;
    hm.depthTest = !atraves;
  }, -5);
  return (
    <>
      <mesh ref={malla} geometry={GEO_ESFERA} material={mat} renderOrder={5} visible={false} />
      <sprite ref={halo} visible={false} renderOrder={4}>
        <spriteMaterial map={texturaHalo()} blending={AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
      </sprite>
    </>
  );
}

/** Luz que acompaña a la esfera más brillante: ilumina manos y cuerpo. */
function LuzEnergia() {
  const luz = useRef<PointLight>(null);
  useFrame(() => {
    const l = luz.current!;
    let mejor = -1;
    let valor = 0;
    escena.estado.esferas.forEach((s, i) => {
      const v = s.activa && s.ilumina ? s.brillo * s.opacidad * s.radio : 0;
      if (v > valor) {
        valor = v;
        mejor = i;
      }
    });
    if (mejor < 0) {
      l.intensity = 0;
      return;
    }
    const s = escena.estado.esferas[mejor];
    const p = posicionPegada(s.pos, s.ref, s.pegado);
    l.position.set(p[0], p[1], p[2]);
    l.color.copy(colorEnergia(s.color));
    l.intensity = Math.min(0.5, valor * 6);
  }, -4);
  return <pointLight ref={luz} distance={1.6} decay={2} intensity={0} />;
}

export function Esferas() {
  return (
    <>
      {Array.from({ length: MAX_ESFERAS }, (_, i) => (
        <UnaEsfera key={i} i={i} />
      ))}
      <LuzEnergia />
    </>
  );
}

// ── Flujos de partículas ────────────────────────────────────────────────

const N_PART = 110;
const _a = new Vector3();
const _t = new Vector3();
const _n = new Vector3();
const _b = new Vector3();
const _arriba = new Vector3(0, 1, 0);

function UnFlujo({ i }: { i: number }) {
  const puntos = useRef<Points>(null);
  const { geo, matA, curva } = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(N_PART * 3), 3));
    geo.setAttribute('aAlfa', new BufferAttribute(new Float32Array(N_PART), 1));
    geo.setAttribute('aTam', new BufferAttribute(new Float32Array(N_PART), 1));
    const curva = new CatmullRomCurve3([new Vector3(), new Vector3(0, 1, 0)], false, 'centripetal');
    return { geo, matA: crearMaterialParticulas(true), curva };
  }, []);

  const firma = useRef('');
  useFrame((state) => {
    const f = escena.estado.flujos[i];
    const pts = puntos.current!;
    const visible = f.activo && f.puntos.length >= 2 && f.intensidad > 0.01;
    pts.visible = visible;
    if (!visible) return;
    const mat = matA;
    if (pts.material !== mat) pts.material = mat;
    mat.uniforms.uColor.value.copy(colorEnergia(f.color));
    mat.uniforms.uIntensidad.value = (f.color === 'sombra' ? 0.7 : 1.6) * f.intensidad;
    mat.uniforms.uEscala.value = f.ancho;
    mat.uniforms.uDpr.value = state.gl.getPixelRatio();

    // Actualiza la curva con los puntos resueltos (pueden moverse con las manos).
    const resueltos = f.puntos.map(resolver);
    const nueva = resueltos.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}`).join(';');
    if (nueva !== firma.current) {
      firma.current = nueva;
      while (curva.points.length < resueltos.length) curva.points.push(new Vector3());
      curva.points.length = resueltos.length;
      resueltos.forEach((p, k) => curva.points[k].set(p[0], p[1], p[2]));
      curva.updateArcLengths();
    }

    const pos = geo.getAttribute('position') as BufferAttribute;
    const alfa = geo.getAttribute('aAlfa') as BufferAttribute;
    const tam = geo.getAttribute('aTam') as BufferAttribute;
    const desde = f.cabeza - f.cola;
    const velocidad = escena.reducido ? 0.05 : 0.32;
    for (let k = 0; k < N_PART; k++) {
      const semilla = azar(k * 3.1 + i * 17.7);
      // Cada partícula avanza por la estela; su posición relativa se recicla.
      const frac = (semilla + reloj.valor * velocidad * (0.7 + 0.6 * azar(k + 5))) % 1;
      const u = desde + frac * f.cola;
      if (u < 0 || u > 1) {
        alfa.setX(k, 0);
        continue;
      }
      curva.getPointAt(u, _a);
      curva.getTangentAt(u, _t);
      _n.crossVectors(_t, _arriba);
      if (_n.lengthSq() < 1e-4) _n.set(1, 0, 0);
      _n.normalize();
      _b.crossVectors(_t, _n).normalize();
      const ang = semilla * Math.PI * 2 + reloj.valor * (1.5 + semilla * 2);
      const rad = f.remolino * (0.4 + 0.6 * azar(k + 11));
      _a.addScaledVector(_n, Math.cos(ang) * rad).addScaledVector(_b, Math.sin(ang) * rad);
      pos.setXYZ(k, _a.x, _a.y, _a.z);
      // Se desvanece en los extremos de la estela.
      const borde = Math.min(frac / 0.25, (1 - frac) / 0.12, 1);
      alfa.setX(k, Math.max(0, borde) * (0.55 + 0.45 * azar(k + 2)));
      tam.setX(k, (0.018 + 0.03 * azar(k + 9)) * (0.6 + 0.4 * frac));
    }
    pos.needsUpdate = true;
    alfa.needsUpdate = true;
    tam.needsUpdate = true;
  }, -5);

  return <points ref={puntos} geometry={geo} material={matA} frustumCulled={false} renderOrder={6} visible={false} />;
}

export function Flujos() {
  return (
    <>
      {Array.from({ length: MAX_FLUJOS }, (_, i) => (
        <UnFlujo key={i} i={i} />
      ))}
    </>
  );
}

// ── Pulsos (ondas esféricas) ────────────────────────────────────────────

const MAX_PULSOS = 4;
function UnPulso({ i }: { i: number }) {
  const malla = useRef<Mesh>(null);
  const mat = useMemo(() => {
    const m = crearMaterialCascara();
    m.uniforms.uMeridianos.value = 0;
    m.uniforms.uCobertura.value = 1;
    m.uniforms.uAlto.value = 100;
    m.uniforms.uBase.value = -50;
    return m;
  }, []);
  useFrame(() => {
    const p = escena.estado.pulsos[i];
    const m = malla.current!;
    m.visible = !!p && p.k > 0 && p.k < 1;
    if (!p || !m.visible) return;
    const c = posicionPegada(p.pos, p.ref, 1);
    m.position.set(c[0], c[1], c[2]);
    const r = p.radio * (0.15 + 0.85 * Math.pow(p.k, 0.6));
    m.scale.setScalar(r);
    mat.uniforms.uColor.value.copy(colorEnergia(p.color));
    mat.uniforms.uOpacidad.value = Math.pow(1 - p.k, 1.6) * 1.6;
  }, -5);
  return <mesh ref={malla} geometry={GEO_ESFERA} material={mat} visible={false} renderOrder={7} />;
}

export function Pulsos() {
  return (
    <>
      {Array.from({ length: MAX_PULSOS }, (_, i) => (
        <UnPulso key={i} i={i} />
      ))}
    </>
  );
}

// ── Órganos y centros (puntos luminosos dentro / sobre el cuerpo) ──────

interface PuntoLuz {
  tipo: 'organo' | 'centro';
  id: string;
  local: V3;
  base: number;
}

export function OrganosYCentros() {
  const ref = useRef<Points>(null);
  const lista = useMemo<PuntoLuz[]>(() => {
    const l: PuntoLuz[] = [];
    for (const o of ORGANOS) {
      for (const p of POS_ORGANOS[o.id] ?? []) l.push({ tipo: 'organo', id: o.id, local: p, base: o.id === 'cerebro' ? 0.075 : 0.11 });
    }
    for (const [id, p] of Object.entries(PUNTOS)) {
      if (id === 'pies' || id === 'pelvis' || id === 'boca') continue;
      l.push({ tipo: 'centro', id, local: [p[0], p[1], p[2] + Math.sign(p[2]) * 0.02], base: 0.1 });
    }
    return l;
  }, []);
  const { geo, mat } = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(lista.length * 3), 3));
    geo.setAttribute('aAlfa', new BufferAttribute(new Float32Array(lista.length), 1));
    geo.setAttribute('aTam', new BufferAttribute(new Float32Array(lista.length), 1));
    geo.setAttribute('color', new BufferAttribute(new Float32Array(lista.length * 3), 3));
    const mat = crearMaterialParticulas(true) as ShaderMaterial;
    mat.vertexShader = mat.vertexShader
      .replace('varying float vAlfa;', 'varying float vAlfa;\nattribute vec3 color;\nvarying vec3 vColor;')
      .replace('vAlfa = aAlfa;', 'vAlfa = aAlfa; vColor = color;');
    mat.fragmentShader = mat.fragmentShader
      .replace('varying float vAlfa;', 'varying float vAlfa;\nvarying vec3 vColor;')
      .replace('vec3 c = uColor', 'vec3 c = vColor');
    mat.depthTest = false;
    return { geo, mat };
  }, [lista]);

  useFrame((state) => {
    const e = escena.estado;
    const r = registro[0];
    mat.uniforms.uDpr.value = state.gl.getPixelRatio();
    const pos = geo.getAttribute('position') as BufferAttribute;
    const alfa = geo.getAttribute('aAlfa') as BufferAttribute;
    const tam = geo.getAttribute('aTam') as BufferAttribute;
    const col = geo.getAttribute('color') as BufferAttribute;
    let algo = false;
    lista.forEach((p, k) => {
      const v = p.tipo === 'organo' ? (e.organos[p.id] ?? 0) : (e.centros[p.id as keyof typeof e.centros] ?? 0);
      if (v > 0.003) algo = true;
      const w = aMundo(0, transformarPunto(p.local, r.pose.agachar, r.pose.inclinar));
      pos.setXYZ(k, w[0], w[1], w[2]);
      const latido = escena.reducido ? 1 : 0.85 + 0.15 * Math.sin(reloj.valor * 3 + k);
      alfa.setX(k, Math.min(1, v) * latido);
      tam.setX(k, p.base * (0.6 + 0.4 * Math.min(1, v)) * (1 + 0.6 * Math.max(0, v - 1)));
      const o = ORGANOS.find((x) => x.id === p.id);
      const c = colorEnergia(p.tipo === 'organo' ? (o?.polaridad === 'tierra' ? 'tierra' : 'cielo') : 'oro');
      col.setXYZ(k, c.r, c.g, c.b);
    });
    ref.current!.visible = algo && e.figuras[0].activa;
    pos.needsUpdate = alfa.needsUpdate = tam.needsUpdate = col.needsUpdate = true;
  }, -5);

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={2} visible={false} />;
}

// ── Mantos (aura alrededor de una figura) ───────────────────────────────

const GEO_MANTO = (() => {
  const g = new SphereGeometry(1, 64, 48);
  return g;
})();

function UnManto({ i }: { i: number }) {
  const malla = useRef<Mesh>(null);
  const mat = useMemo(() => crearMaterialCascara(), []);
  useFrame(() => {
    const m = escena.estado.mantos[i];
    const me = malla.current!;
    me.visible = m.activo && m.opacidad > 0.005 && m.cobertura > 0.001;
    if (!me.visible) return;
    me.position.set(m.centro[0], m.centro[1] + m.alto / 2, m.centro[2]);
    me.scale.set(m.radio, m.alto / 2, m.radio);
    const u = mat.uniforms;
    u.uTiempo.value = reloj.valor;
    u.uColor.value.copy(colorEnergia(m.color));
    u.uOpacidad.value = m.opacidad;
    u.uCobertura.value = m.cobertura;
    u.uDesdeArriba.value = m.desdeArriba ? 1 : 0;
    u.uBanda.value = m.banda;
    u.uMeridianos.value = m.lineas;
    u.uAlto.value = m.alto;
    u.uBase.value = m.centro[1];
  }, -5);
  return <mesh ref={malla} geometry={GEO_MANTO} material={mat} visible={false} renderOrder={8} />;
}

export function Mantos() {
  return (
    <>
      <UnManto i={0} />
      <UnManto i={1} />
    </>
  );
}
