import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle } from "lucide-react";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"validating" | "valid" | "invalid">("validating");
  const [inviteData, setInviteData] = useState<any>(null);

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("invalid");
        return;
      }

      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .eq("token", token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) {
        setStatus("invalid");
      } else {
        setInviteData(data);
        setStatus("valid");
      }
    };

    validateToken();
  }, [searchParams]);

  const handleAccept = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Debes iniciar sesión",
          description: "Inicia sesión para aceptar la invitación",
        });
        navigate("/login");
        return;
      }

      // Mark invite as accepted
      await supabase
        .from("invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", inviteData.id);

      // Add role to user
      await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: inviteData.role,
          centro: inviteData.centro,
          franchisee_id: inviteData.franchisee_id
        });

      toast({
        title: "Invitación aceptada",
        description: "Se ha asignado tu nuevo rol correctamente",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
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
            Esta invitación ha expirado o no es válida
          </p>
          <Button onClick={() => navigate("/login")}>
            Ir al Login
          </Button>
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
          Has sido invitado a unirte como <strong>{inviteData.role}</strong>
        </p>
        <div className="space-y-3">
          <Button onClick={handleAccept} className="w-full">
            Aceptar Invitación
          </Button>
          <Button variant="outline" onClick={() => navigate("/login")} className="w-full">
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AcceptInvite;
