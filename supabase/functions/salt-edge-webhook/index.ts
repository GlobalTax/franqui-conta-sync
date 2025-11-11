import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const signature = req.headers.get('signature');
    const body = await req.text();
    
    console.log('Received Salt Edge webhook:', body.substring(0, 200));

    // Verify signature
    const SALT_EDGE_SECRET = Deno.env.get('SALT_EDGE_SECRET');
    if (!SALT_EDGE_SECRET) {
      throw new Error('Salt Edge secret not configured');
    }

    if (signature) {
      const isValid = await verifySignature(body, signature, SALT_EDGE_SECRET);
      if (!isValid) {
        console.error('Invalid webhook signature');
        throw new Error('Invalid signature');
      }
    }

    const payload = JSON.parse(body);
    const { data } = payload;

    console.log('Webhook event:', data?.stage, 'for connection:', data?.connection_id);

    // Handle different webhook events
    switch (data?.stage) {
      case 'success':
        await handleSuccessEvent(supabase, data);
        break;
      case 'notify':
        await handleNotifyEvent(supabase, data);
        break;
      case 'error':
      case 'fail':
        await handleErrorEvent(supabase, data);
        break;
      default:
        console.log('Unhandled webhook stage:', data?.stage);
    }

    return new Response(
      JSON.stringify({ success: true, stage: data?.stage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 to prevent Salt Edge retries
      }
    );
  }
});

async function handleSuccessEvent(supabase: any, data: any) {
  console.log('Processing success event for connection:', data.connection_id);

  // Get connection details from Salt Edge API
  const connectionDetails = await fetchConnectionDetails(data.connection_id);

  if (!connectionDetails) {
    console.error('Could not fetch connection details');
    return;
  }

  // Extract centro_code from customer_id (format: franquiconta_{centroCode}_{userId})
  const customerId = connectionDetails.customer_id;
  const centroCode = customerId.split('_')[1];

  // Upsert connection in database
  const { error: upsertError } = await supabase
    .from('salt_edge_connections')
    .upsert({
      connection_id: data.connection_id,
      centro_code: centroCode,
      provider_code: connectionDetails.provider_code,
      provider_name: connectionDetails.provider_name,
      customer_id: customerId,
      status: connectionDetails.status,
      consent_expires_at: connectionDetails.consent_expires_at,
      last_success_at: new Date().toISOString(),
      metadata: {
        country_code: connectionDetails.country_code,
        daily_refresh: connectionDetails.daily_refresh,
        store_credentials: connectionDetails.store_credentials,
      },
    }, {
      onConflict: 'connection_id',
    });

  if (upsertError) {
    console.error('Error upserting connection:', upsertError);
    throw upsertError;
  }

  console.log('Connection stored successfully:', data.connection_id);

  // Trigger initial sync
  await triggerTransactionSync(data.connection_id);
}

async function handleNotifyEvent(supabase: any, data: any) {
  console.log('Processing notify event for connection:', data.connection_id);

  // Update connection status
  const { error } = await supabase
    .from('salt_edge_connections')
    .update({
      status: 'active',
      last_sync_at: new Date().toISOString(),
    })
    .eq('connection_id', data.connection_id);

  if (error) {
    console.error('Error updating connection:', error);
  }

  // Trigger transaction sync
  await triggerTransactionSync(data.connection_id);
}

async function handleErrorEvent(supabase: any, data: any) {
  console.log('Processing error event for connection:', data.connection_id);

  const { error } = await supabase
    .from('salt_edge_connections')
    .update({
      status: data.stage === 'fail' ? 'reconnect_required' : 'inactive',
      metadata: { last_error: data.error_message || 'Unknown error' },
    })
    .eq('connection_id', data.connection_id);

  if (error) {
    console.error('Error updating connection status:', error);
  }

  // Log error
  await supabase.from('salt_edge_sync_log').insert({
    connection_id: data.connection_id,
    sync_type: 'webhook',
    status: 'error',
    error_message: data.error_message || 'Connection failed',
    completed_at: new Date().toISOString(),
  });
}

async function fetchConnectionDetails(connectionId: string) {
  const SALT_EDGE_APP_ID = Deno.env.get('SALT_EDGE_APP_ID');
  const SALT_EDGE_SECRET = Deno.env.get('SALT_EDGE_SECRET');
  const SALT_EDGE_BASE_URL = Deno.env.get('SALT_EDGE_BASE_URL') || 'https://www.saltedge.com/api/v6';

  const expireAt = Math.floor(Date.now() / 1000) + 60;
  const path = `/api/v6/connections/${connectionId}`;
  const signature = await generateSignature('GET', path, expireAt);

  const response = await fetch(`${SALT_EDGE_BASE_URL}/connections/${connectionId}`, {
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
    console.error('Error fetching connection details:', await response.text());
    return null;
  }

  const result = await response.json();
  return result.data;
}

async function triggerTransactionSync(connectionId: string) {
  console.log('Triggering transaction sync for connection:', connectionId);
  
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

  // Call sync function asynchronously
  fetch(`${SUPABASE_URL}/functions/v1/sync-bank-transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ connectionId }),
  }).catch(err => console.error('Error triggering sync:', err));
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(body);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );

  return await crypto.subtle.verify('HMAC', key, signatureBytes, messageData);
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
