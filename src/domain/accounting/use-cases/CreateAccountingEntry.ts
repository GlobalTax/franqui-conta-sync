// ============================================================================
// CASO DE USO: CreateAccountingEntry
// Orquesta la creación de un asiento contable completo
// ============================================================================

import { EntryValidator } from '../services/EntryValidator';
import { EntryCalculator } from '../services/EntryCalculator';
import { PeriodValidator } from '../services/PeriodValidator';
import { getNextEntryNumber, createJournalEntry } from '@/infrastructure/persistence/supabase/queries/EntryQueries';
import { supabase } from '@/integrations/supabase/client';
import type { JournalEntry, Transaction } from '../types';

export interface CreateEntryInput {
  centroCode: string;
  entryDate: string;
  description: string;
  fiscalYearId?: string;
  transactions: Transaction[];
  createdBy: string;
}

export interface CreateEntryOutput {
  entry: JournalEntry;
  validationWarnings: string[];
}

export class CreateAccountingEntryUseCase {
  async execute(input: CreateEntryInput): Promise<CreateEntryOutput> {
    const warnings: string[] = [];

    // 1. Validar estructura del asiento
    const validation = EntryValidator.validateEntry({
      entryDate: input.entryDate,
      description: input.description,
      centroCode: input.centroCode,
      totalDebit: 0, // Se calculará
      totalCredit: 0, // Se calculará
      transactions: input.transactions,
    });

    if (!validation.valid) {
      throw new Error(validation.details || validation.error);
    }

    // 2. Calcular totales debe/haber
    const totals = EntryCalculator.calculateTotals(input.transactions);

    if (!totals.isBalanced) {
      throw new Error(`Asiento descuadrado. Diferencia: ${totals.difference.toFixed(2)}`);
    }

    // 3. Verificar período abierto
    const periodValidation = await PeriodValidator.canPostEntryInPeriod(
      input.entryDate,
      input.centroCode
    );

    if (!periodValidation.valid) {
      throw new Error(periodValidation.details || periodValidation.error);
    }

    // 4. Obtener ejercicio fiscal si no se proporcionó
    let fiscalYearId = input.fiscalYearId;
    if (!fiscalYearId) {
      const { data: fiscalYear, error: fyError } = await supabase
        .from('fiscal_years')
        .select('id')
        .eq('centro_code', input.centroCode)
        .eq('status', 'open')
        .single();

      if (fyError || !fiscalYear) {
        throw new Error('No hay ejercicio fiscal abierto para este centro');
      }

      fiscalYearId = fiscalYear.id;
    }

    // 5. Obtener siguiente número de asiento
    const nextEntryNumber = await getNextEntryNumber(fiscalYearId);

    // 6. Persistir asiento + transacciones
    const entry = await createJournalEntry(
      {
        entryDate: input.entryDate,
        description: input.description,
        centroCode: input.centroCode,
        fiscalYearId,
        status: 'draft',
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        transactions: input.transactions,
        createdBy: input.createdBy,
      },
      nextEntryNumber
    );

    return {
      entry,
      validationWarnings: warnings,
    };
  }
}
