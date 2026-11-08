import { Color, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';

/**
 * Material del maniquí: porcelana satinada con un borde Fresnel estrecho. El
 * borde es emisivo, así que con poca luz la silueta sigue leyéndose sobre el
 * fondo oscuro. Con `cavidades`, el color de vértice no tiñe: guarda una
 * oclusión suave (axilas, entrepierna, uniones) que atenúa la luz indirecta.
 */
export interface MaterialCuerpo extends MeshStandardMaterial {
  userData: { rim: { value: number }; rimColor: { value: Color } };
  /** Valor del atributo `color` para geometrías que no lo traen (WebGLBindingStates). */
  defaultAttributeValues: { color: [number, number, number] };
}

export function crearMaterialCuerpo(opts: {
  color: string;
  rimColor: string;
  rim: number;
  translucido: boolean;
  opacidad?: number;
  cavidades?: boolean;
  /** Exponente del borde Fresnel: más alto, borde más fino (los objetos usan 2,6). */
  rimPotencia?: number;
  /** 'alto' agrega una capa de barniz (MeshPhysicalMaterial); solo para opacos. */
  acabado?: 'movil' | 'alto';
}): MaterialCuerpo {
  const base = {
    color: opts.color,
    roughness: 0.42,
    metalness: 0,
    envMapIntensity: 0.65,
    transparent: opts.translucido,
    opacity: opts.opacidad ?? 1,
    // Igual que antes también en translúcido: la pieza de adelante tapa a las de atrás
    // y la figura «fantasma» no se ve por dentro.
    depthWrite: true,
    side: FrontSide,
    dithering: true,
    vertexColors: opts.cavidades ?? false,
  };
  const m = (
    opts.acabado === 'alto' && !opts.translucido
      ? new MeshPhysicalMaterial({ ...base, clearcoat: 0.15, clearcoatRoughness: 0.45, ior: 1.46 })
      : new MeshStandardMaterial(base)
  ) as MaterialCuerpo;
  m.defaultAttributeValues = { color: [1, 1, 1] };

  const potencia = (opts.rimPotencia ?? 3.4).toFixed(2);
  const rim = { value: opts.rim };
  const rimColor = { value: new Color(opts.rimColor) };
  m.userData = { rim, rimColor };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = rim;
    shader.uniforms.uRimColor = rimColor;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRim;\nuniform vec3 uRimColor;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          float f = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          totalEmissiveRadiance += uRimColor * pow(f, ${potencia}) * uRim;
        }`,
      );
    if (opts.cavidades) {
      // El color de vértice es oclusión lineal, no pigmento.
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '').replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
        #ifdef USE_COLOR
          reflectedLight.indirectDiffuse *= vColor.r;
          reflectedLight.indirectSpecular *= mix(1.0, vColor.r, 0.45);
          #ifdef USE_CLEARCOAT
            clearcoatSpecularIndirect *= vColor.r;
          #endif
        #endif`,
      );
    }
  };
  m.customProgramCacheKey = () => `cuerpo-rim-ao-v2-${!!opts.cavidades}-${potencia}`;
  return m;
}

export const TONOS = {
  yo: { color: '#d9d2c8', rimColor: '#ffd6a1', rim: 0.32 },
  otro: { color: '#c5ccd6', rimColor: '#9fd6ff', rim: 0.36 },
  vision: { color: '#b9b0d8', rimColor: '#c4b2ff', rim: 0.9 },
} as const;
