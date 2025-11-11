// ============================================================================
// INVOICE DETAIL EDITOR con OCR INTEGRADO
// Vista de detalle/edición de factura con procesamiento OCR automático
// Layout: PDF izquierda + Formulario contable derecha
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PageHeader } from '@/components/layout/PageHeader';
import { InvoicePDFPreview } from '@/components/invoices/InvoicePDFPreview';
import { InvoicePDFUploader } from '@/components/invoices/InvoicePDFUploader';
import { InvoiceFormHeader } from '@/components/invoices/form/InvoiceFormHeader';
import { InvoiceSupplierSection } from '@/components/invoices/form/InvoiceSupplierSection';
import { InvoiceDataSection } from '@/components/invoices/form/InvoiceDataSection';
import { InvoicePaymentTermsSection } from '@/components/invoices/form/InvoicePaymentTermsSection';
import { InvoiceTaxBreakdownSection } from '@/components/invoices/form/InvoiceTaxBreakdownSection';
import { InvoiceAdvancedOptionsSection } from '@/components/invoices/form/InvoiceAdvancedOptionsSection';
import { InvoiceActionButtons } from '@/components/invoices/form/InvoiceActionButtons';
import { APMappingSuggestions } from '@/components/invoices/APMappingSuggestions';
import { OCREngineIndicator } from '@/components/invoices/OCREngineIndicator';
import { NormalizationChangesAlert } from '@/components/invoices/NormalizationChangesAlert';
import { EntryPreview } from '@/components/invoices/EntryPreview';
import { useInvoicesReceived, useCreateInvoiceReceived, useUpdateInvoiceReceived } from '@/hooks/useInvoicesReceived';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';
import { 
  useProcessInvoiceOCR, 
  useLogOCRProcessing,
  type OCRInvoiceData,
  type OCRResponse,
  type APMappingResult,
  type InvoiceEntryValidationResult
} from '@/hooks/useInvoiceOCR';
import { useAPLearning } from '@/hooks/useAPLearning';
import { useInvoiceStripper } from '@/hooks/useInvoiceStripper';
import { stripAndNormalize, type NormalizationChange } from '@/lib/fiscal-normalizer';
import { validateInvoiceForPosting } from '@/lib/invoice-validation';
import { validateAccountingBalance } from '@/lib/invoice-calculator';
import { StripperBadge } from '@/components/invoices/StripperBadge';
import { StripperChangesDialog } from '@/components/invoices/StripperChangesDialog';
import { toast } from 'sonner';
import { Scan, Loader2, FileText, Sparkles, Zap } from 'lucide-react';

// Schema de validación
const invoiceFormSchema = z.object({
  invoice_type: z.enum(['received', 'issued']),
  centro_code: z.string().min(1, 'Centro obligatorio'),
  
  // Proveedor
  supplier_id: z.string().min(1, 'Proveedor obligatorio'),
  supplier_tax_id: z.string().optional(),
  supplier_name: z.string().optional(),
  
  // Datos factura
  currency: z.literal('EUR'),
  invoice_number: z.string().min(1, 'Número obligatorio'),
  invoice_date: z.string().min(1, 'Fecha obligatoria'),
  due_date: z.string().optional(),
  
  // Totales (calculados)
  subtotal: z.number().default(0),
  tax_total: z.number().default(0),
  total: z.number().default(0),
  
  // Líneas impuestos
  tax_lines: z.array(z.object({
    tax_rate: z.number(),
    tax_base: z.number(),
    tax_amount: z.number(),
    account_code: z.string(),
    expense_category: z.string().optional()
  })).default([]),
  
  // Vencimientos
  payment_terms: z.array(z.object({
    due_date: z.string(),
    amount: z.number()
  })).default([]),
  
  // Opciones avanzadas
  is_rental: z.boolean().default(false),
  is_special_regime: z.boolean().default(false),
  notes: z.string().optional()
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

export default function InvoiceDetailEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  // Estado local para document_path
  const [documentPath, setDocumentPath] = useState<string | null>(null);

  // OCR Estados
  const [ocrData, setOcrData] = useState<OCRInvoiceData | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [rawOCRResponse, setRawOCRResponse] = useState<OCRResponse | null>(null);
  const [apMapping, setApMapping] = useState<APMappingResult | null>(null);
  const [entryValidation, setEntryValidation] = useState<InvoiceEntryValidationResult | null>(null);
  const [ocrEngine, setOcrEngine] = useState<"openai" | "mindee" | "merged" | "manual_review" | "google_vision">("google_vision");
  const [mergeNotes, setMergeNotes] = useState<string[]>([]);
  const [normalizationChanges, setNormalizationChanges] = useState<NormalizationChange[]>([]);
  const [normalizationWarnings, setNormalizationWarnings] = useState<string[]>([]);
  const [ocrProcessed, setOcrProcessed] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<'openai' | 'mindee'>('openai');

  // OCR Hooks
  const processOCR = useProcessInvoiceOCR();
  const logOCR = useLogOCRProcessing();
  const apLearning = useAPLearning();

  // Hooks
  const { data: invoicesData } = useInvoicesReceived({});
  const createInvoice = useCreateInvoiceReceived();
  const updateInvoice = useUpdateInvoiceReceived();
  const invoiceActions = useInvoiceActions();

  // Encontrar la factura si estamos en modo edición
  const invoice = useMemo(() => {
    if (!isEditMode || !invoicesData?.data) return null;
    return invoicesData.data.find(inv => inv.id === id);
  }, [isEditMode, id, invoicesData]);

  // Inicializar formulario
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice_type: 'received',
      currency: 'EUR',
      centro_code: '',
      supplier_id: '',
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      subtotal: 0,
      tax_total: 0,
      total: 0,
      tax_lines: [],
      payment_terms: [],
      is_rental: false,
      is_special_regime: false
    }
  });

  // Stripper Hook (después de form)
  const { stripperState, applyStripper, getFieldChange } = useInvoiceStripper(form);

  // Persistir preferencia de motor OCR en localStorage
  useEffect(() => {
    const savedEngine = localStorage.getItem('preferred_ocr_engine') as 'openai' | 'mindee' | null;
    if (savedEngine) {
      setSelectedEngine(savedEngine);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('preferred_ocr_engine', selectedEngine);
  }, [selectedEngine]);

  // Cargar datos de la factura en modo edición
  useEffect(() => {
    if (invoice && isEditMode) {
      form.reset({
        invoice_type: 'received',
        currency: 'EUR',
        centro_code: invoice.centro_code || '',
        supplier_id: invoice.supplier_id || '',
        supplier_tax_id: invoice.supplier?.tax_id || '',
        supplier_name: invoice.supplier?.name || '',
        invoice_number: invoice.invoice_number || '',
        invoice_date: invoice.invoice_date || '',
        due_date: invoice.due_date || '',
        subtotal: invoice.subtotal || 0,
        tax_total: invoice.tax_total || 0,
        total: invoice.total || 0,
        tax_lines: [],
        payment_terms: [],
        notes: invoice.notes || '',
        is_rental: false,
        is_special_regime: false
      });
      setDocumentPath(invoice.document_path || null);
    }
  }, [invoice, isEditMode, form]);

  // Re-ejecutar OCR si cambia el centro después de procesarlo con 'temp'
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'centro_code' && value.centro_code && value.centro_code !== 'temp' && documentPath && ocrProcessed) {
        // Solo re-procesar si había un centro 'temp' o si no había centro al procesar
        const shouldReprocess = !form.formState.defaultValues?.centro_code || form.formState.defaultValues.centro_code === 'temp';
        if (shouldReprocess) {
          toast.info("Actualizando OCR con el centro seleccionado...");
          setTimeout(() => handleProcessOCR(), 500);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, documentPath, ocrProcessed]);

  // Validación de pre-contabilización
  const canPost = useMemo(() => {
    const values = form.watch();
    
    // 1. Centro asignado
    if (!values.centro_code) return false;
    
    // 2. Balance Debe = Haber
    const taxLines = values.tax_lines || [];
    const debitTotal = taxLines.reduce((sum, line) => sum + line.tax_base + line.tax_amount, 0);
    const creditTotal = values.total || 0;
    
    if (!validateAccountingBalance(debitTotal, creditTotal)) return false;
    
    // 3. Tiene líneas de impuestos
    if (taxLines.length === 0) return false;
    
    return true;
  }, [form.watch()]);

  // ⭐ Función helper para mostrar timeline visual en consola
  const logOCRTimeline = (logs: any[]) => {
    if (!logs || logs.length === 0) return;
    
    console.group('🔍 OCR ORCHESTRATOR TIMELINE');
    
    const startTime = logs[0]?.timestamp || 0;
    
    logs.forEach((log) => {
      const elapsedMs = startTime > 0 ? log.timestamp - startTime : 0;
      const icon = {
        'INIT': '🚀',
        'ROUTING': '🛤️',
        'EXECUTION': '⚙️',
        'VALIDATION': '✅',
        'DECISION': '🎯',
        'MERGE': '🔀',
        'CACHE': '💾'
      }[log.stage] || '📌';
      
      const style = log.decision?.includes('FAILED') || log.action?.includes('failed')
        ? 'color: #ef4444; font-weight: bold'
        : log.stage === 'DECISION'
        ? 'color: #3b82f6; font-weight: bold'
        : 'color: #6b7280';
      
      console.log(
        `%c[+${elapsedMs}ms] ${icon} ${log.stage} → ${log.action}${log.decision ? ` (${log.decision})` : ''}`,
        style
      );
      
      if (log.reason) {
        console.log(`   ℹ️  ${log.reason}`);
      }
      
      if (log.metrics) {
        console.log('   📊 Metrics:', log.metrics);
      }
    });
    
    console.groupEnd();
  };

  // Handler de procesamiento OCR
  // Handler de procesamiento OCR (acepta path/centro/engine opcionales para evitar carreras)
  const handleProcessOCR = async (opts?: { path?: string; centro?: string; engine?: 'openai' | 'mindee' }) => {
    const effectivePath = opts?.path ?? documentPath;
    const engine = opts?.engine ?? selectedEngine;
    
    console.log('[OCR] Iniciando procesamiento OCR...');
    console.log('[OCR] documentPath (effective):', effectivePath);
    console.log('[OCR] motor seleccionado:', engine);
    
    if (!effectivePath) {
      console.error('[OCR] No hay documentPath');
      toast.error("Primero sube un PDF");
      return;
    }
    
    // Usar centro actual o 'temp' si no hay seleccionado
    let centroCode = opts?.centro ?? form.getValues('centro_code');
    console.log('[OCR] Centro code inicial:', centroCode);
    
    if (!centroCode) {
      console.log('[OCR] No hay centro, usando "temp"');
      toast.info("Procesando OCR sin centro asignado. Selecciona un centro después.", {
        duration: 4000
      });
      centroCode = 'temp';
    }

    console.log('[OCR] Invocando edge function con:', { documentPath: effectivePath, centroCode, engine });

    try {
      const result = await processOCR.mutateAsync({
        documentPath: effectivePath,
        centroCode,
        engine
      });
      
      console.log('[OCR] Resultado recibido:', result);
      
      // ⭐ NUEVO: Mostrar timeline visual
      if (result.orchestrator_logs) {
        logOCRTimeline(result.orchestrator_logs);
      }
      
      // ⭐ NUEVO: Resumen de métricas
      if (result.ocr_metrics) {
        console.group('📊 OCR METRICS SUMMARY');
        console.log('Engine usado:', result.ocr_engine);
        console.log('Confianza final:', `${Math.round(result.confidence * 100)}%`);
        console.log('Tiempo total:', `${result.processingTimeMs}ms`);
        console.log('OpenAI:', `${result.ocr_metrics.ms_openai}ms`);
        console.log('Mindee:', `${result.ocr_metrics.ms_mindee}ms`);
        console.log('Páginas:', result.ocr_metrics.pages);
        console.log('Coste estimado:', `€${result.ocr_metrics.cost_estimate_eur?.toFixed(4) || '0.0000'}`);
        console.groupEnd();
      }
      
      // ⭐ NUEVO: Mostrar merge notes si existen
      if (result.merge_notes && result.merge_notes.length > 0) {
        console.group('📝 MERGE NOTES');
        result.merge_notes.forEach(note => console.log(`  • ${note}`));
        console.groupEnd();
      }

      setRawOCRResponse(result);
      
      // FASE 4: STRIPPER (Fiscal Normalizer)
      const dataToNormalize = result.normalized || result.data;
      const { normalized, changes, warnings } = stripAndNormalize(dataToNormalize);
      
      setOcrData(normalized);
      setNormalizationChanges(changes);
      setNormalizationWarnings(warnings);
      setOcrConfidence(result.confidence);
      setOcrWarnings(result.warnings || []);
      setApMapping(result.ap_mapping);
      setEntryValidation(result.entry_validation || null);
      setOcrEngine(result.ocr_engine || "google_vision");
      setMergeNotes(result.merge_notes || []);
      setOcrProcessed(true);

      // PRE-FILL FORMULARIO
      if (normalized.supplier?.matchedId) {
        form.setValue('supplier_id', normalized.supplier.matchedId);
      }
      form.setValue('invoice_number', normalized.invoice_number || '');
      form.setValue('invoice_date', normalized.issue_date || '');
      form.setValue('due_date', normalized.due_date || '');
      
      const subtotal = (normalized.totals?.base_10 || 0) + (normalized.totals?.base_21 || 0);
      const taxTotal = (normalized.totals?.vat_10 || 0) + (normalized.totals?.vat_21 || 0);
      const total = normalized.totals?.total || 0;
      
      form.setValue('subtotal', subtotal);
      form.setValue('tax_total', taxTotal);
      form.setValue('total', total);
      
      const changesMsg = changes.length > 0 ? ` · ${changes.length} normalización(es)` : '';
      toast.success(
        `OCR procesado con ${Math.round(result.confidence * 100)}% confianza${changesMsg}`,
        { duration: 4000 }
      );

    } catch (error: any) {
      console.error('[OCR] Error completo:', error);
      console.error('[OCR] Error message:', error.message);
      console.error('[OCR] Error stack:', error.stack);
      toast.error(`Error OCR: ${error.message}`, {
        description: 'Revisa la consola para más detalles',
        duration: 5000
      });
    }
  };

  // Handle PDF upload completion
  const handleUploadComplete = (path: string | null) => {
    console.log('[Upload] PDF subido, path:', path);
    setDocumentPath(path);
    if (path) {
      toast.success("PDF subido correctamente");
      console.log('[Upload] Programando auto-trigger OCR en 300ms con path');
      setTimeout(() => {
        console.log('[Upload] Ejecutando auto-trigger OCR ahora con path y motor', selectedEngine);
        handleProcessOCR({ path, centro: form.getValues('centro_code') || 'temp', engine: selectedEngine });
      }, 300);
    }
  };

  // Handler para reintentar con motor diferente
  const handleRetryWithDifferentEngine = () => {
    const newEngine = ocrEngine === 'openai' ? 'mindee' : 'openai';
    console.log('[OCR] Reintentando con motor:', newEngine);
    setSelectedEngine(newEngine);
    toast.info(`Reprocesando con ${newEngine === 'openai' ? 'OpenAI Vision' : 'Mindee'}...`);
    setTimeout(() => {
      handleProcessOCR({ engine: newEngine });
    }, 300);
  };

  // Handler para aceptar todas las sugerencias AP
  const handleAcceptAllSuggestions = () => {
    if (!apMapping) return;
    toast.success("Sugerencias AP aplicadas");
  };

  // Handler para aceptar sugerencia de factura
  const handleAcceptInvoiceSuggestion = () => {
    if (!apMapping) return;
    toast.success("Sugerencia de factura aplicada");
  };

  // Handlers
  const handleSaveDraft = async (data: InvoiceFormData) => {
    try {
      if (isEditMode && id) {
        await updateInvoice.mutateAsync({ 
          id, 
          data: {
            centro_code: data.centro_code,
            invoice_number: data.invoice_number,
            invoice_date: data.invoice_date,
            due_date: data.due_date,
            subtotal: data.subtotal,
            tax_total: data.tax_total,
            total: data.total,
            notes: data.notes
          }
        });
        toast.success('Factura actualizada correctamente');
      } else {
        const newInvoice = await createInvoice.mutateAsync({
          centro_code: data.centro_code,
          supplier_id: data.supplier_id,
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          subtotal: data.subtotal,
          tax_total: data.tax_total,
          total: data.total,
          notes: data.notes,
          status: 'draft',
          document_path: documentPath,
          lines: []
        });

        // Log OCR si fue usado
        if (ocrProcessed && rawOCRResponse) {
          await logOCR.mutateAsync({
            invoiceId: newInvoice.id,
            documentPath: documentPath!,
            ocrProvider: 'google-vision',
            rawResponse: rawOCRResponse,
            extractedData: ocrData,
            confidence: ocrConfidence,
            processingTimeMs: rawOCRResponse.processingTimeMs || 0,
            userCorrections: {}
          });
        }

        // AP Learning
        if (ocrProcessed && apMapping && ocrData) {
          try {
            const learningResult = await apLearning.mutateAsync({
              invoiceId: newInvoice.id,
              lines: [],
              supplierId: data.supplier_id,
              supplierName: ocrData?.issuer?.name || '',
              supplierTaxId: ocrData?.issuer?.vat_id || null,
              centroCode: data.centro_code
            });

            if (learningResult.rulesGenerated > 0) {
              toast.success(`✨ ${learningResult.rulesGenerated} regla(s) aprendida(s)`);
            }
          } catch (error) {
            console.error('[AP Learning] Error:', error);
          }
        }

        toast.success('Factura guardada como borrador');
        navigate(`/invoices/received/${newInvoice.id}/edit`);
      }
    } catch (error: any) {
      toast.error('Error al guardar la factura', {
        description: error.message
      });
    }
  };

  const handleConfirmAndPost = async () => {
    try {
      const data = form.getValues();
      
      // 1. Guardar factura primero
      let invoiceId = id;
      
      if (!isEditMode) {
        const newInvoice = await createInvoice.mutateAsync({
          centro_code: data.centro_code,
          supplier_id: data.supplier_id,
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          subtotal: data.subtotal,
          tax_total: data.tax_total,
          total: data.total,
          notes: data.notes,
          status: 'draft',
          document_path: documentPath,
          lines: []
        });
        invoiceId = newInvoice.id;

        // Log OCR si fue usado
        if (ocrProcessed && rawOCRResponse) {
          await logOCR.mutateAsync({
            invoiceId: newInvoice.id,
            documentPath: documentPath!,
            ocrProvider: 'google-vision',
            rawResponse: rawOCRResponse,
            extractedData: ocrData,
            confidence: ocrConfidence,
            processingTimeMs: rawOCRResponse.processingTimeMs || 0,
            userCorrections: {}
          });
        }

        // AP Learning
        if (ocrProcessed && apMapping && ocrData) {
          try {
            const learningResult = await apLearning.mutateAsync({
              invoiceId: newInvoice.id,
              lines: [],
              supplierId: data.supplier_id,
              supplierName: ocrData?.issuer?.name || '',
              supplierTaxId: ocrData?.issuer?.vat_id || null,
              centroCode: data.centro_code
            });

            if (learningResult.rulesGenerated > 0) {
              toast.success(`✨ ${learningResult.rulesGenerated} regla(s) aprendida(s)`);
            }
          } catch (error) {
            console.error('[AP Learning] Error:', error);
          }
        }
      } else {
        await updateInvoice.mutateAsync({ 
          id: invoiceId!, 
          data: {
            centro_code: data.centro_code,
            invoice_number: data.invoice_number,
            invoice_date: data.invoice_date,
            due_date: data.due_date,
            subtotal: data.subtotal,
            tax_total: data.tax_total,
            total: data.total,
            notes: data.notes
          }
        });
      }
      
      // 2. Validar con InvoiceEntryValidator
      const validation = await validateInvoiceForPosting(invoiceId!);
      
      if (!validation.ready_to_post) {
        validation.blocking_issues.forEach(issue => {
          if (issue.includes('centro')) {
            toast.error('❌ Centro no asignado');
          } else if (issue.includes('balance') || issue.includes('Debe')) {
            toast.error('❌ Descuadre contable: Debe ≠ Haber');
          } else if (issue.includes('período')) {
            toast.error('❌ Período cerrado', {
              description: 'No se puede postear en un período cerrado'
            });
          } else {
            toast.error(issue);
          }
        });
        return;
      }
      
      // 3. Contabilizar
      await invoiceActions.postInvoice({ invoiceId: invoiceId! });
      
      toast.success('✅ Factura aprobada y contabilizada correctamente', {
        description: 'El asiento contable ha sido generado'
      });
      
      navigate('/invoices/inbox');
      
    } catch (error: any) {
      console.error('Error al contabilizar:', error);
    }
  };

  const handleIgnore = async () => {
    if (!id) return;
    
    if (!confirm('¿Marcar esta factura como ignorada?')) return;
    
    try {
      await updateInvoice.mutateAsync({
        id,
        data: { status: 'rejected' }
      });
      
      toast.info('Factura marcada como ignorada');
      navigate('/invoices/inbox');
    } catch (error: any) {
      toast.error('Error al ignorar la factura', {
        description: error.message
      });
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !confirm('¿Descartar los cambios?')) {
      return;
    }
    navigate('/invoices/inbox');
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={isEditMode ? 'Editar Factura' : 'Nueva Factura con OCR'}
        breadcrumbs={[
          { label: 'Facturas', href: '/invoices/inbox' },
          { label: isEditMode ? 'Editar' : 'Nueva' }
        ]}
      />

      <div className="container mx-auto max-w-[1800px] p-6">
        {/* Desktop: Grid 2 columnas */}
        <div className="hidden lg:grid lg:grid-cols-[45%_55%] gap-6">
          {/* Izquierda: PDF */}
          <div className="sticky top-6 h-[calc(100vh-8rem)] overflow-hidden space-y-4">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                {documentPath ? (
                  <InvoicePDFPreview
                    documentPath={documentPath}
                    className="h-full"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center p-6" id="pdf-uploader">
                    <InvoicePDFUploader
                      invoiceId={id}
                      invoiceType="received"
                      centroCode={form.watch('centro_code') || 'temp'}
                      currentPath={documentPath}
                      onUploadComplete={handleUploadComplete}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botón OCR manual PROMINENTE si no se ha procesado */}
            {documentPath && !ocrProcessed && (
              <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg animate-pulse">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-3 rounded-full bg-primary/20 animate-bounce">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        PDF Listo para Digitalizar
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Extrae automáticamente todos los datos de la factura
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => handleProcessOCR()}
                      disabled={processOCR.isPending}
                      size="lg"
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold text-lg py-7 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      {processOCR.isPending ? (
                        <>
                          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                          Procesando con IA...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-3 h-6 w-6 animate-pulse" />
                          🚀 Digitalizar con OCR
                        </>
                      )}
                    </Button>
                    
                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                      <Sparkles className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
                      <p>
                        <strong>Auto-procesamiento:</strong> El OCR se ejecuta automáticamente al subir un PDF. 
                        Si no ocurre, usa este botón.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Indicador OCR Engine */}
            {ocrProcessed && (
              <>
                <OCREngineIndicator
                  ocrEngine={ocrEngine}
                  mergeNotes={mergeNotes}
                  confidence={ocrConfidence}
                  metrics={{
                    pages: 1
                  }}
                />
                
                {/* Botón RE-PROCESAR si ya fue procesado */}
                <Button
                  onClick={() => handleProcessOCR()}
                  disabled={processOCR.isPending}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-blue-600 text-blue-700 hover:bg-blue-50"
                >
                  {processOCR.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Re-procesando...
                    </>
                  ) : (
                    <>
                      <Scan className="mr-2 h-4 w-4" />
                      Re-procesar OCR
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Derecha: Formulario */}
          <div className="space-y-6 pb-24">
            <FormProvider {...form}>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-6">
                  <InvoiceFormHeader
                    control={form.control}
                    isEditMode={isEditMode}
                    ocrEngine={ocrEngine}
                    ocrConfidence={ocrConfidence}
                    onProcessOCR={() => handleProcessOCR()}
                    isProcessing={processOCR.isPending}
                    hasDocument={!!documentPath}
                    onGoToUpload={() => document.getElementById('pdf-uploader')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    selectedEngine={selectedEngine}
                    onEngineChange={setSelectedEngine}
                    onRetryWithDifferentEngine={handleRetryWithDifferentEngine}
                  />

                  {/* Badge Stripper + Ver cambios */}
                  {stripperState.isNormalized && stripperState.appliedAt && (
                    <div className="flex items-center gap-2">
                      <StripperBadge 
                        changesCount={stripperState.changes.length}
                        appliedAt={stripperState.appliedAt}
                      />
                      <StripperChangesDialog 
                        changes={stripperState.changes}
                        warnings={stripperState.warnings}
                      />
                    </div>
                  )}

                  {/* Alertas de normalización */}
                  {normalizationChanges.length > 0 && (
                    <NormalizationChangesAlert
                      changes={normalizationChanges}
                      warnings={normalizationWarnings}
                    />
                  )}

                  {/* AP Mapping Suggestions */}
                  {apMapping && (
                    <APMappingSuggestions
                      invoiceSuggestion={{
                        account_suggestion: apMapping.invoice_level.account_suggestion,
                        confidence_score: apMapping.invoice_level.confidence_score,
                        rationale: apMapping.invoice_level.rationale,
                        tax_account: '4720001',
                        ap_account: '4000000',
                        centre_id: form.watch('centro_code'),
                        matched_rule_id: apMapping.invoice_level.matched_rule_id,
                        matched_rule_name: apMapping.invoice_level.matched_rule_name
                      }}
                      lineSuggestions={apMapping.line_level?.map((line, index) => ({
                        account_suggestion: line.account_suggestion,
                        confidence_score: line.confidence_score,
                        rationale: line.rationale,
                        tax_account: '4720001',
                        ap_account: '4000000',
                        centre_id: form.watch('centro_code'),
                        matched_rule_id: line.matched_rule_id,
                        matched_rule_name: line.matched_rule_name
                      })) || []}
                      onAcceptAll={handleAcceptAllSuggestions}
                      onAcceptInvoice={handleAcceptInvoiceSuggestion}
                    />
                  )}

                  {/* Entry Preview */}
                  {entryValidation && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Preview Asiento Contable
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <EntryPreview
                          readyToPost={entryValidation.ready_to_post}
                          blockingIssues={entryValidation.blocking_issues || []}
                          warnings={entryValidation.warnings || []}
                          confidenceScore={Math.round(ocrConfidence * 100)}
                          preview={entryValidation.post_preview || []}
                          onPost={() => {}}
                          onEdit={() => {}}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  
                  <InvoiceSupplierSection
                    control={form.control}
                    setValue={form.setValue}
                    watch={form.watch}
                  />
                  
                  <InvoiceDataSection
                    control={form.control}
                    watch={form.watch}
                    setValue={form.setValue}
                  />
                  
                  <InvoicePaymentTermsSection
                    control={form.control}
                    watch={form.watch}
                  />
                  
                  <InvoiceTaxBreakdownSection
                    control={form.control}
                    setError={form.setError}
                  />
                  
                  <InvoiceAdvancedOptionsSection
                    control={form.control}
                    invoiceId={id}
                    ocrData={ocrData}
                  />

                  {/* Botón Aplicar Stripper */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-sm">Normalizador de Datos</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Limpia y normaliza campos según estándares fiscales españoles
                            </p>
                          </div>
                          {stripperState.isNormalized && (
                            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                              Aplicado
                            </Badge>
                          )}
                        </div>
                        
                        <Button
                          onClick={applyStripper}
                          variant="outline"
                          size="sm"
                          className="w-full border-purple-600 text-purple-700 hover:bg-purple-50"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          {stripperState.isNormalized ? 'Re-aplicar Stripper' : 'Aplicar Stripper'}
                        </Button>
                        
                        {stripperState.isNormalized && (
                          <p className="text-xs text-muted-foreground">
                            ✨ {stripperState.changes.length} campo{stripperState.changes.length !== 1 ? 's' : ''} normalizado{stripperState.changes.length !== 1 ? 's' : ''}
                            {stripperState.warnings.length > 0 && ` • ${stripperState.warnings.length} advertencia${stripperState.warnings.length !== 1 ? 's' : ''}`}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </form>
            </FormProvider>
          </div>
        </div>

        {/* Mobile: Tabs */}
        <div className="lg:hidden">
          <Tabs defaultValue="form">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pdf">PDF</TabsTrigger>
              <TabsTrigger value="form">Formulario</TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  {documentPath ? (
                    <div className="h-[70vh]">
                      <InvoicePDFPreview
                        documentPath={documentPath}
                        className="h-full"
                      />
                    </div>
                  ) : (
                    <div id="pdf-uploader">
                      <InvoicePDFUploader
                        invoiceId={id}
                        invoiceType="received"
                        centroCode={form.watch('centro_code') || 'temp'}
                        currentPath={documentPath}
                        onUploadComplete={handleUploadComplete}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Botón OCR manual PROMINENTE si no se ha procesado */}
              {documentPath && !ocrProcessed && (
                <Alert className="mt-4 border-2 border-blue-600 bg-blue-50 shadow-lg">
                  <div className="flex flex-col items-center gap-3 p-4">
                    <div className="flex items-center gap-2 text-blue-900 font-semibold">
                      <Scan className="h-5 w-5" />
                      <span>PDF listo para procesar</span>
                    </div>
                    
                    <Button
                      onClick={() => handleProcessOCR()}
                      disabled={processOCR.isPending}
                      size="lg"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-6 shadow-md hover:shadow-xl transition-all"
                    >
                      {processOCR.isPending ? (
                        <>
                          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                          Procesando OCR...
                        </>
                      ) : (
                        <>
                          <Scan className="mr-3 h-6 w-6" />
                          🚀 Procesar con OCR
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-blue-700 text-center">
                      El OCR debería ejecutarse automáticamente. Si no ocurre, usa este botón.
                    </p>
                  </div>
                </Alert>
              )}

              {/* Indicador OCR Engine */}
              {ocrProcessed && (
                <div className="mt-4 space-y-2">
                  <OCREngineIndicator
                    ocrEngine={ocrEngine}
                    mergeNotes={mergeNotes}
                    confidence={ocrConfidence}
                    metrics={{
                      pages: 1
                    }}
                  />
                  
                  {/* Botón RE-PROCESAR si ya fue procesado */}
                  <Button
                    onClick={() => handleProcessOCR()}
                    disabled={processOCR.isPending}
                    variant="outline"
                    size="sm"
                    className="w-full border-blue-600 text-blue-700 hover:bg-blue-50"
                  >
                    {processOCR.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Re-procesando...
                      </>
                    ) : (
                      <>
                        <Scan className="mr-2 h-4 w-4" />
                        Re-procesar OCR
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="form" className="mt-6 space-y-6 pb-24">
              <FormProvider {...form}>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-6">
                    <InvoiceFormHeader
                      control={form.control}
                      isEditMode={isEditMode}
                      ocrEngine={ocrEngine}
                      ocrConfidence={ocrConfidence}
                      onProcessOCR={() => handleProcessOCR()}
                      isProcessing={processOCR.isPending}
                      hasDocument={!!documentPath}
                      onGoToUpload={() => document.getElementById('pdf-uploader')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    />

                    {/* Badge Stripper + Ver cambios */}
                    {stripperState.isNormalized && stripperState.appliedAt && (
                      <div className="flex items-center gap-2">
                        <StripperBadge 
                          changesCount={stripperState.changes.length}
                          appliedAt={stripperState.appliedAt}
                        />
                        <StripperChangesDialog 
                          changes={stripperState.changes}
                          warnings={stripperState.warnings}
                        />
                      </div>
                    )}

                    {/* Alertas de normalización */}
                    {normalizationChanges.length > 0 && (
                      <NormalizationChangesAlert
                        changes={normalizationChanges}
                        warnings={normalizationWarnings}
                      />
                    )}

                    {/* AP Mapping Suggestions */}
                    {apMapping && (
                      <APMappingSuggestions
                        invoiceSuggestion={{
                          account_suggestion: apMapping.invoice_level.account_suggestion,
                          confidence_score: apMapping.invoice_level.confidence_score,
                          rationale: apMapping.invoice_level.rationale,
                          tax_account: '4720001',
                          ap_account: '4000000',
                          centre_id: form.watch('centro_code'),
                          matched_rule_id: apMapping.invoice_level.matched_rule_id,
                          matched_rule_name: apMapping.invoice_level.matched_rule_name
                        }}
                        lineSuggestions={apMapping.line_level?.map((line, index) => ({
                          account_suggestion: line.account_suggestion,
                          confidence_score: line.confidence_score,
                          rationale: line.rationale,
                          tax_account: '4720001',
                          ap_account: '4000000',
                          centre_id: form.watch('centro_code'),
                          matched_rule_id: line.matched_rule_id,
                          matched_rule_name: line.matched_rule_name
                        })) || []}
                        onAcceptAll={handleAcceptAllSuggestions}
                        onAcceptInvoice={handleAcceptInvoiceSuggestion}
                      />
                    )}

                    {/* Entry Preview */}
                    {entryValidation && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Preview Asiento Contable
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4">
                          <EntryPreview
                            readyToPost={entryValidation.ready_to_post}
                            blockingIssues={entryValidation.blocking_issues || []}
                            warnings={entryValidation.warnings || []}
                            confidenceScore={Math.round(ocrConfidence * 100)}
                            preview={entryValidation.post_preview || []}
                            onPost={() => {}}
                            onEdit={() => {}}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    
                    <InvoiceSupplierSection
                      control={form.control}
                      setValue={form.setValue}
                      watch={form.watch}
                    />
                    
                    <InvoiceDataSection
                      control={form.control}
                      watch={form.watch}
                      setValue={form.setValue}
                    />
                    
                    <InvoicePaymentTermsSection
                      control={form.control}
                      watch={form.watch}
                    />
                    
                    <InvoiceTaxBreakdownSection
                      control={form.control}
                      setError={form.setError}
                    />
                    
                    <InvoiceAdvancedOptionsSection
                      control={form.control}
                      invoiceId={id}
                      ocrData={ocrData}
                    />

                    {/* Botón Aplicar Stripper */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-sm">Normalizador de Datos</h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                Limpia y normaliza campos según estándares fiscales españoles
                              </p>
                            </div>
                            {stripperState.isNormalized && (
                              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                                Aplicado
                              </Badge>
                            )}
                          </div>
                          
                          <Button
                            onClick={applyStripper}
                            variant="outline"
                            size="sm"
                            className="w-full border-purple-600 text-purple-700 hover:bg-purple-50"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            {stripperState.isNormalized ? 'Re-aplicar Stripper' : 'Aplicar Stripper'}
                          </Button>
                          
                          {stripperState.isNormalized && (
                            <p className="text-xs text-muted-foreground">
                              ✨ {stripperState.changes.length} campo{stripperState.changes.length !== 1 ? 's' : ''} normalizado{stripperState.changes.length !== 1 ? 's' : ''}
                              {stripperState.warnings.length > 0 && ` • ${stripperState.warnings.length} advertencia${stripperState.warnings.length !== 1 ? 's' : ''}`}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </form>
              </FormProvider>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Action Buttons (sticky footer) */}
      <InvoiceActionButtons
        isEditMode={isEditMode}
        isLoading={createInvoice.isPending || updateInvoice.isPending || invoiceActions.isPosting}
        isDirty={form.formState.isDirty}
        canPost={canPost}
        onConfirmAndPost={handleConfirmAndPost}
        onSaveDraft={form.handleSubmit(handleSaveDraft)}
        onIgnore={handleIgnore}
        onCancel={handleCancel}
      />
    </div>
  );
}
