import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, Building2, RefreshCw, XCircle } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';
import { ReprocessOCRDialog } from './ReprocessOCRDialog';
import { RejectInvoiceDialog } from './RejectInvoiceDialog';
import { AssignCentreDialog } from './AssignCentreDialog';
import type { InvoiceReceived } from '@/domain/invoicing/types';

interface InvoiceQuickActionsProps {
  invoice: InvoiceReceived;
  onActionComplete?: () => void;
}

/**
 * Componente de acciones rápidas para cada factura en la bandeja OCR
 * Orden de prioridad: Aprobar → Asignar Centro → Re-procesar OCR → Rechazar
 */
export function InvoiceQuickActions({ invoice, onActionComplete }: InvoiceQuickActionsProps) {
  const { currentMembership } = useOrganization();
  const actions = useInvoiceActions();
  
  const [reprocessDialogOpen, setReprocessDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [assignCentreDialogOpen, setAssignCentreDialogOpen] = useState(false);

  // ========== GUARDARRAÍLES DE ACCIONES ==========
  const canApprove = (invoice.approvalStatus === 'pending_manager' || invoice.approvalStatus === 'pending_accounting') && !invoice.entryId;
  const canReject = invoice.approvalStatus !== 'rejected';
  const canReprocess = !!invoice.documentPath;

  // ========== HANDLER: Aprobar factura ==========
  const handleApprove = async () => {
    if (!currentMembership?.user_id) {
      console.error('No user ID available');
      return;
    }
    
    try {
      await actions.approve({
        invoiceId: invoice.id,
        userId: currentMembership.user_id,
        centroCode: invoice.centroCode,
        comments: undefined
      });
      onActionComplete?.();
    } catch (error) {
      console.error('Approve error:', error);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* 1. APROBAR (prioridad 1) */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={canApprove ? "default" : "ghost"}
              disabled={!canApprove || actions.isApproving}
              onClick={handleApprove}
              className="h-8 px-2"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {canApprove ? 'Aprobar factura' : 'Ya está aprobada o contabilizada'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 2. ASIGNAR CENTRO (prioridad 2) */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={invoice.centroCode ? "ghost" : "outline"}
              onClick={() => setAssignCentreDialogOpen(true)}
              className="h-8 px-2"
            >
              <Building2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {invoice.centroCode ? `Centro: ${invoice.centroCode}` : 'Asignar centro'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 3. RE-PROCESAR OCR (prioridad 3) */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={!canReprocess || actions.isReprocessing}
              onClick={() => setReprocessDialogOpen(true)}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-4 w-4 ${actions.isReprocessing ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Re-procesar OCR</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 4. RECHAZAR (prioridad 5) */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              disabled={!canReject || actions.isRejecting}
              onClick={() => setRejectDialogOpen(true)}
              className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rechazar factura</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* ========== DIALOGS ========== */}
      <ReprocessOCRDialog
        open={reprocessDialogOpen}
        onOpenChange={setReprocessDialogOpen}
        invoice={invoice}
        onComplete={onActionComplete}
      />

      <RejectInvoiceDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        invoice={invoice}
        onComplete={onActionComplete}
      />

      <AssignCentreDialog
        open={assignCentreDialogOpen}
        onOpenChange={setAssignCentreDialogOpen}
        invoiceIds={[invoice.id]}
        currentCentroCode={invoice.centroCode}
        onComplete={onActionComplete}
      />
    </div>
  );
}
