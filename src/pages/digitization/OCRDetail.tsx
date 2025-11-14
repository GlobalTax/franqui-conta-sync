import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useInvoice } from '@/hooks/useInvoice';
import { useReprocessInvoice } from '@/hooks/useReprocessInvoice';
import { usePostInvoice } from '@/hooks/usePostInvoice';
import { normalizeInvoiceForFrontend } from '@/lib/fiscal/normalize-frontend';
import { mapAP } from '@/lib/accounting/composers/map-ap';
import { validatePosting } from '@/lib/accounting/composers/validate-posting';
import { PDFViewer } from '@/components/digitization/PDFViewer';
import { InvoiceForm } from '@/components/digitization/InvoiceForm';
import { JournalPreview } from '@/components/digitization/JournalPreview';
import { Loader2 } from 'lucide-react';

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

  const handleReprocess = async (provider: 'openai') => {
    await reprocess({ invoiceId: id!, provider });
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
        <PDFViewer filePath={invoice.file_path} />
      </div>
      
      <div className="col-span-5 h-full overflow-y-auto space-y-4">
        <InvoiceForm data={normalized} invoiceId={id!} />
        
        <JournalPreview 
          preview={validation.post_preview} 
          issues={validation.blocking_issues}
          mapping={mapping}
        />
        
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => handleReprocess('openai')}
            disabled={isReprocessing}
          >
            {isReprocessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Reprocesar OCR
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
