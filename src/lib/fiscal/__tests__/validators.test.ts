// ============================================================================
// TESTS - Core Validators
// ============================================================================

import { describe, it, expect } from 'vitest';
import { validateSpanishVAT, validateTotals, validateLineAmount } from '../core/validators';

describe('validateSpanishVAT', () => {
  it('valida NIF correcto', () => {
    const result = validateSpanishVAT('12345678Z');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('NIF');
  });
  
  it('valida CIF correcto', () => {
    const result = validateSpanishVAT('A12345678');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('CIF');
  });
  
  it('normaliza formato con espacios/guiones', () => {
    const result = validateSpanishVAT('B-12 345 678');
    expect(result.normalized).toBe('B12345678');
  });
  
  it('rechaza formato inválido', () => {
    const result = validateSpanishVAT('invalid');
    expect(result.valid).toBe(false);
  });

  it('rechaza null', () => {
    const result = validateSpanishVAT(null);
    expect(result.valid).toBe(false);
    expect(result.normalized).toBe(null);
  });
});

describe('validateTotals', () => {
  it('acepta totales correctos', () => {
    const result = validateTotals({
      base_21: 100,
      vat_21: 21,
      total: 121
    });
    expect(result.valid).toBe(true);
    expect(result.difference).toBeLessThanOrEqual(0.02);
  });
  
  it('detecta diferencias > tolerancia', () => {
    const result = validateTotals({
      base_21: 100,
      vat_21: 21,
      total: 125 // Error de 4€
    });
    expect(result.valid).toBe(false);
    expect(result.difference).toBe(4);
  });

  it('acepta diferencias dentro de tolerancia', () => {
    const result = validateTotals({
      base_21: 100,
      vat_21: 21,
      total: 121.01 // Error de 0.01€
    });
    expect(result.valid).toBe(true);
  });

  it('suma correctamente other_taxes', () => {
    const result = validateTotals({
      base_10: 50,
      vat_10: 5,
      total: 60,
      other_taxes: [{ base: 3, quota: 2 }]
    });
    expect(result.valid).toBe(true);
    expect(result.calculated).toBe(60);
  });
});

describe('validateLineAmount', () => {
  it('valida línea correcta', () => {
    const result = validateLineAmount(10, 5.5, 55);
    expect(result.valid).toBe(true);
  });

  it('detecta diferencias', () => {
    const result = validateLineAmount(10, 5.5, 60);
    expect(result.valid).toBe(false);
    expect(result.difference).toBe(5);
  });

  it('acepta diferencias por redondeo', () => {
    const result = validateLineAmount(3, 1.33, 3.99);
    expect(result.valid).toBe(true);
  });
});
