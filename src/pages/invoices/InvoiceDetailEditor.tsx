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
import { stripAndNormalize, type NormalizationChange } from '@/lib/fiscal-normalizer';
import { validateInvoiceForPosting } from '@/lib/invoice-validation';
import { validateAccountingBalance } from '@/lib/invoice-calculator';
import { toast } from 'sonner';
import { Scan, Loader2, FileText } from 'lucide-react';

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

  // Handler de procesamiento OCR
  const handleProcessOCR = async () => {
    if (!documentPath) {
      toast.error("Primero sube un PDF");
      return;
    }
    
    // Usar centro actual o 'temp' si no hay seleccionado
    let centroCode = form.getValues('centro_code');
    if (!centroCode) {
      toast.info("Procesando OCR sin centro asignado. Selecciona un centro después.", {
        duration: 4000
      });
      centroCode = 'temp';
    }

    try {
      const result = await processOCR.mutateAsync({
        documentPath,
        centroCode
      });

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
      console.error('OCR failed:', error);
      toast.error(`Error OCR: ${error.message}`);
    }
  };

  // Handle PDF upload completion
  const handleUploadComplete = (path: string | null) => {
    setDocumentPath(path);
    if (path) {
      toast.success("PDF subido correctamente");
      
      // Auto-trigger OCR siempre (usará centro actual o 'temp')
      setTimeout(() => {
        handleProcessOCR();
      }, 500);
    }
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
                  <div className="h-full flex items-center justify-center p-6">
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

            {/* Botón OCR manual si no se ha procesado */}
            {documentPath && !ocrProcessed && (
              <Alert>
                <Scan className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>PDF cargado</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleProcessOCR}
                    disabled={processOCR.isPending}
                    className="px-2"
                  >
                    {processOCR.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Scan className="mr-2 h-4 w-4" />
                        Procesar con OCR
                      </>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Indicador OCR Engine */}
            {ocrProcessed && (
              <OCREngineIndicator
                ocrEngine={ocrEngine}
                mergeNotes={mergeNotes}
                confidence={ocrConfidence}
                metrics={{
                  pages: 1
                }}
              />
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
                  />

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
                    <InvoicePDFUploader
                      invoiceId={id}
                      invoiceType="received"
                      centroCode={form.watch('centro_code') || 'temp'}
                      currentPath={documentPath}
                      onUploadComplete={handleUploadComplete}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Botón OCR manual si no se ha procesado */}
              {documentPath && !ocrProcessed && (
                <Alert className="mt-4">
                  <Scan className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>PDF cargado</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleProcessOCR}
                      disabled={processOCR.isPending}
                      className="px-2"
                    >
                      {processOCR.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Scan className="mr-2 h-4 w-4" />
                          Procesar con OCR
                        </>
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Indicador OCR Engine */}
              {ocrProcessed && (
                <div className="mt-4">
                  <OCREngineIndicator
                    ocrEngine={ocrEngine}
                    mergeNotes={mergeNotes}
                    confidence={ocrConfidence}
                    metrics={{
                      pages: 1
                    }}
                  />
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
                    />

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
