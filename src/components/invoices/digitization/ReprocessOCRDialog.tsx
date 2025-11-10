import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Zap, Globe } from 'lucide-react';
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
 * Diálogo para re-procesar OCR con motor seleccionado
 * Permite elegir entre OpenAI (rápido) o Mindee (preciso, EU)
 */
export function ReprocessOCRDialog({
  open,
  onOpenChange,
  invoice,
  onComplete
}: ReprocessOCRDialogProps) {
  const { currentMembership } = useOrganization();
  const actions = useInvoiceActions();
  const [selectedEngine, setSelectedEngine] = useState<'openai' | 'mindee'>('openai');

  const handleReprocess = async () => {
    if (!currentMembership?.user_id) return;

    try {
      await actions.reprocessOCR({
        invoiceId: invoice.id,
        engine: selectedEngine
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
            Selecciona el motor OCR para reprocesar la factura. El resultado anterior se sobrescribirá.
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

          {/* Selector de motor */}
          <div className="space-y-3">
            <Label>Selecciona motor OCR:</Label>
            <RadioGroup value={selectedEngine} onValueChange={(v) => setSelectedEngine(v as 'openai' | 'mindee')}>
              {/* OpenAI */}
              <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent" 
                   onClick={() => setSelectedEngine('openai')}>
                <RadioGroupItem value="openai" id="openai" />
                <div className="flex-1">
                  <Label htmlFor="openai" className="cursor-pointer font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    OpenAI Vision (GPT-4o-mini)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Rápido y eficiente. Ideal para facturas con formato claro. 
                    <br />
                    <span className="text-xs">~€0.08/factura · 2-4 seg</span>
                  </p>
                </div>
              </div>

              {/* Mindee */}
              <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent"
                   onClick={() => setSelectedEngine('mindee')}>
                <RadioGroupItem value="mindee" id="mindee" />
                <div className="flex-1">
                  <Label htmlFor="mindee" className="cursor-pointer font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    Mindee (EU)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Especializado en facturas europeas. Mayor precisión en NIFs y campos estructurados.
                    <br />
                    <span className="text-xs">~€0.02/página · Servidor EU</span>
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Recomendación */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>¿Cuándo usar cada motor?</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>OpenAI:</strong> Facturas con baja confianza, imágenes de mala calidad, o OCR fallido</li>
                <li><strong>Mindee:</strong> Errores en NIF, fechas o importes; facturas muy estructuradas</li>
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
