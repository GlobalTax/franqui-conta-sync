// ============================================================================
// TESTS: CreateAccountingEntry Use Case
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateAccountingEntryUseCase } from '../CreateAccountingEntry';
import * as EntryQueries from '@/infrastructure/persistence/supabase/queries/EntryQueries';
import { supabase } from '@/integrations/supabase/client';

// Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/infrastructure/persistence/supabase/queries/EntryQueries', () => ({
  getNextEntryNumber: vi.fn(),
  createJournalEntry: vi.fn(),
}));

vi.mock('../services/PeriodValidator', () => ({
  PeriodValidator: {
    canPostEntryInPeriod: vi.fn().mockResolvedValue({ valid: true }),
  },
}));

describe('CreateAccountingEntryUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe crear asiento válido correctamente', async () => {
    const mockFiscalYear = { id: 'fy-2024' };
    const mockEntry = {
      id: 'entry-123',
      entryNumber: 1,
      entryDate: '2024-03-15',
      description: 'Test entry',
      centroCode: '001',
      fiscalYearId: 'fy-2024',
      status: 'draft' as const,
      totalDebit: 1000,
      totalCredit: 1000,
      transactions: [
        {
          id: 't1',
          accountCode: '6000000',
          movementType: 'debit' as const,
          amount: 1000,
          description: 'Compra',
          lineNumber: 1,
        },
        {
          id: 't2',
          accountCode: '5720000',
          movementType: 'credit' as const,
          amount: 1000,
          description: 'Pago',
          lineNumber: 2,
        },
      ],
      createdBy: 'user-456',
      createdAt: '2024-03-15T10:00:00Z',
      updatedAt: '2024-03-15T10:00:00Z',
    };

    // Mock fiscal year
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockFiscalYear,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });

    // Mock entry queries
    vi.mocked(EntryQueries.getNextEntryNumber).mockResolvedValue(1);
    vi.mocked(EntryQueries.createJournalEntry).mockResolvedValue(mockEntry);

    const useCase = new CreateAccountingEntryUseCase();

    const result = await useCase.execute({
      centroCode: '001',
      entryDate: '2024-03-15',
      description: 'Test entry',
      transactions: [
        {
          accountCode: '6000000',
          movementType: 'debit',
          amount: 1000,
          description: 'Compra',
        },
        {
          accountCode: '5720000',
          movementType: 'credit',
          amount: 1000,
          description: 'Pago',
        },
      ],
      createdBy: 'user-456',
    });

    expect(result.entry).toBeDefined();
    expect(result.entry.id).toBe('entry-123');
    expect(result.entry.totalDebit).toBe(1000);
    expect(result.entry.totalCredit).toBe(1000);
    expect(result.validationWarnings).toEqual([]);
  });

  it('debe rechazar asiento descuadrado', async () => {
    const useCase = new CreateAccountingEntryUseCase();

    await expect(
      useCase.execute({
        centroCode: '001',
        entryDate: '2024-03-15',
        description: 'Unbalanced entry',
        transactions: [
          {
            accountCode: '6000000',
            movementType: 'debit',
            amount: 1000,
            description: 'Debe',
          },
          {
            accountCode: '5720000',
            movementType: 'credit',
            amount: 500,
            description: 'Haber',
          },
        ],
        createdBy: 'user-456',
      })
    ).rejects.toThrow('descuadrado');
  });

  it('debe rechazar asiento en período cerrado', async () => {
    // Mock periodo cerrado
    const PeriodValidator = require('../services/PeriodValidator').PeriodValidator;
    PeriodValidator.canPostEntryInPeriod.mockResolvedValueOnce({
      valid: false,
      error: 'PERIOD_CLOSED',
      details: 'Período cerrado',
    });

    const useCase = new CreateAccountingEntryUseCase();

    await expect(
      useCase.execute({
        centroCode: '001',
        entryDate: '2023-12-31',
        description: 'Test entry',
        transactions: [
          {
            accountCode: '6000000',
            movementType: 'debit',
            amount: 1000,
            description: 'Debe',
          },
          {
            accountCode: '5720000',
            movementType: 'credit',
            amount: 1000,
            description: 'Haber',
          },
        ],
        createdBy: 'user-456',
      })
    ).rejects.toThrow('cerrado');
  });
});
