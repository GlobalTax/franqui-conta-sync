import { describe, it, expect } from 'vitest';
import { SuggestReconciliationMatchesUseCase } from '../SuggestReconciliationMatches';
import type { BankTransaction } from '../../types';
import type { InvoiceReceived } from '@/domain/invoicing/types';

const mockTransaction: BankTransaction = {
  id: 'tx-1',
  bankAccountId: 'acc-1',
  transactionDate: '2025-01-15',
  valueDate: '2025-01-15',
  description: 'Pago FRA-2025-001',
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

const mockInvoice: Partial<InvoiceReceived> & { id: string; invoiceNumber: string; invoiceDate: string; total: number; supplier?: any } = {
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

describe('SuggestReconciliationMatchesUseCase', () => {
  it('debe encontrar sugerencias de conciliación', () => {
    const useCase = new SuggestReconciliationMatchesUseCase();
    
    const result = useCase.execute({
      transaction: mockTransaction,
      centroCode: 'centro-1',
      invoices: [mockInvoice],
    });

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.totalFound).toBeGreaterThan(0);
  });

  it('debe ordenar sugerencias por confidence score', () => {
    const useCase = new SuggestReconciliationMatchesUseCase();
    
    const invoice2 = {
      ...mockInvoice,
      id: 'inv-2',
      invoiceNumber: 'FRA-2025-002',
      total: 1005.00,
    };

    const result = useCase.execute({
      transaction: mockTransaction,
      centroCode: 'centro-1',
      invoices: [mockInvoice, invoice2],
    });

    // Primera sugerencia debe tener el score más alto
    if (result.suggestions.length > 1) {
      expect(result.suggestions[0].confidenceScore).toBeGreaterThanOrEqual(
        result.suggestions[1].confidenceScore
      );
    }
  });

  it('debe limitar resultados a top 10', () => {
    const useCase = new SuggestReconciliationMatchesUseCase();
    
    const manyInvoices = Array.from({ length: 20 }, (_, i) => ({
      ...mockInvoice,
      id: `inv-${i}`,
      invoiceNumber: `FRA-2025-${String(i + 1).padStart(3, '0')}`,
    }));

    const result = useCase.execute({
      transaction: mockTransaction,
      centroCode: 'centro-1',
      invoices: manyInvoices,
    });

    expect(result.suggestions.length).toBeLessThanOrEqual(10);
  });
});
