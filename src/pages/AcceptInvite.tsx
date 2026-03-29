import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"validating" | "valid" | "invalid" | "email_mismatch" | "accepting">("validating");
  const [inviteData, setInviteData] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("invalid");
        return;
      }

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to login with return URL
        const returnUrl = `/accept-invite?token=${token}`;
        navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
        return;
      }

      setUserEmail(user.email || null);

      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .eq("token", token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) {
        setStatus("invalid");
        return;
      }

      // Validate email match
      if (data.email && user.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
        setInviteData(data);
        setStatus("email_mismatch");
        return;
      }

      setInviteData(data);
      setStatus("valid");
    };

    validateToken();
  }, [searchParams, navigate]);

  const handleAccept = async () => {
    setStatus("accepting");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", inviteData.role)
        .maybeSingle();

      if (existingRole) {
        // Update existing role with new franchisee/centro if needed
        if (inviteData.franchisee_id || inviteData.centro) {
          await supabase
            .from("user_roles")
            .update({
              franchisee_id: inviteData.franchisee_id || null,
              centro: inviteData.centro || null,
            })
            .eq("id", existingRole.id);
        }
      } else {
        // Insert new role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: user.id,
            role: inviteData.role,
            centro: inviteData.centro || null,
            franchisee_id: inviteData.franchisee_id || null,
          });

        if (roleError) throw roleError;
      }

      // Mark invite as accepted
      await supabase
        .from("invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", inviteData.id);

      toast({
        title: "Invitación aceptada",
        description: "Se ha asignado tu nuevo rol correctamente",
      });

      navigate("/");
    } catch (error: unknown) {
      setStatus("valid");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    gestor: "Gestor",
    franquiciado: "Franquiciado",
    asesoria: "Asesoría",
  };

  if (status === "validating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Validando invitación...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="p-8 max-w-md text-center">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Invitación Inválida</h2>
          <p className="text-muted-foreground mb-6">
            Esta invitación ha expirado o ya ha sido utilizada.
          </p>
          <Button onClick={() => navigate("/")}>
            Ir al Inicio
          </Button>
        </Card>
      </div>
    );
  }

  if (status === "email_mismatch") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="p-8 max-w-md text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Email no coincide</h2>
          <p className="text-muted-foreground mb-2">
            Esta invitación fue enviada a <strong>{inviteData?.email}</strong>
          </p>
          <p className="text-muted-foreground mb-6">
            Estás conectado como <strong>{userEmail}</strong>
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Inicia sesión con la cuenta correcta para aceptar la invitación.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={async () => {
                await supabase.auth.signOut();
                const token = searchParams.get("token");
                navigate(`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
              }} 
              className="w-full"
            >
              Cambiar de cuenta
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Cancelar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="p-8 max-w-md text-center">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Invitación Válida</h2>
        <p className="text-muted-foreground mb-6">
          Has sido invitado como <strong>{roleLabels[inviteData?.role] || inviteData?.role}</strong>
        </p>
        <div className="space-y-3">
          <Button 
            onClick={handleAccept} 
            className="w-full" 
            disabled={status === "accepting"}
          >
            {status === "accepting" ? "Aceptando..." : "Aceptar Invitación"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AcceptInvite;
