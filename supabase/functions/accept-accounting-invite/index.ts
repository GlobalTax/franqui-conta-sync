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

serve(async (req) => {
  const requestOrigin = req.headers.get("origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes("*") 
      ? "*" 
      : (ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // 🔐 Security: Validate JWT and extract user from token
    const authHeader = req.headers.get("Authorization") ?? "";
    const authToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token } = await req.json();

    // Get invite
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*")
      .eq("token", token)
      .eq("system_module", "contabilidad")
      .is("accepted_at", null)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invitación no válida o ya utilizada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "La invitación ha expirado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔐 Security: Validate email match if invite has email
    if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "El email de la invitación no coincide con tu cuenta" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create membership using authenticated user ID
    const { error: membershipError } = await supabase.from("memberships").insert({
      user_id: user.id,
      organization_id: invite.organization_id,
      role: invite.accounting_role,
      restaurant_id: invite.restaurant_id,
      active: true,
      created_by: invite.invited_by,
    });

    if (membershipError) {
      throw membershipError;
    }

    // Mark invite as accepted
    await supabase
      .from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({ success: true, message: "Invitación aceptada correctamente" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
