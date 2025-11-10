// ============================================================================
// INVOICE FORM HEADER
// Encabezado del formulario de factura (Tipo, OCR, Centro)
// ============================================================================

import { Control } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Sparkles } from 'lucide-react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCentres } from '@/hooks/useCentres';

interface InvoiceFormHeaderProps {
  control: Control<any>;
  isEditMode: boolean;
  ocrEngine?: string;
  ocrConfidence?: number;
}

export function InvoiceFormHeader({ 
  control, 
  isEditMode, 
  ocrEngine, 
  ocrConfidence 
}: InvoiceFormHeaderProps) {
  const { data: centres = [], isLoading: centresLoading } = useCentres();

  return (
    <div className="space-y-4">
      {/* Alert de baja confianza OCR */}
      {ocrConfidence && ocrConfidence < 0.7 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>OCR con baja confianza ({(ocrConfidence * 100).toFixed(0)}%)</AlertTitle>
          <AlertDescription>
            Revisa cuidadosamente los datos extraídos antes de contabilizar.
            Considera reprocesar con otro motor OCR.
          </AlertDescription>
        </Alert>
      )}

      {/* Header principal */}
      <div className="bg-gradient-to-r from-blue-50 to-primary/5 border-l-4 border-primary rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tipo de documento */}
          <FormField
            control={control}
            name="invoice_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="uppercase text-xs font-bold text-primary">
                  Tipo de documento *
                </FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={isEditMode}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="received">Factura Recibida</SelectItem>
                    <SelectItem value="issued">Factura Emitida</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Motor OCR */}
          {ocrEngine && (
            <div>
              <label className="uppercase text-xs font-bold text-primary block mb-2">
                Reconocimiento OCR
              </label>
              <Badge variant="secondary" className="gap-2">
                <Sparkles className="h-3 w-3" />
                {ocrEngine === 'openai' && 'OpenAI GPT-4'}
                {ocrEngine === 'mindee' && 'Mindee'}
                {ocrEngine === 'manual' && 'Manual'}
              </Badge>
            </div>
          )}

          {/* Centro */}
          <FormField
            control={control}
            name="centro_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="uppercase text-xs font-bold text-primary">
                  Centro / Actividad *
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar centro" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {centresLoading ? (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : centres.length === 0 ? (
                      <SelectItem value="empty" disabled>No hay centros disponibles</SelectItem>
                    ) : (
                      centres.map((centre) => (
                        <SelectItem key={centre.codigo} value={centre.codigo}>
                          {centre.codigo} - {centre.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
