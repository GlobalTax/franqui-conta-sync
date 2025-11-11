// ============================================================================
// INVOICE FORM HEADER
// Encabezado del formulario de factura (Tipo, OCR, Centro)
// ============================================================================

import { Control } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Sparkles, Loader2, Zap, Shield, RefreshCw } from 'lucide-react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCentres } from '@/hooks/useCentres';

interface InvoiceFormHeaderProps {
  control: Control<any>;
  isEditMode: boolean;
  ocrEngine?: string;
  ocrConfidence?: number;
  onProcessOCR?: () => void;
  isProcessing?: boolean;
  hasDocument?: boolean;
  onGoToUpload?: () => void;
  selectedEngine?: 'openai' | 'mindee';
  onEngineChange?: (engine: 'openai' | 'mindee') => void;
  onRetryWithDifferentEngine?: () => void;
}

export function InvoiceFormHeader({ 
  control, 
  isEditMode, 
  ocrEngine, 
  ocrConfidence,
  onProcessOCR,
  isProcessing,
  hasDocument,
  onGoToUpload,
  selectedEngine,
  onEngineChange,
  onRetryWithDifferentEngine
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

{/* Motor OCR + Acción */}
<div>
  <div className="flex items-center justify-between mb-2">
    <label className="uppercase text-xs font-bold text-primary block">
      Reconocimiento OCR
    </label>
    {hasDocument ? (
      <Button
        size="sm"
        variant="secondary"
        onClick={onProcessOCR}
        disabled={isProcessing}
      >
        {isProcessing && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
        Digitalizar con OCR
      </Button>
    ) : (
      <Button
        size="sm"
        variant="outline"
        onClick={onGoToUpload}
      >
        Subir PDF
      </Button>
    )}
  </div>

  {/* Selector de motor OCR */}
  <div className="flex items-center gap-2 mt-2">
    <Label className="text-xs text-muted-foreground">Motor:</Label>
    <RadioGroup
      value={selectedEngine || 'openai'}
      onValueChange={(v) => onEngineChange?.(v as 'openai' | 'mindee')}
      className="flex gap-3"
      disabled={isProcessing}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="openai" id="engine-openai" className="h-3 w-3" />
              <Label htmlFor="engine-openai" className="text-xs cursor-pointer flex items-center gap-1">
                <Zap className="h-3 w-3 text-green-600" />
                OpenAI
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">
              <strong>OpenAI Vision (GPT-4)</strong><br />
              • Multilenguaje<br />
              • Rápido (~3-5s)<br />
              • Excelente con facturas complejas<br />
              • Coste: ~€0.002/página
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="mindee" id="engine-mindee" className="h-3 w-3" />
              <Label htmlFor="engine-mindee" className="text-xs cursor-pointer flex items-center gap-1">
                <Shield className="h-3 w-3 text-blue-600" />
                Mindee
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">
              <strong>Mindee Invoice API</strong><br />
              • Especializado en facturas<br />
              • Datos procesados en UE (GDPR)<br />
              • Muy preciso con totales/IVA<br />
              • Coste: ~€0.004/página
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </RadioGroup>
  </div>

  {/* Estado de procesamiento */}
  {isProcessing && (
    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Procesando con {selectedEngine === 'openai' ? 'OpenAI Vision' : 'Mindee'}...
    </div>
  )}

  {/* Badge de motor procesado */}
  {ocrEngine && (
    <Badge variant="secondary" className="gap-2 mt-2">
      <Sparkles className="h-3 w-3" />
      {ocrEngine === 'openai' && 'OpenAI GPT-4'}
      {ocrEngine === 'mindee' && 'Mindee'}
      {ocrEngine === 'merged' && 'Multi-Motor'}
      {ocrEngine === 'manual' && 'Manual'}
      {ocrEngine === 'google_vision' && 'Google Vision'}
    </Badge>
  )}

  {/* Botón de reintentar con otro motor (si baja confianza) */}
  {ocrEngine && ocrConfidence && ocrConfidence < 0.7 && onRetryWithDifferentEngine && (
    <Button
      size="sm"
      variant="outline"
      onClick={onRetryWithDifferentEngine}
      className="mt-2 w-full"
    >
      <RefreshCw className="h-3 w-3 mr-2" />
      Reintentar con {ocrEngine === 'openai' ? 'Mindee' : 'OpenAI'}
    </Button>
  )}

  {!hasDocument && (
    <p className="text-xs text-muted-foreground mt-1">Sube un PDF para habilitar el OCR.</p>
  )}
</div>

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
