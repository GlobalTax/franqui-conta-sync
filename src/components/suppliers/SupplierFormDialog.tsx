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

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

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
      }
    }
  }, [open, editingSupplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  required
                  placeholder="B12345678"
                />
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
            <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>
              {editingSupplier ? 'Actualizar' : 'Crear'} Proveedor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
