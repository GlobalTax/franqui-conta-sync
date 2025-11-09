import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * CORS Configuration
 * Set ALLOWED_ORIGIN env var in Supabase Project Settings
 * Examples:
 * - Single: "https://app.franquicontasync.com"
 * - Multiple: "https://app.com,https://staging.app.com"
 * - Dev: leave empty or "*" for local development
 */
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "*")
  .split(",")
  .map(o => o.trim());

interface OrquestService {
  id: string;
  name: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

serve(async (req) => {
  const requestOrigin = req.headers.get("origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes("*") 
      ? "*" 
      : (ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Crear registro de log
    const { data: logData, error: logError } = await supabase
      .from('orquest_services_sync_logs')
      .insert({
        status: 'running',
        trigger_source: 'manual',
        triggered_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (logError) throw logError;
    const logId = logData.id;

    console.log(`[Sync] Starting sync with log ID: ${logId}`);

    // Obtener todos los franchisees con configuración de Orquest
    const { data: franchisees, error: franchiseesError } = await supabase
      .from('franchisees')
      .select('*')
      .not('orquest_business_id', 'is', null);

    if (franchiseesError) throw franchiseesError;

    let totalServices = 0;
    let franchiseesSucceeded = 0;
    let franchiseesFailed = 0;
    const results: any[] = [];
    const errors: any[] = [];

    // Para cada franchisee, obtener servicios de Orquest
    for (const franchisee of franchisees || []) {
      try {
        console.log(`[Sync] Processing franchisee: ${franchisee.name} (${franchisee.id})`);

        // En una implementación real, aquí harías la llamada a la API de Orquest
        // Por ahora, simulamos la respuesta
        const orquestBaseUrl = Deno.env.get('ORQUEST_BASE_URL') || 'https://api.orquest.com';
        
        // Ejemplo de llamada a Orquest (ajustar según API real)
        // const response = await fetch(`${orquestBaseUrl}/services?business_id=${franchisee.orquest_business_id}`, {
        //   headers: {
        //     'Authorization': `Bearer ${franchisee.orquest_api_key}`,
        //   },
        // });
        // const services: OrquestService[] = await response.json();

        // Por ahora, solo registramos el intento sin hacer llamada real
        console.log(`[Sync] Would sync services for business_id: ${franchisee.orquest_business_id}`);
        
        // Marcar como exitoso (en producción, esto dependería de la respuesta de Orquest)
        franchiseesSucceeded++;
        results.push({
          franchisee_id: franchisee.id,
          franchisee_name: franchisee.name,
          status: 'success',
          services_count: 0,
        });

      } catch (error: any) {
        console.error(`[Sync] Error processing franchisee ${franchisee.name}:`, error);
        franchiseesFailed++;
        errors.push({
          franchisee_id: franchisee.id,
          franchisee_name: franchisee.name,
          error: error.message,
        });
      }
    }

    // Actualizar log con resultados
    await supabase
      .from('orquest_services_sync_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_franchisees: (franchisees || []).length,
        franchisees_succeeded: franchiseesSucceeded,
        franchisees_failed: franchiseesFailed,
        total_services: totalServices,
        results,
        errors,
      })
      .eq('id', logId);

    console.log(`[Sync] Completed. Total services: ${totalServices}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_services: totalServices,
        franchisees_succeeded: franchiseesSucceeded,
        franchisees_failed: franchiseesFailed,
        log_id: logId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[Sync] Fatal error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
