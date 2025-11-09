import { describe, it, expect } from 'vitest';
import { ReconcileBankTransactionUseCase } from '../ReconcileBankTransaction';
import type { BankTransaction } from '../../types';

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

describe('ReconcileBankTransactionUseCase', () => {
  it('debe crear reconciliación con confidence alto (matched)', () => {
    const useCase = new ReconcileBankTransactionUseCase();
    
    const result = useCase.execute({
      transaction: mockTransaction,
      matchType: 'invoice_received',
      matchedId: 'inv-1',
      confidenceScore: 95,
      userId: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.reconciliation.reconciliationStatus).toBe('matched');
    expect(result.reconciliation.confidenceScore).toBe(95);
  });

  it('debe crear reconciliación con confidence bajo (suggested)', () => {
    const useCase = new ReconcileBankTransactionUseCase();
    
    const result = useCase.execute({
      transaction: mockTransaction,
      matchType: 'invoice_received',
      matchedId: 'inv-1',
      confidenceScore: 75,
      userId: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.reconciliation.reconciliationStatus).toBe('suggested');
  });

  it('debe rechazar conciliación de transacción ya reconciliada', () => {
    const useCase = new ReconcileBankTransactionUseCase();
    const transaction = { ...mockTransaction, status: 'reconciled' as const };
    
    expect(() => {
      useCase.execute({
        transaction,
        matchType: 'invoice_received',
        matchedId: 'inv-1',
        confidenceScore: 95,
        userId: 'user-1',
      });
    }).toThrow('No se puede conciliar');
  });
});
