import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceEntryValidator } from '../InvoiceEntryValidator';
import type { InvoiceEntryValidationInput } from '../InvoiceEntryValidator';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Mock vat-utils
vi.mock('@/lib/vat-utils', () => ({
  validateVATCoherence: vi.fn(),
  validateVATCalculation: vi.fn(),
}));

import { supabase } from '@/integrations/supabase/client';
import * as vatUtils from '@/lib/vat-utils';

describe('InvoiceEntryValidator', () => {
  const mockRpc = vi.mocked(supabase.rpc);
  const mockValidateVATCoherence = vi.mocked(vatUtils.validateVATCoherence);
  const mockValidateVATCalculation = vi.mocked(vatUtils.validateVATCalculation);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createValidInput = (): InvoiceEntryValidationInput => ({
    normalized_invoice: {
      document_type: 'invoice',
      issuer: {
        name: 'Test Supplier',
        vat_id: 'B12345678',
      },
      receiver: {
        name: 'Test Receiver',
        vat_id: 'A87654321',
        address: 'Test Address',
      },
      invoice_number: '2024-001',
      issue_date: '2024-06-15',
      due_date: null,
      totals: {
        currency: 'EUR',
        base_10: null,
        vat_10: null,
        base_21: 100,
        vat_21: 21,
        other_taxes: [],
        total: 121,
      },
      lines: [],
      centre_hint: null,
      payment_method: null,
      confidence_notes: [],
      confidence_score: 0.95,
      discrepancies: [],
      proposed_fix: null,
    },
    ap_mapping: {
      invoice_level: {
        account_suggestion: '6000000',
        tax_account: '4720000',
        ap_account: '4100000',
        centre_id: 'test-centre-id',
        confidence_score: 95,
        rationale: 'High confidence mapping',
        matched_rule_id: null,
        matched_rule_name: null,
      },
      line_level: [],
    },
    centro_code: 'M001',
  });

  describe('Validación de Campos Obligatorios', () => {
    it('debe bloquear si falta NIF del emisor', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.issuer.vat_id = null as any;

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.ready_to_post).toBe(false);
      expect(result.blocking_issues.some(i => i.includes('NIF/CIF del emisor'))).toBe(true);
    });

    it('debe bloquear si NIF del emisor es inválido', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.issuer.vat_id = 'INVALID123';

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.ready_to_post).toBe(false);
      expect(result.blocking_issues.some(i => i.includes('NIF/CIF') && i.includes('inválido'))).toBe(true);
    });

    it('debe bloquear si falta número de factura', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.invoice_number = null as any;

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.ready_to_post).toBe(false);
      expect(result.blocking_issues.some(i => i.includes('Número de factura'))).toBe(true);
    });

    it('debe bloquear si falta fecha de emisión', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.issue_date = null as any;

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.ready_to_post).toBe(false);
      expect(result.blocking_issues.some(i => i.includes('Fecha de emisión'))).toBe(true);
    });

    it('debe bloquear si total ≤ 0', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.totals.total = 0;

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.ready_to_post).toBe(false);
      expect(result.blocking_issues.some(i => i.includes('Total') && i.includes('mayor que 0'))).toBe(true);
    });

    it('debe bloquear si formato de fecha incorrecto', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.issue_date = 'invalid-date';

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.ready_to_post).toBe(false);
      expect(result.blocking_issues.some(i => i.includes('formato') && i.includes('fecha'))).toBe(true);
    });
  });

  describe('Validación de Ejercicio Fiscal', () => {
    it('debe bloquear si ejercicio está cerrado', async () => {
      // Arrange
      const input = createValidInput();
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: true, year: 2024, message: 'Ejercicio cerrado' },
        error: null,
      } as any);

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.ready_to_post).toBe(false);
      expect(result.blocking_issues.some(i => i.includes('cerrado'))).toBe(true);
    });

    it('debe añadir warning si no existe ejercicio fiscal', async () => {
      // Arrange
      const input = createValidInput();
      mockRpc.mockResolvedValueOnce({
        data: { exists: false, is_closed: false, year: 2024, message: 'No existe' },
        error: null,
      } as any);

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.warnings.some(w => w.includes('ejercicio fiscal') && w.includes('no existe'))).toBe(true);
    });

    it('debe aprobar si ejercicio está abierto', async () => {
      // Arrange
      const input = createValidInput();
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.blocking_issues.some(i => i.includes('ejercicio'))).toBe(false);
    });

    it('debe añadir warning si RPC falla', async () => {
      // Arrange
      const input = createValidInput();
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' } as any,
      } as any);

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.warnings.some(w => w.includes('Error') && w.includes('ejercicio'))).toBe(true);
    });
  });

  describe('Validación de IVA', () => {
    it('debe bloquear si total no cuadra con base + IVA', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.totals.total = 120; // Incorrecto, debería ser 121
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({
        valid: false,
        reason: 'Total no cuadra con Base+IVA',
        expectedTotal: 121,
      });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.blocking_issues.some(i => i.includes('no cuadra'))).toBe(true);
    });

    it('debe añadir warning si IVA 21% mal calculado', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.totals.vat_21 = 25; // Incorrecto
      input.normalized_invoice.totals.base_21 = 100;
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });
      mockValidateVATCalculation.mockReturnValue({
        valid: false,
        reason: 'IVA 21% mal calculado',
        expectedTotal: 21,
      });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.warnings.some(w => w.includes('IVA 21%'))).toBe(true);
    });

    it('debe añadir warning si IVA 10% mal calculado', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.totals.vat_10 = 15; // Incorrecto
      input.normalized_invoice.totals.base_10 = 100;
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });
      mockValidateVATCalculation.mockReturnValue({
        valid: false,
        reason: 'IVA 10% mal calculado',
        expectedTotal: 10,
      });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.warnings.some(w => w.includes('IVA 10%'))).toBe(true);
    });

    it('debe aprobar cálculos IVA correctos', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.totals.base_21 = 100;
      input.normalized_invoice.totals.vat_21 = 21;
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });
      mockValidateVATCalculation.mockReturnValue({ valid: true });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.warnings.some(w => w.includes('IVA'))).toBe(false);
    });
  });

  describe('Validación de AP Mapping', () => {
    it('debe reducir confianza si AP confidence < 50%', async () => {
      // Arrange
      const input = createValidInput();
      input.ap_mapping.invoice_level.confidence_score = 45;
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.confidence_score).toBeLessThan(0.5);
      expect(result.warnings.some(w => w.includes('confianza baja'))).toBe(true);
    });

    it('debe reducir confianza si AP confidence < 80%', async () => {
      // Arrange
      const input = createValidInput();
      input.ap_mapping.invoice_level.confidence_score = 75;
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.confidence_score).toBeLessThan(0.8);
    });

    it('debe bloquear si cuenta de gasto no empieza con 6xx', async () => {
      // Arrange
      const input = createValidInput();
      input.ap_mapping.invoice_level.account_suggestion = '4000000'; // No es gasto
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.blocking_issues.some(i => i.includes('cuenta de gasto'))).toBe(true);
    });

    it('debe añadir warning si cuenta IVA no es 472xxxx', async () => {
      // Arrange
      const input = createValidInput();
      input.ap_mapping.invoice_level.tax_account = '4770000'; // No es 472xxxx
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.warnings.some(w => w.includes('IVA') && w.includes('472'))).toBe(true);
    });
  });

  describe('Generación de Preview', () => {
    it('debe generar preview balanceado para factura válida', async () => {
      // Arrange
      const input = createValidInput();
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.post_preview.length).toBeGreaterThan(0);
      const totalDebit = result.post_preview.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = result.post_preview.reduce((sum, line) => sum + line.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);
    });

    it('debe incluir IRPF como línea separada si existe', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.totals.other_taxes = [
        { type: 'IRPF 15%', base: 66.67, quota: 10 }
      ];
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.post_preview.some(line => line.account.startsWith('473'))).toBe(true);
    });

    it('debe bloquear si preview no está cuadrado (DEBE ≠ HABER)', async () => {
      // Arrange
      const input = createValidInput();
      input.normalized_invoice.totals.total = 9999; // Forzar descuadre
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      const totalDebit = result.post_preview.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = result.post_preview.reduce((sum, line) => sum + line.credit, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        expect(result.blocking_issues.some(i => i.includes('descuadrado'))).toBe(true);
      }
    });
  });

  describe('Cálculo de Confidence Score', () => {
    it('debe calcular confidence_score basado en issues y warnings', async () => {
      // Arrange
      const input = createValidInput();
      mockRpc.mockResolvedValueOnce({
        data: { exists: true, is_closed: false, year: 2024, message: 'OK' },
        error: null,
      } as any);
      mockValidateVATCoherence.mockReturnValue({ valid: true });

      // Act
      const result = await InvoiceEntryValidator.validate(input);

      // Assert
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
      
      // Si hay warnings, la confianza debe ser menor
      if (result.warnings.length > 0) {
        expect(result.confidence_score).toBeLessThan(1);
      }
    });
  });
});
