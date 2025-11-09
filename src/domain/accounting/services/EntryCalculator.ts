// ============================================================================
// SERVICIO DE DOMINIO: EntryCalculator
// Cálculos de totales y balances para asientos contables
// ============================================================================

import { Transaction, EntryTotals } from '../types';
import { Money } from '../value-objects/Money';

export class EntryCalculator {
  /**
   * Calcula totales de debe, haber y diferencia para un conjunto de transacciones
   */
  static calculateTotals(transactions: Transaction[]): EntryTotals {
    const debit = this.sumByType(transactions, 'debit');
    const credit = this.sumByType(transactions, 'credit');
    const difference = Math.abs(debit - credit);

    return {
      debit,
      credit,
      difference,
      isBalanced: difference < 0.01,
    };
  }

  /**
   * Suma importes por tipo de movimiento (debe o haber)
   */
  private static sumByType(
    transactions: Transaction[],
    type: 'debit' | 'credit'
  ): number {
    return transactions
      .filter(t => t.movementType === type)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Calcula totales usando Money value object (más preciso)
   */
  static calculateTotalsWithMoney(transactions: Transaction[]): {
    debit: Money;
    credit: Money;
    difference: Money;
    isBalanced: boolean;
  } {
    const debit = this.sumByTypeWithMoney(transactions, 'debit');
    const credit = this.sumByTypeWithMoney(transactions, 'credit');
    const difference = debit.subtract(credit).abs();

    return {
      debit,
      credit,
      difference,
      isBalanced: difference.isZero(),
    };
  }

  /**
   * Suma importes usando Money value object
   */
  private static sumByTypeWithMoney(
    transactions: Transaction[],
    type: 'debit' | 'credit'
  ): Money {
    return transactions
      .filter(t => t.movementType === type)
      .reduce(
        (sum, t) => sum.add(Money.create(t.amount)),
        Money.zero()
      );
  }

  /**
   * Valida que un asiento tenga al menos dos líneas
   */
  static hasMinimumLines(transactions: Transaction[]): boolean {
    return transactions.length >= 2;
  }

  /**
   * Valida que todas las líneas tengan importes positivos
   */
  static allAmountsPositive(transactions: Transaction[]): boolean {
    return transactions.every(t => t.amount > 0);
  }

  /**
   * Obtiene el total de debe
   */
  static getTotalDebit(transactions: Transaction[]): number {
    return this.sumByType(transactions, 'debit');
  }

  /**
   * Obtiene el total de haber
   */
  static getTotalCredit(transactions: Transaction[]): number {
    return this.sumByType(transactions, 'credit');
  }
}
