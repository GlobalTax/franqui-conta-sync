// ============================================================================
// PONTO WEBHOOKS - Receive and validate Ponto webhook events
// Purpose: Handle account sync events with HMAC validation
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ponto-signature',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate HMAC signature
    const signature = req.headers.get('X-Ponto-Signature');
    const body = await req.text();
    
    // TODO: Implement HMAC validation when webhook secret is configured
    // For POC, we log but don't enforce
    if (!signature) {
      console.warn('⚠️ Webhook received without signature (POC mode)');
    }

    const event = JSON.parse(body);
    console.log('Webhook received:', {
      type: event.type,
      id: event.id,
      hasSignature: !!signature,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log webhook event
    await supabase.from('ponto_sync_log').insert({
      connection_id: event.relationships?.account?.data?.id || null,
      sync_type: 'webhook',
      status: 'success',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      accounts_synced: 0,
      transactions_synced: 0,
      errors: { webhook_event: event },
    });

    // Handle specific event types
    switch (event.type) {
      case 'account.synchronization.succeeded': {
        const accountId = event.relationships?.account?.data?.id;
        if (accountId) {
          console.log('Account sync succeeded, triggering refresh:', accountId);
          
          // Find connection by account
          const { data: account } = await supabase
            .from('ponto_accounts')
            .select('connection_id')
            .eq('ponto_account_id', accountId)
            .single();

          if (account?.connection_id) {
            // Trigger sync (fire-and-forget)
            supabase.functions.invoke('ponto-sync', {
              body: { connection_id: account.connection_id },
            }).catch(err => console.error('Sync trigger failed:', err));
          }
        }
        break;
      }

      case 'account.synchronization.failed': {
        const accountId = event.relationships?.account?.data?.id;
        console.error('Account sync failed:', {
          accountId,
          error: event.attributes?.error,
        });
        
        // TODO: Alert user or mark connection as errored
        break;
      }

      case 'account.removed': {
        const accountId = event.relationships?.account?.data?.id;
        if (accountId) {
          console.log('Account removed, marking as inactive:', accountId);
          
          await supabase
            .from('ponto_accounts')
            .update({ status: 'inactive' })
            .eq('ponto_account_id', accountId);
        }
        break;
      }

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
