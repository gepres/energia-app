import { describe, expect, it } from 'vitest';
import { faseEn, fasesDe } from './Respiracion';

describe('Página de respiraciones conscientes: ritmos con pausa de 1 s (aclarado en la revisión)', () => {
  it('cada ritmo tiene inhalar · retener · exhalar y la pausa de 1 s', () => {
    expect(fasesDe('4-3-4').map((f) => f.seg)).toEqual([4, 3, 4, 1]);
    expect(fasesDe('3-3-3').map((f) => f.seg)).toEqual([3, 3, 3, 1]);
    expect(fasesDe('5-5-5').map((f) => f.seg)).toEqual([5, 5, 5, 1]);
  });

  it('la fase sigue el reloj con el ritmo elegido y la respiración siguiente empieza tras la pausa', () => {
    expect(faseEn(2, '4-3-4').fase).toBe('Inhala');
    expect(faseEn(5, '4-3-4').fase).toBe('Retén');
    expect(faseEn(9, '4-3-4').fase).toBe('Exhala');
    expect(faseEn(11.5, '4-3-4')).toMatchObject({ fase: 'Pausa', restante: 1, ciclo: 0 });
    expect(faseEn(12, '4-3-4')).toMatchObject({ fase: 'Inhala', ciclo: 1 });
    expect(faseEn(9.5, '3-3-3').fase).toBe('Pausa');
    expect(faseEn(10, '3-3-3')).toMatchObject({ fase: 'Inhala', ciclo: 1 });
    expect(faseEn(15.5, '5-5-5').fase).toBe('Pausa');
    expect(faseEn(16, '5-5-5')).toMatchObject({ fase: 'Inhala', ciclo: 1 });
  });
});
