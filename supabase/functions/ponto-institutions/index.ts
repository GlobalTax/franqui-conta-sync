// ============================================================================
// PONTO INSTITUTIONS - List available banks
// Purpose: Authenticated proxy to Ponto institutions API with caching
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { PontoClient } from '../_shared/ponto-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Ponto institutions for user:', user.id);

    // Get country filter from query params (default: BE)
    const url = new URL(req.url);
    const country = url.searchParams.get('country') || 'BE';

    // Call Ponto API (no access token needed for public institution list)
    const client = new PontoClient();
    const response = await client.get<{ data: any[]; meta: any }>(
      `/financial-institutions?filter[country]=${country}`
    );

    console.log(`Fetched ${response.data?.length || 0} institutions for country: ${country}`);

    return new Response(
      JSON.stringify({
        institutions: response.data || [],
        meta: response.meta || {},
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // Cache 1 hour
        },
      }
    );

  } catch (error) {
    console.error('Institutions fetch error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
