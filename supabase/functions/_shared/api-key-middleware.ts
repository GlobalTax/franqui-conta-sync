import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ApiKeyValidationResult {
  isValid: boolean;
  userId?: string;
  keyId?: string;
  centroCode?: string;
  franchiseeId?: string;
  scopes?: string[];
}

export async function validateApiKey(
  request: Request,
  requiredScope?: string
): Promise<ApiKeyValidationResult> {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return { isValid: false };
  }

  // Validar formato del key
  if (!apiKey.startsWith('pk_live_') && !apiKey.startsWith('pk_test_')) {
    return { isValid: false };
  }

  // Hash del key (mismo algoritmo que en generación)
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Crear cliente Supabase con service role
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Obtener IP del cliente
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') ||
                   'unknown';

  // Validar key usando función RPC
  const { data: rpcData, error } = await supabase.rpc('validate_api_key', {
    p_key_hash: keyHash,
    p_required_scope: requiredScope,
    p_ip_address: clientIp
  });

  if (error || !rpcData || rpcData.length === 0) {
    console.error('[API Key Middleware] Validation failed:', error);
    return { isValid: false };
  }

  const result = rpcData[0];

  if (!result.is_valid) {
    return { isValid: false };
  }

  // Log de uso (fire and forget)
  const url = new URL(request.url);
  supabase.from('api_key_usage_logs').insert({
    api_key_id: result.key_id,
    endpoint: url.pathname,
    method: request.method,
    ip_address: clientIp,
    user_agent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  }).then();

  return {
    isValid: true,
    userId: result.user_id,
    keyId: result.key_id,
    centroCode: result.centro_code,
    franchiseeId: result.franchisee_id,
    scopes: result.scopes ? Object.keys(result.scopes) : []
  };
}

export function createApiKeyResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
