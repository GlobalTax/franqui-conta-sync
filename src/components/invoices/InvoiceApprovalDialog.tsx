import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useApproveInvoice, useInvoiceApprovals } from '@/hooks/useInvoiceApprovals';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, MessageSquare, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InvoiceApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  approvalLevel: 'manager' | 'accounting';
}

export function InvoiceApprovalDialog({
  open,
  onOpenChange,
  invoice,
  approvalLevel,
}: InvoiceApprovalDialogProps) {
  const [comments, setComments] = useState('');
  const [action, setAction] = useState<'approved' | 'rejected' | null>(null);
  
  const approveMutation = useApproveInvoice();
  const { data: approvals } = useInvoiceApprovals(invoice?.id);

  const handleSubmit = () => {
    if (!action) return;

    approveMutation.mutate(
      {
        invoice_id: invoice.id,
        approval_level: approvalLevel,
        action,
        comments: comments || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setComments('');
          setAction(null);
        },
      }
    );
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Aprobación de Factura - {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Proveedor</p>
              <p className="font-medium">{invoice.suppliers?.nombre || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-medium">
                {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-medium text-lg">€{invoice.total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Centro</p>
              <p className="font-medium">{invoice.centro_code}</p>
            </div>
          </div>

          {/* Approval History */}
          {approvals && approvals.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Historial de Aprobaciones</h4>
                <div className="space-y-2">
                  {approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-start gap-3 p-3 bg-muted/30 rounded-md"
                    >
                      {approval.action === 'approved' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-1" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive mt-1" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {approval.approval_level === 'manager' ? 'Gerente' : 'Contabilidad'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(approval.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                          </span>
                        </div>
                        {approval.comments && (
                          <p className="text-sm text-muted-foreground">{approval.comments}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Action Selection */}
          <div className="space-y-3">
            <Label>Decisión</Label>
            <div className="flex gap-2">
              <Button
                variant={action === 'approved' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setAction('approved')}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aprobar
              </Button>
              <Button
                variant={action === 'rejected' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setAction('rejected')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">
              Comentarios {action === 'rejected' && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Añade comentarios sobre tu decisión..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!action || (action === 'rejected' && !comments) || approveMutation.isPending}
          >
            {approveMutation.isPending ? 'Procesando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
