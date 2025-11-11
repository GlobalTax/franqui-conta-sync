import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2 } from "lucide-react";
import { usePontoInstitutions } from "@/hooks/usePontoInstitutions";
import { supabase } from "@/integrations/supabase/client";

interface PontoBankSelectorProps {
  centroCode: string;
  onConnectionStart?: () => void;
}

export function PontoBankSelector({ centroCode, onConnectionStart }: PontoBankSelectorProps) {
  const { data: institutions, isLoading } = usePontoInstitutions("BE");

  const handleConnect = async (institutionId: string) => {
    try {
      onConnectionStart?.();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Build OAuth URL
      const clientId = "YOUR_PONTO_CLIENT_ID"; // TODO: Get from env or config
      const redirectUri = `${window.location.origin}/functions/v1/ponto-oauth-callback`;
      const state = `${centroCode}:${institutionId}:${user.id}`;
      
      const authUrl = new URL("https://api.ponto.com/oauth2/auth");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", "ai pi name offline_access");
      authUrl.searchParams.set("state", state);

      // Redirect to Ponto OAuth
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar banco con Ponto</CardTitle>
        <CardDescription>
          Selecciona tu banco para conectarlo mediante Ponto (PSD2)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions?.map((institution) => (
            <Card key={institution.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {institution.attributes.logoUrl ? (
                    <img
                      src={institution.attributes.logoUrl}
                      alt={institution.attributes.name}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <Building2 className="w-10 h-10 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {institution.attributes.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {institution.attributes.bic}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {institution.attributes.country}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => handleConnect(institution.id)}
                    disabled={institution.attributes.status !== "active"}
                  >
                    Conectar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {institutions?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay bancos disponibles en este momento
          </div>
        )}
      </CardContent>
    </Card>
  );
}
