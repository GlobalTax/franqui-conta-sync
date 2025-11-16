import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';
import { useOrganization } from '@/hooks/useOrganization';
import type { InvoiceReceived } from '@/domain/invoicing/types';

interface ReprocessOCRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceReceived;
  onComplete?: () => void;
}

/**
 * Diálogo para re-procesar OCR con Mindee
 */
export function ReprocessOCRDialog({
  open,
  onOpenChange,
  invoice,
  onComplete
}: ReprocessOCRDialogProps) {
  const { currentMembership } = useOrganization();
  const actions = useInvoiceActions();

  const handleReprocess = async () => {
    if (!currentMembership?.user_id) return;

    try {
      await actions.reprocessOCR({
        invoiceId: invoice.id
      });
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      console.error('Reprocess error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
          <DialogTitle>Re-procesar OCR</DialogTitle>
          <DialogDescription>
            Reprocesar la factura con Mindee. El resultado anterior se sobrescribirá.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información actual */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Motor actual:</strong> {invoice.ocrEngine || 'Desconocido'}
              <br />
              <strong>Confianza actual:</strong> {invoice.ocrConfidence ? `${Math.round(invoice.ocrConfidence * 100)}%` : 'N/A'}
            </AlertDescription>
          </Alert>

          {/* Información sobre Mindee */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Mindee Invoice API</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Especializado en facturas europeas</li>
                <li>Mayor precisión en NIFs, fechas e importes</li>
                <li>Datos procesados en UE (GDPR)</li>
                <li>Ideal para facturas estructuradas</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleReprocess} disabled={actions.isReprocessing}>
            {actions.isReprocessing ? 'Procesando...' : 'Re-procesar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
