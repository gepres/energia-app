import type { V3 } from './mate';

/**
 * Esquinas del cubo en el orden del apunte: B1 noroeste, B2 noreste, B3 sureste,
 * B4 suroeste (y T1–T4 encima). Convención de la escena: norte = +Z y, mirando
 * al norte, el oeste queda a la izquierda (+X).
 */
export function esquinasCubo(centro: V3, lado: number) {
  const a = lado / 2;
  const base: [number, number][] = [
    [a, a], // NO
    [-a, a], // NE
    [-a, -a], // SE
    [a, -a], // SO
  ];
  const inf = base.map(([x, z]) => [centro[0] + x, centro[1], centro[2] + z] as V3);
  const sup = base.map(([x, z]) => [centro[0] + x, centro[1] + lado, centro[2] + z] as V3);
  return { inf, sup };
}
