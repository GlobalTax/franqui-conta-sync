import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InvoicePDFUploader } from "@/components/invoices/InvoicePDFUploader";
import { InvoicePDFPreview } from "@/components/invoices/InvoicePDFPreview";
import { InvoiceLineItemsTable } from "@/components/invoices/InvoiceLineItemsTable";
import { SupplierSelector } from "@/components/invoices/SupplierSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
  useProcessInvoiceOCR, 
  useLogOCRProcessing,
  validateOCRData,
  getConfidenceLevel,
  getFieldConfidenceColor,
  type OCRInvoiceData,
  type OCRResponse,
  type APMappingResult,
  type InvoiceEntryValidationResult
} from "@/hooks/useInvoiceOCR";
import { APMappingSuggestions } from "@/components/invoices/APMappingSuggestions";
import { OCRDiscrepanciesAlert } from "@/components/invoices/OCRDiscrepanciesAlert";
import { EntryPreview } from "@/components/invoices/EntryPreview";
import { OCREngineIndicator } from "@/components/invoices/OCREngineIndicator";
import { useCreateInvoiceReceived } from "@/hooks/useInvoicesReceived";
import { useOrganization } from "@/hooks/useOrganization";
import { Loader2, AlertCircle, CheckCircle, FileText, Scan, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type OCRStatus = 'idle' | 'uploading' | 'processing' | 'review' | 'saving';

export default function NewInvoiceWithOCR() {
  const navigate = useNavigate();
  const { currentMembership } = useOrganization();
  const currentCentro = currentMembership?.restaurant;
  
  const [status, setStatus] = useState<OCRStatus>('idle');
  const [documentPath, setDocumentPath] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<OCRInvoiceData | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [rawOCRResponse, setRawOCRResponse] = useState<OCRResponse | null>(null);
  const [apMapping, setApMapping] = useState<APMappingResult | null>(null);
  const [entryValidation, setEntryValidation] = useState<InvoiceEntryValidationResult | null>(null);
  const [ocrEngine, setOcrEngine] = useState<"openai" | "mindee" | "merged" | "manual_review" | "google_vision">("google_vision");
  const [mergeNotes, setMergeNotes] = useState<string[]>([]);
  
  // Estado para controlar si el preview está expandido
  const [isPreviewOpen, setIsPreviewOpen] = useState(() => {
    // Abierto por defecto en desktop, cerrado en móvil
    return window.innerWidth >= 1024;
  });
  
  const [supplierId, setSupplierId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<any[]>([]);

  const processOCR = useProcessInvoiceOCR();
  const createInvoice = useCreateInvoiceReceived();
  const logOCR = useLogOCRProcessing();

  const handleUploadComplete = (path: string) => {
    setDocumentPath(path);
    setStatus('uploading');
  };

  const handleProcessOCR = async () => {
    if (!documentPath || !currentCentro) {
      toast.error("Falta el documento o el centro");
      return;
    }

    setStatus('processing');
    
    try {
      const result = await processOCR.mutateAsync({
        documentPath,
        centroCode: currentCentro.codigo
      });

      setRawOCRResponse(result);
      setOcrData(result.normalized || result.data);
      setOcrConfidence(result.confidence);
      setOcrWarnings(result.warnings || []);
      setApMapping(result.ap_mapping);
      setEntryValidation(result.entry_validation || null);
      setOcrEngine(result.ocr_engine || "google_vision");
      setMergeNotes(result.merge_notes || []);

      // Pre-fill form
      const normalizedData = result.normalized || result.data;
      if (normalizedData.supplier?.matchedId) {
        setSupplierId(normalizedData.supplier.matchedId);
      }
      setInvoiceNumber(normalizedData.invoice_number || normalizedData.invoiceNumber || '');
      setInvoiceDate(normalizedData.issue_date || normalizedData.invoiceDate || '');
      setDueDate(normalizedData.due_date || normalizedData.dueDate || "");
      
      // Pre-fill lines with AP mapping suggestions
      setLines(normalizedData.lines.map((line: any, index: number) => ({
        id: `temp-${index}`,
        description: line.description,
        quantity: line.quantity || 1,
        unit_price: line.unit_price || line.unitPrice || line.amount,
        discount_percentage: 0,
        tax_rate: line.taxRate || 21,
        account_code: result.ap_mapping?.line_level?.[index]?.account_suggestion || ''
      })));

      setStatus('review');
      
      toast.success(
        `Documento procesado con ${Math.round(result.confidence * 100)}% de confianza`,
        { duration: 3000 }
      );

    } catch (error: any) {
      console.error('OCR processing failed:', error);
      setStatus('idle');
      toast.error(`Error al procesar: ${error.message}`);
    }
  };

  const handleSave = async () => {
    if (!currentCentro || !documentPath) return;

    // Basic validation
    if (!supplierId || !invoiceNumber || !invoiceDate) {
      toast.error("Faltan campos obligatorios");
      return;
    }

    setStatus('saving');

    try {
      const subtotal = lines.reduce((sum, line) => {
        const lineSubtotal = line.quantity * line.unit_price * (1 - (line.discount_percentage || 0) / 100);
        return sum + lineSubtotal;
      }, 0);
      const taxTotal = lines.reduce((sum, line) => {
        const lineSubtotal = line.quantity * line.unit_price * (1 - (line.discount_percentage || 0) / 100);
        return sum + (lineSubtotal * line.tax_rate / 100);
      }, 0);
      const total = subtotal + taxTotal;

      const newInvoice = await createInvoice.mutateAsync({
        supplier_id: supplierId,
        centro_code: currentCentro.codigo,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        subtotal: Math.round(subtotal * 100) / 100,
        tax_total: Math.round(taxTotal * 100) / 100,
        total: Math.round(total * 100) / 100,
        status: 'pending',
        notes,
        lines: lines.map(line => ({
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          discount_percentage: line.discount_percentage || 0,
          tax_rate: line.tax_rate,
          account_code: line.account_code
        }))
      });

      // Log OCR processing
      await logOCR.mutateAsync({
        invoiceId: newInvoice.id,
        documentPath,
        ocrProvider: 'google-vision',
        rawResponse: rawOCRResponse,
        extractedData: ocrData,
        confidence: ocrConfidence,
        processingTimeMs: rawOCRResponse?.processingTimeMs || 0,
        userCorrections: {
          supplierId: supplierId !== ocrData?.supplier.matchedId ? supplierId : null,
          invoiceNumber: invoiceNumber !== ocrData?.invoiceNumber ? invoiceNumber : null,
          invoiceDate: invoiceDate !== ocrData?.invoiceDate ? invoiceDate : null,
          linesModified: JSON.stringify(lines) !== JSON.stringify(ocrData?.lines)
        }
      });

      toast.success("Factura creada con éxito");
      navigate('/facturas');

    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast.error(`Error al guardar: ${error.message}`);
      setStatus('review');
    }
  };

  const handleAcceptAllSuggestions = () => {
    if (!apMapping) return;
    
    setLines(prevLines => prevLines.map((line, index) => ({
      ...line,
      account_code: apMapping.line_level[index]?.account_suggestion || apMapping.invoice_level.account_suggestion
    })));
    
    toast.success("Sugerencias aplicadas a todas las líneas");
  };

  const handleAcceptInvoiceSuggestion = () => {
    if (!apMapping) return;
    
    setLines(prevLines => prevLines.map(line => ({
      ...line,
      account_code: apMapping.invoice_level.account_suggestion
    })));
    
    toast.success("Sugerencia de factura aplicada");
  };

  const confidenceInfo = getConfidenceLevel(ocrConfidence);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Facturas', href: '/facturas' },
          { label: 'Nueva con OCR' }
        ]}
        title="Nueva Factura con OCR"
        subtitle="Sube un PDF y extrae automáticamente los datos de la factura"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: PDF Upload & Preview */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documento PDF
            </h3>
            
            <InvoicePDFUploader
              invoiceType="received"
              centroCode={currentCentro?.codigo || ''}
              currentPath={documentPath}
              onUploadComplete={handleUploadComplete}
            />

            {documentPath && status === 'uploading' && (
              <div className="mt-4">
                <Button 
                  onClick={handleProcessOCR} 
                  disabled={processOCR.isPending}
                  className="w-full"
                >
                  {processOCR.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando OCR...
                    </>
                  ) : (
                    <>
                      <Scan className="mr-2 h-4 w-4" />
                      Procesar con OCR
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>

          {/* PDF Preview - Collapsible */}
          {documentPath && (
            <Collapsible
              open={isPreviewOpen}
              onOpenChange={setIsPreviewOpen}
              className="space-y-2"
            >
              <Card className="p-6">
                {/* Header con trigger */}
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Vista Previa
                      </h3>
                      
                      {/* Badges de estado - siempre visibles */}
                      <div className="flex items-center gap-2">
                        {status === 'processing' && (
                          <Badge variant="secondary" className="animate-pulse">
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Procesando...
                          </Badge>
                        )}
                        
                        {status === 'review' && (
                          <Badge className="bg-success text-white border-success">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Procesado
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Icono indicador */}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1 h-auto group-hover:bg-muted"
                    >
                      {isPreviewOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </CollapsibleTrigger>
                
                {/* Contenido collapsible */}
                <CollapsibleContent className="mt-4">
                  <InvoicePDFPreview 
                    documentPath={documentPath}
                    className="h-[400px] lg:h-[600px] rounded-lg overflow-hidden border border-border"
                  />
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {status === 'processing' && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <div>
                    <p className="font-medium">Procesando documento...</p>
                    <p className="text-sm text-muted-foreground">Esto puede tardar unos segundos</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {status === 'review' && ocrConfidence > 0 && (
            <Card className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Confianza del OCR</h4>
                  <Badge className={confidenceInfo.color}>
                    {Math.round(ocrConfidence * 100)}% - {confidenceInfo.label}
                  </Badge>
                </div>

                {ocrWarnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {ocrWarnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {ocrData?.supplier.matched && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Proveedor encontrado automáticamente
                      {ocrData.supplier.matchConfidence && ocrData.supplier.matchConfidence < 1 && 
                        ` (${Math.round(ocrData.supplier.matchConfidence * 100)}% confianza)`
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right: Form */}
        <div className="space-y-4">
          {/* OCR Engine Indicator */}
          {status === 'review' && (
            <OCREngineIndicator
              ocrEngine={ocrEngine}
              mergeNotes={mergeNotes}
              confidence={ocrConfidence}
            />
          )}

          {/* AP Mapping Suggestions */}
          {status === 'review' && apMapping && (
            <APMappingSuggestions
              invoiceSuggestion={apMapping.invoice_level}
              lineSuggestions={apMapping.line_level}
              onAcceptAll={handleAcceptAllSuggestions}
              onAcceptInvoice={handleAcceptInvoiceSuggestion}
            />
          )}

          {/* OCR Discrepancies Alert */}
          {status === 'review' && rawOCRResponse && (
            <OCRDiscrepanciesAlert
              discrepancies={ocrData?.discrepancies || []}
              proposedFix={ocrData?.proposed_fix || null}
              autofixApplied={rawOCRResponse.autofix_applied || []}
              validation={rawOCRResponse.validation || { ok: true, errors: [], warnings: [] }}
              onApplyFix={() => {
                if (ocrData?.proposed_fix) {
                  toast.success(`Corrección aplicada: ${ocrData.proposed_fix.what}`);
                  handleProcessOCR();
                }
              }}
            />
          )}

          {/* Entry Preview */}
          {status === 'review' && entryValidation && (
            <EntryPreview
              readyToPost={entryValidation.ready_to_post}
              blockingIssues={entryValidation.blocking_issues}
              warnings={entryValidation.warnings}
              confidenceScore={entryValidation.confidence_score}
              preview={entryValidation.post_preview}
              isLoading={createInvoice.isPending}
            />
          )}

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Datos de la Factura</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Proveedor *</Label>
                <SupplierSelector
                  value={supplierId}
                  onValueChange={setSupplierId}
                />
              </div>

              <div>
                <Label>Número de Factura *</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={status === 'review' ? getFieldConfidenceColor(!!invoiceNumber, ocrConfidence) : ''}
                  placeholder="Ej: FAC-2025-001"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha Factura *</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className={status === 'review' ? getFieldConfidenceColor(!!invoiceDate, ocrConfidence) : ''}
                  />
                </div>

                <div>
                  <Label>Fecha Vencimiento</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={status === 'review' ? getFieldConfidenceColor(!!dueDate, ocrConfidence * 0.8) : ''}
                  />
                </div>
              </div>

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {status === 'review' && lines.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Líneas de Factura</h3>
              <InvoiceLineItemsTable
                lines={lines}
                onChange={setLines}
                readonly={false}
              />
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/facturas')}
              disabled={status === 'saving'}
            >
              Cancelar
            </Button>

            {status === 'review' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleProcessOCR}
                  disabled={processOCR.isPending}
                >
                  <Scan className="mr-2 h-4 w-4" />
                  Re-procesar OCR
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={createInvoice.isPending || !supplierId || !invoiceNumber || !invoiceDate}
                  className="flex-1"
                >
                  {createInvoice.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Factura'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
