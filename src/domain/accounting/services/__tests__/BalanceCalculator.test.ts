// ============================================================================
// TESTS: BalanceCalculator
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BalanceCalculator } from '../BalanceCalculator';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('BalanceCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateTrialBalance', () => {
    it('debe calcular balance de comprobación correctamente', async () => {
      const mockTransactions = [
        {
          account_code: '6000000',
          movement_type: 'debit',
          amount: 1000,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-03-15',
            status: 'posted',
          },
        },
        {
          account_code: '6000000',
          movement_type: 'credit',
          amount: 200,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-03-16',
            status: 'posted',
          },
        },
        {
          account_code: '7000000',
          movement_type: 'credit',
          amount: 5000,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-03-17',
            status: 'posted',
          },
        },
      ];

      const mockAccounts = [
        {
          code: '6000000',
          name: 'Compras de mercaderías',
          account_type: 'expense',
          level: 3,
          parent_code: '600',
        },
        {
          code: '7000000',
          name: 'Ventas de mercaderías',
          account_type: 'revenue',
          level: 3,
          parent_code: '700',
        },
      ];

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Primera llamada: transacciones
          return {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          };
        } else {
          // Segunda llamada: cuentas
          return {
            eq: vi.fn().mockResolvedValue({
              data: mockAccounts,
              error: null,
            }),
          };
        }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await BalanceCalculator.calculateTrialBalance(
        '001',
        '2024-03-01',
        '2024-03-31'
      );

      expect(result).toHaveLength(2);
      expect(result[0].accountCode).toBe('6000000');
      expect(result[0].debitTotal).toBe(1000);
      expect(result[0].creditTotal).toBe(200);
      expect(result[0].balance).toBe(800);
      expect(result[1].accountCode).toBe('7000000');
      expect(result[1].creditTotal).toBe(5000);
    });

    it('debe retornar array vacío si no hay transacciones', async () => {
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        } else {
          return {
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await BalanceCalculator.calculateTrialBalance(
        '001',
        '2024-01-01',
        '2024-01-31'
      );

      expect(result).toEqual([]);
    });
  });

  describe('calculateAccountBalance', () => {
    it('debe calcular saldo de cuenta específica', async () => {
      const mockTransactions = [
        {
          movement_type: 'debit',
          amount: 1500,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-03-10',
            status: 'posted',
          },
        },
        {
          movement_type: 'credit',
          amount: 500,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-03-15',
            status: 'posted',
          },
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockResolvedValue({
        data: mockTransactions,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ lte: mockLte });

      const result = await BalanceCalculator.calculateAccountBalance(
        '5720000',
        '001',
        '2024-03-01',
        '2024-03-31'
      );

      expect(result.accountCode).toBe('5720000');
      expect(result.debitTotal).toBe(1500);
      expect(result.creditTotal).toBe(500);
      expect(result.balance).toBe(1000);
    });
  });

  describe('sumByAccountGroup', () => {
    it('debe sumar saldos por grupo PGC', async () => {
      const mockTransactions = [
        {
          account_code: '6000000',
          movement_type: 'debit',
          amount: 1000,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-03-15',
            status: 'posted',
          },
        },
        {
          account_code: '6060000',
          movement_type: 'debit',
          amount: 500,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-03-16',
            status: 'posted',
          },
        },
        {
          account_code: '7000000',
          movement_type: 'credit',
          amount: 2000,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-03-17',
            status: 'posted',
          },
        },
      ];

      const mockAccounts = [
        {
          code: '6000000',
          name: 'Compras',
          account_type: 'expense',
          level: 3,
          parent_code: '600',
        },
        {
          code: '6060000',
          name: 'Aprovisionamientos',
          account_type: 'expense',
          level: 3,
          parent_code: '606',
        },
        {
          code: '7000000',
          name: 'Ventas',
          account_type: 'revenue',
          level: 3,
          parent_code: '700',
        },
      ];

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          };
        } else {
          return {
            eq: vi.fn().mockResolvedValue({
              data: mockAccounts,
              error: null,
            }),
          };
        }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await BalanceCalculator.sumByAccountGroup(
        '6',
        '001',
        '2024-03-01',
        '2024-03-31'
      );

      expect(result).toBe(1500); // 1000 + 500
    });
  });

  describe('calculateBalanceSheet', () => {
    it('debe calcular balance de situación', async () => {
      const mockTransactions = [
        {
          account_code: '2100000',
          movement_type: 'debit',
          amount: 10000,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-03-15',
            status: 'posted',
          },
        },
        {
          account_code: '4000000',
          movement_type: 'credit',
          amount: 5000,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-03-16',
            status: 'posted',
          },
        },
      ];

      const mockAccounts = [
        {
          code: '2100000',
          name: 'Edificios',
          account_type: 'asset',
          level: 3,
          parent_code: '210',
        },
        {
          code: '4000000',
          name: 'Proveedores',
          account_type: 'liability',
          level: 3,
          parent_code: '400',
        },
      ];

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          };
        } else {
          return {
            eq: vi.fn().mockResolvedValue({
              data: mockAccounts,
              error: null,
            }),
          };
        }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await BalanceCalculator.calculateBalanceSheet(
        '001',
        '2024-03-31'
      );

      expect(result.activo.total).toBeGreaterThan(0);
      expect(result.pasivo.total).toBeGreaterThan(0);
    });
  });

  describe('getOpeningBalances', () => {
    it('debe obtener saldos de apertura', async () => {
      const mockFiscalYear = {
        start_date: '2024-01-01',
      };

      const mockTransactions = [
        {
          account_code: '5720000',
          movement_type: 'debit',
          amount: 1000,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2023-12-31',
            status: 'posted',
          },
        },
      ];

      const mockAccounts = [
        {
          code: '5720000',
          name: 'Bancos',
          account_type: 'asset',
          level: 3,
          parent_code: '572',
        },
      ];

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // fiscal_years
          return {
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockFiscalYear,
              error: null,
            }),
          };
        } else if (callCount === 2) {
          // transactions
          return {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          };
        } else {
          // accounts
          return {
            eq: vi.fn().mockResolvedValue({
              data: mockAccounts,
              error: null,
            }),
          };
        }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await BalanceCalculator.getOpeningBalances(
        '001',
        'fy-2024'
      );

      expect(result).toHaveLength(1);
      expect(result[0].accountCode).toBe('5720000');
    });
  });

  describe('calculateClosingBalances', () => {
    it('debe calcular saldos de cierre', async () => {
      const mockFiscalYear = {
        end_date: '2024-12-31',
      };

      const mockTransactions = [
        {
          account_code: '5720000',
          movement_type: 'debit',
          amount: 5000,
          accounting_entries: {
            centro_code: '001',
            entry_date: '2024-12-30',
            status: 'posted',
          },
        },
      ];

      const mockAccounts = [
        {
          code: '5720000',
          name: 'Bancos',
          account_type: 'asset',
          level: 3,
          parent_code: '572',
        },
      ];

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // fiscal_years
          return {
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockFiscalYear,
              error: null,
            }),
          };
        } else if (callCount === 2) {
          // transactions
          return {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          };
        } else {
          // accounts
          return {
            eq: vi.fn().mockResolvedValue({
              data: mockAccounts,
              error: null,
            }),
          };
        }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await BalanceCalculator.calculateClosingBalances(
        '001',
        'fy-2024'
      );

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe(5000);
    });
  });
});
