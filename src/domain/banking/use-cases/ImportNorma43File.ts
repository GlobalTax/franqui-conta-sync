// ============================================================================
// CASO DE USO - ImportNorma43File
// Importar archivo Norma 43
// Orquesta: Validación → Parsing → Transformación → Persistencia
// ============================================================================

import { Norma43Parser } from '../services/Norma43Parser';
import type { BankTransaction } from '../types';

export interface ImportNorma43Input {
  bankAccountId: string;
  centroCode: string;
  fileName: string;
  fileContent: string;
}

export interface ImportNorma43Output {
  success: boolean;
  transactionsImported: number;
  totalDebits: number;
  totalCredits: number;
  errors: string[];
  warnings: string[];
  transactions: Omit<BankTransaction, 'id' | 'createdAt'>[];
}

/**
 * Caso de uso: Importar archivo Norma 43
 * Orquesta: Validación → Parsing → Transformación → Persistencia
 */
export class ImportNorma43FileUseCase {
  execute(input: ImportNorma43Input): ImportNorma43Output {
    const warnings: string[] = [];

    // PASO 1: Validar formato
    if (!Norma43Parser.isValidFormat(input.fileContent)) {
      return {
        success: false,
        transactionsImported: 0,
        totalDebits: 0,
        totalCredits: 0,
        errors: ['El archivo no tiene formato Norma 43 válido'],
        warnings: [],
        transactions: [],
      };
    }

    // PASO 2: Parsear archivo
    const parseResult = Norma43Parser.parse(input.fileContent);

    if (parseResult.errors.length > 0) {
      warnings.push(...parseResult.errors);
    }

    // PASO 3: Transformar a transacciones bancarias
    const importBatchId = crypto.randomUUID();
    
    const transactions: Omit<BankTransaction, 'id' | 'createdAt'>[] = parseResult.transactions.map(tx => ({
      bankAccountId: input.bankAccountId,
      transactionDate: tx.transactionDate,
      valueDate: tx.valueDate,
      description: tx.description,
      reference: tx.reference1 || tx.documentNumber,
      amount: tx.amount,
      balance: null,
      status: 'pending',
      matchedEntryId: null,
      matchedInvoiceId: null,
      reconciliationId: null,
      importBatchId,
    }));

    return {
      success: true,
      transactionsImported: parseResult.transactions.length,
      totalDebits: parseResult.summary.totalDebits,
      totalCredits: parseResult.summary.totalCredits,
      errors: [],
      warnings,
      transactions,
    };
  }
}
