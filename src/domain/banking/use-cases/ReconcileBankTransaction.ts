// ============================================================================
// CASO DE USO - ReconcileBankTransaction
// Conciliar Transacción Bancaria
// Orquesta: Validación → Creación de conciliación → Actualización de transacción
// ============================================================================

import { ReconciliationValidator } from '../services/ReconciliationValidator';
import type { BankTransaction, BankReconciliation } from '../types';

export interface ReconcileBankTransactionInput {
  transaction: BankTransaction;
  matchType: 'invoice_received' | 'invoice_issued' | 'entry' | 'daily_closure' | 'manual';
  matchedId: string;
  confidenceScore: number;
  ruleId?: string;
  userId: string;
  notes?: string;
}

export interface ReconcileBankTransactionOutput {
  success: boolean;
  reconciliation: Omit<BankReconciliation, 'id' | 'createdAt' | 'updatedAt'>;
  warnings: string[];
}

/**
 * Caso de uso: Conciliar Transacción Bancaria
 * Orquesta: Validación → Creación de conciliación → Actualización de transacción
 */
export class ReconcileBankTransactionUseCase {
  execute(input: ReconcileBankTransactionInput): ReconcileBankTransactionOutput {
    // PASO 1: Validar que se pueda conciliar
    const validation = ReconciliationValidator.canReconcile(input.transaction);
    
    if (!validation.isValid) {
      throw new Error(`No se puede conciliar: ${validation.errors.join(', ')}`);
    }

    // PASO 2: Crear reconciliación
    const reconciliation: Omit<BankReconciliation, 'id' | 'createdAt' | 'updatedAt'> = {
      bankTransactionId: input.transaction.id,
      matchedType: input.matchType,
      matchedId: input.matchedId,
      reconciliationStatus: input.confidenceScore >= 90 ? 'matched' : 'suggested',
      confidenceScore: input.confidenceScore,
      ruleId: input.ruleId || null,
      reconciledBy: input.userId,
      reconciledAt: new Date().toISOString(),
      notes: input.notes || null,
      metadata: {},
    };

    return {
      success: true,
      reconciliation,
      warnings: validation.warnings,
    };
  }
}
