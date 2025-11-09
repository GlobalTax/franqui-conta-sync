import { describe, it, expect } from 'vitest';
import { InvoiceCalculator } from '../InvoiceCalculator';

describe('InvoiceCalculator', () => {
  describe('calculateLine', () => {
    it('debe calcular correctamente una línea sin descuento ni IVA', () => {
      const line = { quantity: 2, unitPrice: 50, discountPercentage: 0, taxRate: 0 };
      const result = InvoiceCalculator.calculateLine(line);

      expect(result.subtotal).toBe(100);
      expect(result.discountAmount).toBe(0);
      expect(result.subtotalAfterDiscount).toBe(100);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(100);
    });

    it('debe aplicar descuento correctamente', () => {
      const line = { quantity: 1, unitPrice: 100, discountPercentage: 10, taxRate: 0 };
      const result = InvoiceCalculator.calculateLine(line);

      expect(result.subtotal).toBe(100);
      expect(result.discountAmount).toBe(10);
      expect(result.subtotalAfterDiscount).toBe(90);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(90);
    });

    it('debe calcular IVA del 21% correctamente', () => {
      const line = { quantity: 1, unitPrice: 100, discountPercentage: 0, taxRate: 21 };
      const result = InvoiceCalculator.calculateLine(line);

      expect(result.subtotal).toBe(100);
      expect(result.discountAmount).toBe(0);
      expect(result.subtotalAfterDiscount).toBe(100);
      expect(result.taxAmount).toBe(21);
      expect(result.total).toBe(121);
    });

    it('debe aplicar descuento e IVA juntos correctamente', () => {
      const line = { quantity: 2, unitPrice: 50, discountPercentage: 10, taxRate: 21 };
      const result = InvoiceCalculator.calculateLine(line);

      expect(result.subtotal).toBe(100);
      expect(result.discountAmount).toBe(10);
      expect(result.subtotalAfterDiscount).toBe(90);
      expect(result.taxAmount).toBe(18.9);
      expect(result.total).toBe(108.9);
    });

    it('debe manejar cantidad decimal', () => {
      const line = { quantity: 2.5, unitPrice: 40, discountPercentage: 0, taxRate: 10 };
      const result = InvoiceCalculator.calculateLine(line);

      expect(result.subtotal).toBe(100);
      expect(result.taxAmount).toBe(10);
      expect(result.total).toBe(110);
    });

    it('debe redondear a 2 decimales', () => {
      const line = { quantity: 3, unitPrice: 33.333, discountPercentage: 5, taxRate: 21 };
      const result = InvoiceCalculator.calculateLine(line);

      expect(result.subtotal).toBe(100);
      expect(result.discountAmount).toBe(5);
      expect(result.subtotalAfterDiscount).toBe(95);
      // 95 * 0.21 = 19.95
      expect(result.taxAmount).toBe(19.95);
      expect(result.total).toBe(114.95);
    });

    it('debe manejar descuento del 100%', () => {
      const line = { quantity: 1, unitPrice: 100, discountPercentage: 100, taxRate: 21 };
      const result = InvoiceCalculator.calculateLine(line);

      expect(result.discountAmount).toBe(100);
      expect(result.subtotalAfterDiscount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(0);
    });

    it('debe manejar múltiples tipos de IVA', () => {
      const line1 = { quantity: 1, unitPrice: 100, discountPercentage: 0, taxRate: 4 };
      const result1 = InvoiceCalculator.calculateLine(line1);
      expect(result1.taxAmount).toBe(4);

      const line2 = { quantity: 1, unitPrice: 100, discountPercentage: 0, taxRate: 10 };
      const result2 = InvoiceCalculator.calculateLine(line2);
      expect(result2.taxAmount).toBe(10);
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('debe sumar múltiples líneas correctamente', () => {
      const lines = [
        { quantity: 1, unitPrice: 100, discountPercentage: 0, taxRate: 21 },
        { quantity: 2, unitPrice: 50, discountPercentage: 10, taxRate: 10 },
      ];

      const totals = InvoiceCalculator.calculateInvoiceTotals(lines);

      // Línea 1: 100 + 21 IVA = 121
      // Línea 2: 90 (con descuento) + 9 IVA = 99
      expect(totals.subtotal).toBe(190); // 100 + 90
      expect(totals.totalDiscount).toBe(10); // 10% de 100 en línea 2
      expect(totals.totalTax).toBe(30); // 21 + 9
      expect(totals.total).toBe(220); // 121 + 99
    });

    it('debe devolver ceros para array vacío', () => {
      const totals = InvoiceCalculator.calculateInvoiceTotals([]);

      expect(totals.subtotal).toBe(0);
      expect(totals.totalDiscount).toBe(0);
      expect(totals.totalTax).toBe(0);
      expect(totals.total).toBe(0);
    });

    it('debe manejar factura con una sola línea', () => {
      const lines = [{ quantity: 1, unitPrice: 100, discountPercentage: 10, taxRate: 21 }];

      const totals = InvoiceCalculator.calculateInvoiceTotals(lines);

      expect(totals.subtotal).toBe(90);
      expect(totals.totalDiscount).toBe(10);
      expect(totals.totalTax).toBe(18.9);
      expect(totals.total).toBe(108.9);
    });

    it('debe sumar líneas con diferentes tasas de IVA', () => {
      const lines = [
        { quantity: 1, unitPrice: 100, discountPercentage: 0, taxRate: 0 },
        { quantity: 1, unitPrice: 100, discountPercentage: 0, taxRate: 4 },
        { quantity: 1, unitPrice: 100, discountPercentage: 0, taxRate: 10 },
        { quantity: 1, unitPrice: 100, discountPercentage: 0, taxRate: 21 },
      ];

      const totals = InvoiceCalculator.calculateInvoiceTotals(lines);

      expect(totals.subtotal).toBe(400);
      expect(totals.totalTax).toBe(35); // 0 + 4 + 10 + 21
      expect(totals.total).toBe(435);
    });
  });

  describe('calculateTaxRate', () => {
    it('debe calcular tasa de IVA correctamente', () => {
      expect(InvoiceCalculator.calculateTaxRate(100, 21)).toBe(21);
      expect(InvoiceCalculator.calculateTaxRate(100, 10)).toBe(10);
      expect(InvoiceCalculator.calculateTaxRate(100, 4)).toBe(4);
    });

    it('debe devolver 0 para subtotal 0', () => {
      expect(InvoiceCalculator.calculateTaxRate(0, 21)).toBe(0);
    });

    it('debe redondear correctamente', () => {
      expect(InvoiceCalculator.calculateTaxRate(33.33, 7)).toBe(21);
    });
  });

  describe('roundAmount', () => {
    it('debe redondear a 2 decimales', () => {
      expect(InvoiceCalculator.roundAmount(10.12345)).toBe(10.12);
      expect(InvoiceCalculator.roundAmount(10.12999)).toBe(10.13);
      expect(InvoiceCalculator.roundAmount(10.125)).toBe(10.13);
    });

    it('debe mantener números enteros', () => {
      expect(InvoiceCalculator.roundAmount(100)).toBe(100);
    });

    it('debe manejar negativos', () => {
      expect(InvoiceCalculator.roundAmount(-10.12345)).toBe(-10.12);
    });
  });

  describe('normalizeLineForCalculation', () => {
    it('debe convertir snake_case a camelCase', () => {
      const dbLine = {
        quantity: 2,
        unit_price: 50,
        discount_percentage: 10,
        tax_rate: 21,
      };

      const normalized = InvoiceCalculator.normalizeLineForCalculation(dbLine);

      expect(normalized.quantity).toBe(2);
      expect(normalized.unitPrice).toBe(50);
      expect(normalized.discountPercentage).toBe(10);
      expect(normalized.taxRate).toBe(21);
    });

    it('debe mantener camelCase si ya viene así', () => {
      const camelLine = {
        quantity: 2,
        unitPrice: 50,
        discountPercentage: 10,
        taxRate: 21,
      };

      const normalized = InvoiceCalculator.normalizeLineForCalculation(camelLine);

      expect(normalized.quantity).toBe(2);
      expect(normalized.unitPrice).toBe(50);
      expect(normalized.discountPercentage).toBe(10);
      expect(normalized.taxRate).toBe(21);
    });

    it('debe manejar valores undefined con defaults', () => {
      const emptyLine = {};
      const normalized = InvoiceCalculator.normalizeLineForCalculation(emptyLine);

      expect(normalized.quantity).toBe(0);
      expect(normalized.unitPrice).toBe(0);
      expect(normalized.discountPercentage).toBe(0);
      expect(normalized.taxRate).toBe(0);
    });
  });
});
