// ============================================================================
// INVOICE SUPPLIER SECTION
// Sección de datos del proveedor con validación NIF + auto-creación OCR
// ============================================================================

import { useState, useEffect } from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, SearchCheck, AlertTriangle, UserPlus } from 'lucide-react';
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
  ocrTaxId?: string;
  ocrSupplierName?: string;
  ocrSupplierAddress?: string;
  ocrSupplierCity?: string;
  ocrSupplierPostalCode?: string;
  ocrSupplierEmail?: string;
}

export function InvoiceSupplierSection({ control, setValue, watch, ocrTaxId, ocrSupplierName }: InvoiceSupplierSectionProps) {
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [validatingNIF, setValidatingNIF] = useState(false);
  const [pendingNIF, setPendingNIF] = useState<string>('');
  const [pendingName, setPendingName] = useState<string>('');
  const { data: suppliers } = useSuppliers({ active: true });

  const supplierId = watch('supplier_id');
  const hasOcrPending = !!(ocrTaxId && !supplierId);

  // Auto-open creation dialog when OCR data arrives without a match
  useEffect(() => {
    if (ocrTaxId && !supplierId) {
      setPendingNIF(ocrTaxId);
      setPendingName(ocrSupplierName || '');
    }
  }, [ocrTaxId, ocrSupplierName, supplierId]);

  const handleValidateNIF = async () => {
    const nif = watch('supplier_tax_id');
    if (!nif) {
      toast.error('Introduce un NIF/CIF para validar');
      return;
    }

    const isValid = validateNIFOrCIF(nif);
    if (!isValid) {
      toast.error(getNIFCIFErrorMessage(nif));
      return;
    }

    setValidatingNIF(true);
    try {
      const existingSupplier = await getSupplierByTaxId(nif);
      
      if (existingSupplier) {
        setValue('supplier_id', existingSupplier.id);
        setValue('supplier_tax_id', existingSupplier.taxId);
        setValue('supplier_name', existingSupplier.name);
        toast.success(`✅ Proveedor encontrado: ${existingSupplier.name}`);
      } else {
        toast.warning('⚠️ Proveedor no encontrado. Créalo primero.');
        setPendingNIF(nif);
        setPendingName('');
        setShowSupplierDialog(true);
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

  const handleCreateFromOCR = () => {
    setPendingNIF(ocrTaxId || '');
    setPendingName(ocrSupplierName || '');
    setShowSupplierDialog(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="uppercase text-sm font-bold text-primary">
          Datos del Proveedor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Banner OCR: proveedor no registrado */}
        {hasOcrPending && (
          <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex items-center justify-between gap-2">
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>{ocrSupplierName || 'Proveedor'}</strong> ({ocrTaxId}) no está registrado
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                onClick={handleCreateFromOCR}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Crear proveedor
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Selector de proveedor */}
        <FormField
          control={control}
          name="supplier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Proveedor *
                {hasOcrPending ? (
                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                    Pendiente de crear
                  </Badge>
                ) : !field.value ? (
                  <Badge variant="destructive" className="text-xs">
                    Requerido
                  </Badge>
                ) : null}
              </FormLabel>
              <FormControl>
                <SupplierSelector
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    const selectedSupplier = suppliers?.find(s => s.id === value);
                    if (selectedSupplier) {
                      setValue('supplier_tax_id', selectedSupplier.tax_id);
                      setValue('supplier_name', selectedSupplier.name);
                    }
                  }}
                  onCreateNew={() => {
                    setPendingNIF('');
                    setPendingName('');
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
                    placeholder={supplierId ? "Auto-rellenado" : "Introduce NIF y pulsa Validar"}
                    readOnly={!!supplierId}
                    className={cn(
                      "flex-1",
                      supplierId && "bg-muted cursor-not-allowed"
                    )}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleValidateNIF}
                  disabled={validatingNIF || !field.value || !!supplierId}
                  title={supplierId ? "Proveedor ya seleccionado" : "Buscar proveedor por NIF/CIF"}
                >
                  {validatingNIF ? (
                    <Search className="h-4 w-4 animate-pulse" />
                  ) : supplierId ? (
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
          if (!open) {
            setPendingNIF('');
            setPendingName('');
          }
        }}
        initialTaxId={pendingNIF}
        initialName={pendingName}
        onSuccess={(newSupplier) => {
          setValue('supplier_id', newSupplier.id);
          setValue('supplier_tax_id', newSupplier.tax_id);
          setValue('supplier_name', newSupplier.name);
          toast.success(`✅ Proveedor "${newSupplier.name}" creado y seleccionado`);
          setPendingNIF('');
          setPendingName('');
        }}
      />
    </Card>
  );
}
