import { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Search } from 'lucide-react';
import { useBulkInvoiceActions } from '@/hooks/useBulkInvoiceActions';
import { useOrganization } from '@/hooks/useOrganization';

interface AssignCentreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceIds: string[];
  currentCentroCode?: string | null;
  onComplete?: () => void;
}

/**
 * Diálogo para asignar centro a una o varias facturas
 * Soporta búsqueda de centros por código o nombre
 */
export function AssignCentreDialog({
  open,
  onOpenChange,
  invoiceIds,
  currentCentroCode,
  onComplete
}: AssignCentreDialogProps) {
  const { currentMembership } = useOrganization();
  const { bulkAssignCentre, isLoading } = useBulkInvoiceActions();
  
  const [selectedCentroCode, setSelectedCentroCode] = useState<string>(currentCentroCode || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Obtener centros disponibles (por ahora mockeado, luego usar hook useCentres)
  const availableCentres = useMemo(() => [
    { code: 'M001', name: 'Restaurante Madrid Centro' },
    { code: 'M002', name: 'Restaurante Madrid Norte' },
    { code: 'B001', name: 'Restaurante Barcelona Diagonal' },
    { code: 'V001', name: 'Restaurante Valencia Puerto' },
    { code: 'S001', name: 'Restaurante Sevilla Triana' }
  ], []);

  // Filtrar centros según búsqueda
  const filteredCentres = useMemo(() => {
    if (!searchTerm) return availableCentres;
    
    const term = searchTerm.toLowerCase();
    return availableCentres.filter(centre => 
      centre.code.toLowerCase().includes(term) || 
      centre.name.toLowerCase().includes(term)
    );
  }, [availableCentres, searchTerm]);

  const handleAssign = async () => {
    if (!selectedCentroCode || !currentMembership?.user_id) return;

    try {
      await bulkAssignCentre({
        invoiceIds,
        centroCode: selectedCentroCode
      });
      
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      console.error('Assign centre error:', error);
    }
  };

  const isValid = selectedCentroCode !== '';
  const isBulk = invoiceIds.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Asignar Centro
          </DialogTitle>
          <DialogDescription>
            {isBulk 
              ? `Asigna un centro a las ${invoiceIds.length} facturas seleccionadas.`
              : 'Asigna un centro a esta factura.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Búsqueda de centros */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar centro</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Buscar por código o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selector de centro */}
          <div className="space-y-2">
            <Label htmlFor="centre">Centro *</Label>
            <Select value={selectedCentroCode} onValueChange={setSelectedCentroCode}>
              <SelectTrigger id="centre">
                <SelectValue placeholder="Selecciona un centro" />
              </SelectTrigger>
              <SelectContent>
                {filteredCentres.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No se encontraron centros
                  </div>
                ) : (
                  filteredCentres.map(centre => (
                    <SelectItem key={centre.code} value={centre.code}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {centre.code}
                        </span>
                        <span>{centre.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Centro actual (si existe) */}
          {currentCentroCode && !isBulk && (
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Centro actual:</strong> {currentCentroCode}
                <br />
                <span className="text-xs text-muted-foreground">
                  Se sobrescribirá si seleccionas un centro diferente
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Info bulk */}
          {isBulk && (
            <Alert>
              <AlertDescription className="text-sm">
                Se asignará el centro <strong>{selectedCentroCode || '(selecciona uno)'}</strong> a {invoiceIds.length} facturas.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!isValid || isLoading}
          >
            {isLoading ? 'Asignando...' : isBulk ? `Asignar a ${invoiceIds.length}` : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
