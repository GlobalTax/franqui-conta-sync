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
 * Diálogo para re-procesar OCR
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
        invoiceId: invoice.id,
        engine: 'openai'
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
            Reprocesar la factura con OpenAI. El resultado anterior se sobrescribirá.
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

          {/* Información sobre OpenAI */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>OpenAI Vision OCR</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Modelo avanzado de visión por computadora</li>
                <li>Alta precisión en documentos complejos</li>
                <li>Capacidad de razonamiento contextual</li>
                <li>Ideal para facturas de cualquier formato</li>
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
