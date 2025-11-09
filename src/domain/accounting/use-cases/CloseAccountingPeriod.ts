// ============================================================================
// CASO DE USO: CloseAccountingPeriod
// Cierra un período contable (mensual o anual) con validaciones completas
// ============================================================================

import { PeriodValidator } from '../services/PeriodValidator';
import { BalanceCalculator } from '../services/BalanceCalculator';
import { supabase } from '@/integrations/supabase/client';
import type { JournalEntry } from '../types';

export interface ClosePeriodInput {
  centroCode: string;
  periodYear: number;
  periodMonth?: number | null;
  notes?: string;
  userId: string;
}

export interface ClosingPeriod {
  id: string;
  centro_code: string;
  period_type: 'monthly' | 'annual';
  period_year: number;
  period_month: number | null;
  status: 'closed';
  closing_date: string;
  closed_by: string;
  notes: string | null;
}

export interface ClosePeriodOutput {
  success: boolean;
  closedPeriod: ClosingPeriod;
  regularizationEntry?: JournalEntry;
  closingBalances: { accountCode: string; balance: number }[];
  warnings: string[];
}

export class CloseAccountingPeriodUseCase {
  async execute(input: ClosePeriodInput): Promise<ClosePeriodOutput> {
    const warnings: string[] = [];

    // 1. Validar que se pueda cerrar
    const canClose = await PeriodValidator.canClosePeriod(
      input.periodYear,
      input.periodMonth || null,
      input.centroCode
    );

    if (!canClose.valid) {
      throw new Error(canClose.details || canClose.error);
    }

    // 2. Validar secuencia
    const sequenceValidation = PeriodValidator.validatePeriodSequence(
      input.periodYear,
      input.periodMonth || null
    );

    if (!sequenceValidation.valid) {
      throw new Error(sequenceValidation.details || sequenceValidation.error);
    }

    // 3. Calcular saldos de cierre
    const endDate = input.periodMonth
      ? `${input.periodYear}-${String(input.periodMonth).padStart(2, '0')}-31`
      : `${input.periodYear}-12-31`;

    const trialBalance = await BalanceCalculator.calculateTrialBalance(
      input.centroCode,
      '1900-01-01',
      endDate
    );

    const closingBalances = trialBalance.map(row => ({
      accountCode: row.accountCode,
      balance: row.balance,
    }));

    // 4. Generar asiento de regularización (solo cierre anual)
    let regularizationEntry: JournalEntry | undefined;

    if (!input.periodMonth) {
      // Calcular resultado del ejercicio (ingresos - gastos)
      const ingresos = await BalanceCalculator.sumByAccountGroup(
        '7',
        input.centroCode,
        `${input.periodYear}-01-01`,
        endDate
      );

      const gastos = await BalanceCalculator.sumByAccountGroup(
        '6',
        input.centroCode,
        `${input.periodYear}-01-01`,
        endDate
      );

      const resultado = ingresos - gastos;

      if (Math.abs(resultado) > 0.01) {
        warnings.push(
          `Resultado del ejercicio: ${resultado > 0 ? 'Beneficio' : 'Pérdida'} de ${Math.abs(resultado).toFixed(2)}€`
        );

        // TODO: Implementar creación de asiento de regularización automático
        // Por ahora solo advertimos
      }
    }

    // 5. Marcar período como cerrado en BD
    const periodType = input.periodMonth ? 'monthly' : 'annual';
    const closingDate = new Date().toISOString();

    const { data: closedPeriod, error: insertError } = await supabase
      .from('closing_periods' as any)
      .insert({
        centro_code: input.centroCode,
        period_type: periodType,
        period_year: input.periodYear,
        period_month: input.periodMonth || null,
        status: 'closed',
        closing_date: closingDate,
        closed_by: input.userId,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error al cerrar período: ${insertError.message}`);
    }

    return {
      success: true,
      closedPeriod: closedPeriod as any as ClosingPeriod,
      regularizationEntry,
      closingBalances,
      warnings,
    };
  }
}
