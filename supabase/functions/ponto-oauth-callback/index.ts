// ============================================================================
// PONTO OAUTH CALLBACK - Handle OAuth flow and token exchange
// Purpose: Receive code, exchange for tokens, encrypt, persist connection
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { encrypt, fingerprint } from '../_shared/crypto.ts';
import { logger } from '../_shared/logger.ts';
import { corsHeaders } from '../_shared/cors.ts';

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

    logger.info('ponto-oauth-callback', 'OAuth callback received', {
      hasCode: !!code,
      hasState: !!state,
      error
    });

    // Handle OAuth error
    if (error) {
      return new Response(
        JSON.stringify({ error: `Error de conexión: ${error}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Missing code or state' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse state: formato "centro_code:institution_id:user_id"
    const [centroCode, institutionId, userId] = state.split(':');
    if (!centroCode || !institutionId || !userId) {
      logger.error('ponto-oauth-callback', 'Invalid state format', state);
      return new Response(
        JSON.stringify({ error: 'Invalid state' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for tokens
    const clientId = Deno.env.get('PONTO_CLIENT_ID');
    const clientSecret = Deno.env.get('PONTO_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      logger.error('ponto-oauth-callback', 'Ponto credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Credenciales Ponto no configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      logger.error('ponto-oauth-callback', 'Token exchange failed', errorText);
      return new Response(
        JSON.stringify({ error: 'No se pudieron obtener los tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens = await tokenResponse.json();
    logger.info('ponto-oauth-callback', 'Tokens received', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    // Encrypt tokens
    const encryptedAccessToken = await encrypt(tokens.access_token);
    const encryptedRefreshToken = await encrypt(tokens.refresh_token);
    const tokenFingerprint = await fingerprint(tokens.access_token);

    logger.info('ponto-oauth-callback', 'Tokens encrypted', tokenFingerprint);

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
      logger.error('ponto-oauth-callback', 'Database error', dbError);
      return new Response(
        JSON.stringify({ error: 'No se pudo guardar la conexión' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('ponto-oauth-callback', 'Connection created', connection.id);

    // Trigger initial sync (fire-and-forget)
    supabase.functions.invoke('ponto-sync', {
      body: { connection_id: connection.id },
    }).catch(err => logger.error('ponto-oauth-callback', 'Sync trigger failed', err));

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
    logger.error('ponto-oauth-callback', 'OAuth callback error', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
