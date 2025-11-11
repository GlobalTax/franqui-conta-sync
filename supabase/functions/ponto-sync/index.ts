// ============================================================================
// PONTO SYNC - Synchronize accounts, transactions, and balances
// Purpose: Full sync with detailed logging and deduplication
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { decrypt } from '../_shared/crypto.ts';
import { PontoClient, refreshAccessToken } from '../_shared/ponto-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  connection_id: string;
  sync_accounts?: boolean;
  sync_transactions?: boolean;
  sync_balances?: boolean;
  transaction_days?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let syncLogId: string | null = null;

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const body: SyncRequest = await req.json();
    const {
      connection_id,
      sync_accounts = true,
      sync_transactions = true,
      sync_balances = true,
      transaction_days = 90,
    } = body;

    if (!connection_id) {
      return new Response(
        JSON.stringify({ error: 'Missing connection_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Ponto sync:', {
      connection_id,
      sync_accounts,
      sync_transactions,
      sync_balances,
      transaction_days,
    });

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('ponto_connections')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('ponto_sync_log')
      .insert({
        connection_id,
        sync_type: 'manual',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) throw logError;
    syncLogId = syncLog.id;

    console.log('Sync log created:', syncLogId);

    // Decrypt and validate token
    let accessToken = await decrypt(connection.access_token_encrypted);
    const tokenExpiresAt = new Date(connection.token_expires_at);

    // Refresh token if expired
    if (tokenExpiresAt < new Date()) {
      console.log('Token expired, refreshing...');
      const refreshToken = await decrypt(connection.refresh_token_encrypted);
      const newTokens = await refreshAccessToken(refreshToken);

      // Re-encrypt and update
      const { encrypt } = await import('../_shared/crypto.ts');
      const newAccessEncrypted = await encrypt(newTokens.access_token);
      const newRefreshEncrypted = await encrypt(newTokens.refresh_token);
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString();

      await supabase
        .from('ponto_connections')
        .update({
          access_token_encrypted: newAccessEncrypted,
          refresh_token_encrypted: newRefreshEncrypted,
          token_expires_at: newExpiresAt,
        })
        .eq('id', connection_id);

      accessToken = newTokens.access_token;
      console.log('Token refreshed successfully');
    }

    // Initialize Ponto client
    const client = new PontoClient({ accessToken });

    let accountsCount = 0;
    let transactionsCount = 0;
    let balancesCount = 0;

    // Sync accounts
    if (sync_accounts) {
      console.log('Syncing accounts...');
      const accountsResponse = await client.get<{ data: any[] }>('/accounts');
      const accounts = accountsResponse.data || [];

      for (const account of accounts) {
        const { data: insertedAccount } = await supabase
          .from('ponto_accounts')
          .upsert({
            connection_id,
            ponto_account_id: account.id,
            account_type: account.attributes.subtype || 'checking',
            currency: account.attributes.currency,
            name: account.attributes.description || 'Cuenta',
            iban: account.attributes.reference,
            bic: account.attributes.referenceType === 'IBAN' ? null : account.attributes.reference,
            status: 'active',
            raw_data: account,
          }, {
            onConflict: 'connection_id,ponto_account_id',
          })
          .select()
          .single();

        if (insertedAccount) accountsCount++;

        // Sync balances for this account
        if (sync_balances && insertedAccount) {
          try {
            const balance = account.attributes.currentBalance;
            if (balance !== undefined) {
              await supabase
                .from('ponto_account_balances')
                .insert({
                  account_id: insertedAccount.id,
                  balance_type: 'current',
                  amount: balance,
                  currency: account.attributes.currency,
                  reference_date: new Date().toISOString().split('T')[0],
                });
              balancesCount++;
            }
          } catch (err) {
            console.error('Balance sync error:', err);
          }
        }

        // Sync transactions for this account
        if (sync_transactions && insertedAccount) {
          try {
            const fromDate = new Date(Date.now() - transaction_days * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
            
            const txResponse = await client.get<{ data: any[] }>(
              `/accounts/${account.id}/transactions?filter[after]=${fromDate}`
            );
            const transactions = txResponse.data || [];

            for (const tx of transactions) {
              const amount = parseFloat(tx.attributes.amount) || 0;
              const { data: insertedTx } = await supabase
                .from('ponto_transactions')
                .upsert({
                  account_id: insertedAccount.id,
                  ponto_transaction_id: tx.id,
                  transaction_date: tx.attributes.executionDate,
                  value_date: tx.attributes.valueDate,
                  amount,
                  currency: tx.attributes.currency,
                  description: tx.attributes.description || '',
                  counterpart_name: tx.attributes.counterpartName,
                  counterpart_reference: tx.attributes.counterpartReference,
                  status: 'imported',
                  raw_data: tx,
                }, {
                  onConflict: 'account_id,ponto_transaction_id',
                });

              if (insertedTx) transactionsCount++;
            }
          } catch (err) {
            console.error('Transaction sync error:', err);
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    // Update sync log
    await supabase
      .from('ponto_sync_log')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        accounts_synced: accountsCount,
        transactions_synced: transactionsCount,
        errors: null,
      })
      .eq('id', syncLogId);

    console.log('Sync completed:', {
      duration_ms: duration,
      accounts: accountsCount,
      transactions: transactionsCount,
      balances: balancesCount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sync_log_id: syncLogId,
        duration_ms: duration,
        accounts_synced: accountsCount,
        transactions_synced: transactionsCount,
        balances_synced: balancesCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Update sync log with error
    if (syncLogId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('ponto_sync_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: { message: errorMessage, stack: errorStack },
        })
        .eq('id', syncLogId);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
