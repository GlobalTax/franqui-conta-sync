export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-ponto-signature, signature, x-supabase-client-info, x-supabase-client-version, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
