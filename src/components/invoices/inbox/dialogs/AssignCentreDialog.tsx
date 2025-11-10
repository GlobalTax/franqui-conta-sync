// ============================================================================
// ASSIGN CENTRE DIALOG
// Modal para asignar centro a facturas (individual o lote)
// ============================================================================

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCentres } from '@/hooks/useCentres';
import { useOrganization } from '@/hooks/useOrganization';
import { Loader2, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AssignCentreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceIds: string[];
  onConfirm: (centreCode: string) => void;
  isLoading?: boolean;
}

export function AssignCentreDialog({
  open,
  onOpenChange,
  invoiceIds,
  onConfirm,
  isLoading = false,
}: AssignCentreDialogProps) {
  const [selectedCentre, setSelectedCentre] = useState('');
  const { currentMembership } = useOrganization();
  const { data: centres, isLoading: isLoadingCentres } = useCentres(
    currentMembership?.organization_id
  );

  const handleConfirm = () => {
    if (selectedCentre) {
      onConfirm(selectedCentre);
      setSelectedCentre(''); // Reset
    }
  };

  const invoiceCount = invoiceIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Asignar Centro
          </DialogTitle>
          <DialogDescription>
            {invoiceCount} factura{invoiceCount > 1 ? 's' : ''} seleccionada
            {invoiceCount > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoadingCentres ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : centres && centres.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="centre">Centro de coste</Label>
              <Select value={selectedCentre} onValueChange={setSelectedCentre}>
                <SelectTrigger id="centre">
                  <SelectValue placeholder="Selecciona un centro..." />
                </SelectTrigger>
                <SelectContent>
                  {centres.map((centre) => (
                    <SelectItem key={centre.id} value={centre.codigo}>
                      {centre.codigo} - {centre.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                El centro seleccionado se asignará a todas las facturas
              </p>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No hay centros disponibles. Crea un centro primero en la
                configuración.
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
            disabled={!selectedCentre || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Asignando...
              </>
            ) : (
              'Asignar Centro'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
