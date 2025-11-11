// ============================================================================
// POSTING - Funciones core para posting de asientos contables
// ============================================================================

import type { JournalLine } from './validators.ts';

/**
 * Resultado de posting
 */
export interface PostingResult {
  entry_id: string;
  entry_number: number;
  success: boolean;
}

/**
 * Comando para crear asiento desde factura
 */
export interface CreateJournalEntryCommand {
  invoice_id: string;
  invoice_type: 'received' | 'issued';
  entry_date: string;
  description: string;
  centre_code: string;
  fiscal_year_id: string;
  lines: JournalLine[];
  created_by: string;
}

/**
 * Valida comando de posting
 */
export function validatePostingCommand(
  command: CreateJournalEntryCommand
): { valid: boolean; error?: string } {
  
  if (!command.invoice_id) {
    return { valid: false, error: 'invoice_id requerido' };
  }
  
  if (!command.entry_date) {
    return { valid: false, error: 'entry_date requerido' };
  }
  
  if (!command.centre_code) {
    return { valid: false, error: 'centre_code requerido' };
  }
  
  if (!command.fiscal_year_id) {
    return { valid: false, error: 'fiscal_year_id requerido' };
  }
  
  if (!command.lines || command.lines.length === 0) {
    return { valid: false, error: 'lines requeridas' };
  }
  
  if (!command.created_by) {
    return { valid: false, error: 'created_by requerido' };
  }
  
  // Validar cuadre
  const totalDebit = command.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = command.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  
  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    return { valid: false, error: 'Debe ≠ Haber en comando' };
  }
  
  return { valid: true };
}

/**
 * Calcula totales de asiento
 */
export function calculateEntryTotals(lines: JournalLine[]): {
  total_debit: number;
  total_credit: number;
} {
  const total_debit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const total_credit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  
  return {
    total_debit: Math.round(total_debit * 100) / 100,
    total_credit: Math.round(total_credit * 100) / 100,
  };
}
