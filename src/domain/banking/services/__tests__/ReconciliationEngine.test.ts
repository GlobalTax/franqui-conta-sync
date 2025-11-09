import { describe, it, expect } from 'vitest';
import { ReconciliationEngine } from '../ReconciliationEngine';
import type { BankTransaction, ReconciliationRule } from '../../types';

const mockTransaction: BankTransaction = {
  id: 'tx-1',
  bankAccountId: 'acc-1',
  transactionDate: '2025-01-15',
  valueDate: '2025-01-15',
  description: 'Pago factura FRA-2025-001',
  reference: 'FRA-2025-001',
  amount: -1000.00,
  balance: null,
  status: 'pending',
  matchedEntryId: null,
  matchedInvoiceId: null,
  reconciliationId: null,
  importBatchId: null,
  createdAt: '2025-01-15T10:00:00Z',
};

const mockInvoice = {
  id: 'inv-1',
  invoiceNumber: 'FRA-2025-001',
  invoiceDate: '2025-01-15',
  centroCode: 'centro-1',
  supplierId: 'sup-1',
  supplier: {
    id: 'sup-1',
    name: 'Proveedor Test',
    taxId: 'B12345678',
  },
  subtotal: 826.45,
  total: 1000.00,
  status: 'approved',
  approvalStatus: 'approved',
  lines: [],
  createdAt: '2025-01-15T08:00:00Z',
  updatedAt: '2025-01-15T08:00:00Z',
};

describe('ReconciliationEngine', () => {
  describe('findInvoiceMatches', () => {
    it('debe encontrar match exacto por importe y fecha', () => {
      const matches = ReconciliationEngine.findInvoiceMatches(
        mockTransaction,
        [mockInvoice]
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].matchedId).toBe('inv-1');
      expect(matches[0].confidenceScore).toBeGreaterThanOrEqual(70);
      expect(matches[0].matchReasons).toContain(expect.stringContaining('Importe coincide'));
      expect(matches[0].matchReasons).toContain(expect.stringContaining('Fecha exacta'));
    });

    it('debe encontrar match con importe cercano', () => {
      const invoice = { ...mockInvoice, total: 1005.00 };
      const matches = ReconciliationEngine.findInvoiceMatches(
        mockTransaction,
        [invoice]
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].matchReasons).toContain(expect.stringContaining('Importe muy cercano'));
    });

    it('debe encontrar match con fecha cercana', () => {
      const invoice = { ...mockInvoice, invoiceDate: '2025-01-17' };
      const matches = ReconciliationEngine.findInvoiceMatches(
        mockTransaction,
        [invoice],
        { dateTolerance: 3 }
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].matchReasons).toContain(expect.stringContaining('Fecha cercana'));
    });

    it('debe encontrar match por referencia exacta', () => {
      const matches = ReconciliationEngine.findInvoiceMatches(
        mockTransaction,
        [mockInvoice],
        { checkReference: true }
      );

      expect(matches).toHaveLength(1);
      const hasReferenceMatch = matches[0].matchReasons.some(r => r.includes('Referencia coincide'));
      expect(hasReferenceMatch).toBe(true);
    });

    it('debe ordenar matches por confidence score', () => {
      const invoice1 = { ...mockInvoice, id: 'inv-1', total: 1000.00, invoiceDate: '2025-01-15' };
      const invoice2 = { ...mockInvoice, id: 'inv-2', total: 1020.00, invoiceDate: '2025-01-20' };
      
      const matches = ReconciliationEngine.findInvoiceMatches(
        mockTransaction,
        [invoice2, invoice1]
      );

      expect(matches[0].matchedId).toBe('inv-1');
    });

    it('no debe devolver matches con score muy bajo', () => {
      const invoice = {
        ...mockInvoice,
        total: 5000.00,
        invoiceDate: '2025-02-15',
        invoiceNumber: 'OTRA-FACTURA',
      };

      const matches = ReconciliationEngine.findInvoiceMatches(
        mockTransaction,
        [invoice]
      );

      expect(matches).toHaveLength(0);
    });

    it('debe respetar tolerancia de importe', () => {
      const invoice = { ...mockInvoice, total: 1000.50 };
      
      const matchesStrict = ReconciliationEngine.findInvoiceMatches(
        mockTransaction,
        [invoice],
        { amountTolerance: 0.01 }
      );

      const matchesLoose = ReconciliationEngine.findInvoiceMatches(
        mockTransaction,
        [invoice],
        { amountTolerance: 1.00 }
      );

      expect(matchesLoose.length).toBeGreaterThanOrEqual(matchesStrict.length);
    });
  });

  describe('applyReconciliationRules', () => {
    it('debe aplicar regla por tipo de transacción (débito)', () => {
      const rule: ReconciliationRule = {
        id: 'rule-1',
        centroCode: 'centro-1',
        ruleName: 'Pagos a proveedores',
        bankAccountId: 'acc-1',
        transactionType: 'debit',
        descriptionPattern: null,
        amountMin: null,
        amountMax: null,
        autoMatchType: 'invoice',
        suggestedAccount: '4000000',
        confidenceThreshold: 80,
        active: true,
        priority: 10,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const result = ReconciliationEngine.applyReconciliationRules(
        mockTransaction,
        [rule]
      );

      expect(result).toBe(rule);
    });

    it('debe aplicar regla por rango de importe', () => {
      const rule: ReconciliationRule = {
        id: 'rule-2',
        centroCode: 'centro-1',
        ruleName: 'Pagos grandes',
        bankAccountId: 'acc-1',
        transactionType: null,
        descriptionPattern: null,
        amountMin: 500,
        amountMax: 2000,
        autoMatchType: 'manual',
        suggestedAccount: null,
        confidenceThreshold: 70,
        active: true,
        priority: 5,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const result = ReconciliationEngine.applyReconciliationRules(
        mockTransaction,
        [rule]
      );

      expect(result).toBe(rule);
    });

    it('debe aplicar regla por patrón de descripción', () => {
      const rule: ReconciliationRule = {
        id: 'rule-3',
        centroCode: 'centro-1',
        ruleName: 'Facturas',
        bankAccountId: 'acc-1',
        transactionType: null,
        descriptionPattern: 'factura',
        amountMin: null,
        amountMax: null,
        autoMatchType: 'invoice',
        suggestedAccount: null,
        confidenceThreshold: 80,
        active: true,
        priority: 8,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const result = ReconciliationEngine.applyReconciliationRules(
        mockTransaction,
        [rule]
      );

      expect(result).toBe(rule);
    });

    it('debe aplicar regla con mayor prioridad', () => {
      const rule1: ReconciliationRule = {
        id: 'rule-1',
        centroCode: 'centro-1',
        ruleName: 'Regla prioridad baja',
        bankAccountId: 'acc-1',
        transactionType: 'debit',
        descriptionPattern: null,
        amountMin: null,
        amountMax: null,
        autoMatchType: 'manual',
        suggestedAccount: null,
        confidenceThreshold: 70,
        active: true,
        priority: 5,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const rule2: ReconciliationRule = {
        ...rule1,
        id: 'rule-2',
        ruleName: 'Regla prioridad alta',
        priority: 10,
      };

      const result = ReconciliationEngine.applyReconciliationRules(
        mockTransaction,
        [rule1, rule2]
      );

      expect(result?.id).toBe('rule-2');
    });

    it('debe ignorar reglas inactivas', () => {
      const rule: ReconciliationRule = {
        id: 'rule-1',
        centroCode: 'centro-1',
        ruleName: 'Regla inactiva',
        bankAccountId: 'acc-1',
        transactionType: 'debit',
        descriptionPattern: null,
        amountMin: null,
        amountMax: null,
        autoMatchType: 'manual',
        suggestedAccount: null,
        confidenceThreshold: 70,
        active: false,
        priority: 10,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const result = ReconciliationEngine.applyReconciliationRules(
        mockTransaction,
        [rule]
      );

      expect(result).toBeNull();
    });

    it('debe devolver null si ninguna regla aplica', () => {
      const rule: ReconciliationRule = {
        id: 'rule-1',
        centroCode: 'centro-1',
        ruleName: 'Regla no aplicable',
        bankAccountId: 'acc-1',
        transactionType: 'credit',
        descriptionPattern: null,
        amountMin: null,
        amountMax: null,
        autoMatchType: 'manual',
        suggestedAccount: null,
        confidenceThreshold: 70,
        active: true,
        priority: 10,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const result = ReconciliationEngine.applyReconciliationRules(
        mockTransaction,
        [rule]
      );

      expect(result).toBeNull();
    });
  });
});
