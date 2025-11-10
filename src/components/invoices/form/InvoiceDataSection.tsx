// ============================================================================
// INVOICE DATA SECTION
// Sección de datos principales de la factura con auto-cálculo de totales
// ============================================================================

import { Control, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useEffect } from 'react';
import { calculateInvoiceTotals } from '@/lib/invoice-calculator';

interface InvoiceDataSectionProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

export function InvoiceDataSection({ control, watch, setValue }: InvoiceDataSectionProps) {
  const taxLines = watch('tax_lines') || [];

  // Auto-cálculo de totales
  useEffect(() => {
    const totals = calculateInvoiceTotals(taxLines);
    setValue('subtotal', totals.subtotal);
    setValue('tax_total', totals.tax_total);
    setValue('total', totals.total);
  }, [taxLines, setValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="uppercase text-sm font-bold text-primary">
          Datos de la Factura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Moneda */}
          <FormField
            control={control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-muted" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Número de factura */}
          <FormField
            control={control}
            name="invoice_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Factura *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="FAC-2025-001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fecha emisión */}
          <FormField
            control={control}
            name="invoice_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Emisión *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha vencimiento */}
          <FormField
            control={control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Vencimiento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Totales calculados */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Base Imponible:</span>
            <span className="text-lg font-semibold">
              {watch('subtotal')?.toFixed(2) || '0.00'} €
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">IVA:</span>
            <span className="text-lg font-semibold">
              {watch('tax_total')?.toFixed(2) || '0.00'} €
            </span>
          </div>
          
          <div className="flex justify-between items-center border-t pt-3">
            <span className="text-base font-bold text-primary">TOTAL:</span>
            <span className="text-2xl font-bold text-right text-primary">
              {watch('total')?.toFixed(2) || '0.00'} €
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
