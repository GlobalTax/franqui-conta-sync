// ============================================================================
// INVOICE SUPPLIER SECTION
// Sección de datos del proveedor con validación NIF
// ============================================================================

import { Control, UseFormSetValue } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { SupplierSelector } from '@/components/invoices/SupplierSelector';
import { validateNIFOrCIF, getNIFCIFErrorMessage } from '@/lib/nif-validator';
import { toast } from 'sonner';

interface InvoiceSupplierSectionProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: any;
}

export function InvoiceSupplierSection({ control, setValue, watch }: InvoiceSupplierSectionProps) {
  const handleValidateNIF = () => {
    const nif = watch('supplier_tax_id');
    if (!nif) {
      toast.error('Introduce un NIF/CIF para validar');
      return;
    }

    const isValid = validateNIFOrCIF(nif);
    
    if (isValid) {
      toast.success('✅ NIF/CIF válido');
    } else {
      toast.error(getNIFCIFErrorMessage(nif));
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
              <FormLabel>Proveedor *</FormLabel>
              <FormControl>
                <SupplierSelector
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
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
                  <Input {...field} placeholder="B12345678" className="flex-1" />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleValidateNIF}
                  title="Validar NIF/CIF"
                >
                  <Search className="h-4 w-4" />
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
                <Input {...field} placeholder="Nombre del proveedor" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
