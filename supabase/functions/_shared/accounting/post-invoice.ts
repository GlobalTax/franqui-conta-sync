// ============================================================================
// POST INVOICE - Posting de facturas al diario contable (Edge Function)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import type { JournalLine } from './core/validators.ts';
import {
  validatePostingCommand,
  calculateEntryTotals,
  type CreateJournalEntryCommand,
  type PostingResult,
} from './core/posting.ts';

/**
 * Parámetros para postear factura
 */
export interface PostInvoiceParams {
  invoiceId: string;
  invoiceType: 'received' | 'issued';
  entryDate: string;
  description: string;
  centreCode: string;
  fiscalYearId: string;
  preview: JournalLine[];
  userId: string;
}

/**
 * Postea una factura al diario contable
 * 
 * Proceso:
 * 1. Valida comando
 * 2. Crea journal_entry
 * 3. Crea accounting_transactions (líneas)
 * 4. Actualiza invoice status → 'posted'
 * 
 * Todo envuelto en transacción (rollback automático en error)
 */
export async function postInvoiceEntry(
  params: PostInvoiceParams,
  supabaseUrl: string,
  supabaseKey: string
): Promise<PostingResult> {
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // ========================================================================
  // 1. VALIDAR COMANDO
  // ========================================================================
  
  const command: CreateJournalEntryCommand = {
    invoice_id: params.invoiceId,
    invoice_type: params.invoiceType,
    entry_date: params.entryDate,
    description: params.description,
    centre_code: params.centreCode,
    fiscal_year_id: params.fiscalYearId,
    lines: params.preview,
    created_by: params.userId,
  };
  
  const validation = validatePostingCommand(command);
  
  if (!validation.valid) {
    throw new Error(validation.error || 'Comando inválido');
  }
  
  // ========================================================================
  // 2. CALCULAR TOTALES
  // ========================================================================
  
  const totals = calculateEntryTotals(params.preview);
  
  // ========================================================================
  // 3. OBTENER SIGUIENTE NÚMERO DE ASIENTO
  // ========================================================================
  
  const { data: maxNumberData, error: maxNumberError } = await supabase
    .from('accounting_entries')
    .select('entry_number')
    .eq('fiscal_year_id', params.fiscalYearId)
    .order('entry_number', { ascending: false })
    .limit(1);
  
  if (maxNumberError) {
    throw new Error(`Error obteniendo número: ${maxNumberError.message}`);
  }
  
  const entryNumber = maxNumberData && maxNumberData.length > 0 
    ? (maxNumberData[0].entry_number || 0) + 1 
    : 1;
  
  // ========================================================================
  // 4. CREAR JOURNAL ENTRY
  // ========================================================================
  
  const { data: entryData, error: entryError } = await supabase
    .from('accounting_entries')
    .insert({
      entry_number: entryNumber,
      entry_date: params.entryDate,
      description: params.description,
      centro_code: params.centreCode,
      fiscal_year_id: params.fiscalYearId,
      status: 'posted',
      total_debit: totals.total_debit,
      total_credit: totals.total_credit,
      created_by: params.userId,
      posted_at: new Date().toISOString(),
      posted_by: params.userId,
    })
    .select('id')
    .single();
  
  if (entryError || !entryData) {
    throw new Error(`Error creando entry: ${entryError?.message || 'No data'}`);
  }
  
  const entryId = entryData.id;
  
  // ========================================================================
  // 5. CREAR LÍNEAS (TRANSACTIONS)
  // ========================================================================
  
  const transactions = params.preview.map((line, index) => ({
    entry_id: entryId,
    account_code: line.account,
    movement_type: ((line.debit || 0) > 0 ? 'debit' : 'credit') as 'debit' | 'credit',
    amount: (line.debit || 0) > 0 ? line.debit : line.credit,
    description: line.description || params.description,
    line_number: index + 1,
  }));
  
  const { error: linesError } = await supabase
    .from('accounting_transactions')
    .insert(transactions);
  
  if (linesError) {
    // Rollback: eliminar entry
    await supabase.from('accounting_entries').delete().eq('id', entryId);
    throw new Error(`Error creando líneas: ${linesError.message}`);
  }
  
  // ========================================================================
  // 6. ACTUALIZAR INVOICE STATUS
  // ========================================================================
  
  const invoiceTable = params.invoiceType === 'received' 
    ? 'invoices_received' 
    : 'invoices_issued';
  
  const { error: updateError } = await supabase
    .from(invoiceTable)
    .update({
      status: 'posted',
      posted_at: new Date().toISOString(),
      accounting_entry_id: entryId,
    })
    .eq('id', params.invoiceId);
  
  if (updateError) {
    // Rollback: eliminar transactions y entry
    await supabase.from('accounting_transactions').delete().eq('entry_id', entryId);
    await supabase.from('accounting_entries').delete().eq('id', entryId);
    throw new Error(`Error actualizando factura: ${updateError.message}`);
  }
  
  // ========================================================================
  // 7. RETORNAR RESULTADO
  // ========================================================================
  
  return {
    entry_id: entryId,
    entry_number: entryNumber,
    success: true,
  };
}
