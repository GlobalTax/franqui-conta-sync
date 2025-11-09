// ============================================================================
// TESTS: PostEntry Use Case
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostEntryUseCase } from '../PostEntry';
import * as EntryQueries from '@/infrastructure/persistence/supabase/queries/EntryQueries';
import { supabase } from '@/integrations/supabase/client';

// Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/infrastructure/persistence/supabase/queries/EntryQueries', () => ({
  getJournalEntryById: vi.fn(),
  updateEntryStatus: vi.fn(),
}));

vi.mock('../services/PeriodValidator', () => ({
  PeriodValidator: {
    canPostEntryInPeriod: vi.fn().mockResolvedValue({ valid: true }),
  },
}));

vi.mock('../services/BalanceCalculator', () => ({
  BalanceCalculator: {
    calculateAccountBalance: vi.fn().mockResolvedValue({
      accountCode: '6000000',
      debitTotal: 1000,
      creditTotal: 0,
      balance: 1000,
    }),
  },
}));

describe('PostEntryUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe contabilizar asiento draft correctamente', async () => {
    const mockDraftEntry = {
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

    const mockPostedEntry = {
      ...mockDraftEntry,
      status: 'posted' as const,
    };

    vi.mocked(EntryQueries.getJournalEntryById)
      .mockResolvedValueOnce(mockDraftEntry)
      .mockResolvedValueOnce(mockPostedEntry);

    // Mock update
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as any);
    mockUpdate.mockReturnValue({ eq: mockEq });

    const useCase = new PostEntryUseCase();

    const result = await useCase.execute({
      entryId: 'entry-123',
      userId: 'user-789',
    });

    expect(result.success).toBe(true);
    expect(result.postedEntry.status).toBe('posted');
    expect(result.updatedBalances).toHaveLength(2);
    expect(result.message).toContain('contabilizado correctamente');
  });

  it('debe rechazar contabilizar asiento ya posted', async () => {
    const mockPostedEntry = {
      id: 'entry-123',
      entryNumber: 1,
      entryDate: '2024-03-15',
      description: 'Test entry',
      centroCode: '001',
      fiscalYearId: 'fy-2024',
      status: 'posted' as const,
      totalDebit: 1000,
      totalCredit: 1000,
      transactions: [],
      createdBy: 'user-456',
      createdAt: '2024-03-15T10:00:00Z',
      updatedAt: '2024-03-15T10:00:00Z',
    };

    vi.mocked(EntryQueries.getJournalEntryById).mockResolvedValue(mockPostedEntry);

    const useCase = new PostEntryUseCase();

    await expect(
      useCase.execute({
        entryId: 'entry-123',
        userId: 'user-789',
      })
    ).rejects.toThrow('ya está en estado');
  });

  it('debe rechazar contabilizar en período cerrado', async () => {
    const mockDraftEntry = {
      id: 'entry-123',
      entryNumber: 1,
      entryDate: '2023-12-31',
      description: 'Test entry',
      centroCode: '001',
      fiscalYearId: 'fy-2023',
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

    vi.mocked(EntryQueries.getJournalEntryById).mockResolvedValue(mockDraftEntry);

    // Mock periodo cerrado
    const PeriodValidator = require('../services/PeriodValidator').PeriodValidator;
    PeriodValidator.canPostEntryInPeriod.mockResolvedValueOnce({
      valid: false,
      error: 'PERIOD_CLOSED',
      details: 'Período cerrado',
    });

    const useCase = new PostEntryUseCase();

    await expect(
      useCase.execute({
        entryId: 'entry-123',
        userId: 'user-789',
      })
    ).rejects.toThrow('cerrado');
  });
});
