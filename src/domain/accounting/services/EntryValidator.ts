// ============================================================================
// SERVICIO DE DOMINIO: EntryValidator
// Validación de asientos contables según reglas del PGC
// ============================================================================

import { Transaction, ValidationResult, JournalEntry } from '../types';
import { EntryCalculator } from './EntryCalculator';
import { AccountCode } from '../value-objects/AccountCode';

export class EntryValidator {
  /**
   * Valida que un asiento esté cuadrado (debe = haber)
   */
  static validateBalance(transactions: Transaction[]): ValidationResult {
    const totals = EntryCalculator.calculateTotals(transactions);

    if (!totals.isBalanced) {
      return {
        valid: false,
        error: 'UNBALANCED_ENTRY',
        details: `El asiento no está cuadrado. Debe: ${totals.debit.toFixed(2)}, Haber: ${totals.credit.toFixed(2)}, Diferencia: ${totals.difference.toFixed(2)}`,
      };
    }

    return { valid: true };
  }

  /**
   * Valida que un asiento tenga al menos dos líneas
   */
  static validateMinimumLines(transactions: Transaction[]): ValidationResult {
    if (!EntryCalculator.hasMinimumLines(transactions)) {
      return {
        valid: false,
        error: 'INSUFFICIENT_LINES',
        details: 'Un asiento debe tener al menos dos líneas (una de debe y una de haber)',
      };
    }

    return { valid: true };
  }

  /**
   * Valida que todos los importes sean positivos
   */
  static validatePositiveAmounts(transactions: Transaction[]): ValidationResult {
    if (!EntryCalculator.allAmountsPositive(transactions)) {
      return {
        valid: false,
        error: 'NEGATIVE_AMOUNTS',
        details: 'Todos los importes deben ser positivos',
      };
    }

    return { valid: true };
  }

  /**
   * Valida que los códigos de cuenta sean válidos según PGC
   */
  static validateAccountCodes(transactions: Transaction[]): ValidationResult {
    for (const transaction of transactions) {
      try {
        AccountCode.create(transaction.accountCode);
      } catch (error) {
        return {
          valid: false,
          error: 'INVALID_ACCOUNT_CODE',
          details: `Código de cuenta inválido: ${transaction.accountCode}. ${error instanceof Error ? error.message : ''}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Valida que haya al menos una línea de debe y una de haber
   */
  static validateBothMovementTypes(transactions: Transaction[]): ValidationResult {
    const hasDebit = transactions.some(t => t.movementType === 'debit');
    const hasCredit = transactions.some(t => t.movementType === 'credit');

    if (!hasDebit || !hasCredit) {
      return {
        valid: false,
        error: 'MISSING_MOVEMENT_TYPE',
        details: 'Un asiento debe tener al menos una línea de debe y una de haber',
      };
    }

    return { valid: true };
  }

  /**
   * Validación completa de un asiento contable
   */
  static validateEntry(entry: JournalEntry): ValidationResult {
    // Validar líneas mínimas
    const linesValidation = this.validateMinimumLines(entry.transactions);
    if (!linesValidation.valid) return linesValidation;

    // Validar tipos de movimiento
    const movementValidation = this.validateBothMovementTypes(entry.transactions);
    if (!movementValidation.valid) return movementValidation;

    // Validar importes positivos
    const amountsValidation = this.validatePositiveAmounts(entry.transactions);
    if (!amountsValidation.valid) return amountsValidation;

    // Validar códigos de cuenta
    const accountsValidation = this.validateAccountCodes(entry.transactions);
    if (!accountsValidation.valid) return accountsValidation;

    // Validar cuadre
    const balanceValidation = this.validateBalance(entry.transactions);
    if (!balanceValidation.valid) return balanceValidation;

    // Validar fecha
    if (!entry.entryDate) {
      return {
        valid: false,
        error: 'MISSING_DATE',
        details: 'La fecha del asiento es obligatoria',
      };
    }

    // Validar descripción
    if (!entry.description || entry.description.trim().length === 0) {
      return {
        valid: false,
        error: 'MISSING_DESCRIPTION',
        details: 'La descripción del asiento es obligatoria',
      };
    }

    return { valid: true };
  }
}
