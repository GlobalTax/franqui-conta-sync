// ============================================================================
// TRANSACTION MAPPER
// Convierte entre tipos de DB (snake_case) y tipos de Dominio (camelCase)
// ============================================================================

import type { BankTransaction, BankAccount } from "@/domain/banking/types";

export class TransactionMapper {
  /**
   * Convierte transacción bancaria de DB a dominio
   */
  static toDomain(dbTransaction: any): BankTransaction {
    return {
      id: dbTransaction.id,
      bankAccountId: dbTransaction.bank_account_id,
      transactionDate: dbTransaction.transaction_date,
      valueDate: dbTransaction.value_date,
      description: dbTransaction.description,
      reference: dbTransaction.reference,
      amount: dbTransaction.amount,
      balance: dbTransaction.balance,
      status: dbTransaction.status,
      matchedEntryId: dbTransaction.matched_entry_id,
      matchedInvoiceId: dbTransaction.matched_invoice_id,
      reconciliationId: dbTransaction.reconciliation_id,
      importBatchId: dbTransaction.import_batch_id,
      createdAt: dbTransaction.created_at,
    };
  }

  /**
   * Convierte transacción bancaria de dominio a DB
   */
  static toDatabase(transaction: Partial<BankTransaction>): Partial<any> {
    return {
      bank_account_id: transaction.bankAccountId,
      transaction_date: transaction.transactionDate,
      value_date: transaction.valueDate,
      description: transaction.description,
      reference: transaction.reference,
      amount: transaction.amount,
      balance: transaction.balance,
      status: transaction.status,
      matched_entry_id: transaction.matchedEntryId,
      matched_invoice_id: transaction.matchedInvoiceId,
      reconciliation_id: transaction.reconciliationId,
      import_batch_id: transaction.importBatchId,
    };
  }

  /**
   * Convierte cuenta bancaria de DB a dominio
   */
  static bankAccountToDomain(dbAccount: any): BankAccount {
    return {
      id: dbAccount.id,
      centroCode: dbAccount.centro_code,
      accountName: dbAccount.account_name,
      iban: dbAccount.iban,
      swift: dbAccount.swift,
      currency: dbAccount.currency,
      currentBalance: dbAccount.current_balance,
      accountCode: dbAccount.account_code,
      active: dbAccount.active,
      createdAt: dbAccount.created_at,
      updatedAt: dbAccount.updated_at,
    };
  }

  /**
   * Convierte cuenta bancaria de dominio a DB
   */
  static bankAccountToDatabase(account: Partial<BankAccount>): Partial<any> {
    return {
      centro_code: account.centroCode,
      account_name: account.accountName,
      iban: account.iban,
      swift: account.swift,
      currency: account.currency,
      current_balance: account.currentBalance,
      account_code: account.accountCode,
      active: account.active,
    };
  }
}
