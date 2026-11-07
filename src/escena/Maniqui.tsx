import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  CapsuleGeometry,
  type Group,
  type InstancedMesh,
  LatheGeometry,
  Matrix4,
  type Mesh,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { publicarFigura } from './anclas';
import { type Pose, PROP, copiarPose, resolverEsqueleto } from './cuerpo';
import { crearMaterialCuerpo, TONOS, type MaterialCuerpo } from './materiales';
import { type V3, amortiguar, cruzV, lerp, normV } from './mate';
import { NEUTRA } from './poses';
import { escena } from './tienda';

// ── Geometrías (compartidas) ────────────────────────────────────────────

/** Segmento ahusado de longitud fija a lo largo de +Y, con extremos redondeados. */
function segmento(largo: number, r0: number, r1: number, bulto = 0, desplazBulto = 0.4) {
  const pts: Vector2[] = [];
  const nCap = 7;
  for (let i = 0; i <= nCap; i++) {
    const a = -Math.PI / 2 + (i / nCap) * (Math.PI / 2);
    pts.push(new Vector2(Math.max(1e-4, r0 * Math.cos(a)), r0 * Math.sin(a)));
  }
  const nMed = 14;
  for (let j = 1; j < nMed; j++) {
    const k = j / nMed;
    // Remapea k para que el abultamiento tenga su máximo en `desplazBulto`.
    const kb = k < desplazBulto ? (0.5 * k) / desplazBulto : 0.5 + (0.5 * (k - desplazBulto)) / (1 - desplazBulto);
    const forma = Math.pow(Math.sin(Math.PI * kb), 1.4);
    pts.push(new Vector2(lerp(r0, r1, k) + bulto * forma, k * largo));
  }
  for (let i = 0; i <= nCap; i++) {
    const a = (i / nCap) * (Math.PI / 2);
    pts.push(new Vector2(Math.max(1e-4, r1 * Math.cos(a)), largo + r1 * Math.sin(a)));
  }
  const g = new LatheGeometry(pts, 28);
  g.computeVertexNormals();
  return g;
}

/** Perfil de revolución genérico [radio, altura]. */
function torno(perfil: [number, number][], seg = 36) {
  const g = new LatheGeometry(
    perfil.map(([r, y]) => new Vector2(Math.max(1e-4, r), y)),
    seg,
  );
  g.computeVertexNormals();
  return g;
}

function crearGeometrias() {
  const pecho = torno([
    [0.0, -0.02],
    [0.112, -0.015],
    [0.122, 0.06],
    [0.142, 0.15],
    [0.156, 0.24],
    [0.156, 0.31],
    [0.146, 0.36],
    [0.122, 0.405],
    [0.085, 0.435],
    [0.05, 0.452],
    [0.0, 0.458],
  ]);
  pecho.scale(1, 1, 0.64);
  const pelvis = torno([
    [0.0, -0.005],
    [0.06, 0.0],
    [0.112, 0.03],
    [0.145, 0.085],
    [0.152, 0.13],
    [0.14, 0.175],
    [0.12, 0.215],
    [0.112, 0.245],
    [0.0, 0.25],
  ]);
  pelvis.scale(1, 1, 0.72);
  const cintura = new SphereGeometry(0.116, 32, 20);
  cintura.scale(1, 0.9, 0.66);
  const cabeza = torno(
    Array.from({ length: 22 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 21) * Math.PI;
      const y = Math.sin(a);
      const ancho = Math.cos(a) * (y < 0 ? 1 - 0.2 * -y : 1);
      return [0.098 * ancho, 0.118 * y] as [number, number];
    }),
    36,
  );
  cabeza.scale(0.9, 1, 1.04);
  // Rasgos mínimos para leer hacia dónde mira: nariz y arco de las cejas.
  const nariz = new CapsuleGeometry(0.011, 0.032, 4, 10);
  nariz.rotateX(-0.32);
  nariz.translate(0, -0.012, 0.1);
  const cejas = new CapsuleGeometry(0.009, 0.075, 4, 10);
  cejas.rotateZ(Math.PI / 2);
  cejas.translate(0, 0.022, 0.087);
  const cabezaConRasgos = mergeGeometries([cabeza.toNonIndexed(), nariz.toNonIndexed(), cejas.toNonIndexed()]);
  const cuello = new CapsuleGeometry(0.046, 0.09, 6, 20);
  const articulacion = new SphereGeometry(1, 20, 14);
  const mano = new CapsuleGeometry(0.029, 0.085, 6, 14);
  mano.scale(1.3, 1, 0.48);
  const pulgar = new CapsuleGeometry(0.0125, 0.04, 4, 10);
  const pie = new CapsuleGeometry(0.04, 0.15, 6, 16);
  pie.rotateX(Math.PI / 2);
  pie.scale(1.12, 0.66, 1);
  return {
    pecho,
    pelvis,
    cintura,
    cabeza: cabezaConRasgos,
    cuello,
    articulacion,
    mano,
    pulgar,
    pie,
    brazo: segmento(PROP.brazo, 0.043, 0.036, 0.008),
    antebrazo: segmento(PROP.antebrazo, 0.034, 0.026, 0.006, 0.3),
    muslo: segmento(PROP.muslo, 0.07, 0.048, 0.006, 0.6),
    pierna: segmento(PROP.pierna, 0.046, 0.032, 0.01, 0.65),
  };
}

let GEOS: ReturnType<typeof crearGeometrias> | null = null;
const geos = () => (GEOS ??= crearGeometrias());

// ── Utilidades de matrices ──────────────────────────────────────────────

const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _dir = new Vector3();
const _up = new Vector3(0, 1, 0);
const _ejeX = new Vector3();
const _ejeY = new Vector3();
const _ejeZ = new Vector3();
const _rot = new Matrix4();

function matrizSegmento(a: V3, b: V3) {
  _p.set(a[0], a[1], a[2]);
  _dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  _q.setFromUnitVectors(_up, _dir);
  _s.set(1, 1, 1);
  return _m.compose(_p, _q, _s);
}

function matrizEsfera(c: V3, r: number) {
  _p.set(c[0], c[1], c[2]);
  _q.identity();
  _s.set(r, r, r);
  return _m.compose(_p, _q, _s);
}

/** Matriz con eje Y = dedos y eje Z = normal de la palma. */
function matrizMarco(centro: V3, y: V3, z: V3) {
  _ejeY.set(y[0], y[1], y[2]).normalize();
  _ejeZ.set(z[0], z[1], z[2]).normalize();
  _ejeX.crossVectors(_ejeY, _ejeZ).normalize();
  _ejeZ.crossVectors(_ejeX, _ejeY).normalize();
  _rot.makeBasis(_ejeX, _ejeY, _ejeZ);
  _q.setFromRotationMatrix(_rot);
  _p.set(centro[0], centro[1], centro[2]);
  _s.set(1, 1, 1);
  return _m.compose(_p, _q, _s);
}

// ── Amortiguación de pose ───────────────────────────────────────────────

function amortiguarV(a: V3, b: V3, l: number, dt: number) {
  a[0] = amortiguar(a[0], b[0], l, dt);
  a[1] = amortiguar(a[1], b[1], l, dt);
  a[2] = amortiguar(a[2], b[2], l, dt);
}

function amortiguarPose(act: Pose, obj: Pose, l: number, dt: number) {
  amortiguarV(act.manoD, obj.manoD, l, dt);
  amortiguarV(act.manoI, obj.manoI, l, dt);
  amortiguarV(act.codoD, obj.codoD, l, dt);
  amortiguarV(act.codoI, obj.codoI, l, dt);
  amortiguarV(act.palmaD, obj.palmaD, l, dt);
  amortiguarV(act.palmaI, obj.palmaI, l, dt);
  for (const k of ['dedosD', 'dedosI'] as const) {
    const o = obj[k];
    if (!o) act[k] = null;
    else if (!act[k]) act[k] = [...o];
    else {
      amortiguarV(act[k]!, o, l, dt);
      act[k] = normV(act[k]!);
    }
  }
  act.agachar = amortiguar(act.agachar, obj.agachar, l, dt);
  act.inclinar = amortiguar(act.inclinar, obj.inclinar, l, dt);
  act.cabezaPitch = amortiguar(act.cabezaPitch, obj.cabezaPitch, l, dt);
  act.cabezaYaw = amortiguar(act.cabezaYaw, obj.cabezaYaw, l, dt);
}

// ── Componente ─────────────────────────────────────────────────────────

const ARTICULACIONES = 12;

export function Maniqui({ indice }: { indice: 0 | 1 }) {
  const g = geos();
  const grupo = useRef<Group>(null);
  const refs = {
    pecho: useRef<Mesh>(null),
    pelvis: useRef<Mesh>(null),
    cintura: useRef<Mesh>(null),
    cabeza: useRef<Mesh>(null),
    cuello: useRef<Mesh>(null),
    art: useRef<InstancedMesh>(null),
    brazo: useRef<InstancedMesh>(null),
    antebrazo: useRef<InstancedMesh>(null),
    muslo: useRef<InstancedMesh>(null),
    pierna: useRef<InstancedMesh>(null),
    mano: useRef<InstancedMesh>(null),
    pulgar: useRef<InstancedMesh>(null),
    pie: useRef<InstancedMesh>(null),
  };
  const actual = useRef<Pose>(copiarPose(NEUTRA));
  const visible = useRef(false);

  const mats = useMemo(() => {
    const crear = (t: keyof typeof TONOS, translucido: boolean, opacidad?: number) =>
      crearMaterialCuerpo({ ...TONOS[t], translucido, opacidad });
    return {
      yo: crear('yo', false),
      otro: crear('otro', false),
      yoT: crear('yo', true, 0.3),
      otroT: crear('otro', true, 0.3),
      vision: crear('vision', true, 0.38),
    };
  }, []);

  const pos = useRef<V3>([0, 0, 0]);
  const rot = useRef(0);

  useFrame((_, dtReal) => {
    const f = escena.estado.figuras[indice];
    const gr = grupo.current;
    if (!gr) return;
    const activa = f.activa && f.opacidad > 0.01;
    gr.visible = activa;
    if (!activa) {
      visible.current = false;
      return;
    }
    const dt = Math.min(dtReal, 0.1);
    const corte = escena.corte || !visible.current || escena.reducido;
    visible.current = true;

    // Pose dibujada: sigue a la pose objetivo con amortiguación.
    if (corte) {
      actual.current = copiarPose(f.pose);
      pos.current = [...f.pos];
      rot.current = f.rotY;
    } else {
      amortiguarPose(actual.current, f.pose, f.agilidad, dt);
      amortiguarV(pos.current, f.pos, f.agilidad * 0.8, dt);
      rot.current = amortiguar(rot.current, f.rotY, f.agilidad * 0.8, dt);
    }
    const p = actual.current;
    const e = resolverEsqueleto(p);
    publicarFigura(indice, pos.current, rot.current, p, e);
    gr.position.set(pos.current[0], pos.current[1], pos.current[2]);
    gr.rotation.y = rot.current;

    // Material según tono y transparencia.
    let mat: MaterialCuerpo;
    if (f.tono === 'vision') {
      mat = mats.vision;
      mat.opacity = 0.38 * f.opacidad;
    } else if (f.rayos > 0.01 || f.opacidad < 0.99) {
      mat = f.tono === 'yo' ? mats.yoT : mats.otroT;
      mat.opacity = lerp(1, 0.22, f.rayos) * f.opacidad;
    } else {
      mat = f.tono === 'yo' ? mats.yo : mats.otro;
    }
    const orden = mat.transparent ? 3 : 0;
    for (const r of Object.values(refs)) {
      const m = r.current;
      if (m) {
        if (m.material !== mat) m.material = mat;
        m.renderOrder = orden;
      }
    }

    // Torso
    const pecho = refs.pecho.current!;
    pecho.position.set(e.pivote[0], e.pivote[1], e.pivote[2]);
    pecho.rotation.set(e.inclinar, 0, 0);
    const pelvis = refs.pelvis.current!;
    pelvis.position.set(0, 0.8 - p.agachar, -0.36 * p.agachar);
    pelvis.rotation.set(0.5 * p.agachar, 0, 0);
    const cintura = refs.cintura.current!;
    cintura.position.set(e.pivote[0], e.pivote[1] + 0.005, e.pivote[2]);
    cintura.rotation.set(e.inclinar * 0.5, 0, 0);
    const cuello = refs.cuello.current!;
    cuello.position.set(e.cuello[0], e.cuello[1] + 0.02 * Math.cos(e.inclinar), e.cuello[2] + 0.02 * Math.sin(e.inclinar));
    cuello.rotation.set(e.inclinar + 0.12, 0, 0);
    const cabeza = refs.cabeza.current!;
    cabeza.position.set(e.cabeza[0], e.cabeza[1], e.cabeza[2]);
    cabeza.rotation.set(e.cabezaPitch, e.cabezaYaw, 0, 'YXZ');

    // Extremidades
    const brazo = refs.brazo.current!;
    brazo.setMatrixAt(0, matrizSegmento(e.hombroD, e.codoD));
    brazo.setMatrixAt(1, matrizSegmento(e.hombroI, e.codoI));
    brazo.instanceMatrix.needsUpdate = true;
    const ante = refs.antebrazo.current!;
    ante.setMatrixAt(0, matrizSegmento(e.codoD, e.munecaD));
    ante.setMatrixAt(1, matrizSegmento(e.codoI, e.munecaI));
    ante.instanceMatrix.needsUpdate = true;
    const muslo = refs.muslo.current!;
    muslo.setMatrixAt(0, matrizSegmento(e.caderaD, e.rodillaD));
    muslo.setMatrixAt(1, matrizSegmento(e.caderaI, e.rodillaI));
    muslo.instanceMatrix.needsUpdate = true;
    const pierna = refs.pierna.current!;
    pierna.setMatrixAt(0, matrizSegmento(e.rodillaD, e.tobilloD));
    pierna.setMatrixAt(1, matrizSegmento(e.rodillaI, e.tobilloI));
    pierna.instanceMatrix.needsUpdate = true;

    const art = refs.art.current!;
    const juntas: [V3, number][] = [
      [e.hombroD, 0.056],
      [e.hombroI, 0.056],
      [e.codoD, 0.037],
      [e.codoI, 0.037],
      [e.munecaD, 0.028],
      [e.munecaI, 0.028],
      [e.rodillaD, 0.05],
      [e.rodillaI, 0.05],
      [e.tobilloD, 0.034],
      [e.tobilloI, 0.034],
      [e.caderaD, 0.07],
      [e.caderaI, 0.07],
    ];
    juntas.forEach(([c, r], i) => art.setMatrixAt(i, matrizEsfera(c, r)));
    art.instanceMatrix.needsUpdate = true;

    // Manos y pulgares
    const mano = refs.mano.current!;
    const pulgar = refs.pulgar.current!;
    const manos = [
      { pm: e.palmaD, lado: -1 },
      { pm: e.palmaI, lado: 1 },
    ];
    manos.forEach(({ pm, lado }, i) => {
      mano.setMatrixAt(i, matrizMarco(pm.centro, pm.dedos, pm.normal));
      // El pulgar sale hacia el lado lateral de cada mano.
      const lateral = cruzV(pm.dedos, pm.normal);
      const s = lado === -1 ? -1 : 1;
      const base: V3 = [
        pm.centro[0] - pm.dedos[0] * 0.035 + lateral[0] * 0.034 * s + pm.normal[0] * 0.012,
        pm.centro[1] - pm.dedos[1] * 0.035 + lateral[1] * 0.034 * s + pm.normal[1] * 0.012,
        pm.centro[2] - pm.dedos[2] * 0.035 + lateral[2] * 0.034 * s + pm.normal[2] * 0.012,
      ];
      const dirPulgar = normV([
        pm.dedos[0] * 0.75 + lateral[0] * 0.55 * s + pm.normal[0] * 0.3,
        pm.dedos[1] * 0.75 + lateral[1] * 0.55 * s + pm.normal[1] * 0.3,
        pm.dedos[2] * 0.75 + lateral[2] * 0.55 * s + pm.normal[2] * 0.3,
      ]);
      pulgar.setMatrixAt(i, matrizMarco(base, dirPulgar, pm.normal));
    });
    mano.instanceMatrix.needsUpdate = true;
    pulgar.instanceMatrix.needsUpdate = true;

    // Pies (fijos en el piso)
    const pie = refs.pie.current!;
    pie.setMatrixAt(0, matrizEsfera([e.tobilloD[0] - 0.006, 0.03, e.tobilloD[2] + 0.065], 1));
    pie.setMatrixAt(1, matrizEsfera([e.tobilloI[0] + 0.006, 0.03, e.tobilloI[2] + 0.065], 1));
    pie.instanceMatrix.needsUpdate = true;
  }, -20);

  return (
    <group ref={grupo} visible={false}>
      <mesh ref={refs.pecho} geometry={g.pecho} material={mats.yo} />
      <mesh ref={refs.pelvis} geometry={g.pelvis} material={mats.yo} />
      <mesh ref={refs.cintura} geometry={g.cintura} material={mats.yo} />
      <mesh ref={refs.cuello} geometry={g.cuello} material={mats.yo} />
      <mesh ref={refs.cabeza} geometry={g.cabeza} material={mats.yo} />
      <instancedMesh ref={refs.art} args={[g.articulacion, mats.yo, ARTICULACIONES]} frustumCulled={false} />
      <instancedMesh ref={refs.brazo} args={[g.brazo, mats.yo, 2]} frustumCulled={false} />
      <instancedMesh ref={refs.antebrazo} args={[g.antebrazo, mats.yo, 2]} frustumCulled={false} />
      <instancedMesh ref={refs.muslo} args={[g.muslo, mats.yo, 2]} frustumCulled={false} />
      <instancedMesh ref={refs.pierna} args={[g.pierna, mats.yo, 2]} frustumCulled={false} />
      <instancedMesh ref={refs.mano} args={[g.mano, mats.yo, 2]} frustumCulled={false} />
      <instancedMesh ref={refs.pulgar} args={[g.pulgar, mats.yo, 2]} frustumCulled={false} />
      <instancedMesh ref={refs.pie} args={[g.pie, mats.yo, 2]} frustumCulled={false} />
    </group>
  );
}
