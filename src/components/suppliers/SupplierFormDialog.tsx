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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateSupplier, useUpdateSupplier, type Supplier, type SupplierFormData } from '@/hooks/useSuppliers';
import { toast } from '@/hooks/use-toast';
import { validateNIFOrCIF, getNIFCIFErrorMessage } from '@/lib/nif-validator';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { EUROPEAN_COUNTRIES, getCountryISOCode } from '@/lib/constants/countries';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (supplier: Supplier) => void;
  editingSupplier?: Supplier | null;
  initialTaxId?: string;
}

export function SupplierFormDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  editingSupplier,
  initialTaxId 
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
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const { toast } = useToast();

  // Validar NIF/CIF (España) o VAT (UE) según país
  const validateTaxId = async (value: string, country: string) => {
    if (!value.trim()) {
      setTaxIdError('');
      setTaxIdValid(false);
      return;
    }

    // Auto-formatear: mayúsculas y sin espacios
    const cleanValue = value.trim().toUpperCase().replace(/\s/g, '');

    // 🇪🇸 ESPAÑA → Validación local con validateNIFOrCIF
    if (country === 'España') {
      const isValid = validateNIFOrCIF(cleanValue);
      setTaxIdValid(isValid);
      setTaxIdError(isValid ? '' : getNIFCIFErrorMessage(cleanValue));
      return;
    }

    // 🇪🇺 OTROS PAÍSES UE → Validación VIES
    const countryCode = getCountryISOCode(country);
    if (!countryCode) {
      setTaxIdError('País no soportado para validación automática');
      setTaxIdValid(false);
      return;
    }

    // Pre-validación de formato básico
    if (!/^[\w]{4,12}$/.test(cleanValue)) {
      setTaxIdError(`Formato inválido. Debe ser: ${countryCode}XXXXXXXXXX (4-12 caracteres)`);
      setTaxIdValid(false);
      return;
    }

    setIsValidating(true);
    console.log(`[Validation] Calling VIES for ${countryCode}${cleanValue}`);

    try {
      const { data, error } = await supabase.functions.invoke('validate-eu-vat', {
        body: { countryCode, vatNumber: cleanValue }
      });

      if (error) {
        console.error('[Validation] Supabase error:', error);
        throw error;
      }

      const { valid, name, error: viesError } = data;

      setTaxIdValid(valid);
      setTaxIdError(valid ? '' : (viesError || 'CIF/VAT no válido en sistema VIES'));

      console.log(`[Validation] VIES result: valid=${valid}, name=${name}`);

      // Opcional: auto-rellenar nombre si VIES lo devuelve y el campo está vacío
      if (valid && name && !formData.name) {
        toast({
          title: '✨ Datos encontrados',
          description: `Se encontró: ${name}. Puedes usar este nombre.`,
        });
      }
    } catch (err) {
      console.error('[Validation] Error calling VIES:', err);
      setTaxIdError('⚠️ Error al conectar con VIES. Verifica el formato e intenta de nuevo.');
      setTaxIdValid(false);
    } finally {
      setIsValidating(false);
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
        validateTaxId(editingSupplier.tax_id, editingSupplier.country);
      } else {
        setFormData({
          tax_id: initialTaxId || '',
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
        
        // Si hay initialTaxId, validarlo automáticamente
        if (initialTaxId) {
          validateTaxId(initialTaxId, 'España');
        }
      }
    } else {
      // Reset validación al cerrar
      setTaxIdError('');
      setTaxIdValid(false);
      setIsValidating(false);
    }
  }, [open, editingSupplier, initialTaxId]);

  // Re-validar tax_id cuando cambia el país
  useEffect(() => {
    if (formData.tax_id && formData.country && open) {
      validateTaxId(formData.tax_id, formData.country);
    }
  }, [formData.country]);

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
                <Label htmlFor="tax_id">
                  {formData.country === 'España' 
                    ? 'CIF/NIF *' 
                    : `VAT Number (${getCountryISOCode(formData.country) || '??'}) *`
                  }
                </Label>
                <div className="relative">
                  <Input
                    id="tax_id"
                    placeholder={
                      formData.country === 'España'
                        ? 'Ej: B12345678, 12345678Z'
                        : `Ej: ${getCountryISOCode(formData.country)}123456789`
                    }
                    value={formData.tax_id}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/\s/g, '');
                      setFormData({ ...formData, tax_id: value });
                      
                      // Solo validar en onChange para España (evitar muchas llamadas VIES)
                      if (formData.country === 'España') {
                        validateTaxId(value, formData.country);
                      }
                    }}
                    onBlur={(e) => validateTaxId(e.target.value, formData.country)}
                    required
                    disabled={isValidating}
                    className={`pr-10 ${
                      taxIdError ? 'border-red-500' : taxIdValid ? 'border-green-500' : ''
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isValidating ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : formData.tax_id && taxIdValid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : formData.tax_id && taxIdError ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : null}
                  </div>
                </div>
                
                {/* Mensajes de validación */}
                {isValidating && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Validando con VIES...
                  </p>
                )}
                {taxIdError && !isValidating && (
                  <p className="text-sm text-red-500">{taxIdError}</p>
                )}
                {taxIdValid && !taxIdError && formData.tax_id && !isValidating && (
                  <p className="text-sm text-green-600">
                    ✓ {formData.country === 'España' ? 'NIF/CIF válido' : 'VAT válido en VIES'}
                  </p>
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
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un país" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] bg-popover">
                    {EUROPEAN_COUNTRIES.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
