// ============================================================================
// COMPONENT: BulkPostDialog
// Diálogo para contabilizar múltiples facturas en lote
// ============================================================================

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: any[];
  onConfirm: (postingDate: Date) => void;
  isLoading?: boolean;
  progress?: { current: number; total: number };
}

export function BulkPostDialog({
  open,
  onOpenChange,
  invoices,
  onConfirm,
  isLoading = false,
  progress,
}: BulkPostDialogProps) {
  const [postingDate, setPostingDate] = useState<Date>(new Date());
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    issues: string[];
  }>({ valid: true, issues: [] });

  useEffect(() => {
    // Validate invoices
    const issues: string[] = [];

    for (const inv of invoices) {
      if (inv.approval_status !== 'approved_accounting') {
        issues.push(`${inv.invoice_number} no está aprobada contablemente`);
      }
      if (!inv.centro_code) {
        issues.push(`${inv.invoice_number} no tiene centro asignado`);
      }
      if (inv.entry_id) {
        issues.push(`${inv.invoice_number} ya está contabilizada`);
      }
    }

    setValidationResult({
      valid: issues.length === 0,
      issues: issues.slice(0, 5), // Show max 5 issues
    });
  }, [invoices]);

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const readyCount = invoices.filter(
    inv => inv.approval_status === 'approved_accounting' && inv.centro_code && !inv.entry_id
  ).length;

  const handleConfirm = () => {
    if (!validationResult.valid) return;
    onConfirm(postingDate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Contabilizar en Lote</DialogTitle>
          <DialogDescription>
            {invoices.length} factura{invoices.length > 1 ? 's' : ''} seleccionada{invoices.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validation Status */}
          {validationResult.valid ? (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                <div className="space-y-1 text-sm">
                  <p>✓ {readyCount} factura{readyCount > 1 ? 's' : ''} lista{readyCount > 1 ? 's' : ''} para contabilizar</p>
                  <p>✓ Todas aprobadas contablemente</p>
                  <p>✓ Todas tienen centro asignado</p>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">No se puede contabilizar:</p>
                <ul className="text-sm space-y-1 ml-4">
                  {validationResult.issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                  {invoices.length - validationResult.issues.length > 0 && (
                    <li>... y {invoices.length - validationResult.issues.length} más</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Posting Date */}
          {validationResult.valid && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de contabilización</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !postingDate && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {postingDate ? format(postingDate, "PPP", { locale: es }) : "Selecciona fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={postingDate}
                      onSelect={(date) => date && setPostingDate(date)}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Summary */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total a contabilizar:</span>
                  <span className="font-semibold">{totalAmount.toFixed(2)}€</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Periodo:</span>
                  <span>{format(postingDate, 'MMMM yyyy', { locale: es })}</span>
                </div>
              </div>
            </>
          )}

          {/* Progress Bar */}
          {isLoading && progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Contabilizando...</span>
                <span className="font-medium">{progress.current}/{progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          )}

          {!validationResult.valid && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Corrige los problemas de validación antes de contabilizar. Puedes deseleccionar las facturas con errores.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validationResult.valid || isLoading}
          >
            {isLoading ? 'Contabilizando...' : 'Contabilizar Todas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
