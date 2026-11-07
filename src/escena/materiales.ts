import { Color, MeshStandardMaterial } from 'three';

/**
 * Material del maniquí: porcelana mate con un borde Fresnel sutil. El borde es
 * emisivo, así que con poca luz la silueta sigue leyéndose sobre el fondo oscuro.
 */
export interface MaterialCuerpo extends MeshStandardMaterial {
  userData: { rim: { value: number }; rimColor: { value: Color } };
}

export function crearMaterialCuerpo(opts: {
  color: string;
  rimColor: string;
  rim: number;
  translucido: boolean;
  opacidad?: number;
}): MaterialCuerpo {
  const m = new MeshStandardMaterial({
    color: opts.color,
    roughness: 0.46,
    metalness: 0.0,
    transparent: opts.translucido,
    opacity: opts.opacidad ?? 1,
    depthWrite: true,
  }) as MaterialCuerpo;
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
          totalEmissiveRadiance += uRimColor * pow(f, 2.6) * uRim;
        }`,
      );
  };
  m.customProgramCacheKey = () => 'cuerpo-rim';
  return m;
}

export const TONOS = {
  yo: { color: '#d9d2c8', rimColor: '#ffd6a1', rim: 0.55 },
  otro: { color: '#c5ccd6', rimColor: '#9fd6ff', rim: 0.6 },
  vision: { color: '#b9b0d8', rimColor: '#c4b2ff', rim: 1.4 },
} as const;
