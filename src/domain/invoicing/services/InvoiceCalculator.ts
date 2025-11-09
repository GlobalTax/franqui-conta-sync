// ============================================================================
// SERVICIO DE DOMINIO - INVOICE CALCULATOR
// Responsabilidad: Cálculos matemáticos puros para facturas sin efectos secundarios
// ============================================================================

import type { InvoiceLine } from '../types';

export interface LineCalculation {
  subtotal: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  taxAmount: number;
  total: number;
}

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
}

/**
 * Servicio de cálculos para facturas (recibidas y emitidas)
 * Todos los métodos son puros (sin efectos secundarios) y testeables
 */
export class InvoiceCalculator {
  /**
   * Calcula el total de una línea de factura aplicando descuentos e IVA
   * @param line - Línea de factura con cantidad, precio, descuento y tasa de IVA
   * @returns Desglose completo de cálculos
   * 
   * @example
   * const line = { quantity: 2, unitPrice: 50, discountPercentage: 10, taxRate: 21 };
   * const result = InvoiceCalculator.calculateLine(line);
   * // result.total === 99.99 (100 - 10% descuento = 90, + 21% IVA = 108.9)
   */
  static calculateLine(
    line: Pick<InvoiceLine, 'quantity' | 'unitPrice' | 'discountPercentage' | 'taxRate'>
  ): LineCalculation {
    const subtotal = line.quantity * line.unitPrice;
    const discountAmount = (subtotal * line.discountPercentage) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = (subtotalAfterDiscount * line.taxRate) / 100;
    const total = subtotalAfterDiscount + taxAmount;

    return {
      subtotal: this.roundAmount(subtotal),
      discountAmount: this.roundAmount(discountAmount),
      subtotalAfterDiscount: this.roundAmount(subtotalAfterDiscount),
      taxAmount: this.roundAmount(taxAmount),
      total: this.roundAmount(total),
    };
  }

  /**
   * Calcula los totales de una factura completa sumando todas las líneas
   * @param lines - Array de líneas de factura
   * @returns Totales agregados (subtotal, descuento total, IVA total, total)
   * 
   * @example
   * const lines = [
   *   { quantity: 1, unitPrice: 100, discountPercentage: 0, taxRate: 21 },
   *   { quantity: 2, unitPrice: 50, discountPercentage: 10, taxRate: 10 }
   * ];
   * const totals = InvoiceCalculator.calculateInvoiceTotals(lines);
   * // totals.total === 220 (100*1.21 + 90*1.10)
   */
  static calculateInvoiceTotals(
    lines: Pick<InvoiceLine, 'quantity' | 'unitPrice' | 'discountPercentage' | 'taxRate'>[]
  ): InvoiceTotals {
    return lines.reduce(
      (acc, line) => {
        const calc = this.calculateLine(line);
        return {
          subtotal: acc.subtotal + calc.subtotalAfterDiscount,
          totalDiscount: acc.totalDiscount + calc.discountAmount,
          totalTax: acc.totalTax + calc.taxAmount,
          total: acc.total + calc.total,
        };
      },
      { subtotal: 0, totalDiscount: 0, totalTax: 0, total: 0 }
    );
  }

  /**
   * Calcula el porcentaje de IVA aplicado a partir de importes
   * @param subtotal - Subtotal antes de aplicar IVA
   * @param taxAmount - Importe de IVA aplicado
   * @returns Porcentaje de IVA (0-100)
   * 
   * @example
   * const rate = InvoiceCalculator.calculateTaxRate(100, 21);
   * // rate === 21
   */
  static calculateTaxRate(subtotal: number, taxAmount: number): number {
    if (subtotal === 0) return 0;
    return this.roundAmount((taxAmount / subtotal) * 100);
  }

  /**
   * Redondea un importe a 2 decimales para evitar errores de precisión de float
   * @param amount - Importe a redondear
   * @returns Importe redondeado a 2 decimales
   * 
   * @example
   * const rounded = InvoiceCalculator.roundAmount(10.12345);
   * // rounded === 10.12
   */
  static roundAmount(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Convierte una línea con snake_case a camelCase para cálculos
   * Útil para trabajar con datos de base de datos
   */
  static normalizeLineForCalculation(dbLine: any): Pick<InvoiceLine, 'quantity' | 'unitPrice' | 'discountPercentage' | 'taxRate'> {
    return {
      quantity: dbLine.quantity || 0,
      unitPrice: dbLine.unit_price || dbLine.unitPrice || 0,
      discountPercentage: dbLine.discount_percentage || dbLine.discountPercentage || 0,
      taxRate: dbLine.tax_rate || dbLine.taxRate || 0,
    };
  }
}
