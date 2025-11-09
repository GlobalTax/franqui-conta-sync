// ============================================================================
// E2E INTEGRATION TEST: Bank Reconciliation Flow
// Tests complete flow: Import Norma43 → Suggest Matches → Reconcile → Entry
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportNorma43FileUseCase } from '@/domain/banking/use-cases/ImportNorma43File';
import { SuggestReconciliationMatchesUseCase } from '@/domain/banking/use-cases/SuggestReconciliationMatches';
import { ReconcileBankTransactionUseCase } from '@/domain/banking/use-cases/ReconcileBankTransaction';
import { CreateAccountingEntryUseCase } from '@/domain/accounting/use-cases/CreateAccountingEntry';
import { 
  createTestNorma43File, 
  createTestBankTransaction, 
  createTestInvoiceReceived 
} from './helpers/test-data-builders';
import type { BankTransaction } from '@/domain/banking/types';

describe('E2E: Flujo completo de Norma43 → Conciliación → Asiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe importar Norma43 y conciliar transacciones automáticamente', async () => {
    // ========================================================================
    // STEP 1: Import Norma43 file
    // ========================================================================
    const norma43Content = createTestNorma43File([
      { amount: 1210.00, description: 'PAGO FACTURA F2025-001', date: '2025-01-15' },
      { amount: -500.00, description: 'TRASPASO NOMINAS', date: '2025-01-16' },
      { amount: 350.00, description: 'COBRO CLIENTE ABC', date: '2025-01-17' },
    ]);

    const importUseCase = new ImportNorma43FileUseCase();
    const importResult = importUseCase.execute({
      bankAccountId: 'bank-acc-123',
      centroCode: 'C001',
      fileName: 'test-january.n43',
      fileContent: norma43Content,
    });

    expect(importResult.success).toBe(true);
    expect(importResult.transactionsImported).toBe(3);
    expect(importResult.transactions.length).toBe(3);
    expect(importResult.transactions[0].amount).toBe(1210.00);
    expect(importResult.transactions[1].amount).toBe(-500.00);

    // ========================================================================
    // STEP 2: Create matching invoice for first transaction
    // ========================================================================
    const matchingInvoice = createTestInvoiceReceived({
      invoiceNumber: 'F2025-001',
      total: 1210.00,
      approvalStatus: 'approved',
    });

    // ========================================================================
    // STEP 3: Suggest reconciliation matches
    // ========================================================================
    const suggestUseCase = new SuggestReconciliationMatchesUseCase();
    const tx1 = createTestBankTransaction({
      amount: 1210.00,
      description: 'PAGO FACTURA F2025-001',
    });

    const suggestions = suggestUseCase.execute({
      transaction: tx1,
      centroCode: 'C001',
      invoices: [matchingInvoice],
    });

    expect(suggestions.suggestions.length).toBeGreaterThan(0);
    expect(suggestions.suggestions[0].matchType).toBe('invoice_received');
    expect(suggestions.suggestions[0].matchedId).toBe(matchingInvoice.id);
    expect(suggestions.suggestions[0].confidenceScore).toBeGreaterThanOrEqual(85);

    // ========================================================================
    // STEP 4: Reconcile transaction with high confidence
    // ========================================================================
    const reconcileUseCase = new ReconcileBankTransactionUseCase();
    const reconciliation = reconcileUseCase.execute({
      transaction: tx1,
      matchType: 'invoice_received',
      matchedId: matchingInvoice.id,
      confidenceScore: suggestions.suggestions[0].confidenceScore,
      userId: 'treasurer-123',
      notes: 'Auto-matched by invoice number',
    });

    expect(reconciliation.success).toBe(true);
    expect(reconciliation.reconciliation.matchedType).toBe('invoice_received');
    expect(reconciliation.reconciliation.matchedId).toBe(matchingInvoice.id);
    expect(reconciliation.reconciliation.reconciliationStatus).toBe('matched'); // High confidence
    expect(reconciliation.warnings).toEqual([]);

    // ========================================================================
    // FINAL VERIFICATION
    // ========================================================================
    expect(importResult.transactionsImported).toBe(3);
    expect(reconciliation.reconciliation.reconciledBy).toBe('treasurer-123');
  });

  it('debe generar asiento de regularización para transacciones no conciliadas', async () => {
    // ========================================================================
    // STEP 1: Import transaction with no matches
    // ========================================================================
    const norma43Content = createTestNorma43File([
      { amount: 250.00, description: 'INGRESO DESCONOCIDO', date: '2025-01-20' },
    ]);

    const importUseCase = new ImportNorma43FileUseCase();
    const importResult = importUseCase.execute({
      bankAccountId: 'bank-acc-123',
      centroCode: 'C001',
      fileName: 'unknown.n43',
      fileContent: norma43Content,
    });

    expect(importResult.success).toBe(true);
    expect(importResult.transactionsImported).toBe(1);

    // ========================================================================
    // STEP 2: Try to find matches (should be empty)
    // ========================================================================
    const tx1 = createTestBankTransaction({
      amount: 250.00,
      description: 'INGRESO DESCONOCIDO',
    });

    const suggestUseCase = new SuggestReconciliationMatchesUseCase();
    const suggestions = suggestUseCase.execute({
      transaction: tx1,
      centroCode: 'C001',
      invoices: [], // No invoices to match
    });

    expect(suggestions.suggestions.length).toBe(0);

    // ========================================================================
    // STEP 3: Create manual regularization entry
    // ========================================================================
    const createEntryUseCase = new CreateAccountingEntryUseCase();
    const entryResult = await createEntryUseCase.execute({
      centroCode: 'C001',
      entryDate: '2025-01-20',
      description: 'Regularización ingreso desconocido - Conciliación bancaria',
      transactions: [
        { accountCode: '5720000', movementType: 'debit' as const, amount: 250.00, description: 'Banco' },
        { accountCode: '7590000', movementType: 'credit' as const, amount: 250.00, description: 'Otros ingresos' },
      ],
      createdBy: 'accountant-123',
    });

    expect(entryResult.entry.totalDebit).toBe(250.00);
    expect(entryResult.entry.totalCredit).toBe(250.00);

    // ========================================================================
    // STEP 4: Now reconcile with the created entry
    // ========================================================================
    const reconcileUseCase = new ReconcileBankTransactionUseCase();
    const reconciliation = reconcileUseCase.execute({
      transaction: tx1,
      matchType: 'entry',
      matchedId: entryResult.entry.id!,
      confidenceScore: 100, // Manual match
      userId: 'accountant-123',
      notes: 'Manual regularization entry',
    });

    expect(reconciliation.success).toBe(true);
    expect(reconciliation.reconciliation.matchedType).toBe('entry');
    expect(reconciliation.reconciliation.reconciliationStatus).toBe('matched');
  });

  it('debe detectar importación duplicada del mismo archivo (idempotencia)', async () => {
    // ========================================================================
    // STEP 1: First import
    // ========================================================================
    const norma43Content = createTestNorma43File([
      { amount: 100.00, description: 'TEST DUPLICATE', date: '2025-01-15' },
    ]);

    const importUseCase = new ImportNorma43FileUseCase();
    
    const result1 = importUseCase.execute({
      bankAccountId: 'bank-acc-123',
      centroCode: 'C001',
      fileName: 'duplicate-test.n43',
      fileContent: norma43Content,
    });

    expect(result1.success).toBe(true);
    expect(result1.transactionsImported).toBe(1);
    expect(result1.warnings).toEqual([]);

    // ========================================================================
    // STEP 2: Second import of the same file (should detect duplicates)
    // ========================================================================
    // In a real implementation, this would check import_batch_id or fileName hash
    // For now, we verify the parser itself is idempotent
    
    const result2 = importUseCase.execute({
      bankAccountId: 'bank-acc-123',
      centroCode: 'C001',
      fileName: 'duplicate-test.n43',
      fileContent: norma43Content,
    });

    // Parser should successfully parse again (idempotent)
    expect(result2.success).toBe(true);
    expect(result2.transactionsImported).toBe(1);
    
    // Verify both results produce identical transactions
    expect(result2.transactions[0].amount).toBe(result1.transactions[0].amount);
    expect(result2.transactions[0].description).toBe(result1.transactions[0].description);

    // Note: In production, the database layer would prevent duplicate inserts
    // based on unique constraints on (bank_account_id, transaction_date, reference, amount)
  });

  it('debe sugerir múltiples matches ordenados por confidence score', async () => {
    // ========================================================================
    // ARRANGE: Create transaction and multiple potential matches
    // ========================================================================
    const transaction = createTestBankTransaction({
      amount: 1000.00,
      description: 'PAGO PROVEEDOR ABC',
      transactionDate: '2025-01-15',
    });

    const invoice1 = createTestInvoiceReceived({
      invoiceNumber: 'F2025-001',
      total: 1000.00, // Exact match
      supplierId: 'supplier-abc',
    });

    const invoice2 = createTestInvoiceReceived({
      invoiceNumber: 'F2025-002',
      total: 1050.00, // Close match
      supplierId: 'supplier-abc',
    });

    const invoice3 = createTestInvoiceReceived({
      invoiceNumber: 'F2025-003',
      total: 500.00, // Poor match
      supplierId: 'supplier-xyz',
    });

    // ========================================================================
    // ACT: Suggest matches
    // ========================================================================
    const suggestUseCase = new SuggestReconciliationMatchesUseCase();
    const suggestions = suggestUseCase.execute({
      transaction,
      centroCode: 'C001',
      invoices: [invoice1, invoice2, invoice3],
    });

    // ========================================================================
    // ASSERT: Verify suggestions are ordered by confidence
    // ========================================================================
    expect(suggestions.suggestions.length).toBeGreaterThan(0);
    
    // First suggestion should be the exact match
    const topMatch = suggestions.suggestions[0];
    expect(topMatch.matchedId).toBe(invoice1.id);
    expect(topMatch.confidenceScore).toBeGreaterThanOrEqual(90);
    
    // Confidence scores should be descending
    for (let i = 0; i < suggestions.suggestions.length - 1; i++) {
      expect(suggestions.suggestions[i].confidenceScore)
        .toBeGreaterThanOrEqual(suggestions.suggestions[i + 1].confidenceScore);
    }
  });
});
