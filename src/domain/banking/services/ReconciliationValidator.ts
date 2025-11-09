// ============================================================================
// SERVICIO DE DOMINIO - ReconciliationValidator
// Validador de reglas de negocio para conciliaciones bancarias
// Responsabilidad: Validar reglas de negocio sin efectos secundarios
// ============================================================================

import type { BankTransaction, BankReconciliation } from '../types';

export interface ReconciliationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validador de reglas de negocio para conciliaciones bancarias
 */
export class ReconciliationValidator {
  /**
   * Valida que se pueda crear una conciliación
   */
  static canReconcile(
    transaction: BankTransaction,
    existingReconciliation?: BankReconciliation
  ): ReconciliationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Verificar que la transacción no esté ya conciliada
    if (transaction.status === 'reconciled' && existingReconciliation?.reconciliationStatus === 'confirmed') {
      errors.push('La transacción ya está conciliada y confirmada');
    }

    // 2. Verificar que el importe no sea cero
    if (transaction.amount === 0) {
      warnings.push('La transacción tiene importe cero');
    }

    // 3. Verificar que tenga descripción
    if (!transaction.description || transaction.description.trim() === '') {
      warnings.push('La transacción no tiene descripción');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Valida que se pueda confirmar una conciliación
   */
  static canConfirmReconciliation(
    reconciliation: BankReconciliation
  ): ReconciliationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Debe estar en estado 'matched' o 'reviewed'
    if (!['matched', 'reviewed'].includes(reconciliation.reconciliationStatus)) {
      errors.push(`No se puede confirmar una conciliación en estado ${reconciliation.reconciliationStatus}`);
    }

    // 2. Debe tener un match asociado
    if (!reconciliation.matchedId) {
      errors.push('La conciliación no tiene un documento asociado');
    }

    // 3. Confidence score mínimo (advertencia)
    if (reconciliation.confidenceScore && reconciliation.confidenceScore < 80) {
      warnings.push(`El confidence score es bajo (${reconciliation.confidenceScore}%)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Valida que se pueda rechazar una conciliación
   */
  static canRejectReconciliation(
    reconciliation: BankReconciliation,
    notes?: string
  ): ReconciliationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. No se puede rechazar una ya confirmada
    if (reconciliation.reconciliationStatus === 'confirmed') {
      errors.push('No se puede rechazar una conciliación ya confirmada');
    }

    // 2. Debe proporcionar notas al rechazar
    if (!notes || notes.trim() === '') {
      warnings.push('Se recomienda proporcionar una razón para el rechazo');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
