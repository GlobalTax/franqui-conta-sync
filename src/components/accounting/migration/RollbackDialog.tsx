import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Loader2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface MigrationRun {
  id: string;
  centro_code: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  entries_created: string[];
  iva_staging_runs: string[];
  bank_transactions_created: string[];
  closing_periods_created: string[];
}

interface RollbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  migrationRun: MigrationRun | null;
}

export function RollbackDialog({ open, onOpenChange, migrationRun }: RollbackDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const handleRollback = async () => {
    if (!migrationRun) return;
    if (confirmText !== "ELIMINAR") {
      toast.error("Debes escribir 'ELIMINAR' para confirmar");
      return;
    }
    if (!reason.trim()) {
      toast.error("Debes proporcionar una razón para el rollback");
      return;
    }
    if (!understood) {
      toast.error("Debes confirmar que entiendes las consecuencias");
      return;
    }

    setRolling(true);
    setProgress(10);

    try {
      setProgress(30);

      const { data, error } = await supabase.functions.invoke('rollback-migration', {
        body: {
          migrationRunId: migrationRun.id,
          reason: reason,
        },
      });

      setProgress(90);

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al deshacer migración');
      }

      setProgress(100);
      setResult(data);

      toast.success(
        `✅ Migración deshecha correctamente\n` +
        `${data.summary.entries_deleted} asientos eliminados\n` +
        `${data.summary.iva_runs_deleted} importaciones IVA eliminadas`
      );

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['migration-runs'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });

      // Cerrar después de 3 segundos
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (error: any) {
      console.error('Error en rollback:', error);
      toast.error(`Error: ${error.message}`);
      setResult({ success: false, error: error.message });
    } finally {
      setRolling(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setReason("");
    setUnderstood(false);
    setProgress(0);
    setResult(null);
    onOpenChange(false);
  };

  if (!migrationRun) return null;

  const totalItems = 
    (migrationRun.entries_created?.length || 0) +
    (migrationRun.iva_staging_runs?.length || 0) +
    (migrationRun.bank_transactions_created?.length || 0) +
    (migrationRun.closing_periods_created?.length || 0);

  // Si ya hay resultado, mostrar resumen
  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              Resultado del Rollback
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {result.success ? (
              <Alert className="border-success bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertTitle>Migración deshecha correctamente</AlertTitle>
                <AlertDescription>
                  Todos los datos de la migración han sido eliminados del sistema.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error al deshacer migración</AlertTitle>
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            )}

            {result.summary && (
              <div className="space-y-2 border rounded-lg p-4">
                <h4 className="font-semibold text-sm">Datos eliminados:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• {result.summary.entries_deleted} asientos contables</li>
                  <li>• {result.summary.iva_runs_deleted} importaciones de IVA</li>
                  <li>• {result.summary.bank_transactions_deleted} movimientos bancarios</li>
                  <li>• {result.summary.closing_periods_deleted} períodos de cierre</li>
                </ul>
              </div>
            )}

            <Button onClick={handleClose} className="w-full">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Deshacer Migración de Ejercicio {migrationRun.fiscal_year}
          </DialogTitle>
          <DialogDescription>
            Esta acción eliminará TODOS los datos importados de este ejercicio fiscal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Advertencia crítica */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Se eliminarán permanentemente:</p>
              <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                <li>{migrationRun.entries_created?.length || 0} asientos contables</li>
                <li>{migrationRun.iva_staging_runs?.length || 0} importaciones de IVA</li>
                <li>{migrationRun.bank_transactions_created?.length || 0} movimientos bancarios</li>
                <li>{migrationRun.closing_periods_created?.length || 0} períodos de cierre</li>
              </ul>
              <p className="font-semibold mt-3">
                Total: {totalItems} registros serán eliminados
              </p>
            </AlertDescription>
          </Alert>

          {/* Resumen de migración */}
          <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
            <h4 className="font-semibold text-sm">Detalles de la migración:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Ejercicio:</span>
                <span className="ml-2 font-mono">{migrationRun.fiscal_year}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Centro:</span>
                <span className="ml-2 font-mono">{migrationRun.centro_code}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Período:</span>
                <span className="ml-2 text-xs">
                  {new Date(migrationRun.start_date).toLocaleDateString('es-ES')} - 
                  {new Date(migrationRun.end_date).toLocaleDateString('es-ES')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Iniciada:</span>
                <span className="ml-2 text-xs">
                  {new Date(migrationRun.started_at).toLocaleDateString('es-ES')}
                </span>
              </div>
            </div>
          </div>

          {/* Razón obligatoria */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Razón del rollback <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ej: Detectados errores en datos de apertura, necesito reimportar..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={rolling}
            />
          </div>

          {/* Confirmación de texto */}
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Escribe <strong>ELIMINAR</strong> para confirmar <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirm"
              placeholder="ELIMINAR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={rolling}
              className={confirmText === "ELIMINAR" ? "border-destructive" : ""}
            />
          </div>

          {/* Checkbox de comprensión */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="understood"
              checked={understood}
              onCheckedChange={(checked) => setUnderstood(checked as boolean)}
              disabled={rolling}
            />
            <label
              htmlFor="understood"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Entiendo que esta acción eliminará todos los datos importados y no se puede deshacer
            </label>
          </div>

          {/* Progress bar (solo visible cuando está en proceso) */}
          {rolling && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Eliminando datos...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={rolling}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRollback}
              disabled={
                rolling ||
                confirmText !== "ELIMINAR" ||
                !reason.trim() ||
                !understood
              }
              className="flex-1"
            >
              {rolling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Migración
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
