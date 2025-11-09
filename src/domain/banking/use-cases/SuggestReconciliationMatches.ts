// ============================================================================
// CASO DE USO - SuggestReconciliationMatches
// Sugerir Matches de Conciliación
// Orquesta: Obtener candidatos → Calcular scores → Filtrar mejores matches
// ============================================================================

import { ReconciliationEngine, type ReconciliationMatch } from '../services/ReconciliationEngine';
import type { BankTransaction } from '../types';
import type { InvoiceReceived } from '@/domain/invoicing/types';

export interface SuggestReconciliationMatchesInput {
  transaction: BankTransaction;
  centroCode: string;
  invoices: any[];
  lookbackDays?: number;
}

export interface SuggestReconciliationMatchesOutput {
  suggestions: ReconciliationMatch[];
  totalFound: number;
}

/**
 * Caso de uso: Sugerir Matches de Conciliación
 * Orquesta: Obtener candidatos → Calcular scores → Filtrar mejores matches
 */
export class SuggestReconciliationMatchesUseCase {
  execute(input: SuggestReconciliationMatchesInput): SuggestReconciliationMatchesOutput {
    const suggestions: ReconciliationMatch[] = [];

    // PASO 1: Calcular matches con facturas
    const invoiceMatches = ReconciliationEngine.findInvoiceMatches(
      input.transaction,
      input.invoices,
      {
        amountTolerance: 0.01,
        dateTolerance: 3,
      }
    );

    suggestions.push(...invoiceMatches);

    // PASO 2: Ordenar por confidence score
    suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore);

    return {
      suggestions: suggestions.slice(0, 10), // Top 10
      totalFound: suggestions.length,
    };
  }
}
