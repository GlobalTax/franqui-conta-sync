// ============================================================================
// PONTO OAUTH CALLBACK - Handle OAuth flow and token exchange
// Purpose: Receive code, exchange for tokens, encrypt, persist connection
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { encrypt, fingerprint } from '../_shared/crypto.ts';

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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('OAuth callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error 
    });

    // Handle OAuth error
    if (error) {
      return new Response(
        `<html><body><h1>Error de conexión</h1><p>${error}</p></body></html>`,
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return new Response(
        '<html><body><h1>Error</h1><p>Missing code or state</p></body></html>',
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    // Parse state: formato "centro_code:institution_id:user_id"
    const [centroCode, institutionId, userId] = state.split(':');
    if (!centroCode || !institutionId || !userId) {
      console.error('Invalid state format:', state);
      return new Response(
        '<html><body><h1>Error</h1><p>Invalid state</p></body></html>',
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    // Exchange code for tokens
    const clientId = Deno.env.get('PONTO_CLIENT_ID');
    const clientSecret = Deno.env.get('PONTO_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Ponto credentials not configured');
      return new Response(
        '<html><body><h1>Error de configuración</h1><p>Credenciales Ponto no configuradas</p></body></html>',
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    const tokenResponse = await fetch('https://api.ponto.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${url.origin}/functions/v1/ponto-oauth-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(
        '<html><body><h1>Error de autenticación</h1><p>No se pudieron obtener los tokens</p></body></html>',
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    // Encrypt tokens
    const encryptedAccessToken = await encrypt(tokens.access_token);
    const encryptedRefreshToken = await encrypt(tokens.refresh_token);
    const tokenFingerprint = await fingerprint(tokens.access_token);

    console.log('Tokens encrypted, fingerprint:', tokenFingerprint);

    // Calculate expiration
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    // Persist connection
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: connection, error: dbError } = await supabase
      .from('ponto_connections')
      .insert({
        centro_code: centroCode,
        institution_id: institutionId,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: expiresAt,
        status: 'active',
        connected_by: userId,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        '<html><body><h1>Error</h1><p>No se pudo guardar la conexión</p></body></html>',
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    console.log('Connection created:', connection.id);

    // Trigger initial sync (fire-and-forget)
    supabase.functions.invoke('ponto-sync', {
      body: { connection_id: connection.id },
    }).catch(err => console.error('Sync trigger failed:', err));

    // Success page with redirect
    return new Response(
      `<html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f7fafc; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            h1 { color: #1d4ed8; margin: 0 0 1rem 0; }
            p { color: #64748b; margin: 0 0 1.5rem 0; }
            .spinner { border: 3px solid #e2e8f0; border-top-color: #1d4ed8; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅ Banco conectado</h1>
            <p>Tu cuenta Ponto se conectó correctamente. Redirigiendo...</p>
            <div class="spinner"></div>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = '/treasury/bank-reconciliation';
            }, 2000);
          </script>
        </body>
      </html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      `<html><body><h1>Error</h1><p>${message}</p></body></html>`,
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }
});
