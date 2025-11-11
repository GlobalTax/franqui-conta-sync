import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateConnectionRequest {
  centroCode: string;
  providerCode: string;
  returnUrl?: string;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { centroCode, providerCode, returnUrl } = await req.json() as CreateConnectionRequest;

    if (!centroCode || !providerCode) {
      throw new Error('Missing required fields: centroCode, providerCode');
    }

    console.log(`Creating Salt Edge connection for centro ${centroCode}, provider ${providerCode}`);

    // Salt Edge credentials
    const SALT_EDGE_APP_ID = Deno.env.get('SALT_EDGE_APP_ID');
    const SALT_EDGE_SECRET = Deno.env.get('SALT_EDGE_SECRET');
    const SALT_EDGE_BASE_URL = Deno.env.get('SALT_EDGE_BASE_URL') || 'https://www.saltedge.com/api/v6';

    if (!SALT_EDGE_APP_ID || !SALT_EDGE_SECRET) {
      throw new Error('Salt Edge credentials not configured');
    }

    // Create or get customer
    const customerId = `franquiconta_${centroCode}_${user.id}`;

    // Generate connect session URL
    const connectPayload = {
      data: {
        customer_id: customerId,
        consent: {
          scopes: ['account_details', 'transactions_details'],
          from_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
        },
        attempt: {
          return_to: returnUrl || `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'functions.supabase.co')}/salt-edge-webhook`,
          fetch_scopes: ['accounts', 'transactions'],
        },
        provider_code: providerCode,
        locale: 'es',
      }
    };

    const expireAt = Math.floor(Date.now() / 1000) + 60;
    const signature = await generateSignature('POST', '/api/v6/connect_sessions/create', expireAt, connectPayload);

    const response = await fetch(`${SALT_EDGE_BASE_URL}/connect_sessions/create`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'App-id': SALT_EDGE_APP_ID,
        'Secret': SALT_EDGE_SECRET,
        'Signature': signature,
        'Expires-at': expireAt.toString(),
      },
      body: JSON.stringify(connectPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Salt Edge API error:', errorText);
      throw new Error(`Salt Edge API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log('Salt Edge connect session created:', result.data?.connect_url);

    return new Response(
      JSON.stringify({
        success: true,
        connectUrl: result.data?.connect_url,
        sessionId: result.data?.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating bank connection:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

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
