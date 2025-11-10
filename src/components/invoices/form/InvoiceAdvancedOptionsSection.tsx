// ============================================================================
// INVOICE ADVANCED OPTIONS SECTION
// Sección de opciones avanzadas (checkboxes, comentarios, menú de opciones)
// ============================================================================

import { Control } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MoreVertical, Search, Wand2, RefreshCw, CreditCard, Paperclip } from 'lucide-react';
import { useState } from 'react';

interface InvoiceAdvancedOptionsSectionProps {
  control: Control<any>;
  invoiceId?: string;
  ocrData?: any;
}

export function InvoiceAdvancedOptionsSection({ 
  control, 
  invoiceId, 
  ocrData 
}: InvoiceAdvancedOptionsSectionProps) {
  const [showOCRDialog, setShowOCRDialog] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="uppercase text-sm font-bold text-primary">
          Opciones Avanzadas
        </CardTitle>
        
        {/* Menú de 3 puntos */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Opciones avanzadas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => setShowOCRDialog(true)}>
              <Search className="mr-2 h-4 w-4" />
              Ver OCR Details
            </DropdownMenuItem>
            
            <DropdownMenuItem>
              <Wand2 className="mr-2 h-4 w-4" />
              Ver Stripper
            </DropdownMenuItem>
            
            <DropdownMenuItem>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reprocesar OCR
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              Realizar pago
            </DropdownMenuItem>
            
            <DropdownMenuItem>
              <Paperclip className="mr-2 h-4 w-4" />
              Asignar pago existente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Checkbox: Factura de alquiler */}
        <FormField
          control={control}
          name="is_rental"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Es factura de alquiler</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Checkbox: Régimen especial */}
        <FormField
          control={control}
          name="is_special_regime"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Factura en Régimen Especial</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Comentarios */}
        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comentarios / Notas</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder="Añade comentarios o notas adicionales sobre esta factura..."
                  className="resize-none"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>

      {/* Dialog OCR Details */}
      <Dialog open={showOCRDialog} onOpenChange={setShowOCRDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Datos OCR Raw</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
            {JSON.stringify(ocrData || { message: 'No hay datos OCR disponibles' }, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
