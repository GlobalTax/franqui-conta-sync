import { describe, it, expect } from 'vitest';
import { EntryValidator } from '../EntryValidator';
import { Transaction, JournalEntry } from '../../types';

describe('EntryValidator', () => {
  describe('validateBalance', () => {
    it('should validate balanced entry', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryValidator.validateBalance(transactions);

      expect(result.valid).toBe(true);
    });

    it('should reject unbalanced entry', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 90, description: 'Ventas' },
      ];

      const result = EntryValidator.validateBalance(transactions);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('UNBALANCED_ENTRY');
    });

    it('should handle multiple lines', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 121, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
        { accountCode: '4770000', movementType: 'credit', amount: 21, description: 'IVA Repercutido' },
      ];

      const result = EntryValidator.validateBalance(transactions);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateMinimumLines', () => {
    it('should accept entry with 2 or more lines', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryValidator.validateMinimumLines(transactions);

      expect(result.valid).toBe(true);
    });

    it('should reject entry with less than 2 lines', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
      ];

      const result = EntryValidator.validateMinimumLines(transactions);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_LINES');
    });
  });

  describe('validatePositiveAmounts', () => {
    it('should accept all positive amounts', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryValidator.validatePositiveAmounts(transactions);

      expect(result.valid).toBe(true);
    });

    it('should reject negative amounts', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: -100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryValidator.validatePositiveAmounts(transactions);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('NEGATIVE_AMOUNTS');
    });

    it('should reject zero amounts', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 0, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryValidator.validatePositiveAmounts(transactions);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateAccountCodes', () => {
    it('should accept valid PGC account codes', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryValidator.validateAccountCodes(transactions);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid account codes', () => {
      const transactions: Transaction[] = [
        { accountCode: 'ABC123', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryValidator.validateAccountCodes(transactions);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_ACCOUNT_CODE');
    });

    it('should reject empty account codes', () => {
      const transactions: Transaction[] = [
        { accountCode: '', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryValidator.validateAccountCodes(transactions);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateBothMovementTypes', () => {
    it('should accept entry with both debit and credit', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
        { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
      ];

      const result = EntryValidator.validateBothMovementTypes(transactions);

      expect(result.valid).toBe(true);
    });

    it('should reject entry with only debit', () => {
      const transactions: Transaction[] = [
        { accountCode: '4300000', movementType: 'debit', amount: 50, description: 'Cliente 1' },
        { accountCode: '4300001', movementType: 'debit', amount: 50, description: 'Cliente 2' },
      ];

      const result = EntryValidator.validateBothMovementTypes(transactions);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_MOVEMENT_TYPE');
    });

    it('should reject entry with only credit', () => {
      const transactions: Transaction[] = [
        { accountCode: '7000000', movementType: 'credit', amount: 50, description: 'Ventas 1' },
        { accountCode: '7000001', movementType: 'credit', amount: 50, description: 'Ventas 2' },
      ];

      const result = EntryValidator.validateBothMovementTypes(transactions);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateEntry', () => {
    it('should validate complete valid entry', () => {
      const entry: JournalEntry = {
        entryDate: '2025-01-15',
        description: 'Venta de mercancías',
        centroCode: '1050',
        totalDebit: 121,
        totalCredit: 121,
        transactions: [
          { accountCode: '4300000', movementType: 'debit', amount: 121, description: 'Cliente' },
          { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
          { accountCode: '4770000', movementType: 'credit', amount: 21, description: 'IVA 21%' },
        ],
      };

      const result = EntryValidator.validateEntry(entry);

      expect(result.valid).toBe(true);
    });

    it('should reject entry with missing date', () => {
      const entry: JournalEntry = {
        entryDate: '',
        description: 'Venta de mercancías',
        centroCode: '1050',
        totalDebit: 100,
        totalCredit: 100,
        transactions: [
          { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
          { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
        ],
      };

      const result = EntryValidator.validateEntry(entry);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_DATE');
    });

    it('should reject entry with missing description', () => {
      const entry: JournalEntry = {
        entryDate: '2025-01-15',
        description: '',
        centroCode: '1050',
        totalDebit: 100,
        totalCredit: 100,
        transactions: [
          { accountCode: '4300000', movementType: 'debit', amount: 100, description: 'Cliente' },
          { accountCode: '7000000', movementType: 'credit', amount: 100, description: 'Ventas' },
        ],
      };

      const result = EntryValidator.validateEntry(entry);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_DESCRIPTION');
    });
  });
});
