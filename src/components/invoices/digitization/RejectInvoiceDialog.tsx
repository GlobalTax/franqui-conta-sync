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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';
import { useOrganization } from '@/hooks/useOrganization';
import type { InvoiceReceived } from '@/domain/invoicing/types';

interface RejectInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceReceived;
  onComplete?: () => void;
}

const REJECT_REASONS = [
  { value: 'duplicate', label: 'Duplicado' },
  { value: 'not_invoice', label: 'No es una factura válida' },
  { value: 'illegible', label: 'Documento ilegible' },
  { value: 'wrong_company', label: 'Factura de otra empresa' },
  { value: 'test_document', label: 'Documento de prueba' },
  { value: 'other', label: 'Otro motivo' }
];

/**
 * Diálogo para rechazar facturas con motivo obligatorio
 * Permite seleccionar motivo predefinido + comentarios adicionales
 */
export function RejectInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onComplete
}: RejectInvoiceDialogProps) {
  const { currentMembership } = useOrganization();
  const actions = useInvoiceActions();
  
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalComments, setAdditionalComments] = useState('');

  const handleReject = async () => {
    if (!currentMembership?.user_id || !selectedReason) return;

    const reason = REJECT_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
    const fullReason = additionalComments 
      ? `${reason}: ${additionalComments}` 
      : reason;

    try {
      await actions.reject({
        invoiceId: invoice.id,
        userId: currentMembership.user_id,
        reason: fullReason
      });
      
      // Reset form
      setSelectedReason('');
      setAdditionalComments('');
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      console.error('Reject error:', error);
    }
  };

  const isValid = selectedReason !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rechazar Factura</DialogTitle>
          <DialogDescription>
            Indica el motivo por el cual esta factura debe ser rechazada. Esta acción quedará registrada en la auditoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alerta de acción destructiva */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              La factura será marcada como rechazada y no podrá contabilizarse hasta que sea revertida.
            </AlertDescription>
          </Alert>

          {/* Selector de motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo de rechazo *</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {REJECT_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comentarios adicionales */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comentarios adicionales (opcional)</Label>
            <Textarea
              id="comments"
              placeholder="Añade detalles adicionales sobre el rechazo..."
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Info de la factura */}
          <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
            <p><strong>Factura:</strong> {invoice.invoiceNumber || 'Sin número'}</p>
            <p><strong>Proveedor:</strong> {invoice.supplier?.name || 'Sin proveedor'}</p>
            <p><strong>Total:</strong> {invoice.total?.toFixed(2) || '0.00'} €</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReject} 
            disabled={!isValid || actions.isRejecting}
          >
            {actions.isRejecting ? 'Rechazando...' : 'Rechazar Factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
