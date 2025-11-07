import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, organizationId, restaurantId } = await req.json();

    // Validate that sender has admin role
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .eq("role", "admin")
      .eq("active", true)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Solo administradores pueden enviar invitaciones" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create invite
    const { error: inviteError } = await supabase.from("invites").insert({
      email,
      role,
      organization_id: organizationId,
      restaurant_id: restaurantId,
      system_module: "contabilidad",
      accounting_role: role,
      token,
      expires_at: expiresAt.toISOString(),
      invited_by: user.id,
    });

    if (inviteError) {
      throw inviteError;
    }

    // Send email (using Resend)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
      const inviteUrl = `${appUrl}/accept-accounting-invite?token=${token}`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Contabilidad <noreply@lovable.app>",
          to: email,
          subject: "Invitación al sistema de contabilidad",
          html: `
            <h2>Has sido invitado al sistema de contabilidad</h2>
            <p>Rol: ${role}</p>
            <p>Haz clic en el siguiente enlace para aceptar la invitación:</p>
            <a href="${inviteUrl}">${inviteUrl}</a>
            <p>Esta invitación expirará en 7 días.</p>
          `,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invitación enviada correctamente" }),
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
