// ============================================================================
// TESTS: CloseAccountingPeriod Use Case
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloseAccountingPeriodUseCase } from '../CloseAccountingPeriod';
import { supabase } from '@/integrations/supabase/client';

// Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../services/PeriodValidator', () => ({
  PeriodValidator: {
    canClosePeriod: vi.fn().mockResolvedValue({ valid: true }),
    validatePeriodSequence: vi.fn().mockReturnValue({ valid: true }),
  },
}));

vi.mock('../services/BalanceCalculator', () => ({
  BalanceCalculator: {
    calculateTrialBalance: vi.fn().mockResolvedValue([
      {
        accountCode: '6000000',
        accountName: 'Compras',
        accountType: 'expense',
        level: 3,
        parentCode: '600',
        debitTotal: 1000,
        creditTotal: 0,
        balance: 1000,
      },
      {
        accountCode: '7000000',
        accountName: 'Ventas',
        accountType: 'revenue',
        level: 3,
        parentCode: '700',
        debitTotal: 0,
        creditTotal: 5000,
        balance: -5000,
      },
    ]),
    sumByAccountGroup: vi.fn().mockImplementation((group) => {
      if (group === '7') return 5000; // Ingresos
      if (group === '6') return 1000; // Gastos
      return 0;
    }),
  },
}));

describe('CloseAccountingPeriodUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe cerrar período mensual correctamente', async () => {
    const mockClosedPeriod = {
      id: 'period-123',
      centro_code: '001',
      period_type: 'monthly' as const,
      period_year: 2024,
      period_month: 3,
      status: 'closed' as const,
      closing_date: '2024-03-31T23:59:59Z',
      closed_by: 'user-456',
      notes: 'Cierre marzo 2024',
    };

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockClosedPeriod,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });

    const useCase = new CloseAccountingPeriodUseCase();

    const result = await useCase.execute({
      centroCode: '001',
      periodYear: 2024,
      periodMonth: 3,
      notes: 'Cierre marzo 2024',
      userId: 'user-456',
    });

    expect(result.success).toBe(true);
    expect(result.closedPeriod.period_type).toBe('monthly');
    expect(result.closedPeriod.period_month).toBe(3);
    expect(result.closingBalances).toHaveLength(2);
    expect(result.warnings).toEqual([]);
  });

  it('debe rechazar cerrar si hay asientos en borrador', async () => {
    // Mock canClosePeriod para simular draft entries
    const PeriodValidator = require('../services/PeriodValidator').PeriodValidator;
    PeriodValidator.canClosePeriod.mockResolvedValueOnce({
      valid: false,
      error: 'HAS_DRAFT_ENTRIES',
      details: 'Existen asientos en borrador',
    });

    const useCase = new CloseAccountingPeriodUseCase();

    await expect(
      useCase.execute({
        centroCode: '001',
        periodYear: 2024,
        periodMonth: 3,
        userId: 'user-456',
      })
    ).rejects.toThrow('borrador');
  });

  it('debe generar advertencia de regularización en cierre anual', async () => {
    const mockClosedPeriod = {
      id: 'period-annual',
      centro_code: '001',
      period_type: 'annual' as const,
      period_year: 2024,
      period_month: null,
      status: 'closed' as const,
      closing_date: '2024-12-31T23:59:59Z',
      closed_by: 'user-456',
      notes: 'Cierre anual 2024',
    };

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockClosedPeriod,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });

    const useCase = new CloseAccountingPeriodUseCase();

    const result = await useCase.execute({
      centroCode: '001',
      periodYear: 2024,
      notes: 'Cierre anual 2024',
      userId: 'user-456',
    });

    expect(result.success).toBe(true);
    expect(result.closedPeriod.period_type).toBe('annual');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Resultado del ejercicio');
  });
});
