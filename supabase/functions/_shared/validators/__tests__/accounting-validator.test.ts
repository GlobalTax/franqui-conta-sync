import { describe, it, expect } from 'vitest';
import { validateAccountingRulesCompact } from '../accounting-validator.ts';

describe('validateAccountingRulesCompact', () => {
  
  describe('Facturas correctas (ok: true)', () => {
    it('debe validar factura simple sin punto verde', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.00", tax: "21.00", gross: "121.00" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "121.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs).toEqual({ eq1: 0, eq2: 0, eq3: 0 });
      expect(result.recalculated_totals.base_total_plus_fees).toBe("100.00");
      expect(result.recalculated_totals.tax_total).toBe("21.00");
      expect(result.recalculated_totals.grand_total).toBe("121.00");
    });

    it('debe validar factura con punto verde', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.00", tax: "21.00" }],
        fees: { green_point: "0.12" },
        base_total_plus_fees: "100.12",
        tax_total: "21.00",
        grand_total: "121.12"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs).toEqual({ eq1: 0, eq2: 0, eq3: 0 });
      expect(result.recalculated_totals.base_total_plus_fees).toBe("100.12");
      expect(result.recalculated_totals.tax_total).toBe("21.00");
      expect(result.recalculated_totals.grand_total).toBe("121.12");
    });

    it('debe validar factura con múltiples tipos de IVA', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [
          { base: "50.00", tax: "2.00" },   // 4%
          { base: "30.00", tax: "3.00" },   // 10%
          { base: "20.00", tax: "4.20" }    // 21%
        ],
        base_total_plus_fees: "100.00",
        tax_total: "9.20",
        grand_total: "109.20"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs).toEqual({ eq1: 0, eq2: 0, eq3: 0 });
      expect(result.recalculated_totals.base_total_plus_fees).toBe("100.00");
      expect(result.recalculated_totals.tax_total).toBe("9.20");
      expect(result.recalculated_totals.grand_total).toBe("109.20");
    });
  });

  describe('Errores de redondeo (dentro de tolerancia)', () => {
    it('debe aceptar diferencia de +1 céntimo en eq1', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.01", tax: "21.00" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "121.01"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs.eq1).toBe(1);
      expect(result.diffs.eq2).toBe(0);
      expect(result.diffs.eq3).toBe(1);
      expect(result.recalculated_totals.base_total_plus_fees).toBe("100.01");
    });

    it('debe aceptar diferencia de -2 céntimos en eq2', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.00", tax: "20.98" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "120.98"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs.eq1).toBe(0);
      expect(result.diffs.eq2).toBe(-2);
      expect(result.diffs.eq3).toBe(-2);
      expect(result.recalculated_totals.tax_total).toBe("20.98");
    });

    it('debe aceptar redondeos combinados en límite', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.01", tax: "21.01" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "121.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs.eq1).toBe(1);
      expect(result.diffs.eq2).toBe(1);
      expect(result.diffs.eq3).toBe(2);
    });

    it('debe aceptar diferencia de exactamente +2 céntimos', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.02", tax: "21.00" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "121.02"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs.eq1).toBe(2);
      expect(result.diffs.eq2).toBe(0);
      expect(result.diffs.eq3).toBe(2);
    });

    it('debe aceptar diferencia de exactamente -2 céntimos', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "99.98", tax: "21.00" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "120.98"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs.eq1).toBe(-2);
      expect(result.diffs.eq2).toBe(0);
      expect(result.diffs.eq3).toBe(-2);
    });
  });

  describe('Errores graves (fuera de tolerancia)', () => {
    it('debe rechazar error de +10 céntimos en base', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.00", tax: "21.00" }],
        base_total_plus_fees: "99.90",
        tax_total: "21.00",
        grand_total: "120.90"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(false);
      expect(result.diffs.eq1).toBe(10);
      expect(result.diffs.eq2).toBe(0);
      expect(result.diffs.eq3).toBe(10);
      expect(result.recalculated_totals.base_total_plus_fees).toBe("100.00");
    });

    it('debe rechazar error de -50 céntimos en IVA', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.00", tax: "20.50" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "120.50"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(false);
      expect(result.diffs.eq1).toBe(0);
      expect(result.diffs.eq2).toBe(-50);
      expect(result.diffs.eq3).toBe(-50);
      expect(result.recalculated_totals.tax_total).toBe("20.50");
    });

    it('debe rechazar error de +10€ en total general', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.00", tax: "21.00" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "131.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(false);
      expect(result.diffs.eq1).toBe(0);
      expect(result.diffs.eq2).toBe(0);
      expect(result.diffs.eq3).toBe(-1000);
      expect(result.recalculated_totals.grand_total).toBe("121.00");
    });

    it('debe rechazar múltiples errores acumulados', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.05", tax: "20.97" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "121.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(false);
      expect(result.diffs.eq1).toBe(5);
      expect(result.diffs.eq2).toBe(-3);
      expect(result.diffs.eq3).toBe(2);
    });

    it('debe rechazar error de +3 céntimos (justo fuera de tolerancia)', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.03", tax: "21.00" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "121.03"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(false);
      expect(result.diffs.eq1).toBe(3);
      expect(result.diffs.eq3).toBe(3);
    });
  });

  describe('Casos límite (edge cases)', () => {
    it('debe manejar factura sin líneas de IVA', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [],
        base_total_plus_fees: "100.00",
        tax_total: "0.00",
        grand_total: "100.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(false);
      expect(result.diffs.eq1).toBe(-10000);
      expect(result.diffs.eq2).toBe(0);
      expect(result.diffs.eq3).toBe(-10000);
      expect(result.recalculated_totals.base_total_plus_fees).toBe("0.00");
    });

    it('debe manejar campos null en líneas de IVA', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: null, tax: null }],
        base_total_plus_fees: "0.00",
        tax_total: "0.00",
        grand_total: "0.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs).toEqual({ eq1: 0, eq2: 0, eq3: 0 });
      expect(result.recalculated_totals.base_total_plus_fees).toBe("0.00");
    });

    it('debe manejar campos undefined en líneas de IVA', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: undefined, tax: undefined }],
        base_total_plus_fees: "0.00",
        tax_total: "0.00",
        grand_total: "0.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs).toEqual({ eq1: 0, eq2: 0, eq3: 0 });
    });

    it('debe manejar importes con muchos decimales (precisión)', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.123456", tax: "21.006789" }],
        base_total_plus_fees: "100.12",
        tax_total: "21.01",
        grand_total: "121.13"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs.eq1).toBe(0); // 100.12 vs 100.12
      expect(result.diffs.eq2).toBe(-1); // 21.00 vs 21.01
      expect(result.diffs.eq3).toBe(-1); // 121.12 vs 121.13
    });

    it('debe manejar importes negativos (nota de crédito)', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "-50.00", tax: "-10.50" }],
        base_total_plus_fees: "-50.00",
        tax_total: "-10.50",
        grand_total: "-60.50"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs).toEqual({ eq1: 0, eq2: 0, eq3: 0 });
      expect(result.recalculated_totals.base_total_plus_fees).toBe("-50.00");
      expect(result.recalculated_totals.tax_total).toBe("-10.50");
      expect(result.recalculated_totals.grand_total).toBe("-60.50");
    });

    it('debe detectar punto verde no sumado en base', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.00", tax: "21.00" }],
        fees: { green_point: "0.12" },
        base_total_plus_fees: "100.00", // Debería ser 100.12
        tax_total: "21.00",
        grand_total: "121.00" // Debería ser 121.12
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(false);
      expect(result.diffs.eq1).toBe(12);
      expect(result.diffs.eq2).toBe(0);
      expect(result.diffs.eq3).toBe(12);
      expect(result.recalculated_totals.base_total_plus_fees).toBe("100.12");
    });

    it('debe manejar punto verde sin campo fees', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.00", tax: "21.00" }],
        fees: undefined,
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "121.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs).toEqual({ eq1: 0, eq2: 0, eq3: 0 });
    });

    it('debe manejar totals_by_vat undefined', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: undefined,
        base_total_plus_fees: "0.00",
        tax_total: "0.00",
        grand_total: "0.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.diffs).toEqual({ eq1: 0, eq2: 0, eq3: 0 });
    });
  });

  describe('Formato de respuesta', () => {
    it('debe devolver recalculated_totals con 2 decimales', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.1", tax: "21" }],
        base_total_plus_fees: "100.10",
        tax_total: "21.00",
        grand_total: "121.10"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.recalculated_totals.base_total_plus_fees).toMatch(/^\d+\.\d{2}$/);
      expect(result.recalculated_totals.tax_total).toMatch(/^\d+\.\d{2}$/);
      expect(result.recalculated_totals.grand_total).toMatch(/^\d+\.\d{2}$/);
    });

    it('debe devolver diffs en céntimos (números enteros)', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.05", tax: "21.03" }],
        base_total_plus_fees: "100.00",
        tax_total: "21.00",
        grand_total: "121.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(Number.isInteger(result.diffs.eq1)).toBe(true);
      expect(Number.isInteger(result.diffs.eq2)).toBe(true);
      expect(Number.isInteger(result.diffs.eq3)).toBe(true);
    });

    it('debe mantener signo correcto en diffs (positivo = calculado > declarado)', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [{ base: "100.00", tax: "21.00" }],
        base_total_plus_fees: "99.95", // calculado mayor
        tax_total: "21.05", // calculado menor
        grand_total: "121.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result.diffs.eq1).toBe(5); // 100.00 - 99.95 = +0.05 = +5 céntimos
      expect(result.diffs.eq2).toBe(-5); // 21.00 - 21.05 = -0.05 = -5 céntimos
      expect(result.diffs.eq3).toBe(0); // 121.00 - 121.00 = 0
    });

    it('debe devolver estructura completa incluso con valores cero', () => {
      // Arrange
      const invoiceData = {
        totals_by_vat: [],
        base_total_plus_fees: "0.00",
        tax_total: "0.00",
        grand_total: "0.00"
      };

      // Act
      const result = validateAccountingRulesCompact(invoiceData);

      // Assert
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('diffs');
      expect(result.diffs).toHaveProperty('eq1');
      expect(result.diffs).toHaveProperty('eq2');
      expect(result.diffs).toHaveProperty('eq3');
      expect(result).toHaveProperty('recalculated_totals');
      expect(result.recalculated_totals).toHaveProperty('base_total_plus_fees');
      expect(result.recalculated_totals).toHaveProperty('tax_total');
      expect(result.recalculated_totals).toHaveProperty('grand_total');
    });
  });
});
