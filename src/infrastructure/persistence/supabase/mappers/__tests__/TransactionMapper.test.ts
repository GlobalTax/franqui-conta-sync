import { describe, it, expect } from 'vitest';
import { TransactionMapper } from '../TransactionMapper';
import type { BankTransaction, BankAccount } from '@/domain/banking/types';

describe('TransactionMapper', () => {
  describe('toDomain', () => {
    it('convierte transacción bancaria de DB a dominio correctamente', () => {
      const dbTransaction = {
        id: 'trans-1',
        bank_account_id: 'acc-1',
        transaction_date: '2025-01-15',
        value_date: '2025-01-16',
        description: 'Pago a proveedor',
        reference: 'REF-12345',
        amount: -500.50,
        balance: 10000,
        status: 'pending',
        matched_entry_id: null,
        matched_invoice_id: null,
        reconciliation_id: null,
        import_batch_id: 'batch-1',
        created_at: '2025-01-15T10:00:00Z',
      };

      const result = TransactionMapper.toDomain(dbTransaction);

      expect(result).toEqual({
        id: 'trans-1',
        bankAccountId: 'acc-1',
        transactionDate: '2025-01-15',
        valueDate: '2025-01-16',
        description: 'Pago a proveedor',
        reference: 'REF-12345',
        amount: -500.50,
        balance: 10000,
        status: 'pending',
        matchedEntryId: null,
        matchedInvoiceId: null,
        reconciliationId: null,
        importBatchId: 'batch-1',
        createdAt: '2025-01-15T10:00:00Z',
      });
    });

    it('maneja transacción reconciliada correctamente', () => {
      const dbTransaction = {
        id: 'trans-2',
        bank_account_id: 'acc-1',
        transaction_date: '2025-01-15',
        value_date: '2025-01-16',
        description: 'Cobro de cliente',
        reference: 'REF-99999',
        amount: 1000,
        balance: 11000,
        status: 'reconciled',
        matched_entry_id: 'entry-1',
        matched_invoice_id: 'inv-1',
        reconciliation_id: 'rec-1',
        import_batch_id: null,
        created_at: '2025-01-15T10:00:00Z',
      };

      const result = TransactionMapper.toDomain(dbTransaction);

      expect(result.status).toBe('reconciled');
      expect(result.matchedEntryId).toBe('entry-1');
      expect(result.matchedInvoiceId).toBe('inv-1');
      expect(result.reconciliationId).toBe('rec-1');
    });
  });

  describe('toDatabase', () => {
    it('convierte transacción bancaria de dominio a DB correctamente', () => {
      const domainTransaction: Partial<BankTransaction> = {
        bankAccountId: 'acc-1',
        transactionDate: '2025-01-15',
        valueDate: '2025-01-16',
        description: 'Pago a proveedor',
        reference: 'REF-12345',
        amount: -500.50,
        balance: 10000,
        status: 'pending',
      };

      const result = TransactionMapper.toDatabase(domainTransaction);

      expect(result).toEqual({
        bank_account_id: 'acc-1',
        transaction_date: '2025-01-15',
        value_date: '2025-01-16',
        description: 'Pago a proveedor',
        reference: 'REF-12345',
        amount: -500.50,
        balance: 10000,
        status: 'pending',
        matched_entry_id: undefined,
        matched_invoice_id: undefined,
        reconciliation_id: undefined,
        import_batch_id: undefined,
      });
    });
  });

  describe('bankAccountToDomain', () => {
    it('convierte cuenta bancaria de DB a dominio correctamente', () => {
      const dbAccount = {
        id: 'acc-1',
        centro_code: '457',
        account_name: 'Cuenta Principal',
        iban: 'ES7921000813610123456789',
        swift: 'CAIXESBBXXX',
        currency: 'EUR',
        current_balance: 50000,
        account_code: '5720000',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      };

      const result = TransactionMapper.bankAccountToDomain(dbAccount);

      expect(result).toEqual({
        id: 'acc-1',
        centroCode: '457',
        accountName: 'Cuenta Principal',
        iban: 'ES7921000813610123456789',
        swift: 'CAIXESBBXXX',
        currency: 'EUR',
        currentBalance: 50000,
        accountCode: '5720000',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
      });
    });
  });

  describe('bankAccountToDatabase', () => {
    it('convierte cuenta bancaria de dominio a DB correctamente', () => {
      const domainAccount: Partial<BankAccount> = {
        centroCode: '457',
        accountName: 'Cuenta Principal',
        iban: 'ES7921000813610123456789',
        swift: 'CAIXESBBXXX',
        currency: 'EUR',
        currentBalance: 50000,
        accountCode: '5720000',
        active: true,
      };

      const result = TransactionMapper.bankAccountToDatabase(domainAccount);

      expect(result).toEqual({
        centro_code: '457',
        account_name: 'Cuenta Principal',
        iban: 'ES7921000813610123456789',
        swift: 'CAIXESBBXXX',
        currency: 'EUR',
        current_balance: 50000,
        account_code: '5720000',
        active: true,
      });
    });
  });
});
