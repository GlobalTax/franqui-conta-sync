import { DigitizationTabs } from '@/components/digitization/DigitizationTabs';
import InvoicesInbox from '@/pages/invoices/InvoicesInbox';
import InvoiceDetailEditor from '@/pages/invoices/InvoiceDetailEditor';
import BulkInvoiceUpload from '@/pages/invoices/BulkInvoiceUpload';
import MigrationValidationChecklist from '@/pages/digitalizacion/MigrationValidationChecklist';
import { useInvoicesReceived } from '@/hooks/useInvoicesReceived';
import { useMemo } from 'react';

export default function Digitization() {
  // Fetch invoices to calculate counts
  const { data: invoices } = useInvoicesReceived({
    page: 1,
    limit: 1000, // Get all for counting
  });

  // Calculate tab counts
  const counts = useMemo(() => {
    const invoiceList = invoices?.data || [];
    
    return {
      inbox: invoiceList.filter(inv => 
        inv.approval_status === 'pending' || 
        inv.approval_status === 'ocr_review'
      ).length,
      depura: invoiceList.filter(inv => 
        inv.approval_status === 'ocr_review' ||
        (inv.ocr_confidence !== null && inv.ocr_confidence < 75)
      ).length,
      papelera: invoiceList.filter(inv => 
        inv.approval_status === 'rejected'
      ).length,
    };
  }, [invoices]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Digitalización de Documentos
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestión integral de facturas y documentos OCR
          </p>
        </div>

        <DigitizationTabs counts={counts}>
          {{
            inbox: <InvoicesInbox view="inbox" />,
            nueva: <InvoiceDetailEditor />,
            carga: <BulkInvoiceUpload />,
            depura: <InvoicesInbox view="depura" />,
            papelera: <InvoicesInbox view="papelera" />,
            validacion: <MigrationValidationChecklist />,
          }}
        </DigitizationTabs>
      </div>
    </div>
  );
}
