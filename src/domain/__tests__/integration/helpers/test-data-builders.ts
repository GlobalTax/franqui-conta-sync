// ============================================================================
// TEST DATA BUILDERS - Integration Tests
// Helper functions to create consistent test data
// ============================================================================

import type { InvoiceReceived, InvoiceLine } from '@/domain/invoicing/types';
import type { BankTransaction } from '@/domain/banking/types';

/**
 * Creates a test supplier
 */
export function createTestSupplier(overrides?: Partial<any>) {
  return {
    id: crypto.randomUUID(),
    name: 'Proveedor Test SL',
    taxId: 'B12345678',
    email: 'test@proveedor.com',
    ...overrides,
  };
}

/**
 * Creates a test invoice received
 */
export function createTestInvoiceReceived(overrides?: Partial<InvoiceReceived>): InvoiceReceived {
  return {
    id: crypto.randomUUID(),
    supplierId: 'supplier-123',
    centroCode: 'C001',
    invoiceNumber: `F${Date.now()}`,
    invoiceDate: '2025-01-15',
    dueDate: '2025-02-15',
    subtotal: 1000.00,
    taxTotal: 210.00,
    total: 1210.00,
    status: 'draft',
    documentPath: null,
    entryId: null,
    paymentTransactionId: null,
    ocrConfidence: null,
    // Campos OCR
    ocrEngine: null,
    ocrMsOpenai: null,
    ocrMsMindee: null,
    ocrPages: null,
    ocrTokensIn: null,
    ocrTokensOut: null,
    ocrCostEstimateEur: null,
    ocrProcessingTimeMs: null,
    ocrConfidenceNotes: null,
    ocrMergeNotes: null,
    ocrExtractedData: null,
    notes: null,
    approvalStatus: 'pending_manager',
    requiresManagerApproval: true,
    requiresAccountingApproval: true,
    rejectedBy: null,
    rejectedAt: null,
    rejectedReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test-user-123',
    ...overrides,
  };
}

/**
 * Creates test invoice lines
 */
export function createTestInvoiceLines(count: number = 1): Omit<InvoiceLine, 'id' | 'invoiceId' | 'invoiceType'>[] {
  return Array.from({ length: count }, (_, i) => ({
    lineNumber: i + 1,
    description: `Línea ${i + 1}`,
    quantity: 10,
    unitPrice: 100,
    discountPercentage: 0,
    discountAmount: 0,
    subtotal: 1000,
    taxRate: 21,
    taxAmount: 210,
    total: 1210,
    accountCode: '6000000',
  }));
}

/**
 * Creates a test accounting entry input
 */
export function createTestAccountingEntry(overrides?: Partial<any>) {
  return {
    centroCode: 'C001',
    entryDate: '2025-01-15',
    description: `Asiento test ${Date.now()}`,
    transactions: [
      { accountCode: '6000000', movementType: 'debit' as const, amount: 1000, description: 'Compras' },
      { accountCode: '5720000', movementType: 'credit' as const, amount: 1000, description: 'Banco' },
    ],
    createdBy: 'test-user-123',
    ...overrides,
  };
}

/**
 * Creates a test bank transaction
 */
export function createTestBankTransaction(overrides?: Partial<BankTransaction>): BankTransaction {
  return {
    id: crypto.randomUUID(),
    bankAccountId: 'bank-acc-123',
    transactionDate: '2025-01-15',
    valueDate: '2025-01-15',
    amount: 1210.00,
    description: 'PAGO FACTURA F2025-001',
    reference: `REF${Date.now()}`,
    balance: 10000.00,
    status: 'pending',
    matchedEntryId: null,
    matchedInvoiceId: null,
    reconciliationId: null,
    importBatchId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a valid Norma43 file content
 */
export function createTestNorma43File(transactions: Array<{
  amount: number;
  description: string;
  date: string;
}>): string {
  // Header
  let content = '11ES1234567890123456789012EUR           01ES123456780001001\n';
  
  // Transaction lines
  transactions.forEach((tx, index) => {
    const amountStr = Math.abs(tx.amount).toFixed(2).replace('.', '').padStart(14, '0');
    const sign = tx.amount >= 0 ? '1' : '2'; // 1 = credit, 2 = debit
    const dateStr = tx.date.replace(/-/g, '').substring(2); // YYMMDD
    const sequenceNum = String(index + 1).padStart(10, '0');
    const descriptionPadded = tx.description.padEnd(40).substring(0, 40);
    
    content += `22${dateStr}${dateStr}${sign}${amountStr}000${sequenceNum}${descriptionPadded}\n`;
  });
  
  // Footer - totals
  const totalDebit = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalCredit = transactions.filter(t => t.amount >= 0).reduce((sum, t) => sum + t.amount, 0);
  const debitStr = totalDebit.toFixed(2).replace('.', '').padStart(14, '0');
  const creditStr = totalCredit.toFixed(2).replace('.', '').padStart(14, '0');
  const recordCount = String(transactions.length).padStart(5, '0');
  
  content += `33${recordCount}${debitStr}${creditStr}\n`;
  content += `88000100000${String(transactions.length + 3).padStart(6, '0')}${debitStr}${creditStr}\n`;
  
  return content;
}

/**
 * Simulates saving bank transactions to database
 * (In real E2E tests, this would use actual repository)
 */
export async function saveBankTransactions(transactions: BankTransaction[]): Promise<BankTransaction[]> {
  return transactions.map(tx => ({
    ...tx,
    id: tx.id || crypto.randomUUID(),
    createdAt: tx.createdAt || new Date().toISOString(),
  }));
}

/**
 * Creates test user with specific role
 */
export function createTestUser(role: 'manager' | 'accountant' | 'treasurer' | 'admin') {
  return {
    id: `${role}-${crypto.randomUUID()}`,
    email: `${role}@test.com`,
    role,
  };
}

/**
 * Creates a test closing period request
 */
export function createTestClosingPeriodRequest(overrides?: Partial<any>) {
  return {
    centroCode: 'C001',
    periodYear: 2025,
    periodMonth: 1,
    notes: 'Test period closing',
    userId: 'accountant-123',
    ...overrides,
  };
}
