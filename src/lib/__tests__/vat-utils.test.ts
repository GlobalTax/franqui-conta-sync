import { describe, it, expect } from 'vitest';
import {
  validateVATCoherence,
  validateVATCalculation,
  detectVATRate,
  validateVATBreakdown,
} from '../vat-utils';

describe('vat-utils', () => {
  describe('validateVATCoherence', () => {
    it('debe aprobar factura con IVA 21% correcto', () => {
      // Arrange
      const subtotal = 100;
      const taxTotal = 21;
      const total = 121;

      // Act
      const result = validateVATCoherence(subtotal, taxTotal, total);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('debe aprobar factura con IVA 10% correcto', () => {
      // Arrange
      const subtotal = 200;
      const taxTotal = 20;
      const total = 220;

      // Act
      const result = validateVATCoherence(subtotal, taxTotal, total);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('debe aprobar factura con IVA 4% correcto', () => {
      // Arrange
      const subtotal = 250;
      const taxTotal = 10; // 4% de 250
      const total = 260;

      // Act
      const result = validateVATCoherence(subtotal, taxTotal, total);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('debe aprobar factura exenta (IVA 0%)', () => {
      // Arrange
      const subtotal = 150;
      const taxTotal = 0;
      const total = 150;

      // Act
      const result = validateVATCoherence(subtotal, taxTotal, total);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('debe rechazar total incorrecto (diferencia >2 céntimos)', () => {
      // Arrange
      const subtotal = 100;
      const taxTotal = 21;
      const total = 120; // Incorrecto, debería ser 121

      // Act
      const result = validateVATCoherence(subtotal, taxTotal, total);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('no cuadra');
      expect(result.expectedTotal).toBe(121);
    });

    it('debe aprobar con diferencia dentro de tolerancia (≤2 céntimos)', () => {
      // Arrange
      const subtotal = 100;
      const taxTotal = 21;
      const total = 121.01; // Dentro de tolerancia de 2 céntimos

      // Act
      const result = validateVATCoherence(subtotal, taxTotal, total);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('debe rechazar ratio IVA no estándar (ej. 15%)', () => {
      // Arrange
      const subtotal = 100;
      const taxTotal = 15; // 15% no es estándar en España
      const total = 115;

      // Act
      const result = validateVATCoherence(subtotal, taxTotal, total);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('no es estándar');
      expect(result.detectedRatio).toBe(0.15);
    });

    it('debe aprobar factura con base 0 (caso especial)', () => {
      // Arrange
      const subtotal = 0;
      const taxTotal = 0;
      const total = 0;

      // Act
      const result = validateVATCoherence(subtotal, taxTotal, total);

      // Assert
      expect(result.valid).toBe(true);
    });
  });

  describe('validateVATCalculation', () => {
    it('debe aprobar cálculo IVA 21% exacto', () => {
      // Arrange
      const base = 100;
      const vat = 21;
      const rate = 0.21;

      // Act
      const result = validateVATCalculation(base, vat, rate);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('debe aprobar cálculo IVA 10% exacto', () => {
      // Arrange
      const base = 150;
      const vat = 15;
      const rate = 0.10;

      // Act
      const result = validateVATCalculation(base, vat, rate);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('debe aprobar cálculo IVA 4% exacto', () => {
      // Arrange
      const base = 200;
      const vat = 8;
      const rate = 0.04;

      // Act
      const result = validateVATCalculation(base, vat, rate);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('debe rechazar IVA mal calculado (diferencia >2 céntimos)', () => {
      // Arrange
      const base = 100;
      const vat = 25; // Incorrecto, debería ser 21
      const rate = 0.21;

      // Act
      const result = validateVATCalculation(base, vat, rate);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('calculado incorrectamente');
      expect(result.expectedTotal).toBe(21);
    });

    it('debe aprobar con redondeo dentro de tolerancia', () => {
      // Arrange: 33.33 * 0.21 = 6.9993, redondeado a 7.00
      const base = 33.33;
      const vat = 7.00;
      const rate = 0.21;

      // Act
      const result = validateVATCalculation(base, vat, rate);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('debe validar correctamente valores decimales complejos', () => {
      // Arrange
      const base = 123.45;
      const vat = 25.92; // 123.45 * 0.21 = 25.9245 -> 25.92
      const rate = 0.21;

      // Act
      const result = validateVATCalculation(base, vat, rate);

      // Assert
      expect(result.valid).toBe(true);
    });
  });

  describe('detectVATRate', () => {
    it('debe detectar IVA 21% correctamente', () => {
      // Arrange
      const base = 100;
      const vat = 21;

      // Act
      const rate = detectVATRate(base, vat);

      // Assert
      expect(rate).toBe(0.21);
    });

    it('debe detectar IVA 10% correctamente', () => {
      // Arrange
      const base = 200;
      const vat = 20;

      // Act
      const rate = detectVATRate(base, vat);

      // Assert
      expect(rate).toBe(0.10);
    });

    it('debe detectar IVA 4% correctamente', () => {
      // Arrange
      const base = 250;
      const vat = 10;

      // Act
      const rate = detectVATRate(base, vat);

      // Assert
      expect(rate).toBe(0.04);
    });

    it('debe retornar null para ratio no estándar', () => {
      // Arrange
      const base = 100;
      const vat = 15; // 15% no es estándar

      // Act
      const rate = detectVATRate(base, vat);

      // Assert
      expect(rate).toBeNull();
    });

    it('debe retornar null para base <= 0', () => {
      // Arrange
      const base = 0;
      const vat = 10;

      // Act
      const rate = detectVATRate(base, vat);

      // Assert
      expect(rate).toBeNull();
    });
  });

  describe('validateVATBreakdown', () => {
    it('debe aprobar desglose con múltiples tipos IVA', () => {
      // Arrange
      const vatBreakdown = [
        { base: 100, vat: 21, rate: 0.21 },
        { base: 50, vat: 5, rate: 0.10 },
        { base: 25, vat: 1, rate: 0.04 },
      ];
      const total = 202; // 100+21 + 50+5 + 25+1

      // Act
      const result = validateVATBreakdown(vatBreakdown, total);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('debe aprobar desglose con IVA 21% + 10%', () => {
      // Arrange
      const vatBreakdown = [
        { base: 200, vat: 42, rate: 0.21 },
        { base: 100, vat: 10, rate: 0.10 },
      ];
      const total = 352; // 200+42 + 100+10

      // Act
      const result = validateVATBreakdown(vatBreakdown, total);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('debe rechazar desglose con total incorrecto', () => {
      // Arrange
      const vatBreakdown = [
        { base: 100, vat: 21, rate: 0.21 },
        { base: 50, vat: 5, rate: 0.10 },
      ];
      const total = 180; // Incorrecto, debería ser 176 (100+21 + 50+5)

      // Act
      const result = validateVATBreakdown(vatBreakdown, total);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('no cuadra');
      expect(result.expectedTotal).toBe(176);
    });

    it('debe rechazar si un ítem tiene IVA mal calculado', () => {
      // Arrange
      const vatBreakdown = [
        { base: 100, vat: 21, rate: 0.21 }, // Correcto
        { base: 50, vat: 10, rate: 0.10 }, // Incorrecto, debería ser 5
      ];
      const total = 181; // 100+21 + 50+10

      // Act
      const result = validateVATBreakdown(vatBreakdown, total);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('calculado incorrectamente');
    });

    it('debe aprobar desglose vacío con total 0', () => {
      // Arrange
      const vatBreakdown: Array<{ base: number; vat: number; rate: number }> = [];
      const total = 0;

      // Act
      const result = validateVATBreakdown(vatBreakdown, total);

      // Assert
      expect(result.valid).toBe(true);
    });
  });
});
