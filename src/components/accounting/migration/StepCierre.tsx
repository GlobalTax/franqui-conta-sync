import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MigrationState } from "@/hooks/useHistoricalMigration";
import { ErrorExportDialog, type ValidationError } from "./ErrorExportDialog";
import { AdvancedValidationsPanel } from "./AdvancedValidationsPanel";
import { useAdvancedValidations } from "@/hooks/useAdvancedValidations";

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
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Advanced validations
  const { data: advancedValidations } = useAdvancedValidations(
    state.fiscalYear.fiscalYearId || '',
    state.fiscalYear.centroCode
  );

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
      setValidationErrors([...(data.errors || []), ...(data.warnings || [])]);
      
      if (data.errors && data.errors.length > 0) {
        toast.error(`❌ ${data.errors.length} errores encontrados`);
        setShowErrorDialog(true);
      } else if (data.warnings && data.warnings.length > 0) {
        toast.warning(`⚠️ ${data.warnings.length} advertencias`);
        setShowErrorDialog(true);
      } else {
        toast.success("✅ Validación exitosa - No hay errores");
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error("Error al validar");
      setValidationResult({ valid: false, errors: [], warnings: [] });
      setValidationErrors([{
        error_type: 'missing_data',
        severity: 'error',
        entity_type: 'journal_entry',
        message: error.message,
        suggestion: 'Contactar soporte técnico',
      }]);
      setShowErrorDialog(true);
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
        setShowConfirmDialog(false);
        onComplete(closedAt);
        
        toast.success("✅ Ejercicio cerrado exitosamente", {
          description: (
            <div className="space-y-1 text-sm mt-2">
              <p>📅 Ejercicio: {state.fiscalYear.year}</p>
              <p>📊 Asientos de cierre creados</p>
              <p>🔒 {data.periods_closed?.monthly || 0} cierres mensuales + 1 cierre anual</p>
              {data.result_amount !== undefined && (
                <p className="mt-2 font-semibold">
                  Resultado final: {data.result_amount.toFixed(2)} €
                </p>
              )}
            </div>
          ),
          duration: 8000,
        });
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

        {validationErrors.length > 0 && (
          <Button 
            variant="outline" 
            onClick={() => setShowErrorDialog(true)}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Ver detalles ({validationErrors.length})
          </Button>
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
            onClick={() => setShowConfirmDialog(true)}
            disabled={closing || !validationResult?.valid || !advancedValidations?.overallValid}
            variant="destructive"
          >
            {closing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!advancedValidations?.overallValid && <Lock className="h-4 w-4 mr-2" />}
            {advancedValidations?.overallValid ? '🔒 Cerrar Ejercicio Definitivamente' : '🔒 Bloqueado'}
          </Button>
        </div>

        <ErrorExportDialog
          open={showErrorDialog}
          onOpenChange={setShowErrorDialog}
          errors={validationErrors.filter(e => e.severity === 'error')}
          warnings={validationErrors.filter(e => e.severity === 'warning')}
        />

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-6 w-6 text-warning" />
                ¿Cerrar ejercicio {state.fiscalYear.year}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Esta acción creará los asientos de regularización y cierre, marcando el ejercicio como <strong>cerrado definitivamente</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Periodo Fiscal</h4>
                  <p className="text-lg font-bold">{state.fiscalYear.year}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(state.fiscalYear.startDate).toLocaleDateString('es-ES')} - {new Date(state.fiscalYear.endDate).toLocaleDateString('es-ES')}
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Centro</h4>
                  <p className="text-lg font-bold">{state.fiscalYear.centroCode}</p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm mb-3">📊 Datos que se cerrarán:</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Asiento de apertura</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="font-semibold">{state.diario.entriesCount} asientos contables</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>{state.iva.emitidas.count} facturas emitidas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>{state.iva.recibidas.count} facturas recibidas</span>
                  </div>
                  {!state.bancos.skipped && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>{state.bancos.movements} movimientos bancarios</span>
                    </div>
                  )}
                  {state.diario.totalDebit && (
                    <div className="col-span-2 mt-2 pt-2 border-t border-border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Debe total:</span>
                        <span className="font-bold">{state.diario.totalDebit.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Haber total:</span>
                        <span className="font-bold">{state.diario.totalCredit?.toFixed(2)} €</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>⚠️ Acción irreversible</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Una vez cerrado el ejercicio:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                    <li>Se crearán <strong>asientos de regularización</strong> (grupos 6, 7 → 129)</li>
                    <li>Se creará el <strong>asiento de cierre</strong> (grupos 1-5 → cuentas 13X)</li>
                    <li><strong>No podrás modificar</strong> asientos del ejercicio {state.fiscalYear.year}</li>
                    <li>Solo podrás deshacerlo mediante <strong>rollback completo</strong> de la migración</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={closing}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleClose}
                disabled={closing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {closing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                🔒 Confirmar Cierre Definitivo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
