import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock } from "lucide-react";

interface ExpirationAlertsProps {
  expiringCount: number;
}

export function SaltEdgeExpirationAlerts({ expiringCount }: ExpirationAlertsProps) {
  if (expiringCount === 0) return null;

  return (
    <Alert variant="destructive">
      <Clock className="h-4 w-4" />
      <AlertDescription>
        <span className="font-semibold">{expiringCount} conexión(es)</span> expiran en los próximos 30 días.
        Renueva el consentimiento para continuar sincronizando.
      </AlertDescription>
    </Alert>
  );
}
