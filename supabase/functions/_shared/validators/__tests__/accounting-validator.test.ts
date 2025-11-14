// ============================================================================
// TESTS UNITARIOS - validateAccountingRulesCompact
// ============================================================================

import { assertEquals, assert } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { validateAccountingRulesCompact } from '../accounting-validator.ts';

// ============================================================================
// Facturas correctas (ok: true)
// ============================================================================

Deno.test('validateAccountingRulesCompact - debe validar factura simple sin punto verde', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs, { eq1: 0, eq2: 0, eq3: 0 });
  assertEquals(result.recalculated_totals.base_total_plus_fees, "100.00");
  assertEquals(result.recalculated_totals.tax_total, "21.00");
  assertEquals(result.recalculated_totals.grand_total, "121.00");
});

Deno.test('validateAccountingRulesCompact - debe validar factura con punto verde', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs, { eq1: 0, eq2: 0, eq3: 0 });
  assertEquals(result.recalculated_totals.base_total_plus_fees, "100.12");
  assertEquals(result.recalculated_totals.tax_total, "21.00");
  assertEquals(result.recalculated_totals.grand_total, "121.12");
});

Deno.test('validateAccountingRulesCompact - debe validar factura con múltiples tipos de IVA', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs, { eq1: 0, eq2: 0, eq3: 0 });
  assertEquals(result.recalculated_totals.base_total_plus_fees, "100.00");
  assertEquals(result.recalculated_totals.tax_total, "9.20");
  assertEquals(result.recalculated_totals.grand_total, "109.20");
});

// ============================================================================
// Errores de redondeo (dentro de tolerancia)
// ============================================================================

Deno.test('validateAccountingRulesCompact - debe aceptar diferencia de +1 céntimo en eq1', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs.eq1, 1);
  assertEquals(result.diffs.eq2, 0);
  assertEquals(result.diffs.eq3, 1);
  assertEquals(result.recalculated_totals.base_total_plus_fees, "100.01");
});

Deno.test('validateAccountingRulesCompact - debe aceptar diferencia de -2 céntimos en eq2', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs.eq1, 0);
  assertEquals(result.diffs.eq2, -2);
  assertEquals(result.diffs.eq3, -2);
  assertEquals(result.recalculated_totals.tax_total, "20.98");
});

Deno.test('validateAccountingRulesCompact - debe aceptar redondeos combinados en límite', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs.eq1, 1);
  assertEquals(result.diffs.eq2, 1);
  assertEquals(result.diffs.eq3, 2);
});

Deno.test('validateAccountingRulesCompact - debe aceptar diferencia de exactamente +2 céntimos', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs.eq1, 2);
  assertEquals(result.diffs.eq2, 0);
  assertEquals(result.diffs.eq3, 2);
});

Deno.test('validateAccountingRulesCompact - debe aceptar diferencia de exactamente -2 céntimos', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs.eq1, -2);
  assertEquals(result.diffs.eq2, 0);
  assertEquals(result.diffs.eq3, -2);
});

// ============================================================================
// Errores graves (fuera de tolerancia)
// ============================================================================

Deno.test('validateAccountingRulesCompact - debe rechazar error de +10 céntimos en base', () => {
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
  assertEquals(result.ok, false);
  assertEquals(result.diffs.eq1, 10);
  assertEquals(result.diffs.eq2, 0);
  assertEquals(result.diffs.eq3, 10);
  assertEquals(result.recalculated_totals.base_total_plus_fees, "100.00");
});

Deno.test('validateAccountingRulesCompact - debe rechazar error de -50 céntimos en IVA', () => {
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
  assertEquals(result.ok, false);
  assertEquals(result.diffs.eq1, 0);
  assertEquals(result.diffs.eq2, -50);
  assertEquals(result.diffs.eq3, -50);
  assertEquals(result.recalculated_totals.tax_total, "20.50");
});

Deno.test('validateAccountingRulesCompact - debe rechazar error de +10€ en total general', () => {
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
  assertEquals(result.ok, false);
  assertEquals(result.diffs.eq1, 0);
  assertEquals(result.diffs.eq2, 0);
  assertEquals(result.diffs.eq3, -1000);
  assertEquals(result.recalculated_totals.grand_total, "121.00");
});

Deno.test('validateAccountingRulesCompact - debe rechazar múltiples errores acumulados', () => {
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
  assertEquals(result.ok, false);
  assertEquals(result.diffs.eq1, 5);
  assertEquals(result.diffs.eq2, -3);
  assertEquals(result.diffs.eq3, 2);
});

Deno.test('validateAccountingRulesCompact - debe rechazar error de +3 céntimos (justo fuera de tolerancia)', () => {
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
  assertEquals(result.ok, false);
  assertEquals(result.diffs.eq1, 3);
  assertEquals(result.diffs.eq3, 3);
});

// ============================================================================
// Casos límite (edge cases)
// ============================================================================

Deno.test('validateAccountingRulesCompact - debe manejar factura sin líneas de IVA', () => {
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
  assertEquals(result.ok, false);
  assertEquals(result.diffs.eq1, -10000);
  assertEquals(result.diffs.eq2, 0);
  assertEquals(result.diffs.eq3, -10000);
  assertEquals(result.recalculated_totals.base_total_plus_fees, "0.00");
});

Deno.test('validateAccountingRulesCompact - debe manejar campos null en líneas de IVA', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs, { eq1: 0, eq2: 0, eq3: 0 });
  assertEquals(result.recalculated_totals.base_total_plus_fees, "0.00");
});

Deno.test('validateAccountingRulesCompact - debe manejar campos undefined en líneas de IVA', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs, { eq1: 0, eq2: 0, eq3: 0 });
});

Deno.test('validateAccountingRulesCompact - debe manejar importes con muchos decimales (precisión)', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs.eq1, 0); // 100.12 vs 100.12
  assertEquals(result.diffs.eq2, -1); // 21.00 vs 21.01
  assertEquals(result.diffs.eq3, -1); // 121.12 vs 121.13
});

Deno.test('validateAccountingRulesCompact - debe manejar importes negativos (nota de crédito)', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs, { eq1: 0, eq2: 0, eq3: 0 });
  assertEquals(result.recalculated_totals.base_total_plus_fees, "-50.00");
  assertEquals(result.recalculated_totals.tax_total, "-10.50");
  assertEquals(result.recalculated_totals.grand_total, "-60.50");
});

Deno.test('validateAccountingRulesCompact - debe detectar punto verde no sumado en base', () => {
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
  assertEquals(result.ok, false);
  assertEquals(result.diffs.eq1, 12);
  assertEquals(result.diffs.eq2, 0);
  assertEquals(result.diffs.eq3, 12);
  assertEquals(result.recalculated_totals.base_total_plus_fees, "100.12");
});

Deno.test('validateAccountingRulesCompact - debe manejar punto verde sin campo fees', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs, { eq1: 0, eq2: 0, eq3: 0 });
});

Deno.test('validateAccountingRulesCompact - debe manejar totals_by_vat undefined', () => {
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
  assertEquals(result.ok, true);
  assertEquals(result.diffs, { eq1: 0, eq2: 0, eq3: 0 });
});

// ============================================================================
// Formato de respuesta
// ============================================================================

Deno.test('validateAccountingRulesCompact - debe devolver recalculated_totals con 2 decimales', () => {
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
  assert(result.recalculated_totals.base_total_plus_fees.match(/^\d+\.\d{2}$/));
  assert(result.recalculated_totals.tax_total.match(/^\d+\.\d{2}$/));
  assert(result.recalculated_totals.grand_total.match(/^\d+\.\d{2}$/));
});

Deno.test('validateAccountingRulesCompact - debe devolver diffs en céntimos (números enteros)', () => {
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
  assert(Number.isInteger(result.diffs.eq1));
  assert(Number.isInteger(result.diffs.eq2));
  assert(Number.isInteger(result.diffs.eq3));
});

Deno.test('validateAccountingRulesCompact - debe mantener signo correcto en diffs (positivo = calculado > declarado)', () => {
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
  assertEquals(result.diffs.eq1, 5); // 100.00 - 99.95 = +0.05 = +5 céntimos
  assertEquals(result.diffs.eq2, -5); // 21.00 - 21.05 = -0.05 = -5 céntimos
  assertEquals(result.diffs.eq3, 0); // 121.00 - 121.00 = 0
});

Deno.test('validateAccountingRulesCompact - debe devolver estructura completa incluso con valores cero', () => {
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
  assert('ok' in result);
  assert('diffs' in result);
  assert('eq1' in result.diffs);
  assert('eq2' in result.diffs);
  assert('eq3' in result.diffs);
  assert('recalculated_totals' in result);
  assert('base_total_plus_fees' in result.recalculated_totals);
  assert('tax_total' in result.recalculated_totals);
  assert('grand_total' in result.recalculated_totals);
});
