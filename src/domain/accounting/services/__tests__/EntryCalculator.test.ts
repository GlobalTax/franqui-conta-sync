import { describe, it, expect } from 'vitest';
import { EntryCalculator } from '../EntryCalculator';
import { Transaction } from '../../types';

describe('EntryCalculator', () => {
  describe('calculateTotals', () => {
    it('should calculate totals for balanced entry', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryCalculator.calculateTotals(transactions);

      expect(result.debit).toBe(100);
      expect(result.credit).toBe(100);
      expect(result.difference).toBe(0);
      expect(result.isBalanced).toBe(true);
    });

    it('should calculate totals for unbalanced entry', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 90, description: 'Ventas' },
      ];

      const result = EntryCalculator.calculateTotals(transactions);

      expect(result.debit).toBe(100);
      expect(result.credit).toBe(90);
      expect(result.difference).toBe(10);
      expect(result.isBalanced).toBe(false);
    });

    it('should handle multiple debit and credit lines', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 121, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
        { accountCode: '4770000', movementType: 'credit', amount: 21, description: 'IVA' },
      ];

      const result = EntryCalculator.calculateTotals(transactions);

      expect(result.debit).toBe(121);
      expect(result.credit).toBe(121);
      expect(result.difference).toBe(0);
      expect(result.isBalanced).toBe(true);
    });

    it('should handle decimal amounts', () => {
      const transactions: Transaction[] = [
        { accountCode: '6000000', movementType: 'debit', amount: 100.50, description: 'Compras' },
        { accountCode: '4720000', movementType: 'debit', amount: 21.11, description: 'IVA Soportado' },
        { accountCode: '4000000', movementType: 'credit', amount: 121.61, description: 'Proveedor' },
      ];

      const result = EntryCalculator.calculateTotals(transactions);

      expect(result.debit).toBeCloseTo(121.61, 2);
      expect(result.credit).toBeCloseTo(121.61, 2);
      expect(result.difference).toBeCloseTo(0, 2);
      expect(result.isBalanced).toBe(true);
    });
  });

  describe('getTotalDebit', () => {
    it('should sum all debit transactions', () => {
      const transactions: Transaction[] = [
        { accountCode: '6000000', movementType: 'debit', amount: 50, description: 'Compras' },
        { accountCode: '4720000', movementType: 'debit', amount: 10.50, description: 'IVA' },
        { accountCode: '4000000', movementType: 'credit', amount: 60.50, description: 'Proveedor' },
      ];

      const result = EntryCalculator.getTotalDebit(transactions);

      expect(result).toBeCloseTo(60.50, 2);
    });

    it('should return 0 if no debit transactions', () => {
      const transactions: Transaction[] = [
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryCalculator.getTotalDebit(transactions);

      expect(result).toBe(0);
    });
  });

  describe('getTotalCredit', () => {
    it('should sum all credit transactions', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 121, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
        { accountCode: '4770000', movementType: 'credit', amount: 21, description: 'IVA' },
      ];

      const result = EntryCalculator.getTotalCredit(transactions);

      expect(result).toBe(121);
    });

    it('should return 0 if no credit transactions', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
      ];

      const result = EntryCalculator.getTotalCredit(transactions);

      expect(result).toBe(0);
    });
  });

  describe('hasMinimumLines', () => {
    it('should return true for 2 or more lines', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      expect(EntryCalculator.hasMinimumLines(transactions)).toBe(true);
    });

    it('should return false for less than 2 lines', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
      ];

      expect(EntryCalculator.hasMinimumLines(transactions)).toBe(false);
    });

    it('should return false for empty array', () => {
      const transactions: Transaction[] = [];

      expect(EntryCalculator.hasMinimumLines(transactions)).toBe(false);
    });
  });

  describe('allAmountsPositive', () => {
    it('should return true for all positive amounts', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      expect(EntryCalculator.allAmountsPositive(transactions)).toBe(true);
    });

    it('should return false for negative amounts', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: -100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      expect(EntryCalculator.allAmountsPositive(transactions)).toBe(false);
    });

    it('should return false for zero amounts', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 0, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      expect(EntryCalculator.allAmountsPositive(transactions)).toBe(false);
    });
  });
});
