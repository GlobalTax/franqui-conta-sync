import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Authenticate caller via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify user is admin via user_roles
    const { data: hasAdminRole } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!hasAdminRole) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, franchisee_id, centro } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Email y rol son obligatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete any existing pending invites for this email
    await adminClient
      .from("invites")
      .delete()
      .eq("email", email.toLowerCase())
      .is("accepted_at", null);

    // Generate unique token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invite
    const { error: inviteError } = await adminClient
      .from("invites")
      .insert({
        email: email.toLowerCase(),
        token: inviteToken,
        role,
        franchisee_id: franchisee_id || null,
        centro: centro || null,
        invited_by: userId,
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) throw inviteError;

    // Send email (if RESEND_API_KEY is configured)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://franqui-conta-sync.lovable.app";
      const inviteLink = `${appUrl}/accept-invite?token=${inviteToken}`;

      const roleLabels: Record<string, string> = {
        admin: "Asesoría (Admin)",
        gestor: "Gestor",
        franquiciado: "Franquiciado",
        empleado: "Empleado",
      };

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "FranquiContaSync <noreply@franquicontasync.com>",
          to: email,
          subject: "Invitación a FranquiContaSync",
          html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #0F172A; margin-bottom: 16px;">Has sido invitado a FranquiContaSync</h2>
              <p style="color: #475569;">Se te ha asignado el rol de: <strong>${roleLabels[role] || role}</strong></p>
              <div style="margin: 32px 0;">
                <a href="${inviteLink}" style="background-color: #1D4ED8; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; display: inline-block;">
                  Aceptar Invitación
                </a>
              </div>
              <p style="color: #94A3B8; font-size: 14px;">Esta invitación expira en 7 días.</p>
            </div>
          `,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invitación enviada correctamente" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
