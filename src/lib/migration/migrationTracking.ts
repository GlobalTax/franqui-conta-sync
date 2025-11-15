// ============================================================================
// MIGRATION TRACKING HELPERS
// Purpose: Helper functions to track migration progress
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://srwnjnrhxzcpftmbbyib.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd25qbnJoeHpjcGZ0bWJieWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzY1NjMsImV4cCI6MjA2ODkxMjU2M30.JCQDhjjtXKrPCDV8QRYJmmJ6n9YxMtBPfUm8E52UbI4";

export interface CreateMigrationRunParams {
  centroCode: string;
  fiscalYear: number;
  fiscalYearId: string;
  startDate: string;
  endDate: string;
}

/**
 * Creates a new migration_run to track the migration
 */
export async function createMigrationRun(params: CreateMigrationRunParams): Promise<string> {
  const { data: user } = await supabase.auth.getUser();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/migration_runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        centro_code: params.centroCode,
        fiscal_year: params.fiscalYear,
        fiscal_year_id: params.fiscalYearId,
        start_date: params.startDate,
        end_date: params.endDate,
        status: 'in_progress',
        created_by: user.user?.id,
      }),
    });

    if (!response.ok) {
      // Si ya existe (unique violation), obtenerlo
      if (response.status === 409) {
        const existingResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/migration_runs?centro_code=eq.${params.centroCode}&fiscal_year=eq.${params.fiscalYear}&select=id`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
          }
        );
        const existing = await existingResponse.json();
        return existing[0].id;
      }
      throw new Error(`Error creating migration run: ${response.statusText}`);
    }

    const data = await response.json();
    return data[0].id;
  } catch (error) {
    console.error('Error in createMigrationRun:', error);
    throw error;
  }
}

/**
 * Appends entry IDs to migration_run
 */
export async function trackEntries(migrationRunId: string, entryIds: string[]) {
  try {
    const { data, error } = await supabase.rpc('append_migration_ids' as any, {
      p_migration_run_id: migrationRunId,
      p_entry_ids: entryIds,
    } as any);

    if (error) throw error;
  } catch (error) {
    console.error('Error tracking entries:', error);
    // Don't throw, just log - tracking is not critical
  }
}

/**
 * Appends IVA staging run IDs to migration_run
 */
export async function trackIVARuns(migrationRunId: string, ivaRunIds: string[]) {
  try {
    const { data, error } = await supabase.rpc('append_migration_ids' as any, {
      p_migration_run_id: migrationRunId,
      p_iva_run_ids: ivaRunIds,
    } as any);

    if (error) throw error;
  } catch (error) {
    console.error('Error tracking IVA runs:', error);
  }
}

/**
 * Appends bank transaction IDs to migration_run
 */
export async function trackBankTransactions(migrationRunId: string, transactionIds: string[]) {
  try {
    const { data, error } = await supabase.rpc('append_migration_ids' as any, {
      p_migration_run_id: migrationRunId,
      p_bank_transaction_ids: transactionIds,
    } as any);

    if (error) throw error;
  } catch (error) {
    console.error('Error tracking bank transactions:', error);
  }
}

/**
 * Appends closing period IDs to migration_run
 */
export async function trackClosingPeriods(migrationRunId: string, periodIds: string[]) {
  try {
    const { data, error } = await supabase.rpc('append_migration_ids' as any, {
      p_migration_run_id: migrationRunId,
      p_closing_period_ids: periodIds,
    } as any);

    if (error) throw error;
  } catch (error) {
    console.error('Error tracking closing periods:', error);
  }
}

/**
 * Marks migration as completed
 */
export async function completeMigration(migrationRunId: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/migration_runs?id=eq.${migrationRunId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Error completing migration: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error completing migration:', error);
  }
}

/**
 * Marks migration as failed
 */
export async function failMigration(migrationRunId: string, reason: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/migration_runs?id=eq.${migrationRunId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        status: 'failed',
        rollback_reason: reason,
      }),
    });

    if (!response.ok) {
      console.error('Error marking migration as failed');
    }
  } catch (error) {
    console.error('Error marking migration as failed:', error);
  }
}
