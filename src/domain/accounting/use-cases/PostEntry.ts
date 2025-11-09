// ============================================================================
// CASO DE USO: PostEntry
// Contabiliza un asiento (cambio de estado draft → posted)
// ============================================================================

import { EntryValidator } from '../services/EntryValidator';
import { PeriodValidator } from '../services/PeriodValidator';
import { BalanceCalculator } from '../services/BalanceCalculator';
import { getJournalEntryById, updateEntryStatus } from '@/infrastructure/persistence/supabase/queries/EntryQueries';
import { supabase } from '@/integrations/supabase/client';
import type { JournalEntry } from '../types';

export interface PostEntryInput {
  entryId: string;
  userId: string;
}

export interface PostEntryOutput {
  success: boolean;
  postedEntry: JournalEntry;
  updatedBalances: { accountCode: string; newBalance: number }[];
  message: string;
}

export class PostEntryUseCase {
  async execute(input: PostEntryInput): Promise<PostEntryOutput> {
    // 1. Obtener el asiento
    const entry = await getJournalEntryById(input.entryId);

    if (!entry) {
      throw new Error('Asiento no encontrado');
    }

    // 2. Validar que esté en estado draft
    if (entry.status !== 'draft') {
      throw new Error(`El asiento ya está en estado '${entry.status}'. Solo se pueden contabilizar asientos en borrador.`);
    }

    // 3. Verificar cuadre final
    const validation = EntryValidator.validateEntry(entry);

    if (!validation.valid) {
      throw new Error(validation.details || validation.error);
    }

    // 4. Verificar período abierto
    const periodValidation = await PeriodValidator.canPostEntryInPeriod(
      entry.entryDate,
      entry.centroCode
    );

    if (!periodValidation.valid) {
      throw new Error(periodValidation.details || periodValidation.error);
    }

    // 5. Cambiar estado a 'posted' con timestamp y usuario
    const { error: updateError } = await supabase
      .from('accounting_entries')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        posted_by: input.userId,
      })
      .eq('id', input.entryId);

    if (updateError) {
      throw new Error(`Error al actualizar estado: ${updateError.message}`);
    }

    // 6. Recalcular balances afectados
    const affectedAccounts = [...new Set(entry.transactions.map(t => t.accountCode))];
    const updatedBalances = [];

    for (const accountCode of affectedAccounts) {
      const balance = await BalanceCalculator.calculateAccountBalance(
        accountCode,
        entry.centroCode,
        '1900-01-01', // Desde el inicio
        new Date().toISOString().split('T')[0] // Hasta hoy
      );

      updatedBalances.push({
        accountCode,
        newBalance: balance.balance,
      });
    }

    // 7. Recuperar asiento actualizado
    const postedEntry = await getJournalEntryById(input.entryId);

    if (!postedEntry) {
      throw new Error('Error al recuperar asiento contabilizado');
    }

    return {
      success: true,
      postedEntry,
      updatedBalances,
      message: `Asiento ${postedEntry.entryNumber} contabilizado correctamente`,
    };
  }
}
