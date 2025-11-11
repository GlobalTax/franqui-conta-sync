// ============================================================================
// INVOICE FORM HEADER
// Encabezado del formulario de factura (Tipo, OCR, Centro)
// ============================================================================

import { Control } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCentres } from '@/hooks/useCentres';
import { OCRDebugBadge } from '@/components/invoices/OCRDebugBadge';
import { useOrganization } from '@/hooks/useOrganization';
import { useView } from '@/contexts/ViewContext';

interface InvoiceFormHeaderProps {
  control: Control<any>;
  isEditMode: boolean;
  ocrEngine?: string;
  ocrConfidence?: number;
  onProcessOCR?: () => void;
  isProcessing?: boolean;
  hasDocument?: boolean;
  onGoToUpload?: () => void;
  onRetryWithDifferentEngine?: () => void;
  orchestratorLogs?: any[];
  processingTimeMs?: number;
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
  onRetryWithDifferentEngine,
  orchestratorLogs,
  processingTimeMs
}: InvoiceFormHeaderProps) {
  const { data: centres = [], isLoading: centresLoading } = useCentres();
  const { currentMembership, memberships } = useOrganization();
  const { selectedView } = useView();

  // Determinar el centro activo basándose en ViewContext
  const getActiveCentreCode = (): string | null => {
    // 1. Si hay una vista de centro seleccionada en el sidebar, usarla
    if (selectedView?.type === 'centre') {
      const membership = memberships.find(m => m.restaurant_id === selectedView.id);
      return membership?.restaurant?.codigo || null;
    }
    
    // 2. Si el usuario tiene un solo restaurante asignado, usarlo
    if (currentMembership?.restaurant && currentMembership.role !== 'admin') {
      return currentMembership.restaurant.codigo;
    }
    
    // 3. Si no hay selección, no pre-rellenar
    return null;
  };

  const activeCentreCode = getActiveCentreCode();
  const activeCentreName = activeCentreCode 
    ? centres?.find(c => c.codigo === activeCentreCode)?.nombre || currentMembership?.restaurant?.nombre
    : null;
  const hasFixedCentre = activeCentreCode !== null && currentMembership?.role !== 'admin';

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
      Reconocimiento OCR (Mindee)
    </label>
    {hasDocument ? (
      <Button
        size="sm"
        variant="secondary"
        onClick={onProcessOCR}
        disabled={isProcessing}
      >
        {isProcessing && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
        Procesar con OCR
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

  {/* Estado de procesamiento */}
  {isProcessing && (
    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Procesando con Mindee...
    </div>
  )}

  {/* Debug Badge con orchestrator logs */}
  {ocrEngine && orchestratorLogs && orchestratorLogs.length > 0 && (
    <div className="mt-2">
      <OCRDebugBadge
        logs={orchestratorLogs}
        engine={ocrEngine}
        confidence={ocrConfidence}
        processingTimeMs={processingTimeMs}
      />
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

  {/* Botón de reprocesar OCR (si baja confianza) */}
  {ocrEngine && ocrConfidence && ocrConfidence < 0.7 && onRetryWithDifferentEngine && (
    <Button
      size="sm"
      variant="outline"
      onClick={onRetryWithDifferentEngine}
      className="mt-2 w-full"
    >
      <RefreshCw className="h-3 w-3 mr-2" />
      Reprocesar con OCR
    </Button>
  )}

  {!hasDocument && (
    <p className="text-xs text-muted-foreground mt-1">Sube un PDF para habilitar el OCR.</p>
  )}
</div>

          {/* Centro */}
          {hasFixedCentre ? (
            <div className="space-y-2">
              <FormLabel className="uppercase text-xs font-bold text-primary">
                Centro / Actividad *
              </FormLabel>
              <div className="flex items-center gap-2 h-9 px-3 py-2 bg-muted rounded-md border border-border">
                <span className="text-sm text-foreground">
                  {activeCentreCode} - {activeCentreName}
                </span>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
