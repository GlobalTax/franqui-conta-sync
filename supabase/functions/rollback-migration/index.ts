// ============================================================================
// ROLLBACK MIGRATION - Edge Function
// Purpose: Undo a historical data migration, delete entries and reset state
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RollbackRequest {
  fiscalYearId: string;
  deleteAll: boolean; // If true, also delete the fiscal_year record
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RollbackRequest = await req.json();
    const { fiscalYearId, deleteAll } = body;

    console.log(`[rollback-migration] Starting rollback for fiscal year: ${fiscalYearId}`);

    // Get fiscal year info
    const { data: fiscalYear, error: fyError } = await supabase
      .from('fiscal_years')
      .select('centro_code, year, status')
      .eq('id', fiscalYearId)
      .single();

    if (fyError || !fiscalYear) {
      throw new Error('Ejercicio fiscal no encontrado');
    }

    if (fiscalYear.status === 'closed') {
      throw new Error('No se puede deshacer un ejercicio cerrado. Contacta con soporte.');
    }

    console.log(
      `[rollback-migration] Found fiscal year ${fiscalYear.year} for centro ${fiscalYear.centro_code}`
    );

    let deletedEntries = 0;
    let deletedTransactions = 0;
    let deletedIVA = 0;
    let deletedImportRuns = 0;

    // ========================================================================
    // STEP 1: Delete accounting entries and transactions
    // ========================================================================

    // Get all entry IDs for this fiscal year
    const { data: entries, error: entriesError } = await supabase
      .from('accounting_entries')
      .select('id')
      .eq('fiscal_year_id', fiscalYearId)
      .in('serie', ['APERTURA', 'DIARIO', 'REGULARIZACION', 'CIERRE', 'MIGRACION']);

    if (entriesError) {
      console.error('[rollback-migration] Error getting entries:', entriesError);
      throw new Error(`Error al obtener asientos: ${entriesError.message}`);
    }

    if (entries && entries.length > 0) {
      const entryIds = entries.map((e) => e.id);

      // Delete transactions first (foreign key constraint)
      const { error: transError } = await supabase
        .from('accounting_transactions')
        .delete()
        .in('entry_id', entryIds);

      if (transError) {
        console.error('[rollback-migration] Error deleting transactions:', transError);
        throw new Error(`Error al eliminar transacciones: ${transError.message}`);
      }

      deletedTransactions = entryIds.length; // Approx, each entry has multiple transactions

      // Delete entries
      const { error: entriesDeleteError } = await supabase
        .from('accounting_entries')
        .delete()
        .in('id', entryIds);

      if (entriesDeleteError) {
        console.error('[rollback-migration] Error deleting entries:', entriesDeleteError);
        throw new Error(`Error al eliminar asientos: ${entriesDeleteError.message}`);
      }

      deletedEntries = entries.length;
    }

    console.log(`[rollback-migration] Deleted ${deletedEntries} entries`);

    // ========================================================================
    // STEP 2: Delete IVA staging data
    // ========================================================================

    // Get import runs for this period
    const { data: importRuns, error: runsError } = await supabase
      .from('import_runs')
      .select('id')
      .eq('centro_code', fiscalYear.centro_code)
      .in('import_type', ['iva_emitidas', 'iva_recibidas', 'sumas_saldos', 'norma43']);

    if (runsError) {
      console.error('[rollback-migration] Error getting import runs:', runsError);
    } else if (importRuns && importRuns.length > 0) {
      const runIds = importRuns.map((r) => r.id);

      // Delete staging IVA emitidas
      const { error: emitidasError } = await supabase
        .from('stg_iva_emitidas')
        .delete()
        .in('import_run_id', runIds);

      if (emitidasError) {
        console.warn('[rollback-migration] Error deleting stg_iva_emitidas:', emitidasError);
      }

      // Delete staging IVA recibidas
      const { error: recibidasError } = await supabase
        .from('stg_iva_recibidas')
        .delete()
        .in('import_run_id', runIds);

      if (recibidasError) {
        console.warn('[rollback-migration] Error deleting stg_iva_recibidas:', recibidasError);
      }

      deletedIVA = runIds.length;

      // Delete import runs
      const { error: deleteRunsError } = await supabase
        .from('import_runs')
        .delete()
        .in('id', runIds);

      if (deleteRunsError) {
        console.warn('[rollback-migration] Error deleting import_runs:', deleteRunsError);
      } else {
        deletedImportRuns = runIds.length;
      }
    }

    console.log(`[rollback-migration] Deleted ${deletedIVA} IVA imports`);

    // ========================================================================
    // STEP 3: Reset fiscal year status or delete
    // ========================================================================

    if (deleteAll) {
      const { error: deleteFYError } = await supabase
        .from('fiscal_years')
        .delete()
        .eq('id', fiscalYearId);

      if (deleteFYError) {
        console.error('[rollback-migration] Error deleting fiscal year:', deleteFYError);
        throw new Error(`Error al eliminar ejercicio: ${deleteFYError.message}`);
      }

      console.log(`[rollback-migration] Deleted fiscal year ${fiscalYearId}`);
    } else {
      const { error: updateError } = await supabase
        .from('fiscal_years')
        .update({
          status: 'draft',
          closed_at: null,
          closed_by: null,
        })
        .eq('id', fiscalYearId);

      if (updateError) {
        console.error('[rollback-migration] Error updating fiscal year:', updateError);
        throw new Error(`Error al resetear ejercicio: ${updateError.message}`);
      }

      console.log(`[rollback-migration] Reset fiscal year ${fiscalYearId} to draft`);
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================

    console.log('[rollback-migration] ✅ Rollback completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        deleted_entries: deletedEntries,
        deleted_transactions: deletedTransactions,
        deleted_iva_imports: deletedIVA,
        deleted_import_runs: deletedImportRuns,
        fiscal_year_deleted: deleteAll,
        message: `Migración deshecha: ${deletedEntries} asientos eliminados`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[rollback-migration] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
