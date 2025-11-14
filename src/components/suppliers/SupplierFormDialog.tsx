// ============================================================================
// SUPPLIER FORM DIALOG
// Componente reutilizable para crear/editar proveedores
// ============================================================================

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSupplier, useUpdateSupplier, type Supplier, type SupplierFormData } from '@/hooks/useSuppliers';
import { validateNIFOrCIF, getNIFCIFErrorMessage } from '@/lib/nif-validator';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (supplier: Supplier) => void;
  editingSupplier?: Supplier | null;
}

export function SupplierFormDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  editingSupplier 
}: SupplierFormDialogProps) {
  const [formData, setFormData] = useState<SupplierFormData>({
    tax_id: '',
    name: '',
    commercial_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'España',
    payment_terms: 30,
    default_account_code: '',
    notes: '',
  });

  const [taxIdError, setTaxIdError] = useState<string>('');
  const [taxIdValid, setTaxIdValid] = useState<boolean>(false);

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const { toast } = useToast();

  // Validar NIF/CIF
  const validateTaxId = (value: string) => {
    if (!value.trim()) {
      setTaxIdError('');
      setTaxIdValid(false);
      return;
    }

    const isValid = validateNIFOrCIF(value);
    setTaxIdValid(isValid);
    
    if (!isValid) {
      setTaxIdError(getNIFCIFErrorMessage(value));
    } else {
      setTaxIdError('');
    }
  };

  // Reset form when dialog opens/closes or editing supplier changes
  useEffect(() => {
    if (open) {
      if (editingSupplier) {
        setFormData({
          tax_id: editingSupplier.tax_id,
          name: editingSupplier.name,
          commercial_name: editingSupplier.commercial_name || '',
          email: editingSupplier.email || '',
          phone: editingSupplier.phone || '',
          address: editingSupplier.address || '',
          city: editingSupplier.city || '',
          postal_code: editingSupplier.postal_code || '',
          country: editingSupplier.country,
          payment_terms: editingSupplier.payment_terms,
          default_account_code: editingSupplier.default_account_code || '',
          notes: editingSupplier.notes || '',
        });
        // Validar tax_id existente
        validateTaxId(editingSupplier.tax_id);
      } else {
        setFormData({
          tax_id: '',
          name: '',
          commercial_name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          postal_code: '',
          country: 'España',
          payment_terms: 30,
          default_account_code: '',
          notes: '',
        });
        // Reset validación
        setTaxIdError('');
        setTaxIdValid(false);
      }
    } else {
      // Reset validación al cerrar
      setTaxIdError('');
      setTaxIdValid(false);
    }
  }, [open, editingSupplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar NIF/CIF antes de enviar
    if (formData.tax_id && !validateNIFOrCIF(formData.tax_id)) {
      setTaxIdError(getNIFCIFErrorMessage(formData.tax_id));
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "El NIF/CIF introducido no es válido",
      });
      return;
    }
    
    try {
      if (editingSupplier) {
        const updated = await updateSupplier.mutateAsync({ 
          id: editingSupplier.id, 
          data: formData 
        });
        if (onSuccess) {
          onSuccess(updated as Supplier);
        }
      } else {
        const created = await createSupplier.mutateAsync(formData);
        if (onSuccess) {
          onSuccess(created as Supplier);
        }
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </DialogTitle>
          <DialogDescription>
            Completa los datos del proveedor
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_id">CIF/NIF *</Label>
                <div className="relative">
                  <Input
                    id="tax_id"
                    placeholder="Ej: B12345678, 12345678Z"
                    value={formData.tax_id}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setFormData({ ...formData, tax_id: value });
                      validateTaxId(value);
                    }}
                    onBlur={(e) => validateTaxId(e.target.value)}
                    required
                    className={
                      formData.tax_id 
                        ? taxIdValid 
                          ? 'border-green-500 pr-10' 
                          : taxIdError 
                            ? 'border-red-500 pr-10' 
                            : 'pr-10'
                        : ''
                    }
                  />
                  {formData.tax_id && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {taxIdValid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : taxIdError ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : null}
                    </div>
                  )}
                </div>
                {taxIdError && (
                  <p className="text-sm text-red-500">{taxIdError}</p>
                )}
                {taxIdValid && !taxIdError && formData.tax_id && (
                  <p className="text-sm text-green-600">✓ NIF/CIF válido</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Razón Social *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Nombre del proveedor"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commercial_name">Nombre Comercial</Label>
              <Input
                id="commercial_name"
                value={formData.commercial_name}
                onChange={(e) => setFormData({ ...formData, commercial_name: e.target.value })}
                placeholder="Nombre comercial (opcional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@proveedor.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+34 666 777 888"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle, número, piso..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Madrid"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="28001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="España"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Plazo de Pago (días)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 0 })}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_account_code">Cuenta PGC por Defecto</Label>
                <Input
                  id="default_account_code"
                  value={formData.default_account_code}
                  onChange={(e) => setFormData({ ...formData, default_account_code: e.target.value })}
                  placeholder="4000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={
                createSupplier.isPending || 
                updateSupplier.isPending || 
                (formData.tax_id !== '' && !taxIdValid)
              }
            >
              {editingSupplier ? 'Actualizar' : 'Crear'} Proveedor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
