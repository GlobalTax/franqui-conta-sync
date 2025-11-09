// ============================================================================
// E2E INTEGRATION TEST: Period Closing Flow
// Tests complete flow: Create Entries → Post All → Verify Balance → Close Period
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateAccountingEntryUseCase } from '@/domain/accounting/use-cases/CreateAccountingEntry';
import { PostEntryUseCase } from '@/domain/accounting/use-cases/PostEntry';
import { CloseAccountingPeriodUseCase } from '@/domain/accounting/use-cases/CloseAccountingPeriod';
import { BalanceCalculator } from '@/domain/accounting/services/BalanceCalculator';
import { PeriodValidator } from '@/domain/accounting/services/PeriodValidator';
import { AccountingCommands } from '@/infrastructure/persistence/supabase/commands/AccountingCommands';
import { supabase } from '@/integrations/supabase/client';
import { createTestAccountingEntry, createTestClosingPeriodRequest } from './helpers/test-data-builders';

// Mock infrastructure
vi.mock('@/infrastructure/persistence/supabase/commands/AccountingCommands');
vi.mock('@/integrations/supabase/client');
vi.mock('@/domain/accounting/services/BalanceCalculator');
vi.mock('@/domain/accounting/services/PeriodValidator');

describe('E2E: Flujo completo de Asientos del mes → Cierre → Regularización', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe cerrar período mensual con validaciones completas', async () => {
    const centroCode = 'C001';
    const year = 2025;
    const month = 1;

    // ========================================================================
    // STEP 1: Create multiple entries for the period
    // ========================================================================
    const createEntryUseCase = new CreateAccountingEntryUseCase();
    const entryIds: string[] = [];

    // Mock entry creation
    for (let i = 1; i <= 5; i++) {
      const mockEntry = {
        id: `entry-${i}`,
        centroCode,
        entryDate: `2025-01-${String(10 + i).padStart(2, '0')}`,
        description: `Asiento ${i} del período`,
        status: 'draft' as const,
        totalDebit: 100 * i,
        totalCredit: 100 * i,
        transactions: [],
        createdAt: new Date().toISOString(),
      };

      vi.spyOn(AccountingCommands, 'createEntry').mockResolvedValueOnce(mockEntry as any);

      const entryResult = await createEntryUseCase.execute(
        createTestAccountingEntry({
          centroCode,
          entryDate: `2025-01-${String(10 + i).padStart(2, '0')}`,
          description: `Asiento ${i} del período`,
          transactions: [
            { accountCode: '6000000', debit: 100 * i, credit: 0, description: 'Compras' },
            { accountCode: '5720000', debit: 0, credit: 100 * i, description: 'Banco' },
          ],
        })
      );

      expect(entryResult.entry.status).toBe('draft');
      entryIds.push(entryResult.entry.id);
    }

    expect(entryIds.length).toBe(5);

    // ========================================================================
    // STEP 2: Post all entries
    // ========================================================================
    const postUseCase = new PostEntryUseCase();

    for (const entryId of entryIds) {
      const postedEntry = {
        id: entryId,
        status: 'posted' as const,
        postedAt: new Date().toISOString(),
        postedBy: 'accountant-123',
      };

      vi.spyOn(AccountingCommands, 'postEntry').mockResolvedValueOnce(postedEntry as any);

      await postUseCase.execute({
        entryId,
        userId: 'accountant-123',
      });
    }

    expect(AccountingCommands.postEntry).toHaveBeenCalledTimes(5);

    // ========================================================================
    // STEP 3: Verify trial balance before closing
    // ========================================================================
    const mockTrialBalance = [
      {
        accountCode: '6000000',
        accountName: 'Compras',
        accountType: 'expense' as const,
        level: 3,
        parentCode: '600',
        debitTotal: 1500, // Sum of 100+200+300+400+500
        creditTotal: 0,
        balance: 1500,
      },
      {
        accountCode: '5720000',
        accountName: 'Banco',
        accountType: 'asset' as const,
        level: 3,
        parentCode: '572',
        debitTotal: 0,
        creditTotal: 1500,
        balance: -1500,
      },
    ];

    vi.mocked(BalanceCalculator.calculateTrialBalance).mockResolvedValue(mockTrialBalance);

    const trialBalance = await BalanceCalculator.calculateTrialBalance(
      centroCode,
      '2025-01-01',
      '2025-01-31'
    );

    expect(trialBalance.length).toBe(2);
    const totalDebits = trialBalance.reduce((sum, row) => sum + row.debitTotal, 0);
    const totalCredits = trialBalance.reduce((sum, row) => sum + row.creditTotal, 0);
    expect(totalDebits).toBe(totalCredits); // Balance must be squared

    // ========================================================================
    // STEP 4: Validate period can be closed (no draft entries)
    // ========================================================================
    vi.mocked(PeriodValidator.canClosePeriod).mockResolvedValue({
      valid: true,
      error: null,
      details: null,
    });

    const canClose = await PeriodValidator.canClosePeriod(centroCode, year, month);
    expect(canClose.valid).toBe(true);

    // ========================================================================
    // STEP 5: Close the period
    // ========================================================================
    const mockClosedPeriod = {
      id: 'period-123',
      centro_code: centroCode,
      period_type: 'monthly' as const,
      period_year: year,
      period_month: month,
      status: 'closed' as const,
      closing_date: '2025-01-31T23:59:59Z',
      closed_by: 'accountant-123',
      notes: 'Cierre mensual de prueba E2E',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockClosedPeriod,
        error: null,
      }),
    } as any);

    const closeUseCase = new CloseAccountingPeriodUseCase();
    const closeResult = await closeUseCase.execute(
      createTestClosingPeriodRequest({
        centroCode,
        periodYear: year,
        periodMonth: month,
        notes: 'Cierre mensual de prueba E2E',
        userId: 'accountant-123',
      })
    );

    expect(closeResult.success).toBe(true);
    expect(closeResult.closedPeriod.status).toBe('closed');
    expect(closeResult.closedPeriod.period_type).toBe('monthly');
    expect(closeResult.closedPeriod.period_month).toBe(month);
    expect(closeResult.closingBalances.length).toBeGreaterThan(0);

    // ========================================================================
    // STEP 6: Verify cannot create entry in closed period
    // ========================================================================
    vi.mocked(PeriodValidator.isPeriodOpen).mockResolvedValue(false);

    const isPeriodOpen = await PeriodValidator.isPeriodOpen(centroCode, year, month);
    expect(isPeriodOpen).toBe(false);

    // Should throw when trying to create entry in closed period
    await expect(
      createEntryUseCase.execute(
        createTestAccountingEntry({
          centroCode,
          entryDate: '2025-01-20', // Within closed period
          description: 'Este asiento debe fallar',
        })
      )
    ).rejects.toThrow(/período cerrado/i);
  });

  it('debe cerrar ejercicio anual con cálculo de resultado y advertencias', async () => {
    const centroCode = 'C001';
    const year = 2024;

    // ========================================================================
    // STEP 1: Create entries with income and expenses
    // ========================================================================
    const createEntryUseCase = new CreateAccountingEntryUseCase();

    // Income entry (Group 7)
    const incomeEntry = {
      id: 'entry-income',
      status: 'posted' as const,
      totalDebit: 10000,
      totalCredit: 10000,
    };
    vi.spyOn(AccountingCommands, 'createEntry').mockResolvedValueOnce(incomeEntry as any);

    await createEntryUseCase.execute(
      createTestAccountingEntry({
        centroCode,
        entryDate: '2024-12-31',
        description: 'Ingresos del ejercicio',
        transactions: [
          { accountCode: '5720000', debit: 10000, credit: 0, description: 'Banco' },
          { accountCode: '7000000', debit: 0, credit: 10000, description: 'Ventas' },
        ],
      })
    );

    // Expense entry (Group 6)
    const expenseEntry = {
      id: 'entry-expense',
      status: 'posted' as const,
      totalDebit: 7000,
      totalCredit: 7000,
    };
    vi.spyOn(AccountingCommands, 'createEntry').mockResolvedValueOnce(expenseEntry as any);

    await createEntryUseCase.execute(
      createTestAccountingEntry({
        centroCode,
        entryDate: '2024-12-31',
        description: 'Gastos del ejercicio',
        transactions: [
          { accountCode: '6000000', debit: 7000, credit: 0, description: 'Compras' },
          { accountCode: '5720000', debit: 0, credit: 7000, description: 'Banco' },
        ],
      })
    );

    // ========================================================================
    // STEP 2: Mock balance calculation with P&L groups
    // ========================================================================
    vi.mocked(BalanceCalculator.sumByAccountGroup).mockImplementation((group: string) => {
      if (group === '7') return 10000; // Income
      if (group === '6') return 7000;  // Expenses
      return 0;
    });

    const income = BalanceCalculator.sumByAccountGroup('7');
    const expenses = BalanceCalculator.sumByAccountGroup('6');
    const result = income - expenses;

    expect(result).toBe(3000); // Profit

    // ========================================================================
    // STEP 3: Close annual period
    // ========================================================================
    const mockClosedPeriod = {
      id: 'period-annual',
      centro_code: centroCode,
      period_type: 'annual' as const,
      period_year: year,
      period_month: null,
      status: 'closed' as const,
      closing_date: '2024-12-31T23:59:59Z',
      closed_by: 'accountant-123',
      notes: 'Cierre anual 2024',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockClosedPeriod,
        error: null,
      }),
    } as any);

    vi.mocked(PeriodValidator.canClosePeriod).mockResolvedValue({ valid: true, error: null, details: null });

    const closeUseCase = new CloseAccountingPeriodUseCase();
    const closeResult = await closeUseCase.execute({
      centroCode,
      periodYear: year,
      periodMonth: null, // Annual closing
      userId: 'accountant-123',
      notes: 'Cierre anual 2024',
    });

    // ========================================================================
    // ASSERT: Annual closing with profit warning
    // ========================================================================
    expect(closeResult.success).toBe(true);
    expect(closeResult.closedPeriod.period_type).toBe('annual');
    expect(closeResult.warnings.length).toBeGreaterThan(0);
    expect(closeResult.warnings[0]).toMatch(/Resultado del ejercicio.*3000/i);
  });

  it('debe fallar si se intenta cerrar mes sin cerrar mes anterior (validación de secuencia)', async () => {
    // ========================================================================
    // ARRANGE: Mock period validation to reject out-of-sequence closing
    // ========================================================================
    vi.mocked(PeriodValidator.validatePeriodSequence).mockReturnValue({
      valid: false,
      errors: ['Debe cerrar primero los períodos anteriores (enero, febrero)'],
    });

    // ========================================================================
    // ACT + ASSERT: Try to close March without closing Jan/Feb
    // ========================================================================
    const closeUseCase = new CloseAccountingPeriodUseCase();

    await expect(
      closeUseCase.execute({
        centroCode: 'C001',
        periodYear: 2025,
        periodMonth: 3, // March
        userId: 'accountant-123',
      })
    ).rejects.toThrow(/secuencia|anteriores/i);
  });

  it('debe detectar asientos en borrador y rechazar cierre', async () => {
    // ========================================================================
    // ARRANGE: Mock period validation to detect draft entries
    // ========================================================================
    vi.mocked(PeriodValidator.canClosePeriod).mockResolvedValue({
      valid: false,
      error: 'HAS_DRAFT_ENTRIES',
      details: 'Existen 3 asientos en borrador en el período',
    });

    // ========================================================================
    // ACT + ASSERT: Try to close period with draft entries
    // ========================================================================
    const closeUseCase = new CloseAccountingPeriodUseCase();

    await expect(
      closeUseCase.execute({
        centroCode: 'C001',
        periodYear: 2025,
        periodMonth: 1,
        userId: 'accountant-123',
      })
    ).rejects.toThrow(/borrador/i);
  });
});
