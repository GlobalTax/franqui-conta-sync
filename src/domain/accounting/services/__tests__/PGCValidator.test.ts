import { describe, it, expect } from 'vitest';
import { PGCValidator } from '../PGCValidator';

describe('PGCValidator', () => {
  describe('validateAccountGroup', () => {
    it('should accept valid PGC groups (1-9)', () => {
      for (let group = 1; group <= 9; group++) {
        const result = PGCValidator.validateAccountGroup(`${group}000000`);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid PGC groups', () => {
      const result = PGCValidator.validateAccountGroup('0000000');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_PGC_GROUP');
    });

    it('should reject invalid account code format', () => {
      const result = PGCValidator.validateAccountGroup('ABC123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_ACCOUNT_CODE');
    });
  });

  describe('isBalanceAccount', () => {
    it('should return true for balance accounts (groups 1-5)', () => {
      expect(PGCValidator.isBalanceAccount('1000000')).toBe(true); // Patrimonio Neto
      expect(PGCValidator.isBalanceAccount('2000000')).toBe(true); // Activo No Corriente
      expect(PGCValidator.isBalanceAccount('3000000')).toBe(true); // Existencias
      expect(PGCValidator.isBalanceAccount('4000000')).toBe(true); // Acreedores y Deudores
      expect(PGCValidator.isBalanceAccount('5000000')).toBe(true); // Cuentas Financieras
    });

    it('should return false for PyG accounts (groups 6-7)', () => {
      expect(PGCValidator.isBalanceAccount('6000000')).toBe(false);
      expect(PGCValidator.isBalanceAccount('7000000')).toBe(false);
    });

    it('should return false for groups 8-9', () => {
      expect(PGCValidator.isBalanceAccount('8000000')).toBe(false);
      expect(PGCValidator.isBalanceAccount('9000000')).toBe(false);
    });
  });

  describe('isPnLAccount', () => {
    it('should return true for PyG accounts (groups 6-7)', () => {
      expect(PGCValidator.isPnLAccount('6000000')).toBe(true); // Gastos
      expect(PGCValidator.isPnLAccount('7000000')).toBe(true); // Ingresos
    });

    it('should return false for balance accounts', () => {
      expect(PGCValidator.isPnLAccount('1000000')).toBe(false);
      expect(PGCValidator.isPnLAccount('5000000')).toBe(false);
    });
  });

  describe('isAssetAccount', () => {
    it('should return true for asset accounts (groups 2, 3, 5)', () => {
      expect(PGCValidator.isAssetAccount('2000000')).toBe(true);
      expect(PGCValidator.isAssetAccount('3000000')).toBe(true);
      expect(PGCValidator.isAssetAccount('5000000')).toBe(true);
    });

    it('should return false for non-asset accounts', () => {
      expect(PGCValidator.isAssetAccount('1000000')).toBe(false);
      expect(PGCValidator.isAssetAccount('4000000')).toBe(false);
    });
  });

  describe('isLiabilityAccount', () => {
    it('should return true for liability accounts (group 4)', () => {
      expect(PGCValidator.isLiabilityAccount('4000000')).toBe(true);
    });

    it('should return false for non-liability accounts', () => {
      expect(PGCValidator.isLiabilityAccount('1000000')).toBe(false);
      expect(PGCValidator.isLiabilityAccount('5000000')).toBe(false);
    });
  });

  describe('isEquityAccount', () => {
    it('should return true for equity accounts (group 1)', () => {
      expect(PGCValidator.isEquityAccount('1000000')).toBe(true);
    });

    it('should return false for non-equity accounts', () => {
      expect(PGCValidator.isEquityAccount('2000000')).toBe(false);
      expect(PGCValidator.isEquityAccount('6000000')).toBe(false);
    });
  });

  describe('isExpenseAccount', () => {
    it('should return true for expense accounts (group 6)', () => {
      expect(PGCValidator.isExpenseAccount('6000000')).toBe(true);
    });

    it('should return false for non-expense accounts', () => {
      expect(PGCValidator.isExpenseAccount('7000000')).toBe(false);
    });
  });

  describe('isIncomeAccount', () => {
    it('should return true for income accounts (group 7)', () => {
      expect(PGCValidator.isIncomeAccount('7000000')).toBe(true);
    });

    it('should return false for non-income accounts', () => {
      expect(PGCValidator.isIncomeAccount('6000000')).toBe(false);
    });
  });

  describe('getGroupName', () => {
    it('should return correct group names', () => {
      expect(PGCValidator.getGroupName(1)).toBe('Financiación Básica');
      expect(PGCValidator.getGroupName(6)).toBe('Compras y Gastos');
      expect(PGCValidator.getGroupName(7)).toBe('Ventas e Ingresos');
    });

    it('should return "Grupo Desconocido" for invalid groups', () => {
      expect(PGCValidator.getGroupName(0)).toBe('Grupo Desconocido');
      expect(PGCValidator.getGroupName(10)).toBe('Grupo Desconocido');
    });
  });

  describe('validateAccountLength', () => {
    it('should accept valid lengths (1-7 digits)', () => {
      expect(PGCValidator.validateAccountLength('1').valid).toBe(true);
      expect(PGCValidator.validateAccountLength('43').valid).toBe(true);
      expect(PGCValidator.validateAccountLength('4300000').valid).toBe(true);
    });

    it('should reject invalid lengths', () => {
      expect(PGCValidator.validateAccountLength('').valid).toBe(false);
      expect(PGCValidator.validateAccountLength('12345678').valid).toBe(false);
    });
  });
});
