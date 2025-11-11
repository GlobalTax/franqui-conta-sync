import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, RefreshCw, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { usePontoSync } from "@/hooks/usePontoSync";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { PontoConnection } from "@/hooks/usePontoConnections";

interface PontoConnectionCardProps {
  connection: PontoConnection;
  onDelete: (id: string) => void;
}

export function PontoConnectionCard({ connection, onDelete }: PontoConnectionCardProps) {
  const { mutate: syncConnection, isPending: isSyncing } = usePontoSync();

  const handleSync = () => {
    syncConnection({
      connection_id: connection.id,
      sync_accounts: true,
      sync_transactions: true,
      sync_balances: true,
      transaction_days: 90,
    });
  };

  const isTokenExpired = new Date(connection.token_expires_at) < new Date();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-base">
                {connection.institution_name || connection.institution_id}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {connection.centro_code}
              </p>
            </div>
          </div>
          <Badge variant={isTokenExpired ? "destructive" : "success"}>
            {isTokenExpired ? (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Token expirado
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Activo
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Conectado:</span>
            <span className="ml-2 font-medium">
              {format(new Date(connection.created_at), "dd MMM yyyy HH:mm", { locale: es })}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Token expira:</span>
            <span className="ml-2 font-medium">
              {format(new Date(connection.token_expires_at), "dd MMM yyyy HH:mm", { locale: es })}
            </span>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSync}
              disabled={isSyncing || isTokenExpired}
              className="flex-1"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(connection.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
