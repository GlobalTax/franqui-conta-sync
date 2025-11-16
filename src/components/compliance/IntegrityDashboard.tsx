// ============================================================================
// COMPONENT: Integrity Dashboard
// Panel de estado de integridad de la cadena de hashes
// ============================================================================

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useView } from '@/contexts/ViewContext';
import { useValidateEntryChain } from '@/hooks/useEntryIntegrity';
import { Shield, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function IntegrityDashboard() {
  const { selectedView } = useView();
  const [fiscalYearId, setFiscalYearId] = useState<string>('');
  
  const { data: validationResult, refetch, isFetching } = useValidateEntryChain(
    selectedView?.type === 'centre' ? selectedView.id : undefined,
    fiscalYearId || undefined
  );

  const handleValidate = () => {
    if (!selectedView) {
      toast.error('Selecciona un centro para validar');
      return;
    }
    if (!fiscalYearId) {
      toast.error('Selecciona un ejercicio fiscal');
      return;
    }
    refetch();
  };

  const getStatusIcon = () => {
    if (!validationResult) return <Shield className="h-5 w-5 text-muted-foreground" />;
    if (validationResult.is_valid) return <CheckCircle2 className="h-5 w-5 text-success" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getStatusBadge = () => {
    if (!validationResult) {
      return <Badge variant="secondary">No validado</Badge>;
    }
    if (validationResult.is_valid) {
      return <Badge className="bg-success text-success-foreground">Válida</Badge>;
    }
    return <Badge variant="destructive">Rota</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle>Integridad de la Cadena</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Validación de cadena de hashes según RD 1007/2023
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationResult ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total de asientos</p>
                <p className="text-2xl font-semibold">{validationResult.total_entries}</p>
              </div>
              {!validationResult.is_valid && (
                <div>
                  <p className="text-muted-foreground">Ruptura en asiento</p>
                  <p className="text-2xl font-semibold text-destructive">
                    #{validationResult.broken_at}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-1">Estado</p>
              <p className="text-sm text-muted-foreground">{validationResult.message}</p>
            </div>

            {!validationResult.is_valid && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive mb-1">Acción requerida</p>
                  <p className="text-muted-foreground">
                    La cadena de integridad está comprometida. Contacta con soporte técnico
                    y conserva el log de auditoría.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Ejecuta una validación para verificar la integridad de la cadena
            </p>
          </div>
        )}

        <Button
          onClick={handleValidate}
          disabled={isFetching || !selectedView}
          className="w-full"
        >
          {isFetching ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Validando...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Validar Cadena
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
