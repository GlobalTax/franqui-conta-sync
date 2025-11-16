import { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useInvoice } from '@/hooks/useInvoice';
import { useReprocessInvoice } from '@/hooks/useReprocessInvoice';
import { usePostInvoice } from '@/hooks/usePostInvoice';
import { normalizeInvoiceForFrontend } from '@/lib/fiscal/normalize-frontend';
import { mapAP } from '@/lib/accounting/composers/map-ap';
import { validatePosting } from '@/lib/accounting/composers/validate-posting';
import { InvoiceForm } from '@/components/digitization/InvoiceForm';
import { MindeeMetricsCard } from '@/components/invoices/MindeeMetricsCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load componentes pesados
const PDFViewer = lazy(() => import('@/components/digitization/PDFViewer').then(m => ({ default: m.PDFViewer })));
const JournalPreview = lazy(() => import('@/components/digitization/JournalPreview').then(m => ({ default: m.JournalPreview })));

export default function OCRDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id!);
  const { reprocess, isReprocessing } = useReprocessInvoice();
  const { postInvoice, isPosting } = usePostInvoice();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Factura no encontrada</p>
      </div>
    );
  }

  const normalized = normalizeInvoiceForFrontend(invoice.ocr_payload as any || {});
  const mapping = mapAP(normalized);
  const validation = validatePosting(
    { totals: normalized.totals || { total: 0 } }, 
    mapping
  );

  const handleReprocess = async () => {
    await reprocess({ invoiceId: id! });
  };

  const handlePost = async () => {
    await postInvoice({
      invoiceId: id!,
      invoiceType: 'received',
      entryDate: normalized.issue_date || new Date().toISOString().split('T')[0],
      description: `Factura ${normalized.invoice_number || 'S/N'} - ${normalized.issuer?.name || 'Proveedor'}`,
      centreCode: mapping.centre_id || 'DEFAULT',
      fiscalYearId: '2025', // TODO: Get from context or user selection
      preview: validation.post_preview,
    });
    navigate('/digitalizacion/inbox-v2');
  };

  return (
    <div className="grid grid-cols-12 gap-4 p-6 h-screen">
      <div className="col-span-7 h-full">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <PDFViewer filePath={invoice.file_path} />
        </Suspense>
      </div>
      
      <div className="col-span-5 h-full overflow-y-auto space-y-4">
        {/* Alert de revisión manual si aplica */}
        {(invoice.approval_status === 'ocr_review' || invoice.ocr_fallback_used) && (
          <Alert className="border-orange-500/50 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900 dark:text-orange-100">
              Revisión Manual Requerida
            </AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              {invoice.approval_status === 'ocr_review' 
                ? 'Esta factura es de un proveedor crítico o tiene confianza baja.'
                : 'Se utilizaron parsers de respaldo para extraer datos.'
              } Por favor, revisar antes de aprobar.
            </AlertDescription>
          </Alert>
        )}
        
        <InvoiceForm data={normalized} invoiceId={id!} />
        
        {/* Métricas de Mindee */}
        <MindeeMetricsCard
          mindeeDocumentId={invoice.mindee_document_id}
          mindeeConfidence={invoice.mindee_confidence}
          mindeeCostEuros={invoice.mindee_cost_euros}
          mindeeProcessingTime={invoice.mindee_processing_time}
          mindeePages={invoice.mindee_pages}
          ocrFallbackUsed={invoice.ocr_fallback_used || false}
          fieldConfidenceScores={invoice.field_confidence_scores as Record<string, number> | null}
        />
        
        <Suspense fallback={
          <Skeleton className="h-64 w-full" />
        }>
          <JournalPreview 
            preview={validation.post_preview} 
            issues={validation.blocking_issues}
            mapping={mapping}
          />
        </Suspense>
        
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleReprocess}
            disabled={isReprocessing}
          >
            {isReprocessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Reprocesar con Mindee
          </Button>
          <Button 
            disabled={!validation.ready_to_post || isPosting}
            onClick={handlePost}
          >
            {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar y contabilizar
          </Button>
        </div>
      </div>
    </div>
  );
}
