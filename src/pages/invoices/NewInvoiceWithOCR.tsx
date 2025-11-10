import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InvoicePDFUploader } from "@/components/invoices/InvoicePDFUploader";
import { InvoiceLineItemsTable } from "@/components/invoices/InvoiceLineItemsTable";
import { SupplierSelector } from "@/components/invoices/SupplierSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
  useProcessInvoiceOCR, 
  useLogOCRProcessing,
  validateOCRData,
  getConfidenceLevel,
  getFieldConfidenceColor,
  type OCRInvoiceData 
} from "@/hooks/useInvoiceOCR";
import { useCreateInvoiceReceived } from "@/hooks/useInvoicesReceived";
import { useOrganization } from "@/hooks/useOrganization";
import { Loader2, AlertCircle, CheckCircle, FileText, Scan } from "lucide-react";
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
  const [rawOCRResponse, setRawOCRResponse] = useState<any>(null);
  
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
      setOcrData(result.data);
      setOcrConfidence(result.confidence);
      setOcrWarnings(result.warnings || []);

      // Pre-fill form
      if (result.data.supplier.matchedId) {
        setSupplierId(result.data.supplier.matchedId);
      }
      setInvoiceNumber(result.data.invoiceNumber);
      setInvoiceDate(result.data.invoiceDate);
      setDueDate(result.data.dueDate || "");
      setLines(result.data.lines.map((line, index) => ({
        id: `temp-${index}`,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        discount_percentage: 0,
        tax_rate: line.taxRate,
        account_code: ''
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

    // Validate
    const validation = ocrData ? validateOCRData({
      ...ocrData,
      supplier: {
        ...ocrData.supplier,
        matchedId: supplierId
      },
      invoiceNumber,
      invoiceDate,
      dueDate: dueDate || undefined,
      lines
    }) : { isValid: false, errors: ['No hay datos de OCR'], warnings: [] };

    if (!validation.isValid) {
      toast.error("Hay errores en el formulario");
      validation.errors.forEach(err => toast.error(err));
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
