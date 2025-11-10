// ============================================================================
// COMPONENT: Stripper Changes Dialog
// Muestra detalle de cambios realizados por el normalizador
// ============================================================================

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertTriangle } from 'lucide-react';
import type { NormalizationChange } from '@/lib/fiscal-normalizer';

interface StripperChangesDialogProps {
  changes: NormalizationChange[];
  warnings: string[];
}

export function StripperChangesDialog({ changes, warnings }: StripperChangesDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
          <FileText className="h-3 w-3" />
          Ver cambios ({changes.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cambios de Normalización</DialogTitle>
          <DialogDescription>
            Detalle de las modificaciones aplicadas por el Stripper
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Cambios */}
            {changes.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Cambios Aplicados</h4>
                {changes.map((change, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{formatFieldName(change.field)}</span>
                      <Badge variant="outline" className="text-xs">
                        {change.rule}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Antes:</span>
                        <div className="font-mono bg-muted px-2 py-1 rounded mt-1 break-all">
                          {String(change.before) || '—'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Después:</span>
                        <div className="font-mono bg-green-50 px-2 py-1 rounded mt-1 break-all text-green-800">
                          {String(change.after) || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Advertencias */}
            {warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Advertencias
                </h4>
                {warnings.map((warning, idx) => (
                  <Alert key={idx} variant="destructive" className="bg-yellow-50 border-yellow-200">
                    <AlertDescription className="text-yellow-800 text-sm">
                      {warning}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {changes.length === 0 && warnings.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No hay cambios registrados
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function formatFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    supplier_tax_id: 'NIF/CIF Proveedor',
    supplier_name: 'Razón Social',
    invoice_number: 'Nº Factura',
    issue_date: 'Fecha Emisión',
    due_date: 'Fecha Vencimiento',
    subtotal: 'Subtotal',
    tax_total: 'Total IVA',
    total: 'Total',
    currency: 'Moneda',
    centro_code: 'Centro'
  };

  return fieldNames[field] || field;
}
