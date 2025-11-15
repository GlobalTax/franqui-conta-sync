import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MigrationState } from "@/hooks/useHistoricalMigration";

interface StepCierreProps {
  state: MigrationState;
  onComplete: (closedAt: string) => void;
  onPrev: () => void;
  onReset: () => void;
}

export function StepCierre({ state, onComplete, onPrev, onReset }: StepCierreProps) {
  const [closing, setClosing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const handleValidate = async () => {
    setValidating(true);
    try {
      // Call validation edge function
      const { data, error } = await supabase.functions.invoke('validate-migration', {
        body: {
          centroCode: state.fiscalYear.centroCode,
          fiscalYear: state.fiscalYear.year,
          startDate: state.fiscalYear.startDate,
          endDate: state.fiscalYear.endDate,
        },
      });

      if (error) throw error;

      setValidationResult(data);
      
      if (data.valid) {
        toast.success("✅ Validación exitosa");
      } else {
        toast.warning("⚠️ Se encontraron advertencias");
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error("Error al validar");
      setValidationResult({ valid: false, errors: [error.message] });
    } finally {
      setValidating(false);
    }
  };

  const handleClose = async () => {
    if (!state.fiscalYear.fiscalYearId) {
      toast.error("No se encontró el ejercicio fiscal");
      return;
    }

    setClosing(true);
    try {
      // Call close-fiscal-year edge function
      const { data, error } = await supabase.functions.invoke('close-fiscal-year', {
        body: {
          centroCode: state.fiscalYear.centroCode,
          fiscalYearId: state.fiscalYear.fiscalYearId,
          closingDate: state.fiscalYear.endDate,
        },
      });

      if (error) throw error;

      if (data.success) {
        const closedAt = new Date().toISOString();
        onComplete(closedAt);
        
        toast.success(
          `✅ Ejercicio ${state.fiscalYear.year} cerrado exitosamente\n${data.message}`,
          { duration: 5000 }
        );
      } else {
        throw new Error(data.error || 'Error al cerrar el ejercicio');
      }
    } catch (error: any) {
      console.error('Closing error:', error);
      toast.error(error.message || "Error al cerrar el ejercicio");
    } finally {
      setClosing(false);
    }
  };

  if (state.cierre.completed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            ¡Migración Completada!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Ejercicio {state.fiscalYear.year} cerrado</AlertTitle>
            <AlertDescription>
              El ejercicio histórico ha sido importado y cerrado exitosamente.
            </AlertDescription>
          </Alert>

          <div className="bg-muted rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">Resumen de la migración:</h4>
            <ul className="space-y-1 text-sm">
              <li>✅ Asiento de apertura: {state.apertura.entryId}</li>
              <li>✅ Asientos contables: {state.diario.entriesCount}</li>
              <li>✅ Facturas emitidas: {state.iva.emitidas.count}</li>
              <li>✅ Facturas recibidas: {state.iva.recibidas.count}</li>
              <li>✅ Movimientos bancarios: {state.bancos.skipped ? 'Omitido' : state.bancos.movements}</li>
              <li>✅ Ejercicio cerrado: {new Date(state.cierre.closedAt!).toLocaleString('es-ES')}</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={onReset}>Nueva Migración</Button>
            <Button variant="outline" onClick={() => window.location.href = '/contabilidad/dashboard'}>
              Ir al Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 6: Cierre del Ejercicio</CardTitle>
        <CardDescription>
          Revisa el resumen y cierra el ejercicio {state.fiscalYear.year}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm">Resumen de la migración:</h4>
          <ul className="space-y-1 text-sm">
            <li>✅ Asiento de apertura: {state.apertura.completed ? state.apertura.entryId : 'Pendiente'}</li>
            <li>✅ Asientos contables: {state.diario.entriesCount}</li>
            <li>✅ Facturas emitidas: {state.iva.emitidas.count}</li>
            <li>✅ Facturas recibidas: {state.iva.recibidas.count}</li>
            <li>✅ Movimientos bancarios: {state.bancos.skipped ? 'Omitido' : `${state.bancos.movements} movimientos`}</li>
          </ul>
        </div>

        {!validationResult && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Se recomienda validar el ejercicio antes de cerrarlo. La validación verificará:
              <ul className="list-disc pl-5 mt-2 text-sm">
                <li>Asientos cuadrados (Debe = Haber)</li>
                <li>Cuentas válidas en el plan contable</li>
                <li>Fechas dentro del ejercicio fiscal</li>
                <li>Coherencia de sumas y saldos</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validationResult && !validationResult.valid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Advertencias detectadas</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-2 text-sm">
                {validationResult.errors?.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validationResult && validationResult.valid && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Validación exitosa</AlertTitle>
            <AlertDescription>
              El ejercicio está listo para ser cerrado.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onPrev}>← Atrás</Button>
          <Button 
            variant="outline" 
            onClick={handleValidate} 
            disabled={validating}
          >
            {validating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Validar Ejercicio
          </Button>
          <Button 
            onClick={handleClose} 
            disabled={closing || !validationResult?.valid}
          >
            {closing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Cerrar Ejercicio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
