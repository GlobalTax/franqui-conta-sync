import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { logger } from '../_shared/logger.ts';
import { corsHeaders } from '../_shared/cors.ts';

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

    logger.info('create-bank-connection', 'Creating Salt Edge connection', { centroCode, providerCode });

    const SALT_EDGE_APP_ID = Deno.env.get('SALT_EDGE_APP_ID');
    const SALT_EDGE_SECRET = Deno.env.get('SALT_EDGE_SECRET');
    const SALT_EDGE_BASE_URL = Deno.env.get('SALT_EDGE_BASE_URL') || 'https://www.saltedge.com/api/v5';

    if (!SALT_EDGE_APP_ID || !SALT_EDGE_SECRET) {
      throw new Error('Salt Edge credentials not configured');
    }

    const saltEdgeHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'App-id': SALT_EDGE_APP_ID,
      'Secret': SALT_EDGE_SECRET,
    };

    // Step 1: Create or find customer
    const customerIdentifier = `franquiconta_${centroCode}_${user.id}`;
    
    // Try to create customer (Salt Edge returns existing one if identifier matches)
    const customerPayload = {
      data: {
        identifier: customerIdentifier,
      }
    };

    logger.debug('create-bank-connection', 'Creating/finding Salt Edge customer', { customerIdentifier });

    const customerResponse = await fetch(`${SALT_EDGE_BASE_URL}/customers`, {
      method: 'POST',
      headers: saltEdgeHeaders,
      body: JSON.stringify(customerPayload),
    });

    let customerId: string;

    if (customerResponse.ok) {
      const customerResult = await customerResponse.json();
      customerId = customerResult.data?.id;
      logger.info('create-bank-connection', 'Customer created/found', { customerId });
    } else {
      const customerError = await customerResponse.text();
      logger.error('create-bank-connection', 'Customer creation error', { customerError });
      
      // If customer already exists, try to list and find it
      if (customerError.includes('already exists') || customerResponse.status === 409) {
        const listResponse = await fetch(
          `${SALT_EDGE_BASE_URL}/customers?identifier=${encodeURIComponent(customerIdentifier)}`,
          { headers: saltEdgeHeaders }
        );
        if (!listResponse.ok) {
          const listError = await listResponse.text();
          throw new Error(`Failed to find existing customer: ${listError}`);
        }
        const listResult = await listResponse.json();
        customerId = listResult.data?.[0]?.id;
        if (!customerId) {
          throw new Error('Customer exists but could not be retrieved');
        }
        logger.info('create-bank-connection', 'Found existing customer', { customerId });
      } else {
        throw new Error(`Salt Edge customer error: ${customerResponse.status} - ${customerError}`);
      }
    }

    // Step 2: Create connect session with the real customer ID
    const connectPayload = {
      data: {
        customer_id: customerId,
        consent: {
          scopes: ['account_details', 'transactions_details'],
          from_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        attempt: {
          return_to: returnUrl || `${Deno.env.get('SUPABASE_URL')}/functions/v1/salt-edge-webhook`,
          fetch_scopes: ['accounts', 'transactions'],
        },
        provider_code: providerCode,
        locale: 'es',
      }
    };

    logger.debug('create-bank-connection', 'Creating connect session', { customerId });

    const response = await fetch(`${SALT_EDGE_BASE_URL}/connect_sessions/create`, {
      method: 'POST',
      headers: saltEdgeHeaders,
      body: JSON.stringify(connectPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('create-bank-connection', 'Salt Edge API error', { errorText });
      throw new Error(`Salt Edge API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    logger.info('create-bank-connection', 'Salt Edge connect session created', { connectUrl: result.data?.connect_url });

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
    logger.error('create-bank-connection', 'Error creating bank connection', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
