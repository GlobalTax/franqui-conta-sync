import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  connectionId?: string;
  centroCode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { connectionId, centroCode } = await req.json() as SyncRequest;

    // Get connections to sync
    let query = supabase
      .from('salt_edge_connections')
      .select('*')
      .eq('status', 'active');

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    } else if (centroCode) {
      query = query.eq('centro_code', centroCode);
    }

    const { data: connections, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active connections to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Syncing ${connections.length} connection(s)`);

    const results = await Promise.all(
      connections.map(conn => syncConnection(supabase, conn))
    );

    const totalAccounts = results.reduce((sum, r) => sum + r.accountsSynced, 0);
    const totalTransactions = results.reduce((sum, r) => sum + r.transactionsSynced, 0);

    return new Response(
      JSON.stringify({
        success: true,
        connectionsSynced: connections.length,
        accountsSynced: totalAccounts,
        transactionsSynced: totalTransactions,
        details: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error syncing transactions:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function syncConnection(supabase: any, connection: any) {
  const startTime = Date.now();
  let accountsSynced = 0;
  let transactionsSynced = 0;

  try {
    console.log(`Syncing connection: ${connection.connection_id}`);

    // Create sync log entry
    const { data: logEntry, error: logError } = await supabase
      .from('salt_edge_sync_log')
      .insert({
        connection_id: connection.id,
        sync_type: 'manual',
        status: 'success',
      })
      .select()
      .single();

    if (logError) throw logError;

    // Fetch accounts from Salt Edge
    const accounts = await fetchAccounts(connection.connection_id);
    accountsSynced = accounts.length;

    // Get or create bank account mapping
    for (const account of accounts) {
      const { data: existingAccount } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('iban', account.iban || account.id)
        .eq('centro_code', connection.centro_code)
        .single();

      let bankAccountId = existingAccount?.id;

      if (!existingAccount && account.iban) {
        // Create new bank account
        const { data: newAccount, error: accountError } = await supabase
          .from('bank_accounts')
          .insert({
            centro_code: connection.centro_code,
            account_name: account.name,
            iban: account.iban,
            swift: account.swift_code,
            currency: account.currency_code,
            current_balance: account.balance,
            active: true,
          })
          .select()
          .single();

        if (accountError) {
          console.error('Error creating bank account:', accountError);
          continue;
        }

        bankAccountId = newAccount.id;
      }

      if (bankAccountId) {
        // Fetch and sync transactions for this account
        const transactions = await fetchTransactions(connection.connection_id, account.id);
        transactionsSynced += await syncTransactions(supabase, bankAccountId, transactions, connection.id);
      }
    }

    // Update connection
    await supabase
      .from('salt_edge_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    // Update sync log
    const duration = Date.now() - startTime;
    await supabase
      .from('salt_edge_sync_log')
      .update({
        status: 'success',
        accounts_synced: accountsSynced,
        transactions_synced: transactionsSynced,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      })
      .eq('id', logEntry.id);

    console.log(`Synced ${accountsSynced} accounts, ${transactionsSynced} transactions in ${duration}ms`);

    return { accountsSynced, transactionsSynced, duration };

  } catch (error) {
    console.error('Error syncing connection:', error);
    
    await supabase
      .from('salt_edge_sync_log')
      .update({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      })
      .eq('connection_id', connection.id);

    return { accountsSynced, transactionsSynced, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function fetchAccounts(connectionId: string) {
  const SALT_EDGE_APP_ID = Deno.env.get('SALT_EDGE_APP_ID');
  const SALT_EDGE_SECRET = Deno.env.get('SALT_EDGE_SECRET');
  const SALT_EDGE_BASE_URL = Deno.env.get('SALT_EDGE_BASE_URL') || 'https://www.saltedge.com/api/v6';

  const expireAt = Math.floor(Date.now() / 1000) + 60;
  const path = `/api/v6/accounts?connection_id=${connectionId}`;
  const signature = await generateSignature('GET', path, expireAt);

  const response = await fetch(`${SALT_EDGE_BASE_URL}/accounts?connection_id=${connectionId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'App-id': SALT_EDGE_APP_ID!,
      'Secret': SALT_EDGE_SECRET!,
      'Signature': signature,
      'Expires-at': expireAt.toString(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${await response.text()}`);
  }

  const result = await response.json();
  return result.data || [];
}

async function fetchTransactions(connectionId: string, accountId: string) {
  const SALT_EDGE_APP_ID = Deno.env.get('SALT_EDGE_APP_ID');
  const SALT_EDGE_SECRET = Deno.env.get('SALT_EDGE_SECRET');
  const SALT_EDGE_BASE_URL = Deno.env.get('SALT_EDGE_BASE_URL') || 'https://www.saltedge.com/api/v6';

  // Fetch last 90 days
  const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const expireAt = Math.floor(Date.now() / 1000) + 60;
  const path = `/api/v6/transactions?connection_id=${connectionId}&account_id=${accountId}&from_date=${fromDate}`;
  const signature = await generateSignature('GET', path, expireAt);

  const response = await fetch(
    `${SALT_EDGE_BASE_URL}/transactions?connection_id=${connectionId}&account_id=${accountId}&from_date=${fromDate}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'App-id': SALT_EDGE_APP_ID!,
        'Secret': SALT_EDGE_SECRET!,
        'Signature': signature,
        'Expires-at': expireAt.toString(),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${await response.text()}`);
  }

  const result = await response.json();
  return result.data || [];
}

async function syncTransactions(supabase: any, bankAccountId: string, transactions: any[], connectionId: string) {
  let synced = 0;

  for (const txn of transactions) {
    // Check if transaction already exists
    const { data: existing } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('bank_account_id', bankAccountId)
      .eq('reference', txn.id)
      .single();

    if (existing) {
      continue; // Skip duplicates
    }

    // Insert new transaction
    const { error } = await supabase
      .from('bank_transactions')
      .insert({
        bank_account_id: bankAccountId,
        transaction_date: txn.made_on,
        value_date: txn.posted_on || txn.made_on,
        description: txn.description || txn.extra?.payee || 'Salt Edge transaction',
        reference: txn.id,
        amount: parseFloat(txn.amount),
        balance: txn.account_balance ? parseFloat(txn.account_balance) : null,
        status: 'pending',
        import_batch_id: `salt_edge_${connectionId}`,
      });

    if (!error) {
      synced++;
    } else {
      console.error('Error inserting transaction:', error);
    }
  }

  return synced;
}

async function generateSignature(
  method: string,
  path: string,
  expiresAt: number,
  body?: any
): Promise<string> {
  const SALT_EDGE_SECRET = Deno.env.get('SALT_EDGE_SECRET') || '';
  const bodyString = body ? JSON.stringify(body) : '';
  const message = `${expiresAt}|${method}|${path}|${bodyString}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(SALT_EDGE_SECRET);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}
