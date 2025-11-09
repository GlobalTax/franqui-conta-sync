// ============================================================================
// SERVICIO DE DOMINIO: PeriodValidator
// Validación de períodos contables abiertos/cerrados
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { ValidationResult } from '../types';

export interface PeriodStatus {
  isOpen: boolean;
  year: number;
  month: number | null;
  closedAt: string | null;
  closedBy: string | null;
}

export class PeriodValidator {
  /**
   * Verifica si un período específico está abierto
   */
  static async isPeriodOpen(
    periodYear: number,
    periodMonth: number | null,
    centroCode: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('closing_periods' as any)
      .select('status')
      .eq('centro_code', centroCode)
      .eq('period_year', periodYear)
      .eq('period_month', periodMonth)
      .maybeSingle();

    if (error) throw error;

    // Si no existe el registro, el período está abierto
    if (!data) return true;

    return (data as any).status === 'open';
  }

  /**
   * Valida si se puede contabilizar un asiento en una fecha específica
   */
  static async canPostEntryInPeriod(
    entryDate: string,
    centroCode: string
  ): Promise<ValidationResult> {
    const date = new Date(entryDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    try {
      const isOpen = await this.isPeriodOpen(year, month, centroCode);

      if (!isOpen) {
        return {
          valid: false,
          error: 'PERIOD_CLOSED',
          details: `El período ${month}/${year} está cerrado. No se pueden contabilizar asientos.`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'VALIDATION_ERROR',
        details: error instanceof Error ? error.message : 'Error al validar período',
      };
    }
  }

  /**
   * Valida si se puede cerrar un período
   */
  static async canClosePeriod(
    periodYear: number,
    periodMonth: number | null,
    centroCode: string
  ): Promise<ValidationResult> {
    try {
      // 1. Verificar que el período esté abierto
      const isOpen = await this.isPeriodOpen(periodYear, periodMonth, centroCode);
      if (!isOpen) {
        return {
          valid: false,
          error: 'ALREADY_CLOSED',
          details: 'El período ya está cerrado',
        };
      }

      // 2. Verificar que no haya asientos en draft
      const { data: draftEntries, error: draftError } = await supabase
        .from('accounting_entries')
        .select('id')
        .eq('centro_code', centroCode)
        .eq('status', 'draft')
        .gte('entry_date', `${periodYear}-${String(periodMonth || 1).padStart(2, '0')}-01`)
        .lte('entry_date', periodMonth 
          ? `${periodYear}-${String(periodMonth).padStart(2, '0')}-31`
          : `${periodYear}-12-31`
        )
        .limit(1);

      if (draftError) throw draftError;

      if (draftEntries && draftEntries.length > 0) {
        return {
          valid: false,
          error: 'HAS_DRAFT_ENTRIES',
          details: 'Existen asientos en borrador en este período. Contabilice o elimine todos los borradores antes de cerrar.',
        };
      }

      // 3. Validar secuencia (si es mensual, verificar que el mes anterior esté cerrado)
      if (periodMonth && periodMonth > 1) {
        const previousMonthOpen = await this.isPeriodOpen(
          periodYear,
          periodMonth - 1,
          centroCode
        );

        if (previousMonthOpen) {
          return {
            valid: false,
            error: 'PREVIOUS_PERIOD_OPEN',
            details: `Debe cerrar el período ${periodMonth - 1}/${periodYear} antes de cerrar ${periodMonth}/${periodYear}`,
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'VALIDATION_ERROR',
        details: error instanceof Error ? error.message : 'Error al validar cierre de período',
      };
    }
  }

  /**
   * Valida que se cierren períodos en orden secuencial
   */
  static validatePeriodSequence(year: number, month: number | null): ValidationResult {
    if (!month) {
      // Cierre anual - validar que el año no sea futuro
      const currentYear = new Date().getFullYear();
      if (year > currentYear) {
        return {
          valid: false,
          error: 'FUTURE_PERIOD',
          details: 'No se puede cerrar un período futuro',
        };
      }
      return { valid: true };
    }

    // Cierre mensual - validar que sea válido
    if (month < 1 || month > 12) {
      return {
        valid: false,
        error: 'INVALID_MONTH',
        details: 'El mes debe estar entre 1 y 12',
      };
    }

    const now = new Date();
    const periodDate = new Date(year, month - 1, 1);

    if (periodDate > now) {
      return {
        valid: false,
        error: 'FUTURE_PERIOD',
        details: 'No se puede cerrar un período futuro',
      };
    }

    return { valid: true };
  }

  /**
   * Obtiene el estado de un período
   */
  static async getPeriodStatus(
    year: number,
    month: number | null,
    centroCode: string
  ): Promise<PeriodStatus> {
    const { data, error } = await supabase
      .from('closing_periods' as any)
      .select('status, closing_date, closed_by')
      .eq('centro_code', centroCode)
      .eq('period_year', year)
      .eq('period_month', month)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        isOpen: true,
        year,
        month,
        closedAt: null,
        closedBy: null,
      };
    }

    const record = data as any;

    return {
      isOpen: record.status === 'open',
      year,
      month,
      closedAt: record.closing_date,
      closedBy: record.closed_by,
    };
  }

  /**
   * Valida que la fecha de cierre sea válida para el período
   */
  static validateClosingDate(
    closingDate: string,
    periodYear: number,
    periodMonth: number | null
  ): ValidationResult {
    const date = new Date(closingDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (periodMonth) {
      // Cierre mensual - la fecha debe estar en el mes
      if (year !== periodYear || month !== periodMonth) {
        return {
          valid: false,
          error: 'INVALID_CLOSING_DATE',
          details: `La fecha de cierre debe estar en el período ${periodMonth}/${periodYear}`,
        };
      }
    } else {
      // Cierre anual - la fecha debe estar en el año
      if (year !== periodYear) {
        return {
          valid: false,
          error: 'INVALID_CLOSING_DATE',
          details: `La fecha de cierre debe estar en el año ${periodYear}`,
        };
      }
    }

    // La fecha no puede ser futura
    if (date > new Date()) {
      return {
        valid: false,
        error: 'FUTURE_CLOSING_DATE',
        details: 'La fecha de cierre no puede ser futura',
      };
    }

    return { valid: true };
  }
}
