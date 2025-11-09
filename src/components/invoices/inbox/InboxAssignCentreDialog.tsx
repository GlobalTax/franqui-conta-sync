// ============================================================================
// INBOX ASSIGN CENTRE DIALOG
// Diálogo para asignación masiva de centro a facturas seleccionadas
// ============================================================================

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/hooks/useOrganization';
import { useCentres } from '@/hooks/useCentres';
import { useBulkInvoiceActions } from '@/hooks/useBulkInvoiceActions';

interface InboxAssignCentreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onAssigned?: () => void;
}

/**
 * Diálogo de asignación masiva de centro usando arquitectura DDD
 * Delega lógica de negocio al hook useBulkInvoiceActions
 */
export function InboxAssignCentreDialog({
  open,
  onOpenChange,
  selectedIds,
  onAssigned,
}: InboxAssignCentreDialogProps) {
  const { currentMembership } = useOrganization();
  const { data: centres } = useCentres(currentMembership?.organization_id);
  const { bulkAssignCentre, isLoading } = useBulkInvoiceActions();
  const [centroCode, setCentroCode] = useState<string>('');

  const handleAssign = () => {
    if (!centroCode || selectedIds.length === 0) return;

    bulkAssignCentre(
      { invoiceIds: selectedIds, centroCode },
      {
        onSuccess: () => {
          onOpenChange(false);
          setCentroCode('');
          onAssigned?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Asignar Centro a Facturas
          </DialogTitle>
          <DialogDescription>
            Asigna un centro de coste a las facturas seleccionadas de forma masiva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <span className="font-semibold text-foreground">
              {selectedIds.length}
            </span>
            factura{selectedIds.length > 1 ? 's' : ''} seleccionada
            {selectedIds.length > 1 ? 's' : ''}
          </div>

          <div className="space-y-2">
            <Label htmlFor="centro-select">Centro de coste</Label>
            <Select value={centroCode} onValueChange={setCentroCode} disabled={isLoading}>
              <SelectTrigger id="centro-select" className="w-full">
                <SelectValue placeholder="Selecciona un centro..." />
              </SelectTrigger>
              <SelectContent>
                {centres?.map((centre: any) => (
                  <SelectItem key={centre.id} value={centre.codigo}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{centre.codigo}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{centre.nombre}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIds.length > 50 && (
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
              ⚠️ Operación masiva: {selectedIds.length} facturas. Puede tardar unos segundos.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={!centroCode || isLoading}>
            {isLoading ? 'Asignando...' : 'Asignar Centro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
