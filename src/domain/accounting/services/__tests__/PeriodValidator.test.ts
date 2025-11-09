// ============================================================================
// TESTS: PeriodValidator
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PeriodValidator } from '../PeriodValidator';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('PeriodValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPeriodOpen', () => {
    it('debe retornar true si el período está abierto', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { status: 'open' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

      const result = await PeriodValidator.isPeriodOpen(2024, 3, '001');

      expect(result).toBe(true);
    });

    it('debe retornar false si el período está cerrado', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { status: 'closed' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

      const result = await PeriodValidator.isPeriodOpen(2023, 12, '001');

      expect(result).toBe(false);
    });

    it('debe retornar true si no existe registro del período', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

      const result = await PeriodValidator.isPeriodOpen(2024, 4, '001');

      expect(result).toBe(true);
    });
  });

  describe('canPostEntryInPeriod', () => {
    it('debe permitir contabilizar en período abierto', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null, // No existe = abierto
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

      const result = await PeriodValidator.canPostEntryInPeriod('2024-03-15', '001');

      expect(result.valid).toBe(true);
    });

    it('debe rechazar contabilizar en período cerrado', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { status: 'closed' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

      const result = await PeriodValidator.canPostEntryInPeriod('2023-12-31', '001');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('PERIOD_CLOSED');
      expect(result.details).toContain('cerrado');
    });
  });

  describe('canClosePeriod', () => {
    it('debe permitir cerrar período si está abierto y sin draft entries', async () => {
      // Mock isPeriodOpen
      const mockSelect1 = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockMaybeSingle1 = vi.fn().mockResolvedValue({
        data: null, // Abierto
        error: null,
      });

      // Mock draft entries check
      const mockSelect2 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [], // Sin borradores
        error: null,
      });

      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: mockSelect1,
          } as any;
        } else {
          return {
            select: mockSelect2,
          } as any;
        }
      });

      mockSelect1.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ maybeSingle: mockMaybeSingle1 });

      mockSelect2.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ lte: mockLte });
      mockLte.mockReturnValue({ limit: mockLimit });

      const result = await PeriodValidator.canClosePeriod(2024, 3, '001');

      expect(result.valid).toBe(true);
    });

    it('debe rechazar cerrar si hay asientos en borrador', async () => {
      // Mock isPeriodOpen
      const mockSelect1 = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockMaybeSingle1 = vi.fn().mockResolvedValue({
        data: null, // Abierto
        error: null,
      });

      // Mock draft entries check
      const mockSelect2 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [{ id: 'entry-123' }], // Hay borradores
        error: null,
      });

      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: mockSelect1,
          } as any;
        } else {
          return {
            select: mockSelect2,
          } as any;
        }
      });

      mockSelect1.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ maybeSingle: mockMaybeSingle1 });

      mockSelect2.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ lte: mockLte });
      mockLte.mockReturnValue({ limit: mockLimit });

      const result = await PeriodValidator.canClosePeriod(2024, 3, '001');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('HAS_DRAFT_ENTRIES');
    });
  });

  describe('validatePeriodSequence', () => {
    it('debe rechazar cerrar período futuro', () => {
      const futureYear = new Date().getFullYear() + 1;
      const result = PeriodValidator.validatePeriodSequence(futureYear, null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('FUTURE_PERIOD');
    });

    it('debe rechazar mes inválido', () => {
      const result = PeriodValidator.validatePeriodSequence(2024, 13);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_MONTH');
    });

    it('debe aceptar período válido', () => {
      const currentYear = new Date().getFullYear();
      const result = PeriodValidator.validatePeriodSequence(currentYear, 3);

      expect(result.valid).toBe(true);
    });
  });
});
