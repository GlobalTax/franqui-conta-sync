// ============================================================================
// INVOICE SUPPLIER SECTION
// Sección de datos del proveedor con validación NIF
// ============================================================================

import { useState } from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, SearchCheck, AlertTriangle } from 'lucide-react';
import { SupplierSelector } from '@/components/invoices/SupplierSelector';
import { SupplierFormDialog } from '@/components/suppliers/SupplierFormDialog';
import { validateNIFOrCIF, getNIFCIFErrorMessage } from '@/lib/nif-validator';
import { toast } from 'sonner';
import { useSuppliers } from '@/hooks/useSuppliers';
import { getSupplierByTaxId } from '@/infrastructure/persistence/supabase/queries/SupplierQueries';
import { cn } from '@/lib/utils';

interface InvoiceSupplierSectionProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: any;
}

export function InvoiceSupplierSection({ control, setValue, watch }: InvoiceSupplierSectionProps) {
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [validatingNIF, setValidatingNIF] = useState(false);
  const [pendingNIF, setPendingNIF] = useState<string>('');
  const { data: suppliers } = useSuppliers({ active: true });

  const handleValidateNIF = async () => {
    const nif = watch('supplier_tax_id');
    if (!nif) {
      toast.error('Introduce un NIF/CIF para validar');
      return;
    }

    // 1. Validar formato
    const isValid = validateNIFOrCIF(nif);
    if (!isValid) {
      toast.error(getNIFCIFErrorMessage(nif));
      return;
    }

    // 2. Buscar proveedor en BD
    setValidatingNIF(true);
    try {
      const existingSupplier = await getSupplierByTaxId(nif);
      
      if (existingSupplier) {
        // ✅ ENCONTRADO: Auto-seleccionar
        setValue('supplier_id', existingSupplier.id);
        setValue('supplier_tax_id', existingSupplier.taxId);
        setValue('supplier_name', existingSupplier.name);
        toast.success(`✅ Proveedor encontrado: ${existingSupplier.name}`);
      } else {
        // ⚠️ NO ENCONTRADO: Abrir formulario de creación
        toast.warning('⚠️ Proveedor no encontrado. Créalo primero.', {
          description: 'Se abrirá el formulario con el NIF pre-rellenado',
          icon: <AlertTriangle className="h-4 w-4" />
        });
        setPendingNIF(nif);
        setShowSupplierDialog(true);
        // Limpiar campos
        setValue('supplier_id', '');
        setValue('supplier_tax_id', '');
        setValue('supplier_name', '');
      }
    } catch (error) {
      console.error('[Validate NIF] Error:', error);
      toast.error('Error al buscar proveedor');
    } finally {
      setValidatingNIF(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="uppercase text-sm font-bold text-primary">
          Datos del Proveedor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector de proveedor */}
        <FormField
          control={control}
          name="supplier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Proveedor *
                {!field.value && (
                  <Badge variant="destructive" className="text-xs">
                    Requerido
                  </Badge>
                )}
              </FormLabel>
              <FormControl>
                <SupplierSelector
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    
                    // Auto-rellenar campos del proveedor cuando se selecciona
                    const selectedSupplier = suppliers?.find(s => s.id === value);
                    if (selectedSupplier) {
                      setValue('supplier_tax_id', selectedSupplier.tax_id);
                      setValue('supplier_name', selectedSupplier.name);
                    }
                  }}
                  onCreateNew={() => {
                    setPendingNIF('');
                    setShowSupplierDialog(true);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* NIF/CIF con validador */}
        <FormField
          control={control}
          name="supplier_tax_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NIF / CIF</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder={watch('supplier_id') ? "Auto-rellenado" : "Introduce NIF y pulsa Validar"}
                    readOnly={!!watch('supplier_id')}
                    className={cn(
                      "flex-1",
                      watch('supplier_id') && "bg-muted cursor-not-allowed"
                    )}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleValidateNIF}
                  disabled={validatingNIF || !field.value || !!watch('supplier_id')}
                  title={watch('supplier_id') ? "Proveedor ya seleccionado" : "Buscar proveedor por NIF/CIF"}
                >
                  {validatingNIF ? (
                    <Search className="h-4 w-4 animate-pulse" />
                  ) : watch('supplier_id') ? (
                    <SearchCheck className="h-4 w-4 text-success" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Razón social */}
        <FormField
          control={control}
          name="supplier_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razón Social</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Se rellenará automáticamente"
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>

      {/* Diálogo de creación de proveedor */}
      <SupplierFormDialog
        open={showSupplierDialog}
        onOpenChange={(open) => {
          setShowSupplierDialog(open);
          if (!open) setPendingNIF('');
        }}
        initialTaxId={pendingNIF}
        onSuccess={(newSupplier) => {
          // Auto-seleccionar el proveedor recién creado
          setValue('supplier_id', newSupplier.id);
          setValue('supplier_tax_id', newSupplier.tax_id);
          setValue('supplier_name', newSupplier.name);
          toast.success(`✅ Proveedor "${newSupplier.name}" creado y seleccionado`);
          setPendingNIF('');
        }}
      />
    </Card>
  );
}
