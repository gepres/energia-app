import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Group, type InstancedMesh, Matrix4, type Mesh, Quaternion, Vector3 } from 'three';
import { publicarFigura } from './anclas';
import { PROP, type Pose, copiarPose, resolverEsqueleto } from './cuerpo';
import { crearGeometrias, crearTorso } from './cuerpoGeo';
import { crearManos } from './manos';
import { crearMaterialCuerpo, TONOS, type MaterialCuerpo } from './materiales';
import { type V3, amortiguar, lerp, normV } from './mate';
import { NEUTRA } from './poses';
import { escena } from './tienda';

let GEOS: ReturnType<typeof crearGeometrias> | null = null;
const geos = () => (GEOS ??= crearGeometrias());

// ── Utilidades de matrices ──────────────────────────────────────────────

const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _dir = new Vector3();
const _up = new Vector3(0, 1, 0);
const _eje = new Vector3(1, 0, 0);
const _t = new Vector3();

function matrizSegmento(a: V3, b: V3) {
  _p.set(a[0], a[1], a[2]);
  _dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  _q.setFromUnitVectors(_up, _dir);
  _s.set(1, 1, 1);
  return _m.compose(_p, _q, _s);
}

/**
 * El pie se modela apoyado en el piso, con el tobillo a PROP.tobilloY sobre su origen: se lo
 * lleva al tobillo y se lo gira `punta` (rad) alrededor de él (los dedos hacia abajo).
 */
function matrizPie(tobillo: V3, punta: number) {
  _q.setFromAxisAngle(_eje, punta);
  _p.set(0, -PROP.tobilloY, 0).applyQuaternion(_q).add(_t.set(tobillo[0], tobillo[1], tobillo[2]));
  _s.set(1, 1, 1);
  return _m.compose(_p, _q, _s);
}

function matrizEsfera(c: V3, r: number) {
  _p.set(c[0], c[1], c[2]);
  _q.identity();
  _s.set(r, r, r);
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
  act.cierreD = amortiguar(act.cierreD, obj.cierreD, l, dt);
  act.cierreI = amortiguar(act.cierreI, obj.cierreI, l, dt);
  act.pinzaD = amortiguar(act.pinzaD, obj.pinzaD, l, dt);
  act.pinzaI = amortiguar(act.pinzaI, obj.pinzaI, l, dt);
  act.tipoPinzaD = amortiguar(act.tipoPinzaD, obj.tipoPinzaD, l, dt);
  act.tipoPinzaI = amortiguar(act.tipoPinzaI, obj.tipoPinzaI, l, dt);
  act.apoyarD = amortiguar(act.apoyarD, obj.apoyarD, l, dt);
  act.apoyarI = amortiguar(act.apoyarI, obj.apoyarI, l, dt);
  // Si cambia el dedo aislado, primero se abre la mano y recién ahí se aísla el otro (sin saltos).
  for (const [ais, cant, sep] of [
    ['aisladoD', 'aislarD', 'separarD'],
    ['aisladoI', 'aislarI', 'separarI'],
  ] as const) {
    if (act[ais] !== obj[ais]) {
      act[cant] = amortiguar(act[cant], 0, l, dt);
      act[sep] = amortiguar(act[sep], 0, l, dt);
      if (act[cant] < 0.04 && act[sep] < 0.04) act[ais] = obj[ais];
    } else {
      act[cant] = amortiguar(act[cant], obj[cant], l, dt);
      act[sep] = amortiguar(act[sep], obj[sep], l, dt);
    }
  }
  amortiguarV(act.pieD, obj.pieD, l, dt);
  amortiguarV(act.pieI, obj.pieI, l, dt);
  act.puntaD = amortiguar(act.puntaD, obj.puntaD, l, dt);
  act.puntaI = amortiguar(act.puntaI, obj.puntaI, l, dt);
  act.agachar = amortiguar(act.agachar, obj.agachar, l, dt);
  act.atrasar = amortiguar(act.atrasar, obj.atrasar, l, dt);
  act.abrirRodillas = amortiguar(act.abrirRodillas, obj.abrirRodillas, l, dt);
  act.inclinar = amortiguar(act.inclinar, obj.inclinar, l, dt);
  act.girar = amortiguar(act.girar, obj.girar, l, dt);
  act.adelantarD = amortiguar(act.adelantarD, obj.adelantarD, l, dt);
  act.adelantarI = amortiguar(act.adelantarI, obj.adelantarI, l, dt);
  act.cabezaPitch = amortiguar(act.cabezaPitch, obj.cabezaPitch, l, dt);
  act.cabezaYaw = amortiguar(act.cabezaYaw, obj.cabezaYaw, l, dt);
}

// ── Componente ─────────────────────────────────────────────────────────

/** Esferas pequeñas embebidas en codos, rodillas, tobillos y caderas (los hombros los forma el torso). */
const ARTICULACIONES = 8;

export function Maniqui({ indice }: { indice: 0 | 1 }) {
  const g = geos();
  const torso = useMemo(crearTorso, []);
  const grupo = useRef<Group>(null);
  const refs = {
    torso: useRef<Mesh>(null),
    cabeza: useRef<Mesh>(null),
    cuello: useRef<Mesh>(null),
    art: useRef<InstancedMesh>(null),
    brazo: useRef<InstancedMesh>(null),
    antebrazo: useRef<InstancedMesh>(null),
    muslo: useRef<InstancedMesh>(null),
    pierna: useRef<InstancedMesh>(null),
    pie: useRef<InstancedMesh>(null),
  };
  const actual = useRef<Pose>(copiarPose(NEUTRA));
  const visible = useRef(false);

  const mats = useMemo(() => {
    const crear = (t: keyof typeof TONOS, translucido: boolean, opacidad?: number) =>
      crearMaterialCuerpo({ ...TONOS[t], translucido, opacidad, cavidades: true });
    return {
      yo: crear('yo', false),
      otro: crear('otro', false),
      yoT: crear('yo', true, 0.3),
      otroT: crear('otro', true, 0.3),
      vision: crear('vision', true, 0.38),
    };
  }, []);
  const manos = useMemo(() => crearManos(mats.yo), [mats]);
  useEffect(
    () => () => {
      torso.geometry.dispose();
      manos.malla.geometry.dispose();
      Object.values(mats).forEach((m) => m.dispose());
    },
    [torso, manos, mats],
  );

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
    for (const m of [...Object.values(refs).map((r) => r.current), manos.malla]) {
      if (m) {
        if (m.material !== mat) m.material = mat;
        m.renderOrder = orden;
      }
    }

    // Torso continuo: sus vértices ya quedan en coordenadas del cuerpo.
    torso.deformar(e);
    const cuello = refs.cuello.current!;
    cuello.position.set(e.cuello[0], e.cuello[1], e.cuello[2]);
    cuello.rotation.set(e.inclinar, e.girar, 0, 'YXZ');
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
      [e.codoD, 0.029],
      [e.codoI, 0.029],
      [e.rodillaD, 0.037],
      [e.rodillaI, 0.037],
      [e.tobilloD, 0.024],
      [e.tobilloI, 0.024],
      [e.caderaD, 0.05],
      [e.caderaI, 0.05],
    ];
    juntas.forEach(([c, r], i) => art.setMatrixAt(i, matrizEsfera(c, r)));
    art.instanceMatrix.needsUpdate = true;

    // Manos con dedos articulados
    manos.actualizar(e, p);

    // Pies: debajo de cada tobillo; estirados en punta, giran alrededor del tobillo.
    const pie = refs.pie.current!;
    pie.setMatrixAt(0, matrizPie(e.tobilloD, e.puntaD));
    pie.setMatrixAt(1, matrizPie(e.tobilloI, e.puntaI));
    pie.instanceMatrix.needsUpdate = true;
  }, -20);

  return (
    <group ref={grupo} visible={false} dispose={null}>
      <mesh ref={refs.torso} geometry={torso.geometry} material={mats.yo} frustumCulled={false} />
      <mesh ref={refs.cuello} geometry={g.cuello} material={mats.yo} />
      <mesh ref={refs.cabeza} geometry={g.cabeza} material={mats.yo} />
      <instancedMesh ref={refs.art} args={[g.articulacion, mats.yo, ARTICULACIONES]} frustumCulled={false} />
      <instancedMesh ref={refs.brazo} args={[g.brazo, mats.yo, 2]} frustumCulled={false} />
      <instancedMesh ref={refs.antebrazo} args={[g.antebrazo, mats.yo, 2]} frustumCulled={false} />
      <instancedMesh ref={refs.muslo} args={[g.muslo, mats.yo, 2]} frustumCulled={false} />
      <instancedMesh ref={refs.pierna} args={[g.pierna, mats.yo, 2]} frustumCulled={false} />
      <primitive object={manos.raiz} />
      <primitive object={manos.malla} />
      <instancedMesh ref={refs.pie} args={[g.pie, mats.yo, 2]} frustumCulled={false} />
    </group>
  );
}
