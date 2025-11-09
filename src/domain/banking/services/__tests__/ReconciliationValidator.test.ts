import { describe, it, expect } from 'vitest';
import { ReconciliationValidator } from '../ReconciliationValidator';
import type { BankTransaction, BankReconciliation } from '../../types';

const mockTransaction: BankTransaction = {
  id: 'tx-1',
  bankAccountId: 'acc-1',
  transactionDate: '2025-01-15',
  valueDate: '2025-01-15',
  description: 'Pago factura',
  reference: 'REF-001',
  amount: -1000.00,
  balance: null,
  status: 'pending',
  matchedEntryId: null,
  matchedInvoiceId: null,
  reconciliationId: null,
  importBatchId: null,
  createdAt: '2025-01-15T10:00:00Z',
};

const mockReconciliation: BankReconciliation = {
  id: 'rec-1',
  bankTransactionId: 'tx-1',
  matchedType: 'invoice_received',
  matchedId: 'inv-1',
  reconciliationStatus: 'matched',
  confidenceScore: 95,
  ruleId: null,
  reconciledBy: 'user-1',
  reconciledAt: '2025-01-15T10:00:00Z',
  notes: null,
  metadata: {},
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
};

describe('ReconciliationValidator', () => {
  describe('canReconcile', () => {
    it('debe permitir conciliar transacción pending', () => {
      const result = ReconciliationValidator.canReconcile(mockTransaction);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('debe rechazar transacción ya reconciliada y confirmada', () => {
      const transaction = { ...mockTransaction, status: 'reconciled' as const };
      const existing = { ...mockReconciliation, reconciliationStatus: 'confirmed' as const };

      const result = ReconciliationValidator.canReconcile(transaction, existing);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La transacción ya está conciliada y confirmada');
    });

    it('debe advertir sobre transacción con importe cero', () => {
      const transaction = { ...mockTransaction, amount: 0 };

      const result = ReconciliationValidator.canReconcile(transaction);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('La transacción tiene importe cero');
    });

    it('debe advertir sobre transacción sin descripción', () => {
      const transaction = { ...mockTransaction, description: '' };

      const result = ReconciliationValidator.canReconcile(transaction);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('La transacción no tiene descripción');
    });
  });

  describe('canConfirmReconciliation', () => {
    it('debe permitir confirmar reconciliación matched', () => {
      const result = ReconciliationValidator.canConfirmReconciliation(mockReconciliation);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('debe permitir confirmar reconciliación reviewed', () => {
      const reconciliation = { ...mockReconciliation, reconciliationStatus: 'reviewed' as const };

      const result = ReconciliationValidator.canConfirmReconciliation(reconciliation);

      expect(result.isValid).toBe(true);
    });

    it('debe rechazar confirmar reconciliación pending', () => {
      const reconciliation = { ...mockReconciliation, reconciliationStatus: 'pending' as const };

      const result = ReconciliationValidator.canConfirmReconciliation(reconciliation);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('No se puede confirmar una conciliación en estado pending'));
    });

    it('debe rechazar confirmar sin documento asociado', () => {
      const reconciliation = { ...mockReconciliation, matchedId: null };

      const result = ReconciliationValidator.canConfirmReconciliation(reconciliation);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La conciliación no tiene un documento asociado');
    });

    it('debe advertir sobre confidence score bajo', () => {
      const reconciliation = { ...mockReconciliation, confidenceScore: 75 };

      const result = ReconciliationValidator.canConfirmReconciliation(reconciliation);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(expect.stringContaining('El confidence score es bajo'));
    });
  });

  describe('canRejectReconciliation', () => {
    it('debe permitir rechazar reconciliación pending', () => {
      const reconciliation = { ...mockReconciliation, reconciliationStatus: 'pending' as const };

      const result = ReconciliationValidator.canRejectReconciliation(reconciliation, 'No coincide');

      expect(result.isValid).toBe(true);
    });

    it('debe rechazar rechazar reconciliación confirmada', () => {
      const reconciliation = { ...mockReconciliation, reconciliationStatus: 'confirmed' as const };

      const result = ReconciliationValidator.canRejectReconciliation(reconciliation);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No se puede rechazar una conciliación ya confirmada');
    });

    it('debe advertir si no se proporcionan notas', () => {
      const result = ReconciliationValidator.canRejectReconciliation(mockReconciliation);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Se recomienda proporcionar una razón para el rechazo');
    });

    it('no debe advertir si se proporcionan notas', () => {
      const result = ReconciliationValidator.canRejectReconciliation(mockReconciliation, 'No coincide el importe');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
